---
title: Markov decision processes and life - why we are all doomed by physics to make bad decisions
---

# Blog

### [Home](https://ddervs.github.io/)

## Markov decision processes and life: or why we are all doomed by physics to make bad decisions


$\newcommand{\P}{\mathsf{P}}$
$\newcommand{\BQP}{\mathsf{BQP}}$
$\newcommand{\PSPACE}{\mathsf{PSPACE}}$

In life it seems as if it’s always tough to make the right decision, or at least it’s often difficult to do so due to some known or unknown incurred cost. Many a time the palm of my hand has swung lugubriously to my forehead after some blunder I’d like to forget about (usually it’s something I *have* forgotten about...). Alas, maybe there is hope, or at least consolation. Perhaps this isn't due to some personal deficiency, but in fact follows inevitably from the laws of the universe, which conspire to make us bad decision-makers. In this post we will think about this question through the lens of *Markov decision processes* and, with some shaky reasoning, once and for all absolve ourselves of all responsibility for any of the poor decisions we make.

In a Markov decision process $M$ we are given a finite set of states $S$, and we start with a state $s_0 \in S$. Accordingly, at a time $t \in \mathbb{N}$ we are in the state $s_t \in S$. For every $s \in S$ we are allowed a finite set of decisions $D_s$. A particular decision $i\in D_s$ made at time $t$ incurs a cost $c(s, i ,t)$, and our next state $s’$ is decided randomly, according to a probability distribution $p(s, s', i ,t)$. A *policy* $\delta: S \times \mathbb{N} \to \cup_s D_s$ is a mapping from a given state $s$ and time $t$ to a decision $\delta(s,t) \in D_s$.

The problem we are interested in solving is minimising the expectation of the total cost $\sum_{t=0}^T c(s_t, \delta(s_t, t), t )$ over some finite time horizon $T\in \mathbb{N}$, by finding an optimal policy $\delta$. We’ll call this problem of computing $\delta$ the *finite-time Markov decision process problem* (FTMDP). This problem has been known for a long time to be in $\P$, so polynomial-time solvable, via reduction to linear programming. So far this is good news, if we apply this as a model for real decision-making. However, there is a variant of this problem known as *partially observed FTMDP* (pFTMDP) that we are going to concern ourselves with. In this variant, at time $t$, we don’t know which state $s_t\in S$ we are in, rather we know that we lie in a subset of $S$, $z \in \Pi$, where $\Pi = \{z_1, z_2, \ldots, z_k\}$ is a partition of $S$, that is, the $z_i$’s are disjoint and their union is $S$.
 
Papadimitrou and Tsitsiklis in 1987 showed (thanks to Josh Lockhart for showing me this paper) that the computational complexity of pFTMDP is $\PSPACE$-complete. That is, unless $\P=\PSPACE$, there is no polynomial-time classical algorithm that can tell us if a particular expected cost can be achieved in the partial observation setting. Moreover, unless $\BQP=\PSPACE$ then not even a quantum computer can answer this question in polynomial time. Taken dramatically, this means that the best machines the universe has to offer are hopeless in the face of pFTMDP.

Now let us extrapolate this result wildly to the messy domain of meatspace, where we envisage a human life as some Markov decision process $M_{\text{life}}$. I will now make a lazy attempt to justify this model. Surely we are always unsure of which state *precisely* we are in, however we wish to define our state space $S$ (a numeric scale of 1-100, ASCII-encoded bitstring of our deepest, darkest thoughts) and cost $c$ (monetary cost, how many of our hairs fall out). We do probably know roughly which subset of states we are in (between 70 and 80 out of 100, generally feeling good, ‘I’m hungry' etc...), with the collection of subsets corresponding to our partition $\Pi$.  I think we can all at least to some extent agree that the next state of one’s life is decided at random, by some implicit probability distribution $p$. 

It seems that even in the unlikely scenario that we know all of the state transition probabilities and incurred costs that it is hopeless for us to make good decisions. Why? Well we want to live our best lives, and of course that means computing an optimal policy $\delta_{\text{life}}$ for the Markov decision process $M_{\text{life}}$ described in the previous paragraph, taking $t=0$ as birth and $T$ as some finite time significantly larger than a typical lifetime (presumably moving to the state $s=\{\text{dead}\}$ incurs a high cost). Now even asking if we can get a policy with expected total cost above or below a certain value seems to be forbidden by physics, since it’s overwhelmingly likely that $\BQP \neq \PSPACE$ and pFTMDP is $\PSPACE$-complete. So it’s curtains for producing the policy itself. 

What do we take from this? I would take this as a consolation for any bad decisions taken and perhaps even as a hand-wavy excuse! I mean, if the universe wanted us to make good decisions, then surely pFTMDP would be in $\P$? Nowadays, if anyone asks why I’ve done something stupid now I simply tell them I didn’t have a $\PSPACE$ oracle to hand. Somehow that doesn’t seem to go down so well...  