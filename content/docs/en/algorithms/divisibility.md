---
title: Divisibility and prime numbers
description: Find divisors, test primality, and calculate a greatest common divisor.
slug: /divisibility
sidebar_position: 3
keywords: [MiniScript+, divisibility]
---

A positive integer `d` divides an integer `n` when `n MOD d == 0`. The remainder test tells us whether division is exact. This lesson uses non-negative integers; divisor enumeration and primality tests assume `n >= 1`.

## Enumerate divisors

```msp
n = 18
FOR d FROM 1 TO n
  IF n MOD d == 0 THEN
    PRINT d
  END
END
```

The output is `1`, `2`, `3`, `6`, `9`, `18`. This straightforward version performs `O(n)` tests. Divisors come in pairs `d` and `n DIV d`; a faster search stops once `d * d > n`. In a perfect square, both members of a pair can coincide; count that divisor once.

## Prime numbers

A prime has exactly two positive divisors: `1` and itself. Neither `0` nor `1` is prime. If a composite number has a divisor larger than its square root, the paired divisor is smaller; this bounds our search.

```msp
n = 29
prime = n >= 2
d = 2
WHILE d * d <= n AND prime
  IF n MOD d == 0 THEN
    prime = FALSE
  END
  d = d + 1
END
PRINT prime
```

For `29`, the result is `TRUE`; for `49`, divisor `7` produces `FALSE`. The boundary must include equality or `49` would incorrectly pass. There are at most `O(√n)` trials.

## Euclid’s algorithm

The greatest common divisor of `a` and `b` equals that of `b` and `a MOD b`. Repeat until the second value is zero.

```msp
a = 84
b = 30
WHILE b != 0
  remainder = a MOD b
  a = b
  b = remainder
END
PRINT a
```

The pairs become `(84, 30)`, `(30, 24)`, `(24, 6)`, `(6, 0)`, so the answer is `6`. Compute the remainder before overwriting `a`. When exactly one argument is zero, the result is the other argument. `(0, 0)` has no largest positive common divisor; handle the problem's convention separately.

For positive `a` and `b`, the least common multiple is `(a DIV gcd) * b`. Dividing before multiplying reduces the intermediate value, but precision limits still apply.

## Practice

1. Count the divisors of `36`: there are `9`.
2. Test primality for `1`, `2`, `4`, `49`, `97`.
3. Find the GCD and LCM of `24` and `18`: `6` and `72`.
4. Factor `72` through repeated exact divisions: `2`, `2`, `2`, `3`, `3`. Increase the trial divisor only after it no longer divides the remaining value.
