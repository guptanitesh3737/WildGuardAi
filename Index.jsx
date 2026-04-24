import { useState, useRef, useEffect, useCallback } from "react";

const SPECIES_DB = {
  "Snow Leopard": { risk: "CRITICAL", color: "#FF2D2D", bg: "#FF2D2D20", icon: "🐆", habitat: "High Himalaya", population: "~450 in Nepal", wwf: true },
  "Bengal Tiger": { risk: "CRITICAL", color: "#FF2D2D", bg: "#FF2D2D20", icon: "🐅", habitat: "Terai Forest", population: "~235 in Nepal", wwf: true },
  "One-Horned Rhino": { risk: "HIGH", color: "#FF8C00", bg: "#FF8C0020", icon: "🦏", habitat: "Chitwan NP", population: "~752 in Nepal", wwf: true },
  "Red Panda": { risk: "HIGH", color: "#FF8C00", bg: "#FF8C0020", icon: "🦊", habitat: "Eastern Hills", population: "~1000 estimated", wwf: true },
  "Gharial": { risk: "HIGH", color: "#FF8C00", bg: "#FF8C0020", icon: "🐊", habitat: "Narayani River", population: "~200 globally", wwf: true },
  "Himalayan Wolf": { risk: "MODERATE", color: "#F5C518", bg: "#F5C51820", icon: "🐺", habitat: "Upper Mustang", population: "~350 estimated", wwf: false },
  "Musk Deer": { risk: "MODERATE", color: "#F5C518", bg: "#F5C51820", icon: "🦌", habitat: "Annapurna Buffer", population: "Declining", wwf: false },
  "Wild Boar": { risk: "LOW", color: "#22C55E", bg: "#22C55E20", icon: "🐗", habitat: "Forest Buffer Zones", population: "Stable", wwf: false },
};

const MOCK_DETECTIONS = [
  { id: 1, species: "Snow Leopard", confidence: 94.2, lat: 28.3949, lng: 84.1240, location: "Annapurna Conservation Area", time: "14:32", date: "2026-04-25", bbox: { x: 18, y: 22, w: 45, h: 38 } },
  { id: 2, species: "Bengal Tiger", confidence: 89.7, lat: 27.5291, lng: 84.3542, location: "Chitwan National Park", time: "09:15", date: "2026-04-25", bbox: { x: 10, y: 30, w: 60, h: 50 } },
  { id: 3, species: "One-Horned Rhino", confidence: 97.1, lat: 27.5000, lng: 84.5000, location: "Chitwan Buffer Zone", time: "07:44", date: "2026-04-25", bbox: { x: 5, y: 15, w: 75, h: 60 } },
  { id: 4, species: "Red Panda", confidence: 82.4, lat: 27.8000, lng: 87.9000, location: "Kanchenjunga CA", time: "16:01", date: "2026-04-24", bbox: { x: 30, y: 10, w: 40, h: 35 } },
  { id: 5, species: "Wild Boar", confidence: 91.3, lat: 27.6833, lng: 85.3167, location: "Shivapuri NP Boundary", time: "22:17", date: "2026-04-24", bbox: { x: 20, y: 40, w: 55, h: 42 } },
];

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

const formatTime = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

// ─── Simulated AI Detection Engine ───────────────────────────────────────────
async function simulateAIDetection(imageFile) {
  await new Promise(r => setTimeout(r, 2200));
  const speciesKeys = Object.keys(SPECIES_DB);
  const detected = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];
  const confidence = (75 + Math.random() * 24).toFixed(1);
  const bbox = {
    x: Math.floor(5 + Math.random() * 25),
    y: Math.floor(5 + Math.random() * 20),
    w: Math.floor(40 + Math.random() * 35),
    h: Math.floor(35 + Math.random() * 30),
  };
  return { species: detected, confidence: parseFloat(confidence), bbox, processingTime: (1.8 + Math.random() * 0.8).toFixed(2) };
}

// ─── Components ───────────────────────────────────────────────────────────────

function RiskBadge({ risk }) {
  const colors = { CRITICAL: "#FF2D2D", HIGH: "#FF8C00", MODERATE: "#F5C518", LOW: "#22C55E" };
  return (
    <span style={{
      background: colors[risk] + "22", color: colors[risk], border: `1px solid ${colors[risk]}55`,
      padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
      letterSpacing: "1.5px", fontFamily: "monospace"
    }}>
      {risk}
    </span>
  );
}

function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%", background: color,
        animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite", opacity: 0.7
      }} />
      <span style={{ position: "absolute", inset: "2px", borderRadius: "50%", background: color }} />
    </span>
  );
}

