---
title: Operators and expressions
description: Build calculations and conditions; understand division and evaluation order.
slug: /operators
sidebar_position: 2
keywords: [MiniScript+, operators]
---

An expression combines values, variables, operators, and function calls to produce one value. In `price * quantity`, `*` is the operator and the two names are its operands. An assignment such as `total = price * quantity` stores that result.

## Arithmetic

| Operator | Meaning | Example | Result |
| --- | --- | --- | --- |
| `+` | Addition | `7 + 4` | `11` |
| `-` | Subtraction | `7 - 4` | `3` |
| `*` | Multiplication | `7 * 4` | `28` |
| `/` | Division | `7 / 4` | `1.75` |
| `DIV` | Integer quotient, truncated toward zero | `7 DIV 4` | `1` |
| `MOD` or `%` | Remainder | `7 MOD 4` | `3` |

For non-negative integers and a positive divisor, `a = (a DIV b) * b + a MOD b`. A zero divisor raises an error. With negatives, `-7 DIV 4` is `-1` and `-7 MOD 4` is `-3`; the remainder is not always positive.

```msp
PRINT 23 DIV 5
PRINT 23 MOD 5
PRINT 23 / 5
```

The output is `4`, `3`, `4.6`: twenty-three objects make four complete groups of five, with three left over.

## Evaluation order

Parentheses come first. Next come unary operators (`-`, `NOT`), then `*`, `/`, `DIV`, `MOD`, then `+`, `-`, comparisons, `AND`, and finally `OR`. Binary operators at the same level associate from left to right.

```msp
PRINT 2 + 3 * 4
PRINT (2 + 3) * 4
PRINT 20 DIV 3 * 2
```

The results are `14`, `20`, `12`. Use `NOT (a == b)` to negate a comparison explicitly.

## Comparisons and logic

`==` checks equality and `!=` checks inequality. Numbers also support `<`, `<=`, `>`, `>=`. Assignment uses one `=`, equality uses two. Equality respects types: the number `3` differs from the string `"3"`.

| A | B | A AND B | A OR B |
| --- | --- | --- | --- |
| `FALSE` | `FALSE` | `FALSE` | `FALSE` |
| `FALSE` | `TRUE` | `FALSE` | `TRUE` |
| `TRUE` | `FALSE` | `FALSE` | `TRUE` |
| `TRUE` | `TRUE` | `TRUE` | `TRUE` |

`NOT` reverses a Boolean. Express an interval as `x >= 2 AND x <= 8`, not `2 <= x <= 8`. `AND` and `OR` short-circuit: when the left operand decides the result, the right operand is not evaluated. In `b != 0 AND a / b > 2`, the left check protects the division. Order matters: do not put the division before the check.

## Numeric functions

`ABS(x)` gives the absolute value. `INT(x)` and `TRUNC(x)` remove the fractional part toward zero; `FLOOR(x)` rounds down. `ROUND(x)` rounds to an integer; `ROUND(x, 2)` rounds to two decimal places. Ties round toward positive infinity: `ROUND(-1.5)` is `-1`. Numbers have finite precision: avoid exact equality between calculated fractions and keep exact integers within ±9007199254740991.

## Practice

1. Split 37 minutes into complete hours and remaining minutes: `0` and `37`.
2. Predict `18 DIV 4 + 18 MOD 4`, then check: `6`.
3. Write a condition for a positive even number. Continue with [conditions](/docs/conditions).
