---
layout: post
title: The Simplex Algorithm Visualised
date: 2026-02-16 21:47:08
author: danial
short_description: A visualisation of the simplex algorithm for solving Linear Programming programs.
---

For many years I have used the simplex algorithm for Linear Programming (LP) but could never quite wrap my head around its inner workings. I knew it traversed the vertices of a polyhedron encoded by the problem constraints and it used this mysterious *tableau* to do so, but any explanation I read just didn't quite click for me.

Fortunately, today we have amazing visualisation tools and LLMs to generate them quickly. See below the animation that finally did it for me, courtesy of Claude. Hopefully it can help someone else to understand too.

Explanation in detail below the animation (also Claude).

<div id="simplex-app"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" src="{{ '/assets/simplex_viz/simplex_dual.jsx' | relative_url }}"></script>

# Companion to the Interactive Visualizer

This document walks through every concept behind the simplex method visualizer, from tableau construction to duality, with special attention to the geometric intuition and the edge cases where things get interesting.

-----

## 1. The Setup

We’re solving a **linear program** (LP): optimize a linear objective function subject to linear inequality constraints.

**Standard form (maximization):**

$$\max ; \mathbf{c}^\top \mathbf{x} \quad \text{subject to} \quad A\mathbf{x} \leq \mathbf{b}, ;; \mathbf{x} \geq \mathbf{0}$$

In two dimensions, this means: maximize $c_1 x_1 + c_2 x_2$ subject to a set of half-plane constraints. The feasible region is a **convex polygon** (or polyhedron in higher dimensions), and a fundamental theorem of LP guarantees the optimum occurs at a vertex — if one exists.

The simplex method exploits this by only ever visiting vertices, moving along edges in the direction that improves the objective.

-----

## 2. Slack Variables and the Tableau

Each inequality constraint $a_{i1} x_1 + a_{i2} x_2 \leq b_i$ becomes an equality by introducing a **slack variable** $s_i \geq 0$:

$$a_{i1} x_1 + a_{i2} x_2 + s_i = b_i$$

The slack $s_i$ measures *how much room is left* before the constraint is tight. If $s_i = 0$, the constraint is **binding** — you’re on that boundary.

The objective is rewritten as an equation too: $z - c_1 x_1 - c_2 x_2 = 0$. All of this is packed into a **tableau** — a matrix where:

- Each **row** (except the last) is a constraint equation
- The **last row** is the objective equation
- Each **column** corresponds to a variable ($x_1, x_2, s_1, \ldots, s_m$, RHS)

### Initial Tableau Structure

For the general case with $n$ decision variables and $m$ constraints, the initial tableau is:

$$\begin{array}{c|cccc|cccc|c}
& x_1 & x_2 & \cdots & x_n & s_1 & s_2 & \cdots & s_m & \text{RHS} \
\hline
s_1 & a_{11} & a_{12} & \cdots & a_{1n} & 1 & 0 & \cdots & 0 & b_1 \
s_2 & a_{21} & a_{22} & \cdots & a_{2n} & 0 & 1 & \cdots & 0 & b_2 \
\vdots & \vdots & \vdots & \ddots & \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \
s_m & a_{m1} & a_{m2} & \cdots & a_{mn} & 0 & 0 & \cdots & 1 & b_m \
\hline
z & -c_1 & -c_2 & \cdots & -c_n & 0 & 0 & \cdots & 0 & 0
\end{array}$$

The left column shows the **basic variables** — initially all slacks. The identity matrix under $s_1, \ldots, s_m$ means each slack is a unit vector, so the solution reads directly: $s_i = b_i$ and all $x_j = 0$. The objective row carries the negated costs $-c_j$; these are the **reduced costs** that drive the pivot selection.

After one pivot (say $x_k$ enters and $s_r$ leaves), the tableau transforms so that column $x_k$ becomes a unit vector with the 1 in row $r$, and the row label changes from $s_r$ to $x_k$:

$$\begin{array}{c|cccc|cccc|c}
& x_1 & \cdots & x_k & \cdots & s_1 & \cdots & s_r & \cdots & \text{RHS} \
\hline
s_1 & \tilde{a}*{11} & \cdots & 0 & \cdots & 1 & \cdots & \tilde{a}*{1r} & \cdots & \tilde{b}*1 \
\vdots & \vdots & & \vdots & & \vdots & & \vdots & & \vdots \
x_k & \tilde{a}*{r1} & \cdots & 1 & \cdots & 0 & \cdots & \tilde{a}_{rr} & \cdots & \tilde{b}_r \
\vdots & \vdots & & \vdots & & \vdots & & \vdots & & \vdots \
\hline
z & \bar{c}_1 & \cdots & 0 & \cdots & 0 & \cdots & \bar{c}_r & \cdots & \bar{z}
\end{array}$$

where $\tilde{a}_{ij}$ denotes the updated coefficients after row reduction and $\bar{c}_r$ (the objective row entry under the departed slack $s_r$) is now the emerging **shadow price** for constraint $r$.

In the visualizer’s 2-variable case ($n = 2$), the initial tableau looks like:

$$\begin{array}{c|cc|ccc|c}
& x_1 & x_2 & s_1 & s_2 & s_3 & \text{RHS} \
\hline
s_1 & a_{11} & a_{12} & 1 & 0 & 0 & b_1 \
s_2 & a_{21} & a_{22} & 0 & 1 & 0 & b_2 \
s_3 & a_{31} & a_{32} & 0 & 0 & 1 & b_3 \
\hline
z & -c_1 & -c_2 & 0 & 0 & 0 & 0
\end{array}$$

This is exactly what you see at Step 1 of the animation. As the simplex progresses, slacks leave the basis one by one and get replaced by $x_1$ or $x_2$ in the row labels, while the identity block under the slack columns gets scrambled by the row operations — but the columns under the *basic* variables always form an identity.

### Why This Representation?

The tableau is just a bookkeeping device. At every step, it encodes the current system of equations after row reduction, in a form where the solution is immediately readable. The key property is that each **basic variable** has a column that’s a standard basis vector (a single 1, rest 0s), so setting non-basic variables to zero gives you the basic variable values directly from the RHS column.

-----

## 3. Basic and Non-Basic Variables

With $m$ constraints and $n$ original variables, we have $n + m$ total variables and $m$ equations. A **basic feasible solution** (BFS) partitions the variables into:

- **$m$ basic variables**: solved from the equations (their values come from the RHS)
- **$n$ non-basic variables**: fixed at zero

Each BFS corresponds to a **vertex** of the feasible polyhedron. The key geometric insight: setting $n$ variables to zero means you’re at the intersection of $n$ hyperplane boundaries, which in $n$ dimensions pins you to a point — a vertex.

The **row labels** in the tableau tell you which variables are currently basic. As the algorithm progresses, these labels change: slack variables get swapped out for decision variables as we move from the origin toward the optimum.

-----

## 4. The Simplex Algorithm

### 4.1 Dantzig’s Pivot Rule (Entering Variable)

The visualizer uses **Dantzig’s rule** (also called the **largest coefficient rule**): choose the non-basic variable with the **most negative coefficient** in the objective row as the entering variable.

Why? The objective row coefficients are the **reduced costs** — they tell you the rate of change of $z$ per unit increase in each non-basic variable. A negative reduced cost means increasing that variable will increase $z$. Dantzig’s rule picks the steepest rate, which is a greedy heuristic for fastest improvement.

**Other pivot rules exist.** Bland’s rule (choose the smallest index among negative coefficients) guarantees no cycling but may be slower. The steepest edge rule considers the actual step length, not just the rate. Dantzig’s rule is the simplest and most commonly taught.

### 4.2 Minimum Ratio Test (Leaving Variable)

