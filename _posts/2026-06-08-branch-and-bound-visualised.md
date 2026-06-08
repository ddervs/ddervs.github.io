---
layout: post
title: Branch and Bound (and Cut), Visualised
date: 2026-06-08 12:00:00
author: danial
short_description: An interactive visualisation of branch and bound, branch and cut, and pure cutting-plane methods for solving Integer Programs.
---

<!-- ============================================================
     INTRO — TODO(Danial): replace the placeholder below with your
     own opening, in the same spirit as the simplex post.
     ============================================================ -->

*[Intro paragraph goes here — your personal hook, in the same spirit as the simplex post. The two paragraphs below are placeholder framing you can keep, rewrite, or delete.]*

[visualised the simplex algorithm]({% post_url 2026-02-16-simplex-visualised %}) 

<div id="branch-bound-app"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="/assets/branch_bound/engine.js"></script>
<script>
fetch('/assets/branch_bound/branch_bound.jsx')
  .then(r => r.text())
  .then(code => {
    const output = Babel.transform(code, { presets: ['react'] }).code;
    new Function(output)();
  })
  .catch(err => console.error('Failed to load branch & bound viz:', err));
</script>

# Companion to the Interactive Visualiser

This document walks through every concept behind the visualiser: how the LP relaxation gives a bound, how branching carves up the feasible region, why pruning is what makes the search tractable, what cutting planes add, and the trade-offs between the three methods — with attention to the geometry and the edge cases where things get interesting.

Throughout, the running example is the visualiser's **Textbook** preset:

$$\max \; 3x_1 + 2x_2 \quad \text{s.t.} \quad 3x_1 + 4x_2 \le 16, \;\; 4x_1 + x_2 \le 12, \;\; x_1, x_2 \ge 0, \;\; x_1, x_2 \in \mathbb{Z}.$$

Its integer optimum is $(2,2)$ — a point that sits *strictly inside* the polyhedron, touching neither constraint, which makes it a good illustration of how an integer optimum differs from the fractional LP vertex.

-----

## 1. Why Integer Programming Is Hard

A **linear program** (LP) optimises a linear objective over a polyhedron, and simplex solves it efficiently by walking the vertices. An **integer program** (IP) adds one innocent-looking requirement — the variables must be integers:

$$\max \; \mathbf{c}^\top \mathbf{x} \quad \text{s.t.} \quad A\mathbf{x} \le \mathbf{b}, \;\; \mathbf{x} \ge \mathbf{0}, \;\; \mathbf{x} \in \mathbb{Z}^n.$$

We write $z = \mathbf{c}^\top \mathbf{x}$ for the **objective value** — the quantity being maximised (in the Textbook example, $z = 3x_1 + 2x_2$). It is the number reported at each node and tracked in the status strip.

That single change moves the problem from "polynomial-time solvable" to **NP-hard**. The feasible set is no longer a convex polyhedron but a scatter of lattice points inside it, and the optimum can sit deep in the *interior* of the polyhedron, at no vertex simplex would ever visit.

The tempting shortcut — solve the LP and round — **is unreliable**. In the Textbook example the relaxation optimum is $(2.46,\,2.15)$. The objective rewards a larger $x_1$, so the natural rounding is $(3,2)$ — but that is infeasible, since $3\cdot 3 + 4\cdot 2 = 17 > 16$. In fact three of the four ways to round $(2.46,\,2.15)$ leave the feasible region; the survivor $(2,2)$ happens to be optimal here, but you only learn that by checking, and with $n$ variables there are $2^n$ candidate roundings that may all be infeasible or all suboptimal. Rounding is a guess, not an algorithm.

We need a method that searches the lattice points intelligently. That is branch and bound.

-----

## 2. The LP Relaxation and the Bound

Drop the integrality requirement and you are left with the **LP relaxation**:

$$\max \; \mathbf{c}^\top \mathbf{x} \quad \text{s.t.} \quad A\mathbf{x} \le \mathbf{b}, \;\; \mathbf{x} \ge \mathbf{0}.$$

Because the relaxation optimises over a *superset* of the integer-feasible points, its optimal value is an **optimistic bound** on the IP: for a maximisation problem,

$$z_{\text{IP}}^* \;\le\; z_{\text{LP}}^*.$$

This is the single most important fact in the whole subject. Every node of the search will solve a relaxation, and the bound it returns tells us the *best we could possibly hope for* in that part of the search — which is exactly what lets us discard parts of the search without exploring them.

