---
title: Loops
description: Counters, totals, countdowns, and repeated input implemented with MiniScript+ loops.
slug: /loops
sidebar_position: 1
keywords: [MiniScript+ loop examples, WHILE, FOR]
---

Loops repeat the same operation while a condition holds or across a known interval.

## Count upward

```msp title="counter.msp"
counter = 0

WHILE counter < 5
  PRINT counter
  counter = counter + 1
END
```

Expected result: `0, 1, 2, 3, 4`.

## Sum from 1 to N

```msp title="sum.msp"
n = 5
total = 0

FOR value FROM 1 TO n
  total = total + value
END

PRINT total
```

Expected result: `15`.

## Countdown

```msp title="countdown.msp"
counter = 5

WHILE counter >= 0
  PRINT counter
  counter = counter - 1
END
```

Expected result: `5, 4, 3, 2, 1, 0`.

## Process repeated input

```msp title="three-values.msp"
total = 0

FOR index FROM 1 TO 3
  INPUT value
  total = total + value
END

PRINT total
```

Expected result: `6`. Submit `1`, `2`, `3` at the three prompts, one value at a time.

:::warning
Every `WHILE` loop must make progress toward a false condition. Otherwise it will run indefinitely.
:::


## Trace state

In the sum example, the total becomes `1`, `3`, `6`, `10`, `15`. Initialize it before the loop; putting `total = 0` inside the body would discard the accumulated sum. `FOR` includes both bounds. Set `n` to `0`: zero iterations leave the sum at `0`. Read [loops](/docs/loops) and [sums and counts](/docs/aggregates).