Once we’ve chosen which variable enters, we need to know how far to increase it before some basic variable hits zero (goes infeasible). For each row $i$ where the entering column has a positive entry $a_{ij} > 0$, the ratio $b_i / a_{ij}$ tells us how far we can go.

The **minimum ratio** determines the tightest constraint — the first basic variable to hit zero. That variable **leaves** the basis. This is the leaving variable, and together with the entering variable, they define the **pivot**.

If no entry in the entering column is positive, the problem is **unbounded** — you can increase the entering variable forever without any constraint stopping you.

### 4.3 Pivoting (Row Reduction)

The pivot operation is standard Gaussian elimination, targeted to maintain the tableau’s structure:

1. **Divide the pivot row** by the pivot element, making it 1
1. **Eliminate** the entering variable from all other rows (including the objective row) using row operations

After pivoting, the entering variable’s column becomes a standard basis vector (with the 1 in the pivot row), and the solution is again readable from the RHS. The row label updates to reflect the new basic variable.

### 4.4 Optimality Check

After each pivot, check the objective row. If all coefficients are **non-negative**, no improvement is possible — we’re at the optimum. If any coefficient is still negative, we repeat.

-----

## 5. The Objective Direction Arrow

On the graph, the arrow labeled “improve ↑” (or “improve ↓” for minimization) shows the **gradient of the objective function** $\nabla z = (c_1, c_2)$ — the direction in which $z$ increases most rapidly.

Geometrically, the simplex method is sliding along the boundary of the feasible polygon in the direction that has the largest positive component along this gradient. The optimal vertex is the one where you can’t move along any edge without going *against* the gradient (or leaving the feasible region).

The **level curves** (iso-value lines) of the objective are perpendicular to this arrow. The optimum is where the last level curve just touches the feasible region.

-----

## 6. The Dual Problem

Every LP has a **dual**. For the standard max problem, the dual is:

**Primal:**

$$\max ; \mathbf{c}^\top \mathbf{x} \quad \text{s.t.} \quad A\mathbf{x} \leq \mathbf{b}, ;; \mathbf{x} \geq \mathbf{0}$$

**Dual:**

$$\min ; \mathbf{b}^\top \mathbf{y} \quad \text{s.t.} \quad A^\top \mathbf{y} \geq \mathbf{c}, ;; \mathbf{y} \geq \mathbf{0}$$

The construction is mechanical: objective coefficients $\leftrightarrow$ constraint RHS, constraint matrix gets transposed, inequalities flip, and $\min \leftrightarrow \max$.

For a minimization primal, the dual is a maximization problem with $\leq$ constraints.

### 6.1 Key Duality Theorems

**Weak duality:** The dual objective always bounds the primal. For a max primal and min dual: any dual-feasible $\mathbf{y}$ gives $\mathbf{b}^\top \mathbf{y} \geq \mathbf{c}^\top \mathbf{x}$ for any primal-feasible $\mathbf{x}$. This means every dual solution provides a *certificate* that the primal can’t do better than $\mathbf{b}^\top \mathbf{y}$.

**Strong duality:** At optimality, the bound is tight — the primal and dual objectives are equal:

$$\mathbf{c}^\top \mathbf{x}^* = \mathbf{b}^\top \mathbf{y}^*$$

The visualizer verifies this at the optimal step.

**Complementary slackness:** If a primal constraint has slack ($s_i > 0$), the corresponding dual variable must be zero ($y_i = 0$), and vice versa:

$$s_i \cdot y_i = 0 \quad \forall ; i$$

The contrapositive: if $y_i > 0$, the primal constraint must be binding. Both being binding simultaneously is perfectly fine — this is the non-degenerate case.

### 6.2 Shadow Prices

The optimal dual variables $\mathbf{y}^*$ are the **shadow prices**. They appear in the simplex tableau as the objective row entries under the slack variable columns.

The shadow price $y_i^*$ equals the partial derivative of the optimal value function with respect to the $i$-th constraint’s RHS:

$$y_i^* = \frac{\partial , z^*}{\partial , b_i}$$

