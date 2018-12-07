---
layout: post
title: Quantum Computing Since Democritus - some exercises
date: 2018-05-13 22:52:01
author: danial
short_description: In Scott Aaronson's Quantum Computing Since Democritus Chapter 9, there are some interesting exercises for the reader on quantum mechanics. This post is my take.
---

<!-- Talk about QM as operating system of the universe, exercises are a cool way of illustrating this
 -->

**Exercise 1.** Prove that a stochastic matrix is the most general matrix (linear transformation) mapping probability distributions to probability distributions.

**Solution.** First we'll show that a stochastic matrix maps probability distributions to probability distributions, then the other direction.

Let $\Omega$ be a finite state space and let $\pi \in \mathcal{P}(\Omega)$ be a distribution over $\Omega$.
Now suppose $P$ is a stochastic $\lvert \Omega \lvert \times \lvert \Omega \lvert$ matrix. The $y$-th element of $\pi P =: \pi'$ for $y\in \Omega$, $\pi'(y) = \sum_{x \in \Omega} \pi(x) P(x,y)$. Now, $\pi'(y) \geq 0$, since $\pi(x) \geq 0$ and $P(x,y) \geq 0$ for all $x,y \in \Omega$. Moreover, $\sum_{y\in\Omega} \pi'(y) = 1$, since

$$\sum_{y\in\Omega} \pi'(y) = \sum_{y \in \Omega} \sum_{x \in \Omega} \pi(x) P(x,y) = \sum_{x \in \Omega} \pi(x) \sum_{y \in \Omega} P(x,y).$$

Now, $\sum_{y \in \Omega} P(x,y) = 1$ for all $y \in \Omega$ as $P$ is a stochastic matrix, so $\sum_{y\in\Omega} \pi'(y) = \sum_{x \in \Omega} \pi(x) = 1$. Thus, $\pi' = \pi P \in \mathcal{P}(\Omega)$.

Now for the other direction. Suppose $P : \mathcal{P}(\Omega) \to \mathcal{P}(\Omega)$ is a linear map from probability distributions to probability distributions. Suppose for the sake of contradiction that there exist $x',y' \in \Omega$ such that $P(x,y) < 0$. Now, consider the probability distribution $\pi(y) = \delta_{y}^{y'}$. Let $\pi' = \pi P$. Then $\pi'(x') < 0$. This contradicts our assumption that $P : \mathcal{P}(\Omega) \to \mathcal{P}(\Omega)$, so $P(x,y) \geq 0$ for all $x,y \in \Omega$.