In the visualiser, the relaxation is solved (by the very simplex routine from the previous post) at every node; the result is the diamond marker in the geometry pane — **hollow** when the relaxation optimum is fractional, **filled gold** when it happens to be integer.

-----

## 3. The Search Tree

Branch and bound organises the search as a **tree of subproblems**. The root is the original problem. Each node is the original IP plus some extra bound constraints accumulated on the way down from the root (things like $x_1 \le 3$ or $x_2 \ge 2$). Every node owns its own LP relaxation.

The tree is, in principle, astronomically large — but we never build all of it. The art is to grow only the branches that could contain the optimum and to cut off the rest as early as possible. The left pane of the visualiser draws this tree as it is discovered: each circle is a node labelled with its LP bound, and the edges are labelled with the branching constraint that created the child.

A node is **open** (or *active*) once its relaxation has been solved but it has not yet been dealt with — it is waiting on the frontier to be processed. It becomes **closed** once we have finished with it, in one of two ways: it can be **branched** (split into two children, which become open in its place), or it can become a **leaf** by being **pruned**. The algorithm keeps a pool of open nodes, repeatedly picks one to process, and terminates when the pool is empty — every node closed. There are three distinct reasons a node gets pruned, which we come to in §5; the "global bound" in the status strip is computed over exactly the open nodes.

-----

## 4. Branching: Slicing Out the Fractional Gap

Suppose a node's relaxation optimum has a fractional component, say $x_j = f \notin \mathbb{Z}$. We pick that variable and **branch**: create two child subproblems,

$$x_j \le \lfloor f \rfloor \qquad \text{and} \qquad x_j \ge \lceil f \rceil.$$

The key observation is that **no integer-feasible point is lost**. Any integer solution has $x_j$ either $\le \lfloor f \rfloor$ or $\ge \lceil f \rceil$; the open strip $\lfloor f \rfloor < x_j < \lceil f \rceil$ contains no integers at all. We have thrown away a slab of the polyhedron that held only fractional points — including the current fractional optimum, which is now excluded from *both* children, forcing progress.

In the Textbook example the root optimum is $(2.46,\,2.15)$, so we branch on $x_1$ (the more fractional coordinate): the strip $2 < x_1 < 3$ is discarded and we get the children $x_1 \le 2$ and $x_1 \ge 3$. Watch the geometry pane redraw the shaded feasible region for each child as you step into it — the branch constraint appears as a new wall, and the region shrinks.

-----

## 5. Bounding and Pruning

Branching alone would just enumerate everything. **Pruning** is what makes branch and bound efficient: it discards subtrees we can prove are not worth exploring. A node is pruned for one of three reasons.

**Prune by bound.** If the node's LP bound is no better than the best integer solution found so far (the *incumbent*), nothing in this subtree can beat what we already have, so we discard it unexplored. In the Textbook run, once the incumbent $(2,2)$ with $z=10$ is found, the $x_1 \ge 3$ node — whose relaxation is worth only $9$ — is pruned by bound: even its *relaxation* can't reach $10$, so no integer point below it can either.

**Prune by infeasibility.** If the node's added constraints make its LP relaxation infeasible, the subtree is empty and we discard it.

**Prune by integrality.** If the relaxation optimum happens to be all-integer, it is a genuine feasible solution to the IP. There is nothing left to branch on, so the node becomes a leaf — and if it improves on the incumbent, it *becomes* the new incumbent.

These three cases are colour-coded in the tree pane (pruned-by-bound ✂, pruned-infeasible ✗, integer/incumbent ★), so you can see at a glance why each leaf closed.

-----

## 6. The Incumbent and the Optimality Gap

Two running quantities drive the search, shown in the status strip:

- The **incumbent** is the best integer-feasible solution found so far. It is a *lower* bound on the optimum (for a max problem) — a value we know is achievable.
- The **global bound** is the best (largest) LP bound among all still-open nodes, together with the incumbent. It is an *upper* bound — no integer solution anywhere can exceed it.

The distance between them is the **optimality gap**:

$$\text{gap} = \frac{\text{global bound} - \text{incumbent}}{|\text{incumbent}|}.$$

The search is provably done when the gap reaches zero — every open node has a bound no better than the incumbent, so the incumbent is optimal. In practice, large industrial problems are often stopped early at a small non-zero gap (say 1%), trading a certificate of optimality for time. This is one of the great practical virtues of branch and bound: it produces a feasible solution *and* a bound on how far that solution could possibly be from optimal, at every moment during the search.

-----

## 7. Search Strategy and Branching Rules

Branch and bound leaves two choices open, and they matter a great deal in practice.

