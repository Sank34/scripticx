---
title: Loops
description: Repeat instructions safely with WHILE and FOR loops in MiniScript+.
slug: /loops
sidebar_position: 2
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
FOR number = 1 TO 5
  PRINT number
END
```

Add `STEP` to change the increment:

```msp
FOR number = 10 TO 0 STEP -2
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
FOR row = 1 TO 3
  FOR column = 1 TO 3
    PRINT row * column
  END
END
```

Nested loops can perform many operations, so check the expected number of iterations before using them with large ranges.
