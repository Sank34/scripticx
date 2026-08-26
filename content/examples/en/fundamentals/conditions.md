---
title: Conditions
description: Practical branching examples using IF, ELSE, comparisons, and logical expressions.
slug: /conditions
sidebar_position: 2
keywords: [MiniScript+ conditions, IF ELSE examples, branching]
---

Conditions choose which instructions a program executes.

## Simple IF

```msp title="simple-if.msp"
temperature = 28

IF temperature > 25 THEN
  PRINT "Warm"
END
```

## IF and ELSE

Exactly one branch runs.

```msp title="if-else.msp"
score = 72

IF score >= 50 THEN
  PRINT "Passed"
ELSE
  PRINT "Try again"
END
```

## Even or odd

`MOD` returns the remainder after division.

```msp title="even-odd.msp"
number = 14

IF number MOD 2 = 0 THEN
  PRINT "Even"
ELSE
  PRINT "Odd"
END
```

## Maximum of two values

```msp title="maximum.msp"
first = 5
second = 8

IF first > second THEN
  PRINT first
ELSE
  PRINT second
END
```

:::note
Test each condition with values on both sides of the boundary and with a value exactly on the boundary.
:::
