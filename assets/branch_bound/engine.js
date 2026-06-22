/* ============================================================
   BRANCH & BOUND / BRANCH & CUT ENGINE
   Pure JS. Solves 2-variable pure integer programs:
       max/min  c·x   s.t.  A x (<=|>=) b,  x >= 0, x integer
   Produces a search tree + ordered animation steps.

   Conventions mirror the simplex viz:
     objCoeffs   = [c1, c2]
     constraints = [{ coeffs:[a1,a2], rhs, op }]      op defaults to "<="
     isMin       = boolean
   ============================================================ */

const FEAS_TOL = 1e-7;   // constraint satisfaction tolerance
const INT_TOL  = 1e-6;   // integrality tolerance
const BOX      = 1e7;    // artificial bound to detect unboundedness

/* ---------- small helpers ---------- */
function fracPart(v) { return v - Math.floor(v); }
function isInt(v) { return Math.abs(v - Math.round(v)) < INT_TOL; }
function approx(a, b) { return Math.abs(a - b) < 1e-9; }

/* ============================================================
   LP RELAXATION SOLVER (2D vertex enumeration)
   A node's constraint set = base constraints + branch bounds + cuts.
   Returns { status:"optimal"|"infeasible"|"unbounded", x:[x1,x2], z }.
   `obj` is the *effective* (already-maximization) objective.
   ============================================================ */
function solveLP(obj, constraints) {
  // Assemble line set. x>=0 axes + an artificial box for unboundedness.
  // Each line: a1*x1 + a2*x2 = rhs.  We also remember the original
  // constraint list (with ops) for feasibility testing.
  const lines = [];
  for (const c of constraints) lines.push([c.coeffs[0], c.coeffs[1], c.rhs]);
  lines.push([1, 0, 0]);          // x1 = 0
  lines.push([0, 1, 0]);          // x2 = 0
  lines.push([1, 0, BOX]);        // x1 = BOX  (artificial)
  lines.push([0, 1, BOX]);        // x2 = BOX  (artificial)

  const feasible = (x1, x2) => {
    if (x1 < -FEAS_TOL || x2 < -FEAS_TOL) return false;
    for (const c of constraints) {
      const lhs = c.coeffs[0] * x1 + c.coeffs[1] * x2;
      const op = c.op || "<=";
      if (op === "<=" && lhs > c.rhs + FEAS_TOL) return false;
      if (op === ">=" && lhs < c.rhs - FEAS_TOL) return false;
      if (op === "=="  && Math.abs(lhs - c.rhs) > FEAS_TOL) return false;
    }
    return x1 <= BOX + FEAS_TOL && x2 <= BOX + FEAS_TOL;
  };

  // Enumerate all pairwise line intersections -> candidate vertices.
  const verts = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const [a1, b1, c1] = lines[i];
      const [a2, b2, c2] = lines[j];
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-12) continue;          // parallel
      const x1 = (c1 * b2 - c2 * b1) / det;
      const x2 = (a1 * c2 - a2 * c1) / det;
      if (feasible(x1, x2)) verts.push([x1, x2]);
    }
  }

  if (verts.length === 0) return { status: "infeasible", x: null, z: -Infinity };

  // Pick objective-maximizing vertex.
  let best = null, bestZ = -Infinity;
  for (const [x1, x2] of verts) {
    const z = obj[0] * x1 + obj[1] * x2;
    if (z > bestZ + 1e-12) { bestZ = z; best = [x1, x2]; }
  }

  // Unbounded if the optimum only achieved on the artificial box.
  if (best[0] > BOX * 0.5 || best[1] > BOX * 0.5) {
    return { status: "unbounded", x: null, z: Infinity };
  }
  // Snap near-integers for clean display, and recompute z from the
  // snapped point so integer solutions report exact objective values.
  const snap = v => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : v);
  const sx = [snap(best[0]), snap(best[1])];
  return { status: "optimal", x: sx, z: obj[0] * sx[0] + obj[1] * sx[1] };
}

/* ============================================================
   BRANCHING VARIABLE SELECTION
   Most-fractional rule; tie-break to lowest index.
   Returns var index (0 or 1) or -1 if integral.
   ============================================================ */
function selectBranchVar(x) {
  let bestVar = -1, bestScore = INT_TOL;
  for (let j = 0; j < 2; j++) {
    if (!isInt(x[j])) {
      const f = fracPart(x[j]);
      const score = Math.min(f, 1 - f);   // distance from nearest integer
      if (score > bestScore + 1e-12) { bestScore = score; bestVar = j; }
    }
  }
  return bestVar;
}

