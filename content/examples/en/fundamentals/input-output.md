---
title: Input and output
description: Interactive programs with numbers, text identifiers, and validation.
slug: /input-output
sidebar_position: 3
keywords: [MiniScript+, exemple, input-output]
---

Each `INPUT` waits for one complete value. Submit numbers separately rather than on the same line. Read the [input/output lesson](/docs/input-output) first.

## Rectangle area and perimeter

```msp
INPUT length
INPUT width
IF length > 0 AND width > 0 THEN
  PRINT length * width
  PRINT 2 * (length + width)
ELSE
  PRINT "Invalid sides"
END
```

Submit `6`, then `4`. The program prints `24` and `20` on separate lines. Inputs `0` and `4` produce `Invalid sides`. Validation comes first because this problem requires strictly positive sides.

## Preserve leading zeros in an identifier

```msp
INPUT identifier
PRINT identifier
PRINT LEN(identifier)
```

Enter `"0007"`, including JSON quotes, in the editor console. The output is string `0007`, then number `4`. Without quotes the console interprets `0007` as a number; `LEN` requires text and raises an error. Problem test cases should carry a typed string without extra quote characters in its contents.

## Try it

Test the rectangle with `1` and `1`, then a negative side. Test an empty identifier `""` too. A submitted solution should print only the required results, without extra input prompts.