In economic terms: if constraint $i$ limits a resource, $y_i^*$ is the **marginal value** of one additional unit of that resource.

A zero shadow price means the constraint has slack — you already have more of that resource than you need, so more wouldn’t help. A positive shadow price identifies a **bottleneck**.

### 6.3 Why the Dual Lives in the Tableau

The simplex method solves the primal and dual simultaneously. The dual variables at any stage are $\mathbf{c}_B^\top B^{-1}$, where $B$ is the current basis matrix. Through the row operations of the simplex method, this vector is maintained in the objective row under the slack columns. At optimality, it gives the optimal dual solution — no separate computation needed.

More precisely, the optimal value function $z^*(\mathbf{b})$ is **piecewise linear and concave**, and the dual solution $\mathbf{y}^*$ is a subgradient:

$$z^*(\mathbf{b}) = \mathbf{c}_B^\top B^{-1} \mathbf{b}$$

This is linear in $\mathbf{b}$ as long as the current basis $B$ remains optimal.

-----

## 7. Minimization

To minimize $c_1 x_1 + c_2 x_2$, the visualizer internally negates the objective and solves:

$$\max ; (-c_1) x_1 + (-c_2) x_2$$

The simplex algorithm is identical; only the interpretation changes:

- The displayed objective value is negated back for the user
- The gradient arrow flips direction (pointing toward *decreasing* $z$)
- The dual switches from minimization to maximization

This is a standard trick — every minimization LP can be converted to maximization without loss of generality.

-----

## 8. Edge Cases and Subtleties

### 8.1 The Origin Isn’t Always Feasible

The visualizer assumes all constraints are of the form $A\mathbf{x} \leq \mathbf{b}$ with $\mathbf{b} \geq \mathbf{0}$. This guarantees that $\mathbf{x} = \mathbf{0}$ (the origin) is feasible, because all slacks start positive. The initial basis is simply ${s_1, s_2, \ldots, s_m}$.

But what if some $b_i < 0$? Then $s_i = b_i < 0$ at the origin, which is infeasible. The standard simplex method can’t start.

**Solutions:**

- **Big-M method:** Add artificial variables with a large penalty $M$ in the objective, driving them to zero if a feasible solution exists.
- **Two-phase simplex:** Phase I minimizes the sum of artificial variables to find a feasible starting point (or proves infeasibility). Phase II then optimizes the real objective from there.
- **Dual simplex:** Start with a dual-feasible (but primal-infeasible) tableau and pivot to achieve primal feasibility while maintaining dual feasibility. This is particularly useful for re-optimization after adding constraints.

The visualizer validates that all RHS values are non-negative before solving, which is why it rejects negative $b_i$.

### 8.2 Degeneracy

A basic feasible solution is **degenerate** if one or more basic variables equal zero. Geometrically, this means more than $n$ constraints pass through the vertex (it’s “over-determined”).

Degeneracy causes problems because a pivot may not actually move to a new vertex — the objective value stays the same. In theory, this can cause **cycling** (visiting the same sequence of bases forever). In practice this is rare, but Bland’s rule guarantees it never happens.

With degeneracy, shadow prices may not be unique: different optimal bases (all representing the same vertex) can give different dual values. The shadow price interpretation becomes a subgradient rather than a gradient — formally, $\mathbf{y}^*$ lies in the **subdifferential** $\partial z^*(\mathbf{b})$.

### 8.3 Objective Parallel to a Constraint (Alternate Optima)

If the gradient of the objective $\nabla z = (c_1, c_2)$ is perpendicular to a constraint boundary’s normal (i.e., the objective is *parallel* to that constraint), then every point along that constraint edge between two optimal vertices achieves the same objective value.

In simplex terms, this shows up as a **zero reduced cost** for a non-basic variable at optimality — bringing it into the basis wouldn’t change $z$. Pivoting on it gives a different optimal BFS, and the convex combination of all such BFS gives the full set of optimal solutions (an edge or face of the polyhedron):

