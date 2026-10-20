---
title: Base conversions
description: Convert a number to hexadecimal and validate binary text.
slug: /number-bases
sidebar_position: 5
keywords: [MiniScript+, exemple, number-bases]
---

These examples extend [number bases](/docs/number-bases). They use non-negative integers and text representations, without arrays.

## Decimal to hexadecimal

```msp
n = 254
x = n
alphabet = "0123456789ABCDEF"
result = ""
IF x == 0 THEN
  result = "0"
END
WHILE x > 0
  result = CHAR(alphabet, x MOD 16) + result
  x = x DIV 16
END
PRINT result
```

The result is `FE` because `15 * 16 + 14 = 254`. Remainders `14`, `15` select `E`, `F` from the alphabet and are prepended to the result. Zero prints `0`.

## Binary to decimal with digit validation

```msp
INPUT text
valid = LEN(text) > 0
value = 0
FOR i FROM 0 TO LEN(text) - 1
  character = CHAR(text, i)
  IF character == "0" OR character == "1" THEN
    value = value * 2 + ORD(character) - ORD("0")
  ELSE
    valid = FALSE
  END
END
IF valid THEN
  PRINT value
ELSE
  PRINT "Invalid representation"
END
```

Enter `"1101"` with quotes in the editor console to read it as text: expect `13`. Inputs `"102"` and `""` produce `Invalid representation`. Every new digit shifts the accumulated value one position in base two. Use short text so the result remains within the exact integer range.

## Try it

Convert `16`, `255`, `256`: expect `10`, `FF`, `100`. For binary, test `"0"`, `"0011"`, and text containing spaces; spaces are invalid under this definition.
