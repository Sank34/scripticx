---
title: Digit problems
description: Count selected digits and check numeric palindromes.
slug: /digits
sidebar_position: 4
keywords: [MiniScript+, exemple, digits]
---

Use non-negative integers within the exact integer range. `MOD 10` extracts the last digit; `DIV 10` removes it. See [digits of a number](/docs/digits).

## Count even digits, including zero

```msp
n = 4072
x = n
count = 0
IF x == 0 THEN
  count = 1
END
WHILE x > 0
  IF (x MOD 10) MOD 2 == 0 THEN
    count = count + 1
  END
  x = x DIV 10
END
PRINT count
```

The result is `3`: digits `4`, `0`, `2`. For `n = 0`, the answer is `1` because zero is written with one even digit. Without the separate case, the loop would never run and the count would remain zero.

## Check a numeric palindrome

```msp
n = 1221
x = n
reversed = 0
WHILE x > 0
  reversed = reversed * 10 + x MOD 10
  x = x DIV 10
END
PRINT reversed
PRINT n == reversed
```

The output is `1221`, then `TRUE`. For `120`, the numeric reversal is `21` and the check gives `FALSE`. For `0`, expect `0`, then `TRUE`. Numbers do not preserve leading zeros; use text and the [string palindrome example](/examples/strings) for identifiers such as `"00100"`.

## Try it

Test `7`, `20`, `135`, `2002`. Predict each result before running. To accept negative inputs, first decide whether the sign should be ignored, then explicitly use `ABS(n)`.
