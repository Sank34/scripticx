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

## Entering console input

Each `INPUT` waits for one complete value. Use two instructions for two numbers and submit them separately. Entering `2 3` at one prompt produces a string, not two numbers. In examples with three reads, enter and submit one number three times.

| Editor console input | Value read | Type |
| --- | --- | --- |
| `12` | 12 | Number |
| `3.5` | 3.5 | Number |
| `true` | true | Boolean |
| `Ana has apples` | Ana has apples | String |
| `"00123"` | 00123 | String |
| `""` | Empty string | String |

Use a decimal point. Text preserves spaces, including leading and trailing ones. Input is part of execution: once the value is submitted, the program resumes at the following instruction.

## Output for people and graders

Each `PRINT` produces a separate output. Prompts such as “First number:” help in an interactive example. A submitted problem solution must follow the required output format exactly; extra prompts can make an answer incorrect. Labels are not required by the language.

Use `STR` or concatenation when combining text and numbers. For a numeric sum inside a message, write `"Total: " + STR(a + b)` so addition happens before conversion to text.

## Practice

1. Read two rectangle sides and print only the area. Inputs `6` and `4` should produce `24`.
2. Read identifier `"0007"` and verify its length: `4`.
3. Read a name with spaces and print it between two `|` characters to observe leading and trailing spaces.
