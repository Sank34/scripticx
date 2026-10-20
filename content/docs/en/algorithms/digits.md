---
title: Digits of a number
description: Extract digits, calculate their sum, and reverse a non-negative integer.
slug: /digits
sidebar_position: 2
keywords: [MiniScript+, digits]
---

For a non-negative integer, the last decimal digit is the remainder on division by `10`. Integer division by `10` removes that digit. Repeating these operations visits digits from right to left. Review [DIV and MOD](/docs/operators) first.

## Sum of digits

```msp
n = 4072
x = n
sum = 0
WHILE x > 0
  digit = x MOD 10
  sum = sum + digit
  x = x DIV 10
END
PRINT sum
PRINT n
```

| x before | Extracted digit | Sum after | x after |
| --- | --- | --- | --- |
| 4072 | 2 | 2 | 407 |
| 407 | 7 | 9 | 40 |
| 40 | 0 | 9 | 4 |
| 4 | 4 | 13 | 0 |

The output is `13`, then `4072`. The algorithm consumes the copy `x`, preserving `n`. When `n = 0`, the loop never runs, but the initial sum `0` is already correct.

## Reverse a number

Append a digit to the right by multiplying the current result by `10` and adding that digit.

```msp
n = 1204
x = n
reversed = 0
WHILE x > 0
  reversed = reversed * 10 + x MOD 10
  x = x DIV 10
END
PRINT reversed
```

The result is `4021`. Reversing `1200` gives the number `21`: numbers do not preserve leading zeros. If zeros belong to an identifier, use a [string](/docs/strings).

## Digit count and edge cases

Start a counter at zero and increment it whenever you remove a digit. Handle `n = 0` separately: its decimal representation contains one digit, though `WHILE x > 0` runs zero times. For negatives, decide whether to process `ABS(n)`; a minus sign is not a digit.

Every step removes a digit, so `k` digits take `O(k)` steps. Keep calculations within the language's exact integer range; a reversed number may be larger than its input.

## Practice

1. Count even digits in `4072`: there are `3`, including zero.
2. Test whether a number equals its reversal; try `0`, `7`, `1221`, `120`.
3. Find the product of the digits of `205`: it is `0`, not `10`.