/* ============================================================
   BRANCH & BOUND  (best-bound search)
   opts.useCuts  -> enable branch & cut (Gomory cuts, added below)
   Returns { nodes, steps, optimum, status }.
   ============================================================ */
function branchAndBound(objCoeffs, baseConstraints, isMin, opts = {}) {
  const effObj = isMin ? [-objCoeffs[0], -objCoeffs[1]] : [objCoeffs[0], objCoeffs[1]];
  const displayZ = z => (isMin ? -z : z);
  const maxCutRounds = opts.maxCutRounds ?? (opts.useCuts ? 1 : 0);
  const allowBranch  = opts.allowBranch ?? true;

  // normalise base constraints (default op "<=")
  const base = baseConstraints.map(c => ({ coeffs: [c.coeffs[0], c.coeffs[1]], rhs: c.rhs, op: c.op || "<=" }));

  const nodes = [];
  const steps = [];
  let nextId = 0;

  let incumbent = null;          // { x, z(effective) }
  const MAX_NODES = 200;

  function makeNode(parentId, branchConstraints, depth, label) {
    const id = nextId++;
    const node = {
      id, parentId, depth, label,
      branchConstraints,                 // accumulated [{var,op,bound}]
      constraints: base.concat(branchConstraints.map(bc => ({
        coeffs: bc.var === 0 ? [1, 0] : [0, 1],
        rhs: bc.bound,
        op: bc.op,
      }))),
      cuts: [],                          // filled by B&C
      lp: null,
      status: "open",
      isIncumbent: false,
      children: [],
    };
    nodes.push(node);
    if (parentId !== null) nodes.find(n => n.id === parentId).children.push(id);
    return node;
  }

  // Priority queue (best-bound: highest effective LP z first).
  const open = [];
  const pushOpen = n => open.push(n);
  const popBest = () => {
    let bi = -1, bz = -Infinity;
    for (let i = 0; i < open.length; i++) {
      const z = open[i].lp.z;
      if (z > bz + 1e-9) { bz = z; bi = i; }
    }
    return open.splice(bi, 1)[0];
  };

  const globalBound = () => {
    let gb = -Infinity;
    for (const n of open) gb = Math.max(gb, n.lp.z);
    if (incumbent) gb = Math.max(gb, incumbent.z);
    return gb === -Infinity ? null : gb;
  };

  const snapshot = (extra) => Object.assign({
    incumbent: incumbent ? { x: [...incumbent.x], z: displayZ(incumbent.z) } : null,
    globalBound: globalBound() === null ? null : displayZ(globalBound()),
    tree: nodes.map(n => ({
      id: n.id, parentId: n.parentId, depth: n.depth, label: n.label,
      status: n.status, isIncumbent: n.isIncumbent,
      lp: n.lp ? { status: n.lp.status, x: n.lp.x ? [...n.lp.x] : null, z: n.lp.x ? displayZ(n.lp.z) : null } : null,
      branchConstraints: n.branchConstraints.map(b => ({ ...b })),
      cuts: n.cuts.map(c => ({ ...c })),
    })),
  }, extra);

  // tableau for the cutting-plane pane (decision rows + Gomory derivation)
  const tableauOf = (node) => { const d = gomoryDerivation(node, effObj); return d ? d.tableau : null; };

  // ---- root ----
  const root = makeNode(null, [], 0, "root");
  root.lp = solveLP(effObj, root.constraints);
  steps.push(snapshot({
    phase: "solve", nodeId: root.id,
    title: "Solve the root LP relaxation",
    desc: lpDesc(root, displayZ),
    tableau: tableauOf(root, effObj),
  }));

  if (root.lp.status !== "optimal") {
    root.status = root.lp.status === "infeasible" ? "infeasible" : "unbounded";
    steps.push(snapshot({ phase: "terminate", nodeId: root.id,
      title: root.lp.status === "infeasible" ? "Infeasible" : "Unbounded",
      desc: root.lp.status === "infeasible"
        ? "The LP relaxation is infeasible, so the integer program is infeasible too."
        : "The LP relaxation is unbounded." }));
    return { nodes, steps, optimum: null, status: root.lp.status };
  }
  pushOpen(root);

  // ---- main loop ----
  while (open.length > 0 && nextId <= MAX_NODES) {
    const node = popBest();
    node.status = "active";
    steps.push(snapshot({ phase: "select", nodeId: node.id,
      title: `Select node ${node.id} (bound ${fmt(displayZ(node.lp.z))})`,
      desc: `Best-bound search picks the open node with the strongest LP bound: node ${node.id}` +
            (node.branchConstraints.length ? ` (${branchLabel(node.branchConstraints)}).` : " (root).") }));

    // prune by bound
    if (incumbent && node.lp.z <= incumbent.z + INT_TOL) {
      node.status = "pruned-bound";
      steps.push(snapshot({ phase: "prune", nodeId: node.id,
        title: `Prune node ${node.id} by bound`,
        desc: `Its bound ${fmt(displayZ(node.lp.z))} cannot beat the incumbent ${fmt(displayZ(incumbent.z))}, so the whole subtree is discarded.` }));
      continue;
    }

    // CUTTING PLANES: add Gomory cuts before branching (B&C / pure cutting plane)
    let prunedAfterCut = false;
    for (let r = 0; r < maxCutRounds; r++) {
      if (node.lp.status !== "optimal") break;
      if (isInt(node.lp.x[0]) && isInt(node.lp.x[1])) break;   // integral, no cut needed
      const deriv = gomoryDerivation(node, effObj);   // tableau the cut is read from (pre-cut)
      const cut = deriv && deriv.cut;
      if (!cut) break;
      node.cuts.push(cut);
      node.constraints.push({ coeffs: [cut.a1, cut.a2], rhs: cut.rhs, op: "<=" });
      const before = node.lp;
      node.lp = solveLP(effObj, node.constraints);
      steps.push(snapshot({ phase: "cut", nodeId: node.id,
        title: `Add cutting plane at node ${node.id} (round ${r + 1})`,
        desc: `Gomory cut ${cutLabel(cut)} removes the fractional point ${pt(before.x)} ` +
              `without cutting off any integer point. Re-solving gives ${lpShort(node.lp, displayZ)}.`,
        tableau: deriv.tableau }));
      if (incumbent && node.lp.status === "optimal" && node.lp.z <= incumbent.z + INT_TOL) {
        node.status = "pruned-bound";
        steps.push(snapshot({ phase: "prune", nodeId: node.id,
          title: `Prune node ${node.id} by bound`,
          desc: `After cutting, bound ${fmt(displayZ(node.lp.z))} no longer beats incumbent ${fmt(displayZ(incumbent.z))}.` }));
        prunedAfterCut = true;
        break;
      }
    }
    if (prunedAfterCut) continue;

    // integer feasible?
    const bvar = node.lp.status === "optimal" ? selectBranchVar(node.lp.x) : -2;
    if (node.lp.status === "infeasible") {
      node.status = "pruned-infeasible";
      steps.push(snapshot({ phase: "prune", nodeId: node.id,
        title: `Prune node ${node.id}: infeasible`,
        desc: `No feasible LP solution in this subregion.` }));
      continue;
    }
    if (bvar === -1) {
      // integral -> incumbent candidate
      const improved = !incumbent || node.lp.z > incumbent.z + INT_TOL;
      if (improved) {
        incumbent = { x: [...node.lp.x], z: node.lp.z };
        nodes.forEach(n => { n.isIncumbent = false; });
        node.isIncumbent = true;
        node.status = "incumbent";
        steps.push(snapshot({ phase: "incumbent", nodeId: node.id,
          title: `New incumbent at node ${node.id}`,
          desc: `LP optimum ${pt(node.lp.x)} is all-integer with value ${fmt(displayZ(node.lp.z))} — a new best feasible solution.`,
          tableau: tableauOf(node) }));
      } else {
        node.status = "integer";
        steps.push(snapshot({ phase: "integer", nodeId: node.id,
          title: `Integer solution at node ${node.id}`,
          desc: `Integer point ${pt(node.lp.x)} value ${fmt(displayZ(node.lp.z))} does not improve the incumbent.`,
          tableau: tableauOf(node) }));
      }
      continue;
    }

    // pure cutting-plane mode: branching disabled, stop at this (still fractional) node
    if (!allowBranch) {
      node.status = "cut-exhausted";
      steps.push(snapshot({ phase: "stall", nodeId: node.id,
        title: `Node ${node.id} still fractional`,
        desc: `Cutting planes alone did not reach an integer point (no more cuts, or round limit hit). ` +
              `Branching is disabled in pure cutting-plane mode.`,
        tableau: tableauOf(node) }));
      continue;
    }

    // branch
    const f = node.lp.x[bvar];
    const lo = Math.floor(f), hi = Math.ceil(f);
    node.status = "branched";
    const vname = bvar === 0 ? "x₁" : "x₂";
    const downC = node.branchConstraints.concat([{ var: bvar, op: "<=", bound: lo }]);
    const upC   = node.branchConstraints.concat([{ var: bvar, op: ">=", bound: hi }]);
    const down = makeNode(node.id, downC, node.depth + 1, `${vname} ≤ ${lo}`);
    const up   = makeNode(node.id, upC,   node.depth + 1, `${vname} ≥ ${hi}`);
    down.lp = solveLP(effObj, down.constraints);
    up.lp   = solveLP(effObj, up.constraints);
    if (down.lp.status === "optimal") pushOpen(down);
    else down.status = down.lp.status === "infeasible" ? "pruned-infeasible" : "unbounded";
    if (up.lp.status === "optimal") pushOpen(up);
    else up.status = up.lp.status === "infeasible" ? "pruned-infeasible" : "unbounded";

    steps.push(snapshot({ phase: "branch", nodeId: node.id,
      title: `Branch node ${node.id} on ${vname} = ${fmt(f)}`,
      desc: `${vname} is fractional, so split into ${vname} ≤ ${lo} (node ${down.id}, ${lpShort(down.lp, displayZ)}) and ` +
            `${vname} ≥ ${hi} (node ${up.id}, ${lpShort(up.lp, displayZ)}). The strip ${lo} < ${vname} < ${hi} holds no integer points.` }));
  }

  const optimum = incumbent ? { x: [...incumbent.x], z: displayZ(incumbent.z) } : null;
  const stalled = !optimum && nodes.some(n => n.status === "cut-exhausted");
  steps.push(snapshot({ phase: "terminate", nodeId: null,
    title: optimum ? "Optimal integer solution found"
      : stalled ? "Cutting planes did not converge" : "No feasible integer solution",
    desc: optimum
      ? `All open nodes are pruned. The incumbent ${pt(incumbent.x)} with value ${fmt(displayZ(incumbent.z))} is optimal.`
      : stalled
        ? `The cut-round limit was reached before an integer point emerged. Pure cutting planes can "tail off" — switch to Branch & Cut or Branch & Bound to finish the job.`
        : `The search exhausted without finding an integer feasible point.` }));

  return { nodes, steps, optimum, status: optimum ? "optimal" : stalled ? "stalled" : "infeasible" };
}

