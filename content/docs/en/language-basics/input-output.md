---
title: Input and output
description: Read values from the user and present results clearly with INPUT and PRINT.
slug: /input-output
sidebar_position: 3
keywords: [MiniScript+ input, MiniScript+ output, INPUT, PRINT]
---

Input brings values into a program. Output communicates the program's result.

## Display output

`PRINT` accepts text, numbers, variables, and expressions.

```msp
name = "Mara"
score = 95

PRINT "Student:"
PRINT name
PRINT score + 5
```

Use short labels when a number would otherwise be ambiguous.

## Read input

`INPUT` pauses the program, reads a value, and stores it in a variable.

```msp
INPUT age
PRINT age
```

The variable becomes available to every instruction that follows.

## Read text

`INPUT` keeps spaces between words. You can enter `i love bananas` as a single value. Empty input stays an empty string, and whitespace-only input stays text.

In the editor console, numbers and the values `true` and `false` receive their matching types automatically. To keep a code such as `00123` as text, enter `"00123"` with double quotes. You can also enter `""` for an empty string.

```msp
INPUT text
PRINT LEN(text)
```

For `i love bananas`, the program prints `14`. In a problem test case, set the input type to string; do not add quote characters to the value itself.

See [Strings](/docs/strings) for traversal, searching, and conversions.

## Complete example

This program reads two values and prints their sum:

```msp
PRINT "First number:"
INPUT first

PRINT "Second number:"
INPUT second

sum = first + second
PRINT "Sum:"
PRINT sum
```

## Input checklist

- Give every input a meaningful variable name.
- Explain what value is expected before reading it.
- Validate ranges when only certain values are accepted.
- Keep the final output concise and unambiguous.

:::info[Testing]
Run the same program with normal values, boundary values, and unexpected values. This makes assumptions visible before they become bugs.
:::

## Repeating input

Combine `INPUT` with a loop when several values must be processed.

```msp
total = 0

FOR index FROM 1 TO 3
  INPUT value
  total = total + value
END

PRINT total
```

The program reads exactly three values and prints their total.
