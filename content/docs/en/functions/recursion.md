---
title: Recursion
description: Reduce calls to smaller problems and stop at a base case.
slug: /recursion
sidebar_position: 2
keywords: [MiniScript+, recursion]
---

A recursive function calls itself. It needs a **base case** that returns without another call and a step that moves its argument toward that case. Read [functions](/docs/functions) first.

## Factorial

For a non-negative integer, `n!` is the product from `1` through `n`, with `0! = 1`. The relation `n! = n * (n - 1)!` translates directly into a function.

```msp
FUNCTION factorial(n)
  IF n == 0 THEN
    RETURN 1
  END
  RETURN n * factorial(n - 1)
END
PRINT factorial(5)
```

The result is `120`. Calls descend `5 → 4 → 3 → 2 → 1 → 0`. As they return, results are `1`, `1`, `2`, `6`, `24`, `120`. Each call preserves its own `n` while waiting for the next result.

The example assumes an integer `n >= 0`. An input of `-1` moves away from zero; `2.5` never reaches zero exactly. Validate external input before calling it.

## Recursive or iterative?

Factorial can also use a product in a `FOR` loop. Both versions take `O(n)` operations, but recursion retains `O(n)` active calls while iteration needs constant extra memory. Choose recursion when the problem's structure benefits from it.

The MiniScript+ executor limits active calls to `64` and execution to `1000` steps. These are runtime limits, not mathematical rules. Large factorials also lose numeric precision before they make useful deep-recursion examples.

## Common mistakes

- A missing base case or an argument moving away from it.
- Printing a value instead of returning it.
- Using a call without a return value inside an expression.
- Recomputing subproblems: naive recursive Fibonacci makes far more calls than the [iterative version](/docs/sequences).

## Practice

1. Trace `factorial(3)` in the step-by-step editor; its result is `6`.
2. Write a function for `1 + 2 + ... + n`, with base case `n = 0`.
3. Rewrite it iteratively and compare the calls and variables needed.