/* ============================================================
   SIMPLEX TABLEAU (at a node's optimal LP vertex)
   Reconstructs the optimal tableau's *decision-variable rows*
   (x1, x2) expressed in the two nonbasic slacks — the slacks of
   the two constraints binding at the vertex. This is exactly the
   data a Gomory cut is read from, and it stays a constant 2x2
   regardless of how many cuts have been added.
     x_i + sum_j (Binv[i][j]) s_j = (Binv b)_i
   Returns { nonbasic:[{label,idx}], rows:[{label,coeffs,rhs}],
             Binv, xb, r1, r2 } or null when no clean 2-constraint
   basis exists (degenerate / <2 binding "<=" constraints).
   ============================================================ */
function subscript(n) {
  return String(n).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[+d] || d).join("");
}
function slackLabel(i) { return "s" + subscript(i + 1); }

function buildTableau(node) {
  const lp = node.lp;
  if (!lp || lp.status !== "optimal") return null;

  // constraints binding at the optimal vertex (only "<=" carry slacks here)
  const cons = node.constraints;
  const binding = [];
  for (let i = 0; i < cons.length; i++) {
    const c = cons[i];
    if ((c.op || "<=") !== "<=") continue;
    const lhs = c.coeffs[0] * lp.x[0] + c.coeffs[1] * lp.x[1];
    if (Math.abs(lhs - c.rhs) < 1e-6) binding.push({ i, c });
  }
  if (binding.length < 2) return null;

  const r1 = binding[0].c, r2 = binding[1].c;
  const B = [[r1.coeffs[0], r1.coeffs[1]], [r2.coeffs[0], r2.coeffs[1]]];
  const detB = B[0][0] * B[1][1] - B[0][1] * B[1][0];
  if (Math.abs(detB) < 1e-9) return null;
  const Binv = [
    [ B[1][1] / detB, -B[0][1] / detB],
    [-B[1][0] / detB,  B[0][0] / detB],
  ];
  // [x1;x2] = Binv*b - Binv*[s1;s2]  =>  x_i + Binv[i]·s = (Binv b)_i
  const xb = [
    Binv[0][0] * r1.rhs + Binv[0][1] * r2.rhs,
    Binv[1][0] * r1.rhs + Binv[1][1] * r2.rhs,
  ];
  return {
    nonbasic: [
      { label: slackLabel(binding[0].i), idx: binding[0].i },
      { label: slackLabel(binding[1].i), idx: binding[1].i },
    ],
    rows: [
      { label: "x₁", coeffs: [Binv[0][0], Binv[0][1]], rhs: xb[0] },
      { label: "x₂", coeffs: [Binv[1][0], Binv[1][1]], rhs: xb[1] },
    ],
    Binv, xb, r1, r2,
  };
}

