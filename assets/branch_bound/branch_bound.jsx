/* ============================================================
   BRANCH & BOUND / BRANCH & CUT — dual-pane visualiser (UI)
   Engine (solveLP, branchAndBound, gomoryCut, fmt, isInt, …) is
   loaded separately from engine.js and referenced as globals.
   Styling mirrors the simplex viz.
   ============================================================ */

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const PALETTE = ["#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
const CUT_COLOR = "#e879f9";

const STATUS = {
  open:               { fill: "#0f172a", stroke: "#475569", label: "Open" },
  active:             { fill: "#1e40af", stroke: "#93c5fd", label: "Active" },
  branched:           { fill: "#334155", stroke: "#64748b", label: "Branched" },
  incumbent:          { fill: "#b45309", stroke: "#fcd34d", label: "Incumbent" },
  integer:            { fill: "#0f766e", stroke: "#5eead4", label: "Integer (no improve)" },
  "pruned-bound":     { fill: "#7f1d1d", stroke: "#f87171", label: "Pruned (bound)" },
  "pruned-infeasible":{ fill: "#374151", stroke: "#9ca3af", label: "Pruned (infeasible)" },
  unbounded:          { fill: "#581c87", stroke: "#d8b4fe", label: "Unbounded" },
  "cut-exhausted":    { fill: "#6b21a8", stroke: "#d8b4fe", label: "Cut, fractional" },
};

/* ---------- geometry helpers ---------- */
function clipPoly(poly, a, b, rhs) {        // keep half-plane a*x + b*y <= rhs
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], nxt = poly[(i + 1) % poly.length];
    const cv = a * cur[0] + b * cur[1] - rhs;
    const nv = a * nxt[0] + b * nxt[1] - rhs;
    if (cv <= 1e-9) out.push(cur);
    if ((cv < -1e-9 && nv > 1e-9) || (cv > 1e-9 && nv < -1e-9)) {
      const t = cv / (cv - nv);
      out.push([cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])]);
    }
  }
  return out;
}
function regionFor(constraints, maxCoord) {
  let poly = [[0, 0], [maxCoord, 0], [maxCoord, maxCoord], [0, maxCoord]];
  for (const c of constraints) {
    let a = c.coeffs[0], b = c.coeffs[1], rhs = c.rhs;
    if ((c.op || "<=") === ">=") { a = -a; b = -b; rhs = -rhs; }
    poly = clipPoly(poly, a, b, rhs);
    if (poly.length === 0) return [];
  }
  return poly;
}
function nodeConstraints(base, node) {
  const cons = base.map(c => ({ coeffs: [c.coeffs[0], c.coeffs[1]], rhs: c.rhs, op: "<=" }));
  if (!node) return cons;
  for (const bc of node.branchConstraints)
    cons.push({ coeffs: bc.var === 0 ? [1, 0] : [0, 1], rhs: bc.bound, op: bc.op });
  for (const ct of node.cuts)
    cons.push({ coeffs: [ct.a1, ct.a2], rhs: ct.rhs, op: "<=" });
  return cons;
}
function satisfiesBase(base, x1, x2) {
  if (x1 < -1e-9 || x2 < -1e-9) return false;
  for (const c of base) if (c.coeffs[0] * x1 + c.coeffs[1] * x2 > c.rhs + 1e-9) return false;
  return true;
}

/* ============================================================
   GEOMETRY PANE
   ============================================================ */
