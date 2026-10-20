---
title: Loops
description: Repeat instructions safely with WHILE and FOR loops in MiniScript+.
slug: /loops
sidebar_position: 5
keywords: [MiniScript+ loops, while loop, for loop]
---

Loops repeat a block of instructions. They are useful for processing a sequence, validating input, or running a calculation several times.

## WHILE loops

A `WHILE` loop repeats while its condition remains true.

```msp
counter = 0

WHILE counter < 3
  PRINT counter
  counter = counter + 1
END
```

The output is:

```text
0
1
2
```

The loop has three parts:

1. initialize the state before the loop;
2. check a condition before every iteration;
3. update the state inside the loop.

## FOR loops

Use `FOR` when the start, end, and step are known in advance.

```msp
FOR number FROM 1 TO 5
  PRINT number
END
```

Add `INCR` to change the increment:

```msp
FOR number FROM 10 TO 0 INCR -2
  PRINT number
END
```

## Choose the right loop

| Situation | Recommended loop |
| --- | --- |
| A known number of repetitions | `FOR` |
| Repeat until a condition changes | `WHILE` |
| Walk through a numeric interval | `FOR` |
| Validate repeated user input | `WHILE` |

## Avoid infinite loops

An infinite loop never makes its condition false.

```msp
counter = 0
WHILE counter < 5
  PRINT counter
END
```

:::danger[The update is missing]
The example never changes `counter`. Add `counter = counter + 1` inside the loop before running it.
:::

## Nested loops

A loop may contain another loop. Use indentation to keep the structure readable.

```msp
FOR row FROM 1 TO 3
  FOR column FROM 1 TO 3
    PRINT row * column
  END
END
```

Nested loops can perform many operations, so check the expected number of iterations before using them with large ranges.

## Trace a loop

For the first `WHILE` example, build a trace table before running the code:

| counter before | counter < 3 | Output | counter after |
| --- | --- | --- | --- |
| 0 | TRUE | 0 | 1 |
| 1 | TRUE | 1 | 2 |
| 2 | TRUE | 2 | 3 |
| 3 | FALSE | — | — |

The condition is checked again after the last iteration. If it starts false, the body runs zero times. Include an empty sequence in your reasoning.

## FOR bounds and increments

Both bounds are inclusive. `FOR i FROM 1 TO 5` runs five times, not four. A positive increment with a starting value above the ending value produces zero iterations. Counting down requires a negative increment. A zero increment is an error.

Start, end, and increment expressions are evaluated once on entering the loop. Changing a variable used in the bound expression does not update that stored bound. Avoid changing the control variable inside the body. After normal completion, it contains the first value outside the range: after `1 TO 5`, it is `6`.

The `10 TO 0 INCR -2` example prints `10, 8, 6, 4, 2, 0`: six values. Use separate control names for nested loops. A three-step loop inside another three-step loop executes its inner body nine times.

## Practice

1. Print even numbers from `2` through `10`: there are five values.
2. Sum `1` through `5`, initializing the total before the loop: expect `15`.
3. Start the first `WHILE` example at `3` and explain why it prints nothing.
4. Fix the infinite example before running it. The editor's step limit detects long execution but cannot repair an algorithm.

Apply these patterns to [sums and counts](/docs/aggregates) and [string traversal](/docs/strings).
