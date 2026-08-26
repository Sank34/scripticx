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

## Sum from 1 to N

```msp title="sum.msp"
n = 5
total = 0

FOR value = 1 TO n
  total = total + value
END

PRINT total
```

## Countdown

```msp title="countdown.msp"
counter = 5

WHILE counter >= 0
  PRINT counter
  counter = counter - 1
END
```

## Process repeated input

```msp title="three-values.msp"
total = 0

FOR index = 1 TO 3
  INPUT value
  total = total + value
END

PRINT total
```

:::warning
Every `WHILE` loop must make progress toward a false condition. Otherwise it will run indefinitely.
:::