$$\mathbf{x}^* = \lambda , \mathbf{x}_1^* + (1 - \lambda) , \mathbf{x}_2^* \quad \text{for any } \lambda \in [0, 1]$$

The visualizer will correctly find *one* optimal vertex, but won’t indicate that others exist. Look for zeros in the objective row (under non-basic variable columns) at the final step — that’s the signature of alternate optima.

### 8.4 Unbounded Problems

If during the minimum ratio test, no row has a positive entry in the entering column, the entering variable can increase without limit — the feasible region extends to infinity in a direction that improves the objective:

$$z \to \infty \quad (\text{or } z \to -\infty \text{ for min})$$

The visualizer detects this and displays an “Unbounded!” error. Note that an unbounded *feasible region* doesn’t necessarily mean an unbounded *objective* — it depends on whether the objective gradient points into the unbounded direction.

### 8.5 Infeasibility

If the constraints are contradictory (e.g., $x_1 \leq 5$ and $x_1 \geq 10$), no feasible solution exists. The simplex method on the original problem would never encounter this directly (it would just start infeasible), which is why Phase I / Big-M is needed.

The visualizer doesn’t handle this case since it requires $\mathbf{b} \geq \mathbf{0}$, which always gives a feasible origin. But if you enter constraints that make the feasible region empty while keeping $\mathbf{b} \geq \mathbf{0}$ (e.g., $x_1 + x_2 \leq 10$ and $-x_1 - x_2 \leq -20$, which requires negative $b$), the validator will catch it.

### 8.6 Objective Perpendicular to a Constraint

If the objective gradient $\nabla z$ is exactly **perpendicular** to a constraint boundary, that constraint’s normal is parallel to $\nabla z$, meaning that constraint contributes maximally to the objective improvement per unit of resource. This shows up as that constraint having the highest shadow price in the dual solution — it’s the most valuable bottleneck.

This is actually the *common* case: the optimal vertex typically sits at the intersection of constraints whose normals $\mathbf{a}_i$ span a cone containing the objective gradient:

$$\nabla z = \sum_{i \in \mathcal{B}} y_i^* , \mathbf{a}_i$$

where $\mathcal{B}$ is the set of binding constraints and $y_i^*$ are the shadow prices. This is precisely the KKT (Karush-Kuhn-Tucker) condition for optimality.

-----

## 9. Summary: What to Watch in the Visualizer

As you step through the animation, pay attention to:

1. **The arrow** shows where the objective wants to go — the simplex path should generally trend in that direction along the polygon edges.
1. **Row labels changing** — each swap tells you a slack variable (resource with room) became tight, and a decision variable entered production.
1. **Objective row coefficients** — negative values drive the next pivot. When they all go non-negative, you’ve arrived.
1. **Shadow prices** appearing at optimality under the slack columns — they tell you which constraints are worth relaxing.
1. **The dual panel** tracking along — dual variables evolve with each pivot, converging to the shadow prices at the optimal step. Strong duality confirms $\mathbf{c}^\top \mathbf{x}^* = \mathbf{b}^\top \mathbf{y}^*$.
1. **Zero reduced costs at optimality** — if a non-basic variable has a zero in the objective row, alternate optima exist along a constraint edge.

-----

## 10. Going Further

Topics beyond the scope of this visualizer but natural extensions:

- **Revised simplex method:** avoids storing the full tableau by maintaining $B^{-1}$ directly — much more efficient for large problems.
- **Interior point methods:** instead of walking along edges, these methods cut through the interior of the polyhedron. They have polynomial worst-case complexity (unlike simplex, which is exponential in the worst case but fast in practice).
- **Sensitivity analysis:** how much can you change the coefficients before the optimal basis changes? The shadow prices tell you the rates of change; sensitivity analysis tells you the *ranges* over which those rates hold.
- **Integer programming:** when variables must be integers, the LP relaxation (solved by simplex) provides bounds, and branch-and-bound or cutting plane methods find the integer optimum.