**Which open node to explore next?** The visualiser uses **best-bound** search: always expand the open node with the strongest LP bound. This tends to raise the incumbent quickly and prove optimality with few nodes. The main alternative is **depth-first** search, which dives to leaves fast (finding feasible incumbents early, which sharpens pruning) and uses little memory, at the cost of sometimes exploring more nodes. Real solvers blend the two.

**Which fractional variable to branch on?** The visualiser uses the **most-fractional** rule — branch on the variable whose value is closest to a half-integer. It is simple and intuitive but, perhaps surprisingly, often mediocre. Better rules estimate the *objective degradation* each branch would cause: **pseudocost branching** learns these from past branches, and **strong branching** actually tentatively solves both child LPs to measure it. The choice of branching variable can swing the node count by orders of magnitude.

This mirrors the situation with simplex's pivot rules: the algorithm is correct under many choices, but the choice governs how fast it runs.

-----

## 8. Cutting Planes and the Integer Hull

Now we change tack. Instead of splitting the problem, can we *tighten the relaxation itself*?

Imagine the **integer hull**: the convex hull of all integer-feasible points. If we could describe it with linear inequalities, a single LP over it would hand us the integer optimum directly — its vertices are integer points. The integer hull is generally too complex to write down fully, but we don't need all of it; we only need it near the optimum.

A **cutting plane** is a *valid inequality* $\boldsymbol{\alpha}^\top \mathbf{x} \le \beta$ that

1. is satisfied by **every** integer-feasible point (so we lose no real solutions), but
2. is **violated** by the current fractional LP optimum (so it actually does something).

Add such a cut to the relaxation, re-solve, and the LP optimum is forced to move — closer to the integer hull. Repeat, and the relaxation tightens around the integer optimum. In the visualiser these appear as dashed magenta lines slicing across the geometry pane, with the LP optimum diamond jumping to a new vertex after each cut.

-----

## 9. Gomory Cuts from the Simplex Tableau

Where do valid cuts come from? The visualiser uses **Gomory fractional cuts**, which are read directly off the optimal simplex tableau — a satisfying callback to the [simplex post]({% post_url 2026-02-16-simplex-visualised %}).

Take a row of the optimal tableau whose basic variable $x_{B(i)}$ is fractional:

$$x_{B(i)} + \sum_{j \in \mathcal{N}} \bar{a}_{ij}\, x_j = \bar{b}_i,$$

where $\mathcal{N}$ indexes the non-basic variables. Split each coefficient into its integer floor and fractional part, $\bar a_{ij} = \lfloor \bar a_{ij} \rfloor + f_{ij}$ with $0 \le f_{ij} < 1$, and likewise $\bar b_i = \lfloor \bar b_i \rfloor + f_i$. Because $x_{B(i)}$ and the floors are integers for any integer-feasible point, the fractional parts must satisfy

$$\sum_{j \in \mathcal{N}} f_{ij}\, x_j \;\ge\; f_i.$$

This is the **Gomory cut**. It is violated at the current vertex (where all non-basic $x_j = 0$, so the left side is $0$ but $f_i > 0$), yet valid for every integer point. The visualiser reconstructs this from the basis at the node's optimal vertex and translates it from slack-space back into $(x_1, x_2)$ coordinates so it can be drawn.

For the Textbook example the first Gomory cut works out to $2x_1 + 2x_2 \le 9$. Interestingly, if you keep adding cuts (the **Cutting Planes** mode), the iterates close in on the integer optimum, and the last two cuts generated are $x_1 + x_2 \le 4$ and $2x_1 + x_2 \le 6$ — *both* **facets of the integer hull**, and they intersect exactly at the integer optimum $(2,2)$. The procedure has, in effect, rediscovered the true integer description right where it matters.

-----

## 10. Branch and Cut: The Best of Both

**Branch and cut** is the combination that powers every serious MIP solver: at each node, add a few cutting planes to tighten the relaxation *before* deciding whether to branch. Cuts raise the bound (sharpening pruning and sometimes producing an integer optimum outright); branching guarantees the search terminates even when cuts stall.

The visualiser lets you run the same instance three ways and compare. The contrast is the whole point, and the presets are chosen to make it vivid:

| Preset | Branch & Bound | Branch & Cut | Cutting Planes |
|---|---|---|---|
| **Textbook** | 5 nodes | 3 nodes, 3 cuts | 1 node, 5 cuts |
| **Tight relaxation** | 1 node | 1 node | 1 node |
| **Cuts win** | **25 nodes** | 1 node, 2 cuts | 1 node, 2 cuts |
| **Cuts stall** | 3 nodes | 3 nodes, 2 cuts | **27 cuts** |

