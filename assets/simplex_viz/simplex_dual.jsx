const { useState, useEffect, useCallback, useMemo } = React;

/* ============================================================
SIMPLEX SOLVER — generates animation steps
============================================================ */

const SUBS = ["₁","₂","₃","₄","₅","₆","₇"];

function varName(idx, m) {
if (idx < 2) return `x${SUBS[idx]}`;
return `s${SUBS[idx - 2]}`;
}

function cloneTab(tab) { return tab.map(r => [...r]); }

function getVertex(basic, tableau, m) {
let x1 = 0, x2 = 0;
for (let i = 0; i < m; i++) {
if (basic[i] === 0) x1 = tableau[i][2 + m];
if (basic[i] === 1) x2 = tableau[i][2 + m];
}
return [x1, x2];
}

function getDualValues(obj, m) {
// Shadow prices = obj row entries under slack columns
const vals = [];
for (let j = 2; j < 2 + m; j++) vals.push(obj[j]);
return vals;
}

function solveSimplex(objIn, constrsIn, isMin) {
const m = constrsIn.length;
const n = 2 + m;
const steps = [];

// For min, negate objective internally
const effObj = isMin ? [-objIn[0], -objIn[1]] : [objIn[0], objIn[1]];

let tab = [];
let basic = [];
for (let i = 0; i < m; i++) {
let row = [constrsIn[i].coeffs[0], constrsIn[i].coeffs[1]];
for (let j = 0; j < m; j++) row.push(i === j ? 1 : 0);
row.push(constrsIn[i].rhs);
tab.push(row);
basic.push(2 + i);
}
let obj = [-effObj[0], -effObj[1]];
for (let j = 0; j < m; j++) obj.push(0);
obj.push(0);

const colNames = [];
for (let i = 0; i < n; i++) colNames.push(varName(i, m));
colNames.push("RHS");

// For display: the actual objective value shown to user
const displayObj = (rawVal) => isMin ? -rawVal : rawVal;

const snap = () => ({
rows: cloneTab(tab),
obj: [...obj],
basic: basic.map(b => varName(b, m)),
basicIdx: [...basic],
});

const vertex = () => getVertex(basic, tab, m);

const allPaths = [vertex()];
steps.push({
phase: "init",
title: "Initial Setup",
desc: `Start at the origin. All slack variables are basic: ${basic.map(b => varName(b,m)).join(", ")}. Non-basic variables x₁ = x₂ = 0.${isMin ? " (Internally converted to maximization by negating the objective.)" : ""}`,
vertex: vertex(),
path: [...allPaths],
tableau: snap(),
highlight: null,
objValue: displayObj(obj[n]),
dualValues: getDualValues(obj, m),
});

let iteration = 0;
const MAX_ITER = 20;

while (iteration < MAX_ITER) {
let enterCol = -1;
let minVal = -1e-9;
for (let j = 0; j < n; j++) {
if (obj[j] < minVal) { minVal = obj[j]; enterCol = j; }
}
if (enterCol === -1) break;

```
const enterName = varName(enterCol, m);

steps.push({
  phase: "enter",
  title: `Choose Entering Variable`,
  desc: `${enterName} has the most negative coefficient (${fmtNum(obj[enterCol])}) in the objective row. Increasing ${enterName} will improve the ${isMin ? "(internal max) " : ""}objective.`,
  vertex: vertex(), path: [...allPaths], tableau: snap(),
  highlight: { type: "entering", col: enterCol },
  objValue: displayObj(obj[n]),
  dualValues: getDualValues(obj, m),
});

let pivotRow = -1;
let minRatio = Infinity;
const ratios = [];
for (let i = 0; i < m; i++) {
  if (tab[i][enterCol] > 1e-9) {
    const ratio = tab[i][n] / tab[i][enterCol];
    ratios.push(`${fmtNum(tab[i][n])}/${fmtNum(tab[i][enterCol])} = ${fmtNum(ratio)}`);
    if (ratio < minRatio - 1e-9) { minRatio = ratio; pivotRow = i; }
  } else { ratios.push("—"); }
}

if (pivotRow === -1) {
  steps.push({
    phase: "error", title: "Unbounded!",
    desc: `No positive entry in column ${enterName} — the problem is unbounded.`,
    vertex: vertex(), path: [...allPaths], tableau: snap(),
    highlight: { type: "entering", col: enterCol },
    objValue: Infinity, dualValues: getDualValues(obj, m),
  });
  return { steps, colNames, m, error: "unbounded" };
}

const ratiosDisplay = ratios.map((r, i) => i === pivotRow ? r + " ✓" : r);
const leaveName = varName(basic[pivotRow], m);

steps.push({
  phase: "ratio", title: `Minimum Ratio Test`,
  desc: `Row ${pivotRow + 1} has the smallest ratio (${fmtNum(minRatio)}). ${leaveName} leaves the basis.`,
  vertex: vertex(), path: [...allPaths], tableau: snap(),
  highlight: { type: "ratio", col: enterCol, pivotRow, ratios: ratiosDisplay },
  objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
});

const pivotEl = tab[pivotRow][enterCol];
basic[pivotRow] = enterCol;
for (let j = 0; j <= n; j++) tab[pivotRow][j] /= pivotEl;

steps.push({
  phase: "pivot", title: `Row Reduce: R${SUBS[pivotRow]} ÷ ${fmtNum(pivotEl)}`,
  desc: `Divide row ${pivotRow + 1} by pivot element (${fmtNum(pivotEl)}).`,
  vertex: vertex(), path: [...allPaths], tableau: snap(),
  highlight: { type: "pivotRow", row: pivotRow },
  objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
});

for (let i = 0; i < m; i++) {
  if (i === pivotRow) continue;
  const factor = tab[i][enterCol];
  if (Math.abs(factor) < 1e-12) continue;
  for (let j = 0; j <= n; j++) tab[i][j] -= factor * tab[pivotRow][j];
  tab[i][enterCol] = 0;

  steps.push({
    phase: "pivot", title: `Row Reduce: R${SUBS[i]} − ${fmtNum(factor)}·R${SUBS[pivotRow]}`,
    desc: `Eliminate ${enterName} from row ${i + 1}.`,
    vertex: vertex(), path: [...allPaths], tableau: snap(),
    highlight: { type: "pivotRow", row: i },
    objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
  });
}

const objFactor = obj[enterCol];
if (Math.abs(objFactor) > 1e-12) {
  for (let j = 0; j <= n; j++) obj[j] -= objFactor * tab[pivotRow][j];
  obj[enterCol] = 0;

  steps.push({
    phase: "pivot", title: `Row Reduce: R_z − (${fmtNum(objFactor)})·R${SUBS[pivotRow]}`,
    desc: `Update the objective row to eliminate ${enterName}.`,
    vertex: vertex(), path: [...allPaths], tableau: snap(),
    highlight: { type: "pivotRow", row: "obj" },
    objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
  });
}

const v = vertex();
allPaths.push(v);

let isOptimal = true;
for (let j = 0; j < n; j++) {
  if (obj[j] < -1e-9) { isOptimal = false; break; }
}

if (isOptimal) {
  const shadowCols = [];
  for (let j = 2; j < 2 + m; j++) shadowCols.push(j);
  const dv = getDualValues(obj, m);

  steps.push({
    phase: "optimal",
    title: `Optimal! (${fmtNum(v[0])}, ${fmtNum(v[1])}) — ${isMin ? "Min" : "Max"} Value ${fmtNum(displayObj(obj[n]))}`,
    desc: `All objective row coefficients ≥ 0. ${isMin ? "Shadow prices are negated for the minimization dual." : "Shadow prices under slack variables show the marginal value of each constraint."}`,
    vertex: v, path: [...allPaths], tableau: snap(),
    highlight: { type: "shadow", cols: shadowCols },
    objValue: displayObj(obj[n]),
    dualValues: dv,
  });
  return { steps, colNames, m, error: null };
} else {
  steps.push({
    phase: "move",
    title: `New Vertex (${fmtNum(v[0])}, ${fmtNum(v[1])}) — Value ${fmtNum(displayObj(obj[n]))}`,
    desc: `Moved to a new basic feasible solution. Continuing...`,
    vertex: v, path: [...allPaths], tableau: snap(),
    highlight: null,
    objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
  });
}
iteration++;
```

}

const v = vertex();
steps.push({
phase: "error", title: "Max Iterations Reached",
desc: "Solver hit iteration limit.",
vertex: v, path: [...allPaths], tableau: snap(),
highlight: null, objValue: displayObj(obj[n]), dualValues: getDualValues(obj, m),
});
return { steps, colNames, m, error: "max_iter" };
}

