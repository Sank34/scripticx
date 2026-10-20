---
title: Numeric sequences and recurrences
description: Generate terms, track state, and avoid unnecessary storage.
slug: /sequences
sidebar_position: 4
keywords: [MiniScript+, sequences]
---

A numeric sequence is an ordered succession of numbers. A term may be computed directly from its position or from earlier terms. Always state whether positions begin at zero or one.

## Arithmetic progression

With first term `3` and difference `4`, the sequence begins `3, 7, 11, 15`. After printing a term, add the difference to prepare the next one.

```msp
term = 3
FOR i FROM 1 TO 4
  PRINT term
  term = term + 4
END
```

The direct formula at position `i >= 1` is `3 + (i - 1) * 4`. Use a formula for one requested position and a traversal when you need every term.

## Fibonacci sequence

Use the convention `F(0) = 0`, `F(1) = 1`. Each later term is the sum of the preceding two. Two state values and a temporary variable are sufficient.

```msp
a = 0
b = 1
FOR i FROM 0 TO 6
  PRINT a
  next = a + b
  a = b
  b = next
END
```

The output is `0, 1, 1, 2, 3, 5, 8`, one number per line. At the start of iteration `i`, `a` is `F(i)` and `b` is `F(i + 1)`. Updating `a` before calculating the sum would lose an old term.

## Cost and limits

Generating `n` terms takes `O(n)` time and `O(1)` extra memory. Terms grow quickly: beyond `F(78)`, Fibonacci values are no longer all exact integers in the language's number representation. The execution step limit is a separate constraint.

## Practice

1. Generate five terms starting at `2`, with difference `3`: `2, 5, 8, 11, 14`.
2. Change the Fibonacci program to print only `F(6) = 8`.
3. Generate powers of `2` through `32`, starting at `1` and multiplying by `2` each time.