function GeometryPane({ step, base, isMin, objCoeffs, maxCoord }) {
  const W = 360, H = 360, pad = 42;
  const plotW = W - pad - 16, plotH = H - pad - 24;
  const sx = x => pad + (x / maxCoord) * plotW;
  const sy = y => (H - pad) - (y / maxCoord) * plotH;
  const toSvg = ([x, y]) => [sx(x), sy(y)];

  const node = step.tree.find(n => n.id === step.nodeId) || null;
  const cons = nodeConstraints(base, node);
  const poly = regionFor(cons, maxCoord);
  const polyPts = poly.map(v => toSvg(v).join(",")).join(" ");
  const lp = node && node.lp && node.lp.status === "optimal" ? node.lp.x : null;
  const lpFrac = lp && (!isInt(lp[0]) || !isInt(lp[1]));
  const inc = step.incumbent;

  // integer lattice points (feasible ones highlighted)
  const lattice = [];
  for (let i = 0; i <= Math.floor(maxCoord); i++)
    for (let j = 0; j <= Math.floor(maxCoord); j++)
      lattice.push([i, j, satisfiesBase(base, i, j)]);

  const gridStep = maxCoord <= 8 ? 1 : maxCoord <= 20 ? 2 : 5;
  const grid = [];
  for (let v = 0; v <= maxCoord; v += gridStep) grid.push(v);

  // diamond marker
  const diamond = (cx, cy, r) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="bbReg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#2d5a27" stopOpacity="0.45" />
        </linearGradient>
        <filter id="bbGlow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {grid.map(v => (
        <g key={`g${v}`}>
          <line x1={sx(0)} y1={sy(v)} x2={sx(maxCoord)} y2={sy(v)} stroke="#1e293b" strokeWidth="0.5" />
          <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(maxCoord)} stroke="#1e293b" strokeWidth="0.5" />
          <text x={sx(0) - 6} y={sy(v) + 3.5} fill="#64748b" fontSize="10.5" textAnchor="end" fontFamily="monospace">{v}</text>
          <text x={sx(v)} y={sy(0) + 14} fill="#64748b" fontSize="10.5" textAnchor="middle" fontFamily="monospace">{v}</text>
        </g>
      ))}

      {/* axes */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(maxCoord)} y2={sy(0)} stroke="#475569" strokeWidth="1.5" />
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(maxCoord)} stroke="#475569" strokeWidth="1.5" />
      <text x={sx(maxCoord) + 4} y={sy(0) + 5} fill="#cbd5e1" fontSize="13" fontFamily="monospace">x₁</text>
      <text x={sx(0) - 13} y={sy(maxCoord)} fill="#cbd5e1" fontSize="13" fontFamily="monospace">x₂</text>

      {/* base constraint lines (faint) */}
      {base.map((c, i) => {
        const a = c.coeffs[0], b = c.coeffs[1], r = c.rhs;
        let p1, p2;
        if (Math.abs(b) > 1e-10 && Math.abs(a) > 1e-10) { p1 = [0, r / b]; p2 = [r / a, 0]; }
        else if (Math.abs(b) > 1e-10) { p1 = [0, r / b]; p2 = [maxCoord, r / b]; }
        else if (Math.abs(a) > 1e-10) { p1 = [r / a, 0]; p2 = [r / a, maxCoord]; }
        else return null;
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
        const A = toSvg([p1[0] - dx * 2, p1[1] - dy * 2]), B = toSvg([p2[0] + dx * 2, p2[1] + dy * 2]);
        return <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={PALETTE[i % PALETTE.length]} strokeWidth="1" strokeDasharray="4,3" opacity="0.45" />;
      })}

      {/* current node feasible region */}
      {poly.length > 2 && <polygon points={polyPts} fill="url(#bbReg)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.85" />}

      {/* cut lines for current node */}
      {node && node.cuts.map((ct, i) => {
        const a = ct.a1, b = ct.a2, r = ct.rhs;
        let p1, p2;
        if (Math.abs(b) > 1e-10 && Math.abs(a) > 1e-10) { p1 = [0, r / b]; p2 = [r / a, 0]; }
        else if (Math.abs(b) > 1e-10) { p1 = [0, r / b]; p2 = [maxCoord, r / b]; }
        else if (Math.abs(a) > 1e-10) { p1 = [r / a, 0]; p2 = [r / a, maxCoord]; }
        else return null;
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
        const A = toSvg([p1[0] - dx * 2, p1[1] - dy * 2]), B = toSvg([p2[0] + dx * 2, p2[1] + dy * 2]);
        return <line key={`cut${i}`} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={CUT_COLOR} strokeWidth="1.6" strokeDasharray="2,2" opacity="0.9" />;
      })}

      {/* integer lattice */}
      {lattice.map(([i, j, feas], k) => {
        const [px, py] = toSvg([i, j]);
        return <circle key={k} cx={px} cy={py} r={feas ? 2.6 : 1.4}
          fill={feas ? "#5eead4" : "#334155"} opacity={feas ? 0.95 : 0.6} />;
      })}

      {/* objective arrow */}
      {(() => {
        const c1 = objCoeffs[0], c2 = objCoeffs[1], mag = Math.hypot(c1, c2);
        if (mag < 1e-10) return null;
        const dir = isMin ? -1 : 1, scale = maxCoord * 0.16;
        const ox0 = maxCoord * 0.8, oy0 = maxCoord * 0.84;
        const [ox, oy] = toSvg([ox0, oy0]);
        const [tx, ty] = toSvg([ox0 + (c1 / mag) * scale * dir, oy0 + (c2 / mag) * scale * dir]);
        const ang = Math.atan2(ty - oy, tx - ox), hl = 7;
        return (
          <g>
            <line x1={ox} y1={oy} x2={tx} y2={ty} stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,2" />
            <polygon points={`${tx},${ty} ${tx - hl * Math.cos(ang - 0.35)},${ty - hl * Math.sin(ang - 0.35)} ${tx - hl * Math.cos(ang + 0.35)},${ty - hl * Math.sin(ang + 0.35)}`} fill="#86efac" />
            <text x={ox} y={oy + 14} fill="#86efac" fontSize="9.5" fontFamily="monospace" textAnchor="middle">{isMin ? "improve ↓" : "improve ↑"}</text>
          </g>
        );
      })()}

      {/* incumbent marker */}
      {inc && (() => {
        const [px, py] = toSvg(inc.x);
        return (
          <g>
            <circle cx={px} cy={py} r="8" fill="none" stroke="#fcd34d" strokeWidth="1.5" />
            <text x={px} y={py + 4} fill="#fcd34d" fontSize="12" textAnchor="middle" fontWeight="700">★</text>
          </g>
        );
      })()}

      {/* current LP optimum */}
      {lp && (() => {
        const [px, py] = toSvg(lp);
        return (
          <g filter="url(#bbGlow)">
            <polygon points={diamond(px, py, 6)}
              fill={lpFrac ? "none" : "#f59e0b"} stroke={lpFrac ? "#f8fafc" : "#fff"} strokeWidth="2" />
            <text x={px + 10} y={py - 8} fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="700">
              ({fmt(lp[0])}, {fmt(lp[1])})
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

/* ============================================================
   TREE PANE
   ============================================================ */
function TreePane({ step }) {
  const nodes = step.tree;
  const W = 360, H = 360, pad = 26, topPad = 46;   // extra top room for the root's z= label (incl. highlight ring)
  const childrenMap = {};
  nodes.forEach(n => { if (n.parentId !== null) (childrenMap[n.parentId] = childrenMap[n.parentId] || []).push(n.id); });

  // tidy x positions: leaves sequential, parents centred
  const xpos = {};
  let leaf = 0;
  const assign = id => {
    const kids = childrenMap[id] || [];
    if (kids.length === 0) { xpos[id] = leaf++; return xpos[id]; }
    const xs = kids.map(assign);
    xpos[id] = (Math.min(...xs) + Math.max(...xs)) / 2;
    return xpos[id];
  };
  if (nodes.length) assign(0);
  const xs = nodes.map(n => xpos[n.id]);
  const lo = xs.length ? Math.min(...xs) : 0;
  const hi = xs.length ? Math.max(...xs) : 0;
  const span = hi - lo;
  const maxD = Math.max(1, ...nodes.map(n => n.depth));

  // centre the layout: a lone node sits mid-top; otherwise fill the width
  const px = id => span < 1e-9 ? W / 2 : pad + ((xpos[id] - lo) / span) * (W - 2 * pad);
  const py = d => topPad + (d / maxD) * (H - topPad - pad);
  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });

  // adaptive sizing: shrink nodes/labels as the tree grows so big trees stay legible
  const hSpace = span < 1e-9 ? W : (W - 2 * pad) / Math.max(span, 1);
  const vSpace = (H - topPad - pad) / maxD;
  const r = Math.max(5, Math.min(14, Math.min(hSpace, vSpace) * 0.38));
  const fs = Math.max(9, r * 0.9);
  const dense = r < 9.5;          // hide per-node bound + edge labels when crowded

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      {/* edges */}
      {nodes.map(n => {
        if (n.parentId === null) return null;
        const p = byId[n.parentId];
        const x1 = px(p.id), y1 = py(p.depth), x2 = px(n.id), y2 = py(n.depth);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return (
          <g key={`e${n.id}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="1.2" />
            {!dense && <>
              <rect x={mx - 26} y={my - 8} width="52" height="16" rx="3" fill="#0c1222" opacity="0.85" />
              <text x={mx} y={my + 3.5} fill="#cbd5e1" fontSize="10" textAnchor="middle" fontFamily="monospace">{n.label}</text>
            </>}
          </g>
        );
      })}
      {/* nodes */}
      {nodes.map(n => {
        const s = STATUS[n.status] || STATUS.open;
        const x = px(n.id), y = py(n.depth);
        const cur = n.id === step.nodeId;
        const bound = n.lp && n.lp.status === "optimal" ? fmt(n.lp.z)
          : n.lp && n.lp.status === "infeasible" ? "∅" : "—";
        const showZ = !dense || cur;
        return (
          <g key={n.id}>
            {cur && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="#fff" strokeWidth="2" opacity="0.9" />}
            <circle cx={x} cy={y} r={r} fill={s.fill} stroke={s.stroke} strokeWidth="1.6" />
            <text x={x} y={y + fs * 0.35} fill="#f8fafc" fontSize={fs} textAnchor="middle" fontWeight="700" fontFamily="monospace">{n.id}</text>
            {showZ && <text x={x} y={y - (cur ? r + 6 : r) - 6} fill="#cbd5e1" fontSize={Math.max(9, fs * 0.9)} textAnchor="middle" fontFamily="monospace">z={bound}</text>}
            {n.isIncumbent && <text x={x + r} y={y - r + 4} fill="#fcd34d" fontSize={fs + 2} fontWeight="700">★</text>}
            {n.status === "pruned-bound" && <text x={x} y={y + r + 13} fill="#f87171" fontSize="11" textAnchor="middle">✂</text>}
            {n.status === "pruned-infeasible" && <text x={x} y={y + r + 13} fill="#9ca3af" fontSize="11" textAnchor="middle">✗</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   STATUS STRIP
   ============================================================ */
function StatusStrip({ step }) {
  const inc = step.incumbent;
  const gb = step.globalBound;
  let gap = "—";
  if (inc && gb != null && Math.abs(inc.z) > 1e-9) gap = `${(Math.abs(gb - inc.z) / Math.abs(inc.z) * 100).toFixed(1)}%`;
  else if (inc && gb != null) gap = `${Math.abs(gb - inc.z).toFixed(2)}`;
  const cell = (label, val, col) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: col, fontFamily: "monospace" }}>{val}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 8, background: "#0c1222", borderRadius: 10, border: "1px solid #1e293b", padding: "8px 10px" }}>
      {cell("Incumbent", inc ? fmt(inc.z) : "none", inc ? "#fcd34d" : "#64748b")}
      {cell("Global bound", gb != null ? fmt(gb) : "—", "#60a5fa")}
      {cell("Gap", gap, "#86efac")}
    </div>
  );
}

/* ============================================================
   INPUT FORM
   ============================================================ */
const inputStyle = {
  width: 52, padding: "6px", background: "#0f172a", border: "1px solid #334155",
  borderRadius: 6, color: "#e2e8f0", fontSize: 14, fontFamily: "monospace", textAlign: "center", outline: "none",
};
function NumInput({ value, onChange }) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setRaw(String(value)); }, [value, focused]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <input type="text" inputMode="decimal" value={focused ? raw : String(value)}
        onFocus={() => setFocused(true)}
        onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s); if (!isNaN(n)) onChange(n); }}
        onBlur={() => { setFocused(false); const n = parseFloat(raw); if (isNaN(n)) { setRaw("0"); onChange(0); } else { setRaw(String(n)); onChange(n); } }}
        style={inputStyle} />
      <button onClick={() => onChange(-value)} style={{ background: "none", border: "1px solid #334155", borderRadius: 4, color: "#94a3b8", cursor: "pointer", padding: "2px 5px", fontSize: 11, fontFamily: "monospace", lineHeight: 1 }}>±</button>
    </div>
  );
}

const ALGOS = [
  { id: "bb", name: "Branch & Bound", sub: "branch only" },
  { id: "bc", name: "Branch & Cut", sub: "cut + branch" },
  { id: "cp", name: "Cutting Planes", sub: "cut only" },
];

function ProblemInput({ objCoeffs, setObjCoeffs, constraints, setConstraints, isMin, setIsMin, algo, setAlgo, preset, applyPreset, onEdit, onSolve, error }) {
  const updObj = (i, v) => { onEdit(); const o = [...objCoeffs]; o[i] = v; setObjCoeffs(o); };
  const updC = (ci, f, v) => { onEdit(); setConstraints(constraints.map((c, i) => i === ci ? { ...c, coeffs: f === "rhs" ? c.coeffs : c.coeffs.map((x, j) => j === f ? v : x), rhs: f === "rhs" ? v : c.rhs } : c)); };
  const activePreset = PRESETS.find(p => p.id === preset);
  return (
    <div style={{ background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b", padding: "22px 26px", maxWidth: 560, margin: "0 auto" }}>
      {/* example presets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Example</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)} style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 600,
              border: `1px solid ${preset === p.id ? "#60a5fa" : "#334155"}`,
              background: preset === p.id ? "#1e3a5f" : "#0f172a", color: preset === p.id ? "#dbeafe" : "#94a3b8",
            }}>{p.name}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.5, fontFamily: "monospace", minHeight: 28 }}>
          {activePreset ? activePreset.blurb : "Custom problem — edit the objective and constraints below."}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14 }}>
        Define an integer program (2D, ≤ 5 constraints)
      </div>

      {/* max/min */}
      <div style={{ marginBottom: 14, display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #334155", width: "fit-content" }}>
        <button onClick={() => setIsMin(false)} style={{ padding: "8px 18px", fontSize: 13, fontFamily: "monospace", fontWeight: 600, cursor: "pointer", background: !isMin ? "#1e40af" : "#0f172a", color: !isMin ? "#fff" : "#64748b", border: "none" }}>Maximize</button>
        <button onClick={() => setIsMin(true)} style={{ padding: "8px 18px", fontSize: 13, fontFamily: "monospace", fontWeight: 600, cursor: "pointer", background: isMin ? "#b45309" : "#0f172a", color: isMin ? "#fff" : "#64748b", border: "none", borderLeft: "1px solid #334155" }}>Minimize</button>
      </div>

      {/* algo */}
      <div style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ALGOS.map(a => (
          <button key={a.id} onClick={() => setAlgo(a.id)} style={{
            padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "monospace",
            border: `1px solid ${algo === a.id ? "#60a5fa" : "#334155"}`,
            background: algo === a.id ? "#1e3a5f" : "#0f172a", color: algo === a.id ? "#dbeafe" : "#94a3b8",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>{a.sub}</div>
          </button>
        ))}
      </div>

      {/* objective */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontFamily: "monospace" }}>{isMin ? "Minimize:" : "Maximize:"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <NumInput value={objCoeffs[0]} onChange={v => updObj(0, v)} />
          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>x₁ +</span>
          <NumInput value={objCoeffs[1]} onChange={v => updObj(1, v)} />
          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>x₂</span>
        </div>
      </div>

      {/* constraints */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontFamily: "monospace" }}>Subject to:</div>
        {constraints.map((c, ci) => (
          <div key={ci} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: PALETTE[ci % PALETTE.length] }} />
            <NumInput value={c.coeffs[0]} onChange={v => updC(ci, 0, v)} />
            <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>x₁ +</span>
            <NumInput value={c.coeffs[1]} onChange={v => updC(ci, 1, v)} />
            <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>x₂ ≤</span>
            <NumInput value={c.rhs} onChange={v => updC(ci, "rhs", v)} />
            {constraints.length > 1 && <button onClick={() => { onEdit(); setConstraints(constraints.filter((_, i) => i !== ci)); }} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#64748b", cursor: "pointer", padding: "4px 8px" }}>✕</button>}
          </div>
        ))}
        {constraints.length < 5 && <button onClick={() => { onEdit(); setConstraints([...constraints, { coeffs: [1, 1], rhs: 5 }]); }} style={{ background: "none", border: "1px dashed #334155", borderRadius: 6, color: "#64748b", cursor: "pointer", padding: "6px 14px", fontSize: 12, fontFamily: "monospace" }}>+ Add Constraint</button>}
      </div>

      <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", marginBottom: 12 }}>x₁, x₂ ≥ 0 and integer · RHS must be ≥ 0</div>

      {error && <div style={{ color: "#f87171", fontSize: 12, fontFamily: "monospace", marginBottom: 10, padding: "8px 12px", background: "#1c1017", borderRadius: 6, border: "1px solid #7f1d1d" }}>{error}</div>}

      <button onClick={onSolve} style={{ background: isMin ? "#b45309" : "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "monospace", width: "100%" }}>Solve &amp; Animate →</button>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const algoOpts = { bb: { maxCutRounds: 0 }, bc: { maxCutRounds: 2, allowBranch: true }, cp: { maxCutRounds: 40, allowBranch: false } };

const PRESETS = [
  { id: "textbook", name: "Textbook", blurb: "A gentle baseline — every method does a little work (B&B 5 nodes · B&C 3 · cuts-only 5). The integer optimum (2,2) sits in the interior of the polyhedron, not on a vertex.",
    obj: [3, 2], constraints: [{ coeffs: [3, 4], rhs: 16 }, { coeffs: [4, 1], rhs: 12 }] },
  { id: "tight", name: "Tight relaxation", blurb: "The LP optimum is already integral, so branch & bound finishes at the root and no cuts are needed.",
    obj: [3, 2], constraints: [{ coeffs: [1, 0], rhs: 3 }, { coeffs: [0, 1], rhs: 4 }] },
  { id: "cutswin", name: "Cuts win", blurb: "A near-45° wedge: branch & bound thrashes through ~25 nodes chasing tiny fractions, but two cutting planes carve straight to the optimum.",
    obj: [1, 1], constraints: [{ coeffs: [7, 8], rhs: 56 }, { coeffs: [8, 7], rhs: 56 }] },
  { id: "cutsstall", name: "Cuts stall", blurb: "Gomory cuts 'tail off,' adding dozens of ever-smaller slices, while branch & bound finishes in 3 nodes. Branch & cut blends both.",
    obj: [2, 3], constraints: [{ coeffs: [7, 4], rhs: 25 }, { coeffs: [2, 7], rhs: 23 }] },
];

function BranchBoundApp() {
  const [objCoeffs, setObjCoeffs] = useState([3, 2]);
  const [constraints, setConstraints] = useState([{ coeffs: [3, 4], rhs: 16 }, { coeffs: [4, 1], rhs: 12 }]);
  const [isMin, setIsMin] = useState(false);
  const [algo, setAlgo] = useState("bb");
  const [preset, setPreset] = useState("textbook");
  const applyPreset = (p) => {
    setPreset(p.id); setIsMin(false);
    setObjCoeffs([...p.obj]);
    setConstraints(p.constraints.map(c => ({ coeffs: [...c.coeffs], rhs: c.rhs })));
  };
  const [mode, setMode] = useState("input");
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [fs, setFs] = useState(false);

  const [fBase, setFBase] = useState(constraints);
  const [fObj, setFObj] = useState(objCoeffs);
  const [fMin, setFMin] = useState(false);

  const maxCoord = useMemo(() => {
    // size the axes to the actual feasible region, not the (often far larger) axis intercepts
    const poly = regionFor(fBase.map(c => ({ coeffs: c.coeffs, rhs: c.rhs, op: "<=" })), 1e6);
    let ext = 0, unbounded = false;
    for (const [x, y] of poly) { ext = Math.max(ext, x, y); if (x > 1e5 || y > 1e5) unbounded = true; }
    if (!unbounded && ext > 0) return Math.max(Math.ceil(ext) + 1, 5);
    // fallback for unbounded / degenerate regions: largest intercept
    let mx = 0;
    for (const c of fBase) {
      if (c.coeffs[0] > 0) mx = Math.max(mx, c.rhs / c.coeffs[0]);
      if (c.coeffs[1] > 0) mx = Math.max(mx, c.rhs / c.coeffs[1]);
    }
    return Math.max(Math.ceil(mx) + 1, 6);
  }, [fBase]);

  const solve = (algoId, base, obj, min) => {
    const res = branchAndBound(obj, base, min, algoOpts[algoId]);
    setResult(res); setStep(0); setIsPlaying(false);
  };

  const handleSolve = () => {
    for (const c of constraints) {
      if (c.rhs < 0) { setError("All RHS values must be ≥ 0 (keeps the origin feasible)."); return; }
      if (c.coeffs[0] === 0 && c.coeffs[1] === 0) { setError("A constraint has all-zero coefficients."); return; }
    }
    if (objCoeffs[0] === 0 && objCoeffs[1] === 0) { setError("Objective is zero."); return; }
    setError(null);
    const base = constraints.map(c => ({ coeffs: [...c.coeffs], rhs: c.rhs }));
    setFBase(base); setFObj([...objCoeffs]); setFMin(isMin);
    solve(algo, base, objCoeffs, isMin);
    setMode("solve");
  };

  const switchAlgo = (id) => { setAlgo(id); solve(id, fBase, fObj, fMin); };

  useEffect(() => {
    if (!isPlaying || !result) return;
    if (step >= result.steps.length - 1) { setIsPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), 1700);
    return () => clearTimeout(t);
  }, [isPlaying, step, result]);

  const prev = useCallback(() => { setIsPlaying(false); setStep(s => Math.max(0, s - 1)); }, []);
  const next = useCallback(() => { setIsPlaying(false); setStep(s => result ? Math.min(result.steps.length - 1, s + 1) : s); }, [result]);

  if (mode === "input") {
    return (
      <div style={{ background: "#080e1a", color: "#e2e8f0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: "32px 20px", borderRadius: 12, width: "100%", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.5 }}>BRANCH &amp; BOUND / CUT</h1>
            <p style={{ color: "#64748b", fontSize: 12, margin: "6px 0 0", fontFamily: "monospace" }}>Integer programming, visualised</p>
          </div>
          <ProblemInput {...{ objCoeffs, setObjCoeffs, constraints, setConstraints, isMin, setIsMin, algo, setAlgo, preset, applyPreset, onEdit: () => setPreset(null), onSolve: handleSolve, error }} />
        </div>
      </div>
    );
  }

  const cur = result.steps[step];
  const total = result.steps.length;
  const nNodes = cur.tree.length;
  const nCuts = cur.tree.reduce((s, n) => s + n.cuts.length, 0);

  const wrap = fs
    ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, overflow: "auto" }
    : { borderRadius: 12, width: "100%" };

  return (
    <div style={{ background: "#080e1a", color: "#e2e8f0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: "16px 12px", boxSizing: "border-box", ...wrap }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: 0, fontFamily: "monospace" }}>
              BRANCH &amp; BOUND / CUT
              <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: fMin ? "#b45309" : "#1e40af", color: "#fff" }}>{fMin ? "MIN" : "MAX"}</span>
            </h1>
            <p style={{ color: "#64748b", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace" }}>
              {fMin ? "min" : "max"} {fmt(fObj[0])}x₁ + {fmt(fObj[1])}x₂ · {nNodes} nodes · {nCuts} cuts
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ALGOS.map(a => (
              <button key={a.id} onClick={() => switchAlgo(a.id)} style={{ ...btnS, padding: "6px 10px", background: algo === a.id ? "#1e3a5f" : "#1e293b", border: `1px solid ${algo === a.id ? "#60a5fa" : "#334155"}`, color: algo === a.id ? "#dbeafe" : "#94a3b8" }}>{a.name}</button>
            ))}
            <button onClick={() => setFs(f => !f)} style={btnS}>{fs ? "Exit" : "Fullscreen"}</button>
            <button onClick={() => { setMode("input"); setIsPlaying(false); }} style={btnS}>← Edit</button>
          </div>
        </div>

        {/* panes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
          <Pane title="Search tree"><TreePane step={cur} /></Pane>
          <Pane title={`Geometry — node ${cur.nodeId ?? "—"}`}><GeometryPane step={cur} base={fBase} isMin={fMin} objCoeffs={fObj} maxCoord={maxCoord} /></Pane>
        </div>

        {/* status + step info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12, marginBottom: 10 }}>
          <StatusStrip step={cur} />
          <div style={{ background: "#0c1222", borderRadius: 10, border: "1px solid #1e293b", padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ background: phaseColor(cur.phase), color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{cur.phase}</span>
              <span style={{ color: "#64748b", fontSize: 10, fontFamily: "monospace" }}>Step {step + 1} / {total}</span>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 3px", color: "#f8fafc" }}>{cur.title}</h2>
            <p style={{ fontSize: 11.5, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{cur.desc}</p>
          </div>
        </div>

        {/* legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, justifyContent: "center" }}>
          {["active", "incumbent", "pruned-bound", "pruned-infeasible", "branched"].map(k => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: 9, background: STATUS[k].fill, border: `1px solid ${STATUS[k].stroke}` }} />
              <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{STATUS[k].label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 0, borderTop: `2px dashed ${CUT_COLOR}` }} /><span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>cut</span>
          </div>
        </div>

        {/* controls */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setIsPlaying(false); setStep(0); }} style={btnS}>⏮</button>
          <button onClick={prev} style={btnS} disabled={step === 0}>◀ Prev</button>
          <button onClick={() => setIsPlaying(p => !p)} style={{ ...btnS, background: isPlaying ? "#b91c1c" : "#1e40af", minWidth: 72 }}>{isPlaying ? "⏸" : "▶ Play"}</button>
          <button onClick={next} style={btnS} disabled={step === total - 1}>Next ▶</button>
          <button onClick={() => { setIsPlaying(false); setStep(total - 1); }} style={btnS}>⏭</button>
        </div>
        <div style={{ marginTop: 8, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(step / Math.max(total - 1, 1)) * 100}%`, background: cur.phase === "terminate" ? "#f59e0b" : "#3b82f6", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>
    </div>
  );
}

function Pane({ title, children }) {
  return (
    <div style={{ background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b", padding: 8 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", margin: "2px 4px 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      <div style={{ width: "100%", aspectRatio: "1 / 1" }}>{children}</div>
    </div>
  );
}

function phaseColor(p) {
  return ({ solve: "#1e40af", select: "#334155", branch: "#166534", cut: "#a21caf", incumbent: "#b45309", prune: "#b91c1c", integer: "#0f766e", terminate: "#b45309", stall: "#6b21a8" })[p] || "#334155";
}

const btnS = { background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" };

ReactDOM.createRoot(document.getElementById("branch-bound-app")).render(<BranchBoundApp />);
