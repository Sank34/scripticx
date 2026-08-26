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

FOR index = 1 TO 3
  INPUT value
  total = total + value
END

PRINT total
```

The program reads exactly three values and prints their total.
