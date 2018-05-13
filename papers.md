---
layout: default
permalink: papers
---

Papers
======

Here are some papers I've written with a high-level overview of what's in them. I've included a [notes](#notes) section at the bottom of the page to help unpack the jargon.

- [Quantum linear systems algorithms: a primer](https://scirate.com/arxiv/1802.08227)
    - *Short summary* This is a review paper (written jointly with Mark Herbster, Peter Mountney, Simone Severini, Naïri Usher and Leonard Wossnig) focusing on algorithms for solving linear systems of equations on a quantum computer. The aim of the paper is to get a resdearcher in the field of classical linear systems solvers up to speed with the quantum algorithms used for this task.

- [For every quantum walk there is a (classical) lifted Markov chain with faster mixing time](https://scirate.com/arxiv/1712.02318)
    - *Short Summary:* Drawing samples from a probability distribution is an important computational task, used in fields such as randomised algorithms and machine learning. Quantum walks are an approach using a quantum computer that aim to speed up this task. In this paper I show that there is a classical method that is in some sense superior, that is, a random walk that mixes in fewer timesteps, using a technique called _lifting_.
    
    
- [Weak Modular Product of Bipartite Graphs, Bicliques and Isomorphism.](https://scirate.com/arxiv/1707.05179)
    - *Short Summary:* In this joint paper with [Simone Severini](http://www.ucl.ac.uk/~ucapsse/), we resurrect a graph product from the '70s which we use to make an algorithm for the problem of bipartite graph isomorphism. We prove that in certain restricted cases our algorithm is an efficient method for solving this problem.
    

- [Quantum Inspired Algorithms For Graph Matching (Master's Thesis).](https://github.com/ddervs/ddervs.github.io/raw/master/assets/pdfs/GraphKernels.pdf)
    - *Short Summary:* Graph kernels are a method for recognising patterns in data defined as graphs. In this work I define a graph kernel inspired by the theory of quantum walks, that compares favourably with state of the art* methods in graph classification.
    
        <sub style="font-size:60%">\*at the time of writing. This probably isn't true anymore in a field that moves so quickly... 😕</sub>
 
 ----
 <a name="notes"></a>
 ## Notes on papers

 - [Quantum linear systems algorithms: a primer](https://scirate.com/arxiv/1802.08227)
     - A *linear system of equations* is a collection of two or more linear equations involving the same set of variables. The typical representation for such a system is $A x = b$, where $A$ is a matrix and $x$, $b$ are vectors. $A$ and $b$ are given to us and our job is to find $x$. The solution is $x = A^{-1} b$, where $A^{-1}$ is the *inverse* of $A$. There are many practical issues to computing this inverse matrix, discussed in the paper.

 - [For every quantum walk there is a (classical) lifted Markov chain with faster same mixing time](https://scirate.com/arxiv/1712.02318)
     - A *Markov chain* is another name for a random walk on a graph. You start at some vertex, then with some predefined probability use move along one of the edges of the graph to an adjacent vertex. Continue this process for some time *T*.
     - A *quantum walk* is the quantum analogue of a discrete-time random walk on a graph. At each timestep a quantum "coin" is flipped and then the walker moves around the vertices of the graph in superposition. After a certain number of timesteps we measure the location of the walker to draw a sample.
     - When a random walk (quantum or classical) has *mixed*, this means that sampling from the distribution is equivalent to sampling from the infinite-time behaviour of the walk. The *mixing time* is how many timesteps it takes to mix.
     - A *lifting* of a Markov chain is a random walk on a larger, "lifted", graph. For each vertex in the original graph we assign at least one vertex in the lifted graph and every vertex in the lifted graph is associated to a vertex in the original graph. There can only be an edge between two vertices in the lifted graph if there is an edge in the original graph between the associated vertices.

 - [Weak Modular Product of Bipartite Graphs, Bicliques and Isomorphism.](https://scirate.com/arxiv/1707.05179)
     - A *graph product* is a particular way of combining two graphs to form a larger graph, with edges on the larger graph being present only if certain conditions are satisfied by the edges in the two smaller graphs.
     - A *bipartite graph* is a graph whose vertices can be coloured in such a way that no adjacent vertices have the same colour, using only two colours.
     - *Graph isomorphism* is the problem if determining if two graphs are the same (i.e. have the same edges) up to a relabelling of the vertices. Doing this for bipartite graphs is as hard as for the general case. This is an interesting problem because in practise it's easy, but no one can find a generically 'fast' algorithm or prove that such an algorithm doesn't exist. Usually we know one way or the other. 
     
 - [Quantum Inspired Algorithms For Graph Matching (Master's Thesis).](https://github.com/ddervs/ddervs.github.io/raw/master/assets/pdfs/GraphKernels.pdf)
     - A *graph kernel* is a function that takes two graphs and outputs a number that tells you how similar they are. 
     - A *quantum walk* describes the motion of a quantum particle on a graph structure and is used in many quantum algorithms. This work is a classical algorithm using the mathematics describing a quantum walk. 
     - The task of *graph classification* is a machine learning task where we are given a large number of graphs, each with a known label, say `yes` or `no`. Then, given all this data the computer's job is to classify new graphs as `yes`/`no` as quickly and accurately as possible.