/* ============================================================
FEASIBLE REGION
============================================================ */

function clipPolygon(poly, a, b, rhs) {
if (poly.length === 0) return poly;
const out = [];
for (let i = 0; i < poly.length; i++) {
const curr = poly[i], next = poly[(i + 1) % poly.length];
const cVal = a * curr[0] + b * curr[1], nVal = a * next[0] + b * next[1];
const cIn = cVal <= rhs + 1e-9, nIn = nVal <= rhs + 1e-9;
if (cIn) out.push(curr);
if (cIn !== nIn) {
const d1 = cVal - rhs, d2 = nVal - rhs, t = d1 / (d1 - d2);
out.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])]);
}
}
return out;
}

function computeFeasibleRegion(constraints, maxCoord) {
let poly = [[0,0],[maxCoord,0],[maxCoord,maxCoord],[0,maxCoord]];
for (const c of constraints) {
poly = clipPolygon(poly, c.coeffs[0], c.coeffs[1], c.rhs);
if (poly.length === 0) return [];
}
return poly;
}

function findAllVertices(constraints) {
const lines = [];
for (const c of constraints) lines.push({ a: c.coeffs[0], b: c.coeffs[1], rhs: c.rhs });
lines.push({ a: -1, b: 0, rhs: 0 });
lines.push({ a: 0, b: -1, rhs: 0 });
const vertices = [];
for (let i = 0; i < lines.length; i++) {
for (let j = i + 1; j < lines.length; j++) {
const det = lines[i].a * lines[j].b - lines[i].b * lines[j].a;
if (Math.abs(det) < 1e-10) continue;
const x = (lines[i].rhs * lines[j].b - lines[j].rhs * lines[i].b) / det;
const y = (lines[i].a * lines[j].rhs - lines[j].a * lines[i].rhs) / det;
if (x < -1e-9 || y < -1e-9) continue;
let ok = true;
for (const c of constraints) {
if (c.coeffs[0] * x + c.coeffs[1] * y > c.rhs + 1e-6) { ok = false; break; }
}
if (ok) vertices.push([x, y]);
}
}
return vertices;
}

