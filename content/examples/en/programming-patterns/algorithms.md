---
title: Algorithms
description: Classic MiniScript+ algorithms with traceable state and compact implementations.
slug: /algorithms
sidebar_position: 2
keywords: [MiniScript+ algorithms, Fibonacci, GCD, prime number]
---

These examples combine variables, conditions, and loops into complete algorithms.

## Prime number test

```msp title="prime.msp"
n = 7
divisor = 2
isPrime = TRUE

WHILE divisor < n
  IF n MOD divisor = 0 THEN
    isPrime = FALSE
  END
  divisor = divisor + 1
END

IF isPrime THEN
  PRINT "Prime"
ELSE
  PRINT "Not prime"
END
```

## Fibonacci sequence

```msp title="fibonacci.msp"
count = 5
first = 0
second = 1

FOR index = 1 TO count
  PRINT first
  next = first + second
  first = second
  second = next
END
```

## Greatest common divisor

Euclid's subtraction method repeatedly reduces the larger number.

```msp title="gcd.msp"
first = 12
second = 8

WHILE first != second
  IF first > second THEN
    first = first - second
  ELSE
    second = second - first
  END
END

PRINT first
```

## Maximum of three values

```msp title="maximum-three.msp"
first = 3
second = 7
third = 5
maximum = first

IF second > maximum THEN
  maximum = second
END

IF third > maximum THEN
  maximum = third
END

PRINT maximum
```