Now, let $\pi \in \mathcal{P}(\Omega)$ and $\pi' := \pi P$. From assumptions, $\sum_{y\in\Omega} \pi'(y) = 1$. Thus $\sum_{y \in \Omega} \sum_{x \in \Omega} \pi(x) P(x,y) = 1$. Now, let $\pi(x) = \delta_{x}^{x'}$ for some $x' \in \Omega$. Then, $\sum_{y \in \Omega} P(x',y) = 1$. Since we can make $x'$ arbitrary this implies that $\sum_{y \in \Omega} P(x,y) = 1$ for all $x \in \Omega$ and so $P$ is stochastic.



**Exercise 2.** Prove that for a square matrix $U\in \mathbb{C}^{n \times n}$, $U U^* = I$ if and only if $\|U v \|_{2} = \|v\|_2$ for any vector $v \in \mathbb{C}^n_{}$.

**Solution.**  $(\Rightarrow)$ $\|U v \|^2_{2} = \langle v \lvert U^* U \lvert v \rangle =  \langle v \lvert I \lvert v \rangle = \|v \|_{2_{}}$.

$(\Leftarrow)$ Suppose $U$ preserves lengths. Let us first consider the $(j,j)$-th component of $U^* U$:

$[U^* U]_{j,j_{}} = \langle e_j \lvert U^* U \lvert e_j \rangle = \| U e_j \|^2_{2_{}} = \| e_j \|^2_{2_{}} = 1,$

with the third equality coming from the assumption that $U$ preserves length.

Now let us consider the off diagonals of $U^* U$. Consider for $\theta \in [0, 2\pi)$ the expression

$$\| U (\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle ) \|^2_{2_{}} = \| \lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle \|^2_{2_{}} = 2,$$

since $U$ preserves lengths. We can also directly expand the expression

$$\| U (\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle ) \|^2_{2_{}} = \left( \langle e_j \lvert + e^{-i \theta} \langle e_k \lvert \right) U^* U \left(\lvert e_j \rangle + e^{i \theta} \lvert e_k \rangle \right)  = \\ \langle e_j \lvert U^* U \lvert e_j \rangle + e^{-i \theta} \langle e_k \lvert U^* U \lvert e_j \rangle + e^{i \theta} \langle e_j \lvert U^* U \lvert e_k \rangle + \langle e_k \lvert U^* U \lvert e_k \rangle = 2 + e^{-i \theta} \langle e_k \lvert U^* U \lvert e_j \rangle + e^{i \theta} \langle e_j \lvert U^* U \lvert e_k \rangle.$$

Thus, for $U$ to preserve length,

$$e^{-i \theta} [U^* U]_{j,k_{}} + e^{i \theta} [U^* U]_{k,j_{}} = 0 \text{  for all  } \theta \in [0, 2\pi).$$

Multiplying through by $e^{i \theta}$, we have

$$ [U^* U]_{j,k_{}} + e^{2i \theta} [U^* U]_{k,j_{}} = 0 \\ \Longleftrightarrow - [U^* U]_{j,k_{}} = e^{2i \theta} [U^* U]_{k,j_{}} \\ \Longleftrightarrow [U^* U]_{j,k_{}} = e^{i(2\theta + \pi)} [U^* U]_{k,j_{}}.$$

Taking $\theta = 0$ gives $[U^* U]_{j,k_{}} = - [U^* U]_{k,j_{}}$ and taking $\theta = \pi /2$ gives $[U^* U]_{j,k_{}} = [U^* U]_{k,j_{}}$. Thus, $[U^* U]_{j,k_{}} = [U^* U]_{k,j_{}} = 0$ and we have the result.

**Exercise 3.** *"The density matrix encodes all the information that could ever be obtained from some probability distribution over quantum states, by first applying a unitary operation, then measuring."* Why?

**Solution.** Suppose we have a probabilistic ensemble of quantum states, $\{(p_i, \vert \psi_i \rangle)\}_{i\in[m]_{}}$. We apply a unitary $U$ to each state in the ensemble. We also have an arbitrary POVM given by $\{E_k\}_{k \in [K]_{}}$, where $\sum_{k \in [K]} E_k = I$ and the $E_k \succeq 0$. The probability of measuring outcome $k$ on a particular state $\vert \psi_i \rangle$ is $\langle \psi_i \vert U^* E_k U \vert \psi_i \rangle$, and so the probability of measuring $k$ over the ensemble is $\sum_{i \in [m]}p_i \langle \psi_i \vert U^* E_k U \vert \psi_i \rangle$.
Consider the sum again

$$\sum_{i \in [m]}p_i \langle \psi_i \vert U^* E_k U \vert \psi_i \rangle =  \sum_{i \in [m]}p_i \operatorname{Tr}\left( \langle \psi_i \vert U^* E_k U \vert \psi_i \rangle \right) \\ = \sum_{i \in [m]}p_i \operatorname{Tr}\left(  E_k U \vert \psi_i \rangle \langle \psi_i \vert U^* \right) \\ =   \operatorname{Tr}\left(  E_k U \left(\sum_{i \in [m]}p_i \vert \psi_i \rangle \langle \psi_i \vert \right) U^* \right),$$

where in first equality we observe that the trace of a scalar is a scalar, the second equality we have used cyclicity of the trace and in the third the linearity of the trace.
We then make the identification $\rho := \sum_{i \in [m]}p_i \vert \psi_i \rangle \langle \psi_i \vert$, where $\rho$ is now a *density matrix*.

Since all we can or want to do is compute probabilities of specific measurement outcomes, we see that the density matrix picture encodes all of the information from the ensemble, upon applying a unitary and then a measurement.


**Exercise 4.** Why does Gleason's theorem *not* work in two dimensions?

**Exercise 5.** Prove that if a linear transformation other than a permutation or a negation of a subset of elements preserves the $p$-norm of an arbitrary vector, then either $p=1$ or $p=2$.

**Exercise 6.** Prove that any norm-preserving linear transformation in $N$ dimensions can be implemented by a continuous motion in $N+1$ dimensions.

**Exercise 7.** Prove that if quantum mechanics were nonlinear, then not only could you solve $\mathsf{NP}$-complete problems in polynomial time, you could also use EPR pairs to transmit information faster than light.
