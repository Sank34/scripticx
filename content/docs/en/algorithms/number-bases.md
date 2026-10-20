---
title: Number bases
description: Understand positional notation and build binary representations.
slug: /number-bases
sidebar_position: 5
keywords: [MiniScript+, number-bases]
---

In base `b`, each digit has a value from `0` to `b - 1`. Positions from right to left have weights `1`, `b`, `b * b`, and so on. Decimal uses `0..9`; binary uses only `0` and `1`.

## Decode a representation

Binary `1101` means `1 * 8 + 1 * 4 + 0 * 2 + 1 = 13`. Distinguish the string `"1101"`, the decimal number `1101`, and the value `13` represented by those binary digits.

To process digits from left to right, multiply the current value by the base, then add the next digit.

```msp
text = "1101"
value = 0
FOR i FROM 0 TO LEN(text) - 1
  digit = ORD(CHAR(text, i)) - ORD("0")
  value = value * 2 + digit
END
PRINT value
```

The result is `13`. Intermediate values are `1`, `3`, `6`, `13`. The example assumes a non-empty string containing binary digits only; validate characters before processing external input.

## Decimal to binary

Repeated division by two produces digits in reverse order. Prepend each remainder to the result string.

```msp
n = 13
x = n
binary = ""
IF x == 0 THEN
  binary = "0"
END
WHILE x > 0
  binary = STR(x MOD 2) + binary
  x = x DIV 2
END
PRINT binary
```

The remainders are `1`, `0`, `1`, `1`; the final string is `1101`. Zero needs a separate case or the result would be empty. This algorithm requires a non-negative integer.

For bases `2..10`, replace divisor `2` with the chosen base. Higher bases need extra digit symbols: hexadecimal uses `A..F` for `10..15`. Do not concatenate `STR(15)` for one hexadecimal digit; use an alphabet such as `"0123456789ABCDEF"` and `CHAR`.

## Practice

1. Convert `0`, `1`, `8`, `15` to binary: `0`, `1`, `1000`, `1111`.
2. Explain why binary `1010` is decimal `10`.
3. Add validation: `102` is not valid binary. Keep decoded numeric values within the exact integer range.