/* ============================================================
   GOMORY FRACTIONAL CUT + derivation (for branch & cut / cutting
   planes).  Reads the tableau above, picks a fractional decision
   row, and forms  sum_j frac(alpha_j) s_j >= frac(beta), then
   translates back to x-space.  Returns
     { tableau, cut:{a1,a2,rhs,fromVar} | null }
   where `tableau` is a display-ready copy (no Binv/r1/r2) annotated
   with the chosen source row and fractional parts, or null when no
   tableau can be built.
   ============================================================ */
function gomoryDerivation(node, effObj) {
  const tab = buildTableau(node);
  if (!tab) return null;
  const lp = node.lp;

  const clean = {
    nonbasic: tab.nonbasic,
    rows: tab.rows.map(r => ({ label: r.label, coeffs: [...r.coeffs], rhs: r.rhs })),
    sourceRow: -1, fracCoeffs: null, fracRhs: null, cut: null, kind: "integer",
  };

  // choose fractional basic decision variable (x1 first, then x2)
  let row = -1;
  if (!isInt(tab.xb[0])) row = 0;
  else if (!isInt(tab.xb[1])) row = 1;
  if (row === -1) return { tableau: clean, cut: null };

  const beta = tab.xb[row];
  const alpha = [tab.Binv[row][0], tab.Binv[row][1]];
  const fb = fracPart(beta);
  const fa = [fracPart(alpha[0]), fracPart(alpha[1])];
  if (fb < INT_TOL) return { tableau: clean, cut: null };

  // Substitute s_k = b_k - a_k·x  (>=0).  Cut: fa1*s1 + fa2*s2 >= fb
  //   (fa1*a1 + fa2*a2)·x <= (fa1*b1 + fa2*b2) - fb
  const r1 = tab.r1, r2 = tab.r2;
  const A1 = fa[0] * r1.coeffs[0] + fa[1] * r2.coeffs[0];
  const A2 = fa[0] * r1.coeffs[1] + fa[1] * r2.coeffs[1];
  const RHS = fa[0] * r1.rhs + fa[1] * r2.rhs - fb;

  clean.sourceRow = row;
  clean.fracCoeffs = fa;
  clean.fracRhs = fb;

  // sanity: the cut must remove the current fractional vertex
  if (A1 * lp.x[0] + A2 * lp.x[1] <= RHS + 1e-6) {
    clean.kind = "fractional-nocut";
    return { tableau: clean, cut: null };
  }
  clean.kind = "fractional";
  clean.cut = { a1: A1, a2: A2, rhs: RHS };
  return { tableau: clean, cut: { a1: A1, a2: A2, rhs: RHS, fromVar: row } };
}

