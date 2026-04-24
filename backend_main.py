"""
WildGuard AI — Backend API
FastAPI + YOLOv8 + Alert System
eSewa × WWF Nepal Hackathon 2026
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import time
import uuid
import asyncio
import json
import logging
from datetime import datetime

# ── Import services (see services/ directory) ──────────────────────────────────
from services.yolo_service import WildlifeDetector
from services.alert_service import AlertService
from services.risk_engine import RiskEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wildguard")

app = FastAPI(
    title="WildGuard AI API",
    description="Real-time wildlife detection and alert system for Nepal's protected areas",
    version="1.0.0",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://wildguard.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize services ────────────────────────────────────────────────────────
detector = WildlifeDetector(model_path="models/yolov8_wildlife_nepal.pt")
alert_service = AlertService()
risk_engine = RiskEngine()

# In-memory detection log (use MongoDB/PostgreSQL in production)
detections_db: List[dict] = []

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        for connection in self.active:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()


# ── Schemas ────────────────────────────────────────────────────────────────────
class DetectionResult(BaseModel):
    detection_id: str
    species: str
    confidence: float
    risk_level: str
    bbox: dict
    habitat: str
    population_status: str
    processing_time_ms: int
    alert_sent: bool
    timestamp: str
    wwf_notified: bool


class AlertRecord(BaseModel):
    detection_id: str
    species: str
    confidence: float
    risk_level: str
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    timestamp: str
    alert_sent: bool


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "WildGuard AI",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs"
    }


@app.post("/api/detect", response_model=DetectionResult)
async def detect_wildlife(image: UploadFile = File(...)):
    """
    Main detection endpoint.
    Accepts an image file, runs YOLOv8 inference,
    classifies risk, and dispatches alerts.
    """
    # Validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPG, PNG, WebP)")

    # Read image bytes
    img_bytes = await image.read()
    if len(img_bytes) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=413, detail="Image too large. Max 20MB.")

    start_time = time.time()

    try:
        # ── Step 1: Run YOLOv8 detection ──────────────────────────────────────
        raw_result = await asyncio.get_event_loop().run_in_executor(
            None, detector.detect, img_bytes
        )

        if not raw_result:
            raise HTTPException(status_code=422, detail="No wildlife detected in image")

        # ── Step 2: Classify risk level ───────────────────────────────────────
        species = raw_result["species"]
        risk_info = risk_engine.classify(species)

        # ── Step 3: Build detection record ───────────────────────────────────
        detection_id = f"det_{uuid.uuid4().hex[:12]}"
        processing_ms = int((time.time() - start_time) * 1000)
        timestamp = datetime.utcnow().isoformat() + "Z"

        result = {
            "detection_id": detection_id,
            "species": species,
            "confidence": raw_result["confidence"],
            "risk_level": risk_info["risk"],
            "bbox": raw_result["bbox"],
            "habitat": risk_info["habitat"],
            "population_status": risk_info["population"],
            "processing_time_ms": processing_ms,
            "alert_sent": False,
            "timestamp": timestamp,
            "wwf_notified": False,
        }

        # ── Step 4: Send alerts for HIGH/CRITICAL species ─────────────────────
        alert_sent = False
        wwf_notified = False

        if risk_info["risk"] in ("CRITICAL", "HIGH"):
            try:
                await alert_service.send_sms(
                    f"🚨 WILDGUARD ALERT: {species} detected ({raw_result['confidence']:.1f}% confidence). "
                    f"Risk: {risk_info['risk']}. Habitat: {risk_info['habitat']}. ID: {detection_id}"
                )
                await alert_service.send_email(
                    subject=f"[WildGuard] {risk_info['risk']} Alert — {species} Detected",
                    body=f"""
                    WildGuard AI has detected a {species}.
                    
                    Detection ID: {detection_id}
                    Confidence: {raw_result['confidence']:.1f}%
                    Risk Level: {risk_info['risk']}
                    Habitat: {risk_info['habitat']}
                    Population Status: {risk_info['population']}
                    Timestamp: {timestamp}
                    
                    Please dispatch nearest ranger team.
                    """
                )
                alert_sent = True
                wwf_notified = True
                logger.info(f"Alert sent for {species} — ID: {detection_id}")
            except Exception as e:
                logger.error(f"Alert dispatch failed: {e}")

        result["alert_sent"] = alert_sent
        result["wwf_notified"] = wwf_notified

        # ── Step 5: Store detection & broadcast via WebSocket ─────────────────
        detections_db.insert(0, result)
        if len(detections_db) > 500:
            detections_db.pop()

        await manager.broadcast({
            "type": "new_detection",
            "data": result
        })

        return DetectionResult(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail="Detection pipeline failed. Please retry.")


@app.get("/api/alerts", response_model=List[AlertRecord])
async def get_alerts(
    risk: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Fetch detection history with optional risk filter."""
    results = detections_db
    if risk:
        results = [d for d in results if d["risk_level"] == risk.upper()]
    return [
        AlertRecord(
            detection_id=d["detection_id"],
            species=d["species"],
            confidence=d["confidence"],
            risk_level=d["risk_level"],
            location=d.get("location"),
            latitude=d.get("latitude"),
            longitude=d.get("longitude"),
            timestamp=d["timestamp"],
            alert_sent=d["alert_sent"],
        )
        for d in results[offset: offset + limit]
    ]


@app.get("/api/stats")
async def get_stats():
    """Dashboard analytics summary."""
    total = len(detections_db)
    if total == 0:
        return {"total": 0, "critical": 0, "high": 0, "moderate": 0, "low": 0, "avg_confidence": 0}

    by_risk = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0}
    total_conf = 0.0

    for d in detections_db:
        risk = d.get("risk_level", "LOW")
        by_risk[risk] = by_risk.get(risk, 0) + 1
        total_conf += d.get("confidence", 0)

    return {
        "total": total,
        "critical": by_risk["CRITICAL"],
        "high": by_risk["HIGH"],
        "moderate": by_risk["MODERATE"],
        "low": by_risk["LOW"],
        "avg_confidence": round(total_conf / total, 2),
        "alerts_sent": sum(1 for d in detections_db if d.get("alert_sent")),
        "wwf_notified": sum(1 for d in detections_db if d.get("wwf_notified")),
    }


@app.get("/api/map-data")
async def get_map_data():
    """GeoJSON feature collection of all geolocated detections."""
    features = [
        {
            "type": "Feature",
            "properties": {
                "id": d["detection_id"],
                "species": d["species"],
                "confidence": d["confidence"],
                "risk": d["risk_level"],
            },
            "geometry": {
                "type": "Point",
                "coordinates": [d.get("longitude", 84.0), d.get("latitude", 27.7)]
            }
        }
        for d in detections_db if d.get("latitude") and d.get("longitude")
    ]
    return {"type": "FeatureCollection", "features": features}


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alert streaming."""
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "WildGuard live stream active"
        }))
        while True:
            await websocket.receive_text()  # Keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": detector.is_loaded(), "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