/* ============================================================
FORMATTING
============================================================ */

function fmtNum(v) {
if (v == null || !isFinite(v)) return "∞";
if (Math.abs(v) < 1e-10) return "0";
if (Math.abs(v - Math.round(v)) < 1e-6) {
const r = Math.round(v);
return r < 0 ? `−${Math.abs(r)}` : `${r}`;
}
return v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2);
}

function fmtSigned(v) {
if (Math.abs(v) < 1e-10) return "+ 0";
if (v > 0) return `+ ${fmtNum(v)}`;
return `− ${fmtNum(Math.abs(v))}`;
}

/* ============================================================
TABLEAU COMPONENT
============================================================ */

function getCellStyle(highlight, rowType, rowIdx, colIdx) {
if (!highlight) return {};
const h = highlight;
const isEntering = h.type === "entering" && colIdx === h.col;
const isPivotElement = h.type === "ratio" && colIdx === h.col && rowIdx === h.pivotRow && rowType === "row";
const isRatioCol = h.type === "ratio" && colIdx === h.col;
const isPivotRowHL = h.type === "pivotRow" && (
(h.row === "obj" && rowType === "obj") || (h.row === rowIdx && rowType === "row")
);
const isShadow = h.type === "shadow" && h.cols?.includes(colIdx) && rowType === "obj";
if (isPivotElement) return { background: "#ff6b35", color: "#fff", fontWeight: 700 };
if (isPivotRowHL) return { background: "#2d5a27", color: "#e8f5e1" };
if (isShadow) return { background: "#b45309", color: "#fef3c7", fontWeight: 700 };
if (isEntering && rowType === "obj") return { background: "#1e40af", color: "#dbeafe", fontWeight: 700 };
if (isEntering || isRatioCol) return { background: "rgba(30, 64, 175, 0.12)" };
return {};
}

function Tableau({ stepData, colNames }) {
const { tableau, highlight } = stepData;
const showRatios = highlight?.type === "ratio";
return (
<div style={{ overflowX: "auto" }}>
<table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "monospace", fontSize: 12 }}>
<thead>
<tr>
<th style={thS}></th>
{colNames.map((c, i) => (
<th key={i} style={{
...thS,
...(highlight?.type === "entering" && i === highlight.col ? { background: "#1e40af", color: "#dbeafe" } : {}),
...(highlight?.type === "shadow" && highlight.cols?.includes(i) ? { background: "#b45309", color: "#fef3c7" } : {}),
}}>{c}</th>
))}
{showRatios && <th style={thS}>Ratio</th>}
</tr>
</thead>
<tbody>
{tableau.rows.map((row, ri) => (
<tr key={ri}>
<td style={{ ...tdS, fontWeight: 700, color: "#94a3b8", background: "#0c1222" }}>{tableau.basic[ri]}</td>
{row.map((v, ci) => (
<td key={ci} style={{ ...tdS, ...getCellStyle(highlight, "row", ri, ci) }}>{fmtNum(v)}</td>
))}
{showRatios && (
<td style={{ ...tdS, color: ri === highlight.pivotRow ? "#fb923c" : "#64748b",
fontWeight: ri === highlight.pivotRow ? 700 : 400, fontSize: 10, whiteSpace: "nowrap",
}}>{highlight.ratios[ri]}</td>
)}
</tr>
))}
<tr>
<td style={{ ...tdS, fontWeight: 700, color: "#94a3b8", background: "#0c1222", borderTop: "2px solid #334155" }}>z</td>
{tableau.obj.map((v, ci) => (
<td key={ci} style={{ ...tdS, borderTop: "2px solid #334155", ...getCellStyle(highlight, "obj", null, ci) }}>{fmtNum(v)}</td>
))}
{showRatios && <td style={{ ...tdS, borderTop: "2px solid #334155" }}></td>}
</tr>
</tbody>
</table>
</div>
);
}

const thS = { padding: "6px 8px", textAlign: "center", color: "#cbd5e1", borderBottom: "2px solid #334155", background: "#0c1222", fontSize: 11, fontWeight: 600 };
const tdS = { padding: "6px 8px", textAlign: "center", color: "#e2e8f0", borderBottom: "1px solid #1e293b", transition: "background 0.3s, color 0.3s" };

/* ============================================================
DUAL PANEL
============================================================ */