A few lessons fall out:

- **Tight relaxation** has an LP optimum that is already integral, so every method finishes at the root. When the relaxation is tight, integer programming is no harder than LP.
- **Cuts win** is a thin, near-$45^\circ$ wedge. Branch and bound thrashes through **25 nodes** chasing ever-smaller fractions near the apex, while two cutting planes carve straight to the integer optimum. This is the case for cuts.
- **Cuts stall** is the cautionary tale: pure Gomory cuts "tail off," adding **27** ever-shallower slices that each barely move the bound, while branch and bound finishes in 3 nodes. This slow convergence is a well-known weakness of pure cutting-plane methods — and exactly why branching is kept in the loop.

Branch and cut sits in the middle, robust across all four: a little cutting to tighten, a little branching to finish.

-----

## 11. Edge Cases and Subtleties

**Alternate optima.** In the **Cuts win** preset, branch and bound returns $(3,4)$ while the cut-based methods return $(0,7)$ — both with $z = 7$. The objective is parallel to the wedge, so an entire edge of integer points is optimal, and different methods land on different ones. Same value, different vertex — the integer analogue of the alternate-optima case from the simplex post.

**No feasible integer solution.** A relaxation can be perfectly feasible while the IP is not — the polyhedron may simply contain no lattice point. Branch and bound discovers this by pruning *every* leaf without ever finding an integer incumbent; it terminates reporting infeasibility.

**Unbounded relaxation.** If the relaxation is unbounded in an improving direction, so is the IP (assuming it is feasible). The visualiser detects this and reports it rather than looping.

**Cutting planes that never finish.** Pure Gomory cuts are guaranteed to converge in theory (with care over the choice of source row), but convergence can be painfully slow and numerically delicate — the coefficients can grow and accumulate rounding error. The visualiser caps the number of cut rounds; if a custom problem exceeds it, the **Cutting Planes** mode honestly reports that it did not converge and suggests switching to branch and cut. This is not a defect of the demo so much as a faithful reflection of why nobody runs pure cutting planes in practice.

**Worst-case explosion.** Branch and bound is exponential in the worst case — the **Cuts win** preset already shows a 25-node tree for a two-variable problem. On real instances the tree can be enormous, which is why bounding quality (cuts), branching rules, and good incumbents (heuristics) matter so much.

-----

## 12. What to Watch in the Visualiser

As you step through an instance, the two panes tell a coordinated story:

1. **The geometry pane** shows the current node's feasible region (the shaded polygon), the integer lattice points (feasible ones highlighted), the objective direction, any cuts as dashed lines, the LP optimum as a diamond (hollow = fractional, filled = integer), and the incumbent as a ★. Watch the region shrink as you descend the tree and the diamond jump as cuts are added.
2. **The tree pane** shows the search: nodes coloured by fate (active, branched, incumbent ★, pruned ✂/✗), labelled with their LP bounds, the current node ringed in white.
3. **The status strip** tracks the incumbent, the global bound, and the gap closing to zero.
4. **The mode switch** re-runs the same instance as Branch & Bound, Branch & Cut, or Cutting Planes — flip between them on the **Cuts win** and **Cuts stall** presets to feel the trade-offs in §10.

-----

## 13. Going Further

Topics beyond this two-variable visualiser, but natural next steps:

- **Stronger cut families.** Gomory cuts are the classic; modern solvers lean on **mixed-integer rounding (MIR)**, **cover**, **clique**, **flow-cover**, and **lift-and-project** cuts, separated only when violated.
- **Better branching.** **Pseudocost** and **reliability** branching, and full **strong branching**, dramatically shrink trees compared to most-fractional.
- **Primal heuristics.** The **feasibility pump**, **RINS**, and **local branching** find good incumbents early, which sharpens pruning throughout.
- **Warm-starting the children.** A child LP differs from its parent by one bound, so the **dual simplex** re-optimises it in a handful of pivots instead of from scratch — the dual machinery from the simplex post earning its keep.
- **Presolve.** Tightening bounds, removing redundant constraints, and detecting implications before the search even begins often matters more than anything during it.
- **Branch and price.** For problems with enormous numbers of variables, **column generation** is interleaved with branching — branch *and* price — the cutting-plane idea applied to the dual.

The two-variable picture is a faithful miniature of all of this: bound, branch, cut, prune, repeat — until the gap closes.