function StatCard({ icon, label, value, sub, color = "#00D4AA" }) {
  return (
    <div style={{
      background: "#0D1B2A", border: "1px solid #1E3A4A", borderRadius: 16, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'Bebas Neue', cursive", letterSpacing: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8899AA", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#556677", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AlertToast({ alert, onDismiss }) {
  const info = SPECIES_DB[alert.species];
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999, width: 340,
      background: "#0A1628", border: `1.5px solid ${info.color}`, borderRadius: 16,
      padding: "16px 20px", boxShadow: `0 0 40px ${info.color}44`,
      animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <PulsingDot color={info.color} />
          <span style={{ color: info.color, fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>WILDLIFE ALERT</span>
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#556677", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 36 }}>{info.icon}</span>
        <div>
          <div style={{ fontWeight: 800, color: "#E8F4FF", fontSize: 16 }}>{alert.species}</div>
          <div style={{ fontSize: 11, color: "#8899AA" }}>{alert.location} • {alert.confidence}% confidence</div>
          <RiskBadge risk={info.risk} />
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: "#556677", display: "flex", gap: 16 }}>
        <span>🌍 {info.habitat}</span>
        <span>👥 {info.population}</span>
      </div>
      {info.wwf && (
        <div style={{ marginTop: 8, background: "#00D4AA11", border: "1px solid #00D4AA33", borderRadius: 8, padding: "6px 10px", fontSize: 10, color: "#00D4AA" }}>
          ⚡ WWF Emergency Protocol Triggered — Rangers Notified
        </div>
      )}
    </div>
  );
}

function UploadZone({ onDetect }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const detect = async () => {
    if (!file) return;
    setDetecting(true);
    const res = await simulateAIDetection(file);
    setResult(res);
    setDetecting(false);
    onDetect({ ...res, location: "Uploaded Image", time: formatTime(), lat: 27.7 + Math.random(), lng: 84.4 + Math.random() });
  };

  const info = result ? SPECIES_DB[result.species] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !preview && inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#00D4AA" : preview ? "#1E3A4A" : "#2A4A5A"}`,
          borderRadius: 16, minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: preview ? "default" : "pointer", transition: "all 0.3s", position: "relative",
          background: dragging ? "#00D4AA08" : "#0D1B2A", overflow: "hidden"
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        {preview ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <img src={preview} alt="Upload" style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 14 }} />
            {result && (
              <div style={{
                position: "absolute",
                left: `${result.bbox.x}%`, top: `${result.bbox.y}%`,
                width: `${result.bbox.w}%`, height: `${result.bbox.h}%`,
                border: `2px solid ${info.color}`,
                boxShadow: `0 0 12px ${info.color}88`,
                borderRadius: 4
              }}>
                <div style={{
                  position: "absolute", top: -22, left: 0,
                  background: info.color, color: "#000", fontSize: 9, fontWeight: 800,
                  padding: "2px 6px", borderRadius: "4px 4px 4px 0", whiteSpace: "nowrap"
                }}>
                  {result.species} {result.confidence}%
                </div>
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); }}
              style={{
                position: "absolute", top: 8, right: 8, background: "#0A1628CC", border: "1px solid #2A4A5A",
                color: "#8899AA", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11
              }}
            >✕ Clear</button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <div style={{ color: "#E8F4FF", fontWeight: 700, fontSize: 15 }}>Drop wildlife image here</div>
            <div style={{ color: "#556677", fontSize: 12, marginTop: 6 }}>Supports JPG, PNG, WebP — up to 20MB</div>
            <div style={{ marginTop: 16, background: "#00D4AA15", border: "1px solid #00D4AA44", borderRadius: 8, padding: "6px 16px", display: "inline-block", color: "#00D4AA", fontSize: 11 }}>
              or click to browse
            </div>
          </div>
        )}
      </div>

      {preview && !result && (
        <button
          onClick={detect}
          disabled={detecting}
          style={{
            background: detecting ? "#1E3A4A" : "linear-gradient(135deg, #00D4AA, #0099CC)",
            border: "none", borderRadius: 12, padding: "14px", cursor: detecting ? "not-allowed" : "pointer",
            color: detecting ? "#556677" : "#000", fontWeight: 800, fontSize: 14, letterSpacing: 1,
            transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}
        >
          {detecting ? (
            <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span> Analyzing with YOLOv8...</>
          ) : "🔍 Run AI Detection"}
        </button>
      )}

      {result && info && (
        <div style={{
          background: info.bg, border: `1px solid ${info.color}55`, borderRadius: 16, padding: 20
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 28 }}>{info.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: "#E8F4FF", fontSize: 17 }}>{result.species}</div>
                <RiskBadge risk={info.risk} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: info.color, fontWeight: 900, fontSize: 24, fontFamily: "'Bebas Neue', cursive" }}>{result.confidence}%</div>
              <div style={{ fontSize: 10, color: "#8899AA" }}>Confidence</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
            <div style={{ background: "#0A162888", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ color: "#556677" }}>HABITAT</div>
              <div style={{ color: "#E8F4FF", fontWeight: 600 }}>{info.habitat}</div>
            </div>
            <div style={{ background: "#0A162888", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ color: "#556677" }}>POPULATION</div>
              <div style={{ color: "#E8F4FF", fontWeight: 600 }}>{info.population}</div>
            </div>
            <div style={{ background: "#0A162888", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ color: "#556677" }}>PROCESS TIME</div>
              <div style={{ color: "#E8F4FF", fontWeight: 600 }}>{result.processingTime}s</div>
            </div>
            <div style={{ background: "#0A162888", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ color: "#556677" }}>MODEL</div>
              <div style={{ color: "#E8F4FF", fontWeight: 600 }}>YOLOv8-Wildlife</div>
            </div>
          </div>
          {info.wwf && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", color: "#00D4AA", fontSize: 11 }}>
              <PulsingDot color="#00D4AA" />
              WWF Nepal emergency rangers have been notified via SMS + Email
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetectionFeed({ detections }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {detections.slice(0, 8).map((d, i) => {
        const info = SPECIES_DB[d.species] || SPECIES_DB["Wild Boar"];
        return (
          <div key={d.id || i} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#0D1B2A", border: "1px solid #1E3A4A", borderRadius: 12, padding: "10px 14px",
            animation: i === 0 ? "fadeSlideIn 0.5s ease" : "none",
            transition: "all 0.3s"
          }}>
            <span style={{ fontSize: 22 }}>{info.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "#E8F4FF", fontSize: 13 }}>{d.species}</span>
                <RiskBadge risk={info.risk} />
              </div>
              <div style={{ fontSize: 10, color: "#556677", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📍 {d.location} • {d.time}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ color: info.color, fontWeight: 800, fontSize: 14 }}>{d.confidence}%</div>
              <div style={{ fontSize: 9, color: "#556677" }}>CONF.</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniMap({ detections }) {
  // SVG-based Nepal map approximation with plot points
  const points = detections.map(d => ({
    x: ((d.lng - 80) / (88.2 - 80)) * 100,
    y: 100 - ((d.lat - 26.3) / (30.4 - 26.3)) * 100,
    species: d.species,
    risk: (SPECIES_DB[d.species] || SPECIES_DB["Wild Boar"]).risk,
    icon: (SPECIES_DB[d.species] || SPECIES_DB["Wild Boar"]).icon,
    color: (SPECIES_DB[d.species] || SPECIES_DB["Wild Boar"]).color,
  }));

  const riskColors = { CRITICAL: "#FF2D2D", HIGH: "#FF8C00", MODERATE: "#F5C518", LOW: "#22C55E" };

  return (
    <div style={{ position: "relative", background: "#0A1F0F", borderRadius: 16, overflow: "hidden", height: 240 }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.15, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300D4AA' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div style={{ position: "absolute", top: 12, left: 14, fontSize: 10, color: "#00D4AA88", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Nepal Wildlife Map</div>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} preserveAspectRatio="none">
        {/* Nepal rough outline */}
        <path d="M5,50 Q15,35 30,30 Q50,25 70,32 Q85,38 95,45 L95,70 Q80,75 60,72 Q40,70 20,68 Q10,66 5,60 Z"
          fill="#0D2B1A" stroke="#1E4A2A" strokeWidth="0.5" />
        {/* Grid lines */}
        {[20,40,60,80].map(x => <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#1E3A2A" strokeWidth="0.3" />)}
        {[25,50,75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1E3A2A" strokeWidth="0.3" />)}
        {/* Detection points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={p.color} opacity="0.3">
              <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={p.x} cy={p.y} r="2.5" fill={p.color} />
            <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize="4" fill="#E8F4FF">{p.icon}</text>
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ position: "absolute", bottom: 10, right: 12, display: "flex", flexDirection: "column", gap: 3 }}>
        {Object.entries(riskColors).map(([risk, color]) => (
          <div key={risk} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8, color: "#8899AA" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
            {risk}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskDonut({ detections }) {
  const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
  detections.forEach(d => {
    const info = SPECIES_DB[d.species];
    if (info) counts[info.risk]++;
  });
  const total = detections.length || 1;
  const colors = { CRITICAL: "#FF2D2D", HIGH: "#FF8C00", MODERATE: "#F5C518", LOW: "#22C55E" };
  let offset = 0;
  const slices = Object.entries(counts).map(([risk, count]) => {
    const pct = count / total;
    const slice = { risk, count, pct, offset, color: colors[risk] };
    offset += pct;
    return slice;
  });

  const r = 30, cx = 40, cy = 40, circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E3A4A" strokeWidth="12" />
        {slices.filter(s => s.pct > 0).map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="12"
            strokeDasharray={`${s.pct * circ} ${circ}`}
            strokeDashoffset={-s.offset * circ}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        ))}
        <text x={cx} y={cy + 2} textAnchor="middle" fill="#E8F4FF" fontSize="14" fontWeight="900">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#556677" fontSize="5">TOTAL</text>
      </svg>
      <