function DualPanel({ objCoeffs, constraints, isMin, stepData, isOptimal }) {
const m = constraints.length;
const dv = stepData.dualValues || [];

// For Max c'x s.t. Ax ≤ b: Dual is Min b'y s.t. A'y ≥ c, y ≥ 0
// For Min c'x: we internally do Max(-c)'x, dual of that is Min b'y s.t. A'y ≥ -c, y ≥ 0
// The displayed dual values from the tableau correspond to the internal max problem.
// For the user's min problem, the effective dual is: Max b'y s.t. A'y ≤ c, y ≤ 0
// But since y* from internal max are ≥ 0, for the min dual, we present y_min = -y_max

const dualSense = isMin ? "Maximize" : "Minimize";
const dualConstrSign = isMin ? "≤" : "≥";
const displayDualVals = isMin ? dv.map(v => -v) : dv;

// Dual objective value = sum(b_i * y_i)
const dualObjVal = constraints.reduce((s, c, i) => s + c.rhs * (displayDualVals[i] || 0), 0);

// Build dual constraint strings: A'y ≥ c (for max) or A'y ≤ c (for min)
const dualConstrs = [0, 1].map(j => {
const terms = constraints.map((c, i) => {
const coeff = c.coeffs[j];
return { coeff, varIdx: i };
});
return { terms, rhs: objCoeffs[j], varName: `x${SUBS[j]}` };
});

const cColors = ["#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

return (
<div style={{
background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b",
padding: "14px 16px",
}}>
<div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>
Dual Problem
</div>

```
  {/* Dual formulation */}
  <div style={{ fontSize: 12, fontFamily: "monospace", color: "#cbd5e1", marginBottom: 12, lineHeight: 1.8 }}>
    <div>
      <span style={{ color: "#94a3b8" }}>{dualSense}</span>{" "}
      {constraints.map((c, i) => (
        <span key={i}>
          {i === 0 ? "" : " + "}
          <span style={{ color: cColors[i % cColors.length] }}>{fmtNum(c.rhs)}</span>y{SUBS[i]}
        </span>
      ))}
    </div>
    <div style={{ color: "#64748b", fontSize: 10, marginTop: 2, marginBottom: 2 }}>subject to:</div>
    {dualConstrs.map((dc, j) => (
      <div key={j}>
        {dc.terms.map((t, i) => (
          <span key={i}>
            {i === 0 ? "" : ` ${t.coeff >= 0 ? "+" : "−"} `}
            {i === 0 && t.coeff < 0 ? "−" : ""}
            <span style={{ color: cColors[i % cColors.length] }}>{fmtNum(Math.abs(t.coeff))}</span>
            y{SUBS[i]}
          </span>
        ))}
        {" "}{dualConstrSign} {fmtNum(dc.rhs)}
        <span style={{ color: "#475569", fontSize: 10 }}> ({dc.varName})</span>
      </div>
    ))}
    <div>
      y{SUBS.slice(0, m).join(", y")} {isMin ? "≤" : "≥"} 0
    </div>
  </div>

  {/* Current dual values */}
  <div style={{
    background: "#0f172a", borderRadius: 8, padding: "10px 12px",
    border: "1px solid #1e293b",
  }}>
    <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 6 }}>
      CURRENT DUAL VARIABLES {isMin ? "(from internal max)" : "(shadow prices)"}
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
      {displayDualVals.map((v, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: cColors[i % cColors.length] }} />
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" }}>
            y{SUBS[i]} = <span style={{ fontWeight: 700, color: isOptimal ? "#fbbf24" : "#94a3b8" }}>{fmtNum(v)}</span>
          </span>
        </div>
      ))}
    </div>

    {/* Shadow price interpretation */}
    <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", lineHeight: 1.6 }}>
      {displayDualVals.map((v, i) => {
        const absV = Math.abs(v);
        if (absV < 1e-9) return (
          <div key={i}>
            <span style={{ color: cColors[i % cColors.length] }}>y{SUBS[i]}</span> = 0 → Constraint {i+1} has slack (not binding)
          </div>
        );
        return (
          <div key={i}>
            <span style={{ color: cColors[i % cColors.length] }}>y{SUBS[i]}</span> = {fmtNum(v)} → +1 unit of RHS{SUBS[i]} changes obj by {fmtNum(v)}
          </div>
        );
      })}
    </div>

    {/* Strong duality check at optimality */}
    {isOptimal && (
      <div style={{
        marginTop: 10, padding: "8px 10px", borderRadius: 6,
        background: "#1a2e1a", border: "1px solid #2d5a27",
      }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>
          ✓ STRONG DUALITY VERIFIED
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#86efac" }}>
          Primal {isMin ? "min" : "max"} = {fmtNum(stepData.objValue)}
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#86efac" }}>
          Dual {isMin ? "max" : "min"}&nbsp; = {fmtNum(dualObjVal)}
        </div>
      </div>
    )}
  </div>
</div>
```

);
}

/* ============================================================
GRAPH COMPONENT
============================================================ */

function FeasibleGraph({ stepData, constraints, maxCoord, isMin, objCoeffs }) {
const poly = useMemo(() => computeFeasibleRegion(constraints, maxCoord + 10), [constraints, maxCoord]);
const allVerts = useMemo(() => findAllVertices(constraints), [constraints]);

const W = 320, H = 370;
const pad = 50;
const plotW = W - pad - 20, plotH = H - pad - 30;
const sx = (x) => pad + (x / maxCoord) * plotW;
const sy = (y) => (H - pad) - (y / maxCoord) * plotH;
const toSvg = ([x, y]) => [sx(x), sy(y)];

const polyPoints = poly.map(v => toSvg(v).join(",")).join(" ");
const pathPts = stepData.path.map(toSvg);

const gridStep = maxCoord <= 20 ? 5 : maxCoord <= 60 ? 10 : maxCoord <= 150 ? 25 : 50;
const gridVals = [];
for (let v = 0; v <= maxCoord; v += gridStep) gridVals.push(v);

const cColors = ["#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

return (
<svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
<defs>
<linearGradient id="rg2" x1="0%" y1="100%" x2="100%" y2="0%">
<stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
<stop offset="100%" stopColor="#2d5a27" stopOpacity="0.4" />
</linearGradient>
<filter id="gl2"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
</defs>

```
  {gridVals.map(v => (
    <g key={`gy${v}`}>
      <line x1={sx(0)} y1={sy(v)} x2={sx(maxCoord)} y2={sy(v)} stroke="#1e293b" strokeWidth="0.5" />
      <text x={sx(0)-6} y={sy(v)+3} fill="#475569" fontSize="8" textAnchor="end" fontFamily="monospace">{v}</text>
    </g>
  ))}
  {gridVals.map(v => (
    <g key={`gx${v}`}>
      <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(maxCoord)} stroke="#1e293b" strokeWidth="0.5" />
      <text x={sx(v)} y={sy(0)+12} fill="#475569" fontSize="8" textAnchor="middle" fontFamily="monospace">{v}</text>
    </g>
  ))}

  <line x1={sx(0)} y1={sy(0)+2} x2={sx(maxCoord)} y2={sy(0)+2} stroke="#475569" strokeWidth="1.5" />
  <line x1={sx(0)-2} y1={sy(0)} x2={sx(0)-2} y2={sy(maxCoord)} stroke="#475569" strokeWidth="1.5" />
  <text x={sx(maxCoord)+4} y={sy(0)+4} fill="#94a3b8" fontSize="10" fontFamily="monospace">x₁</text>
  <text x={sx(0)-12} y={sy(maxCoord)+4} fill="#94a3b8" fontSize="10" fontFamily="monospace">x₂</text>

  {constraints.map((c, i) => {
    const a = c.coeffs[0], b = c.coeffs[1], r = c.rhs;
    let p1, p2;
    if (Math.abs(b) > 1e-10 && Math.abs(a) > 1e-10) { p1 = [0, r/b]; p2 = [r/a, 0]; }
    else if (Math.abs(b) > 1e-10) { p1 = [0, r/b]; p2 = [maxCoord, r/b]; }
    else if (Math.abs(a) > 1e-10) { p1 = [r/a, 0]; p2 = [r/a, maxCoord]; }
    else return null;
    const dx = p2[0]-p1[0], dy = p2[1]-p1[1];
    return (
      <line key={i}
        x1={toSvg([p1[0]-dx*2, p1[1]-dy*2])[0]} y1={toSvg([p1[0]-dx*2, p1[1]-dy*2])[1]}
        x2={toSvg([p2[0]+dx*2, p2[1]+dy*2])[0]} y2={toSvg([p2[0]+dx*2, p2[1]+dy*2])[1]}
        stroke={cColors[i % cColors.length]} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
    );
  })}

  {poly.length > 2 && <polygon points={polyPoints} fill="url(#rg2)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />}

  {/* Objective direction arrow */}
  {(() => {
    const c1 = objCoeffs[0], c2 = objCoeffs[1];
    const mag = Math.sqrt(c1 * c1 + c2 * c2);
    if (mag < 1e-10) return null;
    const scale = maxCoord * 0.15;
    const dir = isMin ? -1 : 1;
    const dx = (c1 / mag) * scale * dir;
    const dy = (c2 / mag) * scale * dir;
    const originX = maxCoord * 0.78;
    const originY = maxCoord * 0.22;
    const [ox, oy] = toSvg([originX, originY]);
    const [tx, ty] = toSvg([originX + dx, originY + dy]);
    const angle = Math.atan2(ty - oy, tx - ox);
    const headLen = 7;
    const a1x = tx - headLen * Math.cos(angle - 0.35);
    const a1y = ty - headLen * Math.sin(angle - 0.35);
    const a2x = tx - headLen * Math.cos(angle + 0.35);
    const a2y = ty - headLen * Math.sin(angle + 0.35);

    const lblDx = -12 * Math.cos(angle);
    const lblDy = -12 * Math.sin(angle);

    return (
      <g>
        <line x1={ox} y1={oy} x2={tx} y2={ty}
          stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,2" />
        <polygon points={`${tx},${ty} ${a1x},${a1y} ${a2x},${a2y}`}
          fill="#86efac" />
        <text x={ox + lblDx} y={oy + lblDy}
          fill="#86efac" fontSize="7" fontFamily="monospace" fontWeight="600"
          opacity="0.9" textAnchor="middle" dominantBaseline="central">
          {isMin ? "improve ↓" : "improve ↑"}
        </text>
      </g>
    );
  })()}

  {pathPts.length > 1 && (
    <polyline points={pathPts.map(p => p.join(",")).join(" ")}
      fill="none" stroke="#3b82f6" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" filter="url(#gl2)" />
  )}

  {allVerts.map(([vx, vy], i) => {
    const [px, py] = toSvg([vx, vy]);
    const isCurr = Math.abs(vx - stepData.vertex[0]) < 0.01 && Math.abs(vy - stepData.vertex[1]) < 0.01;
    const isVisited = stepData.path.some(p => Math.abs(p[0]-vx) < 0.01 && Math.abs(p[1]-vy) < 0.01);
    return (
      <g key={i}>
        <circle cx={px} cy={py} r={isCurr ? 6 : 3.5}
          fill={isCurr ? (stepData.phase === "optimal" ? "#f59e0b" : "#3b82f6") : isVisited ? "#64748b" : "#334155"}
          stroke={isCurr ? "#fff" : "#64748b"} strokeWidth={isCurr ? 2 : 1}
          filter={isCurr ? "url(#gl2)" : undefined} />
        {(isCurr || isVisited) && (
          <text x={px + (vx < maxCoord*0.3 ? -6 : 6)} y={py + (vy < maxCoord*0.3 ? 14 : -8)}
            fill={isCurr ? "#f8fafc" : "#64748b"} fontSize="8" fontFamily="monospace"
            textAnchor={vx < maxCoord*0.3 ? "end" : "start"} fontWeight={isCurr ? 700 : 400}>
            ({fmtNum(vx)}, {fmtNum(vy)})
          </text>
        )}
      </g>
    );
  })}

  <text x={sx(0)} y={sy(0)+28} fill="#94a3b8" fontSize="10" fontFamily="monospace">
    {isMin ? "Min" : "Max"}: <tspan fill="#f8fafc" fontWeight="700">{fmtNum(stepData.objValue)}</tspan>
  </text>
</svg>
```

);
}

/* ============================================================
INPUT FORM
============================================================ */

const inputStyle = {
width: 56, padding: "6px 6px", background: "#0f172a", border: "1px solid #334155",
borderRadius: 6, color: "#e2e8f0", fontSize: 14, fontFamily: "monospace", textAlign: "center",
outline: "none",
};

function NumInput({ value, onChange }) {
const [raw, setRaw] = useState(String(value));
const [focused, setFocused] = useState(false);

useEffect(() => { if (!focused) setRaw(String(value)); }, [value, focused]);

const handleChange = (e) => {
const s = e.target.value;
setRaw(s);
if (s === "" || s === "-" || s === "." || s === "-.") return;
const n = parseFloat(s);
if (!isNaN(n)) onChange(n);
};

const handleBlur = () => {
setFocused(false);
const n = parseFloat(raw);
if (isNaN(n)) { setRaw("0"); onChange(0); }
else { setRaw(String(n)); onChange(n); }
};

const toggleSign = () => { const nv = -value; onChange(nv); setRaw(String(nv)); };

return (
<div style={{ display: "flex", alignItems: "center", gap: 2 }}>
<input type="text" inputMode="decimal"
value={focused ? raw : String(value)}
onFocus={() => setFocused(true)} onChange={handleChange} onBlur={handleBlur}
style={inputStyle} />
<button onClick={toggleSign} style={{
background: "none", border: "1px solid #334155", borderRadius: 4,
color: "#94a3b8", cursor: "pointer", padding: "2px 5px", fontSize: 11,
fontFamily: "monospace", lineHeight: 1, flexShrink: 0,
}}>±</button>
</div>
);
}

function ProblemInput({ objCoeffs, setObjCoeffs, constraints, setConstraints, isMin, setIsMin, onSolve, error }) {
const addConstraint = () => {
if (constraints.length < 5) setConstraints([...constraints, { coeffs: [1, 1], rhs: 50 }]);
};
const removeConstraint = (idx) => {
if (constraints.length > 1) setConstraints(constraints.filter((_, i) => i !== idx));
};
const updateObj = (idx, val) => {
const o = [...objCoeffs]; o[idx] = val; setObjCoeffs(o);
};
const updateConstr = (ci, field, val) => {
const c = constraints.map((cc, i) => i === ci ? {
...cc,
coeffs: field === 'rhs' ? cc.coeffs : cc.coeffs.map((v, j) => j === field ? val : v),
rhs: field === 'rhs' ? val : cc.rhs,
} : cc);
setConstraints(c);
};

const cColors = ["#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

return (
<div style={{
background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b",
padding: "24px 28px", maxWidth: 560, margin: "0 auto",
}}>
<div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14 }}>
Define Your Problem (2D, ≤ 5 Constraints) — With Dual
</div>

```
  {/* Max / Min toggle */}
  <div style={{ marginBottom: 16, display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #334155", width: "fit-content" }}>
    <button onClick={() => setIsMin(false)} style={{
      padding: "8px 20px", fontSize: 13, fontFamily: "monospace", fontWeight: 600, cursor: "pointer",
      background: !isMin ? "#1e40af" : "#0f172a", color: !isMin ? "#fff" : "#64748b",
      border: "none", transition: "all 0.2s",
    }}>Maximize</button>
    <button onClick={() => setIsMin(true)} style={{
      padding: "8px 20px", fontSize: 13, fontFamily: "monospace", fontWeight: 600, cursor: "pointer",
      background: isMin ? "#b45309" : "#0f172a", color: isMin ? "#fff" : "#64748b",
      border: "none", borderLeft: "1px solid #334155", transition: "all 0.2s",
    }}>Minimize</button>
  </div>

  {/* Objective */}
  <div style={{ marginBottom: 20 }}>
    <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontFamily: "monospace" }}>
      {isMin ? "Minimize:" : "Maximize:"}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <NumInput value={objCoeffs[0]} onChange={v => updateObj(0, v)} />
      <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 14 }}>x₁ +</span>
      <NumInput value={objCoeffs[1]} onChange={v => updateObj(1, v)} />
      <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 14 }}>x₂</span>
    </div>
  </div>

  {/* Constraints */}
  <div style={{ marginBottom: 20 }}>
    <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontFamily: "monospace" }}>Subject to:</div>
    {constraints.map((c, ci) => (
      <div key={ci} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: cColors[ci % cColors.length], flexShrink: 0 }} />
        <NumInput value={c.coeffs[0]} onChange={v => updateConstr(ci, 0, v)} />
        <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 14 }}>x₁ +</span>
        <NumInput value={c.coeffs[1]} onChange={v => updateConstr(ci, 1, v)} />
        <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 14 }}>x₂ ≤</span>
        <NumInput value={c.rhs} onChange={v => updateConstr(ci, 'rhs', v)} />
        {constraints.length > 1 && (
          <button onClick={() => removeConstraint(ci)} style={{
            background: "none", border: "1px solid #334155", borderRadius: 6,
            color: "#64748b", cursor: "pointer", padding: "4px 8px", fontSize: 14, lineHeight: 1,
          }}>✕</button>
        )}
      </div>
    ))}
    {constraints.length < 5 && (
      <button onClick={addConstraint} style={{
        background: "none", border: "1px dashed #334155", borderRadius: 6,
        color: "#64748b", cursor: "pointer", padding: "6px 14px", fontSize: 12, fontFamily: "monospace", marginTop: 4,
      }}>+ Add Constraint</button>
    )}
  </div>

  <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", marginBottom: 12 }}>
    x₁, x₂ ≥ 0 (non-negativity assumed)
  </div>

  {error && (
    <div style={{ color: "#f87171", fontSize: 12, fontFamily: "monospace", marginBottom: 10, padding: "8px 12px", background: "#1c1017", borderRadius: 6, border: "1px solid #7f1d1d" }}>
      {error}
    </div>
  )}

  <button onClick={onSolve} style={{
    background: isMin ? "#b45309" : "#1e40af", color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'IBM Plex Sans', monospace", width: "100%", transition: "background 0.2s",
  }}>
    Solve &amp; Animate →
  </button>
</div>
```

);
}

/* ============================================================
MAIN APP
============================================================ */

function SimplexDualApp() {
const [objCoeffs, setObjCoeffs] = useState([20, 30]);
const [constraints, setConstraints] = useState([
{ coeffs: [2, 4], rhs: 120 },
{ coeffs: [4, 2], rhs: 80 },
]);
const [isMin, setIsMin] = useState(false);
const [mode, setMode] = useState("input");
const [solveResult, setSolveResult] = useState(null);
const [step, setStep] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [inputError, setInputError] = useState(null);
const [zoomLevel, setZoomLevel] = useState(1);

const [frozenConstraints, setFrozenConstraints] = useState(constraints);
const [frozenObj, setFrozenObj] = useState(objCoeffs);
const [frozenIsMin, setFrozenIsMin] = useState(false);

const baseMaxCoord = useMemo(() => {
if (!frozenConstraints) return 50;
let mx = 0;
for (const c of frozenConstraints) {
if (c.coeffs[0] > 0) mx = Math.max(mx, c.rhs / c.coeffs[0]);
if (c.coeffs[1] > 0) mx = Math.max(mx, c.rhs / c.coeffs[1]);
}
return Math.max(mx * 1.15, 10);
}, [frozenConstraints]);

const maxCoord = baseMaxCoord * zoomLevel;

const handleSolve = () => {
for (const c of constraints) {
if (c.rhs < 0) { setInputError("All RHS values must be ≥ 0 for the initial basis to be feasible."); return; }
if (c.coeffs[0] === 0 && c.coeffs[1] === 0) { setInputError("A constraint has all-zero coefficients."); return; }
}
if (objCoeffs[0] === 0 && objCoeffs[1] === 0) { setInputError("Objective function is zero."); return; }
setInputError(null);

```
const result = solveSimplex(objCoeffs, constraints, isMin);
setSolveResult(result);
setFrozenConstraints([...constraints]);
setFrozenObj([...objCoeffs]);
setFrozenIsMin(isMin);
setStep(0);
setIsPlaying(false);
setZoomLevel(1);
setMode("solve");
```

};

const handleBack = () => { setMode("input"); setIsPlaying(false); setSolveResult(null); };

useEffect(() => {
if (!isPlaying || !solveResult) return;
if (step >= solveResult.steps.length - 1) { setIsPlaying(false); return; }
const timer = setTimeout(() => setStep(s => s + 1), 2000);
return () => clearTimeout(timer);
}, [isPlaying, step, solveResult]);

const handlePrev = useCallback(() => { setIsPlaying(false); setStep(s => Math.max(0, s - 1)); }, []);
const handleNext = useCallback(() => {
setIsPlaying(false);
setStep(s => solveResult ? Math.min(solveResult.steps.length - 1, s + 1) : s);
}, [solveResult]);

if (mode === "input") {
return (
<div style={{ minHeight: "100vh", background: "#080e1a", color: "#e2e8f0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: "32px 20px" }}>
<div style={{ maxWidth: 600, margin: "0 auto" }}>
<div style={{ textAlign: "center", marginBottom: 28 }}>
<h1 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.5 }}>
SIMPLEX + DUAL
</h1>
<p style={{ color: "#64748b", fontSize: 12, margin: "6px 0 0", fontFamily: "monospace" }}>
LP Solver with Dual Problem & Shadow Prices
</p>
</div>
<ProblemInput
objCoeffs={objCoeffs} setObjCoeffs={setObjCoeffs}
constraints={constraints} setConstraints={setConstraints}
isMin={isMin} setIsMin={setIsMin}
onSolve={handleSolve} error={inputError}
/>
</div>
</div>
);
}

const currentStep = solveResult.steps[step];
const totalSteps = solveResult.steps.length;
const isOptimalStep = currentStep.phase === "optimal";

return (
<div style={{ minHeight: "100vh", background: "#080e1a", color: "#e2e8f0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: "16px 12px", boxSizing: "border-box" }}>
<div style={{ maxWidth: 1200, margin: "0 auto" }}>
{/* Header */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
<div>
<h1 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", margin: 0, fontFamily: "monospace" }}>
SIMPLEX + DUAL
<span style={{
marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 4,
background: frozenIsMin ? "#b45309" : "#1e40af", color: "#fff",
}}>{frozenIsMin ? "MIN" : "MAX"}</span>
</h1>
<p style={{ color: "#64748b", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace" }}>
{frozenIsMin ? "Min" : "Max"} {fmtNum(frozenObj[0])}x₁ + {fmtNum(frozenObj[1])}x₂
{frozenConstraints.map((c, i) => ` | ${fmtNum(c.coeffs[0])}x₁ + ${fmtNum(c.coeffs[1])}x₂ ≤ ${fmtNum(c.rhs)}`)}
</p>
</div>
<button onClick={handleBack} style={{
background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "monospace",
}}>← Edit</button>
</div>

```
    {/* Main 3-column layout */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(240px, 1fr) minmax(340px, 1.4fr) minmax(240px, 1fr)",
      gap: 12, marginBottom: 12,
    }}>
      {/* Left: Graph */}
      <div style={{ background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b", padding: 8, position: "relative" }}>
        <FeasibleGraph stepData={currentStep} constraints={frozenConstraints} maxCoord={maxCoord} isMin={frozenIsMin} objCoeffs={frozenObj} />
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 3 }}>
          <button onClick={() => setZoomLevel(z => Math.max(0.2, z*0.7))} style={zoomBtn}>+</button>
          <button onClick={() => setZoomLevel(1)} style={{ ...zoomBtn, fontSize: 10 }}>⟳</button>
          <button onClick={() => setZoomLevel(z => Math.min(5, z*1.4))} style={zoomBtn}>−</button>
        </div>
      </div>

      {/* Center: Step info + Tableau */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Step info */}
        <div style={{ background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              background: currentStep.phase === "optimal" ? "#b45309" :
                currentStep.phase === "pivot" ? "#166534" :
                currentStep.phase === "enter" ? "#1e40af" :
                currentStep.phase === "ratio" ? "#92400e" :
                currentStep.phase === "error" ? "#b91c1c" : "#334155",
              color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase",
            }}>
              {currentStep.phase === "init" ? "Start" : currentStep.phase === "enter" ? "Entering" :
               currentStep.phase === "ratio" ? "Ratio Test" : currentStep.phase === "pivot" ? "Row Reduce" :
               currentStep.phase === "move" ? "New Vertex" : currentStep.phase === "optimal" ? "Optimal" : "Error"}
            </span>
            <span style={{ color: "#64748b", fontSize: 10, fontFamily: "monospace" }}>
              Step {step + 1} / {totalSteps}
            </span>
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 3px", color: "#f8fafc" }}>{currentStep.title}</h2>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{currentStep.desc}</p>
        </div>

        {/* Tableau */}
        <div style={{ background: "#0c1222", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 16px", flex: 1 }}>
          <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Simplex Tableau {frozenIsMin ? "(internal max)" : ""}
          </div>
          <Tableau stepData={currentStep} colNames={solveResult.colNames} />
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {currentStep.highlight?.type === "entering" && <Legend color="#1e40af" label="Entering" />}
            {currentStep.highlight?.type === "ratio" && (
              <><Legend color="#1e40af" label="Entering col" /><Legend color="#ff6b35" label="Pivot" /></>
            )}
            {currentStep.highlight?.type === "pivotRow" && <Legend color="#2d5a27" label="Updated row" />}
            {currentStep.highlight?.type === "shadow" && <Legend color="#b45309" label="Shadow prices" />}
          </div>
        </div>
      </div>

      {/* Right: Dual panel */}
      <DualPanel
        objCoeffs={frozenObj}
        constraints={frozenConstraints}
        isMin={frozenIsMin}
        stepData={currentStep}
        isOptimal={isOptimalStep}
      />
    </div>

    {/* Controls */}
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
      <button onClick={() => { setIsPlaying(false); setStep(0); }} style={btnS}>⏮</button>
      <button onClick={handlePrev} style={btnS} disabled={step === 0}>◀ Prev</button>
      <button onClick={() => setIsPlaying(p => !p)}
        style={{ ...btnS, background: isPlaying ? "#b91c1c" : "#1e40af", minWidth: 72 }}>
        {isPlaying ? "⏸" : "▶ Play"}
      </button>
      <button onClick={handleNext} style={btnS} disabled={step === totalSteps - 1}>Next ▶</button>
      <button onClick={() => { setIsPlaying(false); setStep(totalSteps - 1); }} style={btnS}>⏭</button>
    </div>

    <div style={{ marginTop: 8, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${(step / Math.max(totalSteps - 1, 1)) * 100}%`,
        background: currentStep.phase === "optimal" ? "#f59e0b" : currentStep.phase === "error" ? "#ef4444" : "#3b82f6",
        borderRadius: 2, transition: "width 0.3s, background 0.3s",
      }} />
    </div>
  </div>
</div>
```

);
}

function Legend({ color, label }) {
return (
<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
<div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
<span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{label}</span>
</div>
);
}

const btnS = {
background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8,
padding: "7px 12px", fontSize: 12, fontFamily: "monospace", cursor: "pointer",
};

const zoomBtn = {
background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6,
width: 26, height: 26, fontSize: 15, fontWeight: 700, cursor: "pointer",
display: "flex", alignItems: "center", justifyContent: "center",
fontFamily: "monospace", lineHeight: 1, padding: 0,
};

ReactDOM.createRoot(document.getElementById('simplex-app')).render(<SimplexDualApp />);