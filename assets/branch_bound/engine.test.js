const { solveLP, branchAndBound } = require("./engine.js");

const obj = [5, 4];
const constraints = [
  { coeffs: [6, 4], rhs: 24 },
  { coeffs: [1, 2], rhs: 6 },
];

console.log("=== Root LP relaxation ===");
console.log(solveLP(obj, constraints));

function runTrace(label, useCuts) {
  console.log(`\n=== ${label} ===`);
  const { nodes, steps, optimum, status } = branchAndBound(obj, constraints, false, { useCuts });
  for (const s of steps) {
    console.log(`[${s.phase}] ${s.title}`);
    console.log(`    ${s.desc}`);
  }
  console.log(`\n  -> status=${status}  optimum=${optimum ? `(${optimum.x}) z=${optimum.z}` : "none"}  nodes=${nodes.length}`);
  return { nodes, optimum };
}

function run(label, opts) {
  console.log(`\n=== ${label} ===`);
  const { nodes, steps, optimum, status } = branchAndBound(obj, constraints, false, opts);
  for (const s of steps) console.log(`[${s.phase}] ${s.title}\n    ${s.desc}`);
  const cuts = nodes.reduce((s, n) => s + n.cuts.length, 0);
  console.log(`\n  -> status=${status}  optimum=${optimum ? `(${optimum.x}) z=${optimum.z}` : "none"}  nodes=${nodes.length}  cuts=${cuts}`);
  return { nodes, optimum, cuts };
}

const bb = run("BRANCH & BOUND", { maxCutRounds: 0 });
const cp = run("CUTTING PLANES (no branching)", { maxCutRounds: 20, allowBranch: false });
const bc = run("BRANCH & CUT (1 cut/node)", { maxCutRounds: 1, allowBranch: true });

console.log(`\n=== CONTRAST ===`);
console.log(`B&B           : ${bb.nodes.length} nodes, ${bb.cuts} cuts   -> (${bb.optimum.x}) z=${bb.optimum.z}`);
console.log(`Cutting planes: ${cp.nodes.length} nodes, ${cp.cuts} cuts   -> ${cp.optimum ? `(${cp.optimum.x}) z=${cp.optimum.z}` : "none"}`);
console.log(`Branch & cut  : ${bc.nodes.length} nodes, ${bc.cuts} cuts   -> (${bc.optimum.x}) z=${bc.optimum.z}`);