// Back-compat thin wrapper: the cut alone (unchanged behaviour).
function gomoryCut(node, effObj) {
  const d = gomoryDerivation(node, effObj);
  return d && d.cut ? d.cut : null;
}

/* ---------- formatting helpers ---------- */
function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (!isFinite(v)) return v > 0 ? "∞" : "-∞";
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-6) return String(r);
  return v.toFixed(2);
}
function pt(x) { return x ? `(${fmt(x[0])}, ${fmt(x[1])})` : "—"; }
function branchLabel(bcs) { return bcs.map(b => `${b.var === 0 ? "x₁" : "x₂"} ${b.op} ${b.bound}`).join(", "); }
function cutLabel(c) {
  const t = [];
  if (Math.abs(c.a1) > 1e-9) t.push(`${fmt(c.a1)}·x₁`);
  if (Math.abs(c.a2) > 1e-9) t.push(`${fmt(c.a2)}·x₂`);
  return `${t.join(" + ")} ≤ ${fmt(c.rhs)}`;
}
function lpShort(lp, dz) {
  if (!lp) return "—";
  if (lp.status === "infeasible") return "infeasible";
  if (lp.status === "unbounded") return "unbounded";
  return `LP ${pt(lp.x)} z=${fmt(dz(lp.z))}`;
}
function lpDesc(node, dz) {
  if (node.lp.status === "infeasible") return "The LP relaxation is infeasible.";
  if (node.lp.status === "unbounded") return "The LP relaxation is unbounded.";
  return `Relaxation optimum ${pt(node.lp.x)} with value ${fmt(dz(node.lp.z))}. ` +
    (isInt(node.lp.x[0]) && isInt(node.lp.x[1])
      ? "Already integer."
      : "Fractional, so we must branch.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { solveLP, selectBranchVar, branchAndBound, gomoryCut, gomoryDerivation, buildTableau };
}
