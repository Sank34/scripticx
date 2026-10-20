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
isPrime = n >= 2

WHILE divisor * divisor <= n AND isPrime
  IF n MOD divisor == 0 THEN
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

Expected result: `Prime`.

## Fibonacci sequence

```msp title="fibonacci.msp"
count = 5
first = 0
second = 1

FOR index FROM 1 TO count
  PRINT first
  next = first + second
  first = second
  second = next
END
```

Expected result: `0, 1, 1, 2, 3`.

## Greatest common divisor

Euclid's remainder method preserves the GCD and also handles a zero second argument. Inputs are non-negative integers, not both zero.

```msp title="gcd.msp"
first = 12
second = 8

WHILE second != 0
  remainder = first MOD second
  first = second
  second = remainder
END

PRINT first
```

Expected result: `4`.

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

Expected result: `7`.


## Why it works and what to test

Primality excludes `0` and `1`, then tries divisors through the square root, inclusively. Test `1`, `2`, `4`, `49`, `97`. Fibonacci retains just two terms; the temporary value saves their sum before either is overwritten. GCD visits `(12, 8)`, `(8, 4)`, `(4, 0)`; `(12, 0)` immediately prints `12`. Maximum starts with an input value so negative inputs work too.

Read [divisibility](/docs/divisibility) and [numeric sequences](/docs/sequences). Use small inputs within the executor’s step and precision limits.
