---
layout: post
title: Quantum Computing Since Democritus - some exercises
date: 2018-05-13 22:52:01
author: danial
short_description: In Scott Aaronson's Quantum Computing Since Democritus Chapter 9, there are some interesting exercises for the reader on quantum mechanics. This post is my take.
---

**Exercise 1.** Prove that a stochastic matrix is the most general matrix (linear transformation) mapping probability distributions to probability distributions.

**Exercise 2.** Prove that for a square matrix $U\in \mathbb{C}^{n \times n}$, $U U^* = I$ if and only if $\|U v \|_{2} = \|v\|_2$ for any vector $v \in \mathbb{C}^n_{}$.

$(\Rightarrow)$ $\|U v \|^2_{2} = \langle v \lvert U^\dagger U \lvert v \rangle =  \langle v \lvert I \lvert v \rangle = \|v \|_{2_{}}$.

$(\Leftarrow)$ Suppose $U$ preserves lengths. Let us first consider the $(j,j)$-th component of $U^\dagger U$:

$$[U^\dagger U]_{j,j_{}} = \langle e_j \lvert U^\dagger U \lvert e_j \rangle = \| U e_j \|^2_{2_{}} = \| e_j \|^2_{2_{}} = 1,$$
with the third equality coming from the assumption that $U$ preserves length.

Now let us consider the off diagonals of $U^\dagger U$. Consider for $\theta \in [0, 2\pi)$ the expression

$$\| U (\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle ) \|^2_{2_{}} = \| \lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle \|^2_{2_{}} = 2,$$

since $U$ preserves lengths. We can also directly expand the expression

$$\| U (\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle ) \|^2_{2_{}} = (\langle e_j \lvert + e^{-i \theta} \langle e_k \lvert ) U^\dagger U (\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle ) = \\ \langle \lvert e_j U^dagger U \lvert e_j \rangle + e^{-i \theta} \langle \lvert e_k U^dagger U \lvert e_j \rangle + e^{i \theta} \langle \lvert e_j U^dagger U \lvert e_k \rangle + \langle \lvert e_k U^dagger U \lvert e_k \rangle = 2 + e^{-i \theta} \langle \lvert e_k U^dagger U \lvert e_j \rangle + e^{i \theta} \langle \lvert e_j U^dagger U \lvert e_k \rangle.$$

Thus, for $U$ to preserve length,

$$e^{-i \theta} [U^\dagger U]_{j,k_{}} + e^{i \theta} [U^\dagger U]_{k,j_{}} = 0 \text{  for all  } \theta \in [0, 2\pi).$$
Multiplying through by $e^{i \theta}$, we have
$$ [U^\dagger U]_{j,k_{}} + e^{2i \theta} [U^\dagger U]_{k,j_{}} = 0 \\ - [U^\dagger U]_{j,k_{}} = e^{2i \theta} [U^\dagger U]_{k,j_{}} \\ [U^\dagger U]_{j,k_{}} = e^{i(\theta + \pi)} [U^\dagger U]_{k,j_{}}.$$

Taking $\theta = 0$ gives $[U^\dagger U]_{j,k_{}} = - [U^\dagger U]_{k,j_{}}$ and taking $\theta = \pi /2$ gives $[U^\dagger U]_{j,k_{}} = [U^\dagger U]_{k,j_{}}$. Thus, $[U^\dagger U]_{j,k_{}} = [U^\dagger U]_{k,j_{}} = 0$ and we have the result.

**Exercise 3.** *"The density matrix encodes all the information that could ever be obtained from some probability distribution over quantum states, by first applying a unitary operation, then measuring."* Why?

**Exercise 4.** Why does Gleason's theorem *not* work in two dimensions?§

**Exercise 5.** Prove that if a linear transformation other than a permutation or a negation of a subset of elements preserves the $p$-norm of an arbitrary vector, then either $p=1$ or $p=2$.

**Exercise 6.** Prove that any norm-preserving linear transformation in $N$ dimensions can be implemented by a continuous motion in $N+1$ dimensions.

**Exercise 7.** Prove that if quantum mechanics were nonlinear, then not only could you solve $\mathsf{NP}$-complete problems in polynomial time, you could also use EPR pairs to transmit information faster than light.
