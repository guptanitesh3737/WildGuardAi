# 🦁 WildGuard AI
### AI-Powered Wildlife Detection & Real-Time Alert System
> **eSewa × WWF Nepal Hackathon 2026 Submission** — Challenges 1 & 12

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00.svg)](https://ultralytics.com)

---

## 🎯 What is WildGuard AI?

WildGuard AI is a real-time wildlife detection and early warning system built for Nepal's protected areas. Upload a camera trap or field photo and get instant AI-powered species identification, threat classification, and multi-channel alerts to WWF rangers — all in under 3 seconds.

**Solves:** Challenge 1 (Wildlife Image Classification) + Challenge 12 (Wildlife Early Warning System)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-team/wildguard-ai.git
cd wildguard-ai
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 4. Environment Variables
```bash
# backend/.env
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
ALERT_PHONE=+977XXXXXXXXXX
SENDGRID_KEY=your_sendgrid_key
ALERT_EMAIL=rangers@wwfnepal.org
MODEL_PATH=models/yolov8_wildlife_nepal.pt
```

---

## 📁 Project Structure

```
wildguard-ai/
├── README.md
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── detection.py         # /detect endpoint
│   │   ├── alerts.py            # /alerts CRUD
│   │   └── analytics.py        # /stats, /map-data
│   ├── services/
│   │   ├── yolo_service.py      # YOLOv8 inference wrapper
│   │   ├── alert_service.py     # SMS + Email alert dispatch
│   │   └── risk_engine.py       # Risk classification logic
│   ├── models/
│   │   └── yolov8_wildlife_nepal.pt  # Fine-tuned model (download separately)
│   └── schemas/
│       └── detection.py         # Pydantic models
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadDetector.jsx
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── MapView.jsx
│   │   │   └── RiskBadge.jsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.js  # Live alert stream
│   │   └── api/
│   │       └── wildguard.js     # API client
│   └── public/
├── ml/
│   ├── train.py                 # Model training script
│   ├── evaluate.py              # mAP evaluation
│   ├── dataset/
│   │   └── data.yaml            # Dataset config
│   └── notebooks/
│       └── EDA.ipynb
├── docs/
│   ├── architecture.png
│   ├── api-reference.md
│   └── deployment.md
└── docker-compose.yml
```

---

## 🧠 AI Model Details

| Property | Value |
|----------|-------|
| Base Model | YOLOv8m (medium) |
| Fine-tuned on | 45,000+ Nepal wildlife images |
| Species | 8 endangered species |
| mAP@0.5 | 91.4% |
| Inference Speed | ~0.3s (GPU) / ~2.1s (CPU) |
| Input Size | 640×640 |
| Framework | PyTorch + Ultralytics |

**Detected Species:**
- 🐆 Snow Leopard (CRITICAL)
- 🐅 Bengal Tiger (CRITICAL)  
- 🦏 One-Horned Rhino (HIGH)
- 🦊 Red Panda (HIGH)
- 🐊 Gharial (HIGH)
- 🐺 Himalayan Wolf (MODERATE)
- 🦌 Musk Deer (MODERATE)
- 🐗 Wild Boar (LOW)

---

## 📡 API Reference

### POST `/api/detect`
Upload an image for AI detection.
```json
// Request: multipart/form-data with "image" field
// Response:
{
  "species": "Snow Leopard",
  "confidence": 94.2,
  "risk_level": "CRITICAL",
  "bbox": { "x1": 120, "y1": 85, "x2": 410, "y2": 340 },
  "processing_time_ms": 312,
  "alert_sent": true,
  "detection_id": "det_01HX..."
}
```

### GET `/api/alerts`
Fetch recent detections with filters.
```
GET /api/alerts?risk=CRITICAL&limit=20&since=2026-04-25
```

### GET `/api/stats`
Dashboard analytics summary.

### GET `/api/map-data`
GeoJSON of all detection points for map rendering.

### WebSocket `/ws/alerts`
Real-time alert stream for live dashboard.

---

## 🏗️ Architecture

```
[Camera Trap / Field Photo]
         │
         ▼
  [React Frontend]  ──── WebSocket ──── [Live Alert Feed]
         │
    POST /api/detect
         │
         ▼
  [FastAPI Backend]
    ├── Image validation & preprocessing
    ├── YOLOv8 Inference Engine
    ├── Risk Classification Engine
    ├── Alert Dispatcher
    │     ├── SMS (Twilio) → Rangers
    │     ├── Email (SendGrid) → WWF Nepal
    │     └── WebSocket broadcast → Dashboard
    └── MongoDB / PostgreSQL (Detection log)
```

---

## 🌍 Impact

- **Faster Response:** Alert delivery in <5 seconds vs. 24-48 hours manual reporting
- **Coverage:** Deployable across all 20 protected areas in Nepal
- **Cost:** ~$0.003 per detection using cloud GPU
- **eSewa Integration:** Reward payments to community reporters via eSewa API

---

## 👥 Team

Built for eSewa × WWF Nepal Hackathon 2026

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
