---
title: Variables
description: Store, update, and reuse values with clear MiniScript+ variable names.
slug: /variables
sidebar_position: 1
keywords: [MiniScript+ variables, assignment, data]
---

A variable gives a name to a value. Once assigned, that value can be read again or replaced later in the program.

## Assign a value

Use `=` to assign the expression on the right to the name on the left.

```msp
score = 100
playerName = "Alex"
finished = FALSE
```

Assignment does not print anything by itself. Use `PRINT` when you want to inspect a value.

```msp
score = 100
PRINT score
```

## Update a variable

The right-hand side is evaluated first, then the result replaces the old value.

```msp
score = 10
score = score + 5
PRINT score  # 15
```

This pattern is especially useful for counters and totals.

## Naming variables

Choose names that describe the value they contain.

| Prefer | Avoid | Reason |
| --- | --- | --- |
| `studentCount` | `x` | The purpose stays clear |
| `maximumScore` | `thing` | The stored value is explicit |
| `isFinished` | `flag1` | Boolean intent is visible |

Variable names should begin with a letter or underscore and may contain digits after the first character.

:::note[Consistent style]
`camelCase` is used throughout these guides, but consistency matters more than a particular naming convention.
:::

## Expressions

Variables can participate in any expression just like literal values.

```msp
width = 8
height = 5
area = width * height

PRINT "Area:"
PRINT area
```

## Common mistakes

1. Reading a variable before assigning it.
2. Using a quoted name when you meant the stored value.
3. Reusing one vague name for unrelated values.

```msp
points = 25
PRINT "points"  # prints the text points
PRINT points    # prints 25
```

Next, use variables to control [loops](/docs/loops).

For length, characters, and parts of text, see [Strings](/docs/strings).

## What does a variable hold?

Values have types: number, string, or Boolean. `12` is a number, `"12"` is text, and `TRUE` is a Boolean. Quotes change meaning: `"12" + 3` produces the string `"123"`, whereas `12 + 3` produces the number `15`.

There is no separate type declaration. A later assignment can replace a value with another type, but changing a variable's role makes a program harder to follow. Keep one clear purpose for each name.

## Assignment is not an equation

In `score = score + 5`, the old score is read first, `5` is added, then the result is stored. Reading a variable before it exists raises an error. After `copy = score`, updating `score` does not automatically update `copy`: assignment copies the current scalar value rather than connecting the variables.

Names are case-sensitive: `total` and `Total` differ. Use ASCII letters, digits after the first character, and `_`; avoid spaces, accented identifiers, and reserved names.

## Swap two values

Save the first value before overwriting it when exchanging two variables.

```msp
a = 4
b = 9
temporary = a
a = b
b = temporary
PRINT a
PRINT b
```

The result is `9`, then `4`. Without the temporary variable, `a = b` followed by `b = a` leaves both values at `9`.

## Practice

1. Predict the state after `a = 2`, `b = a`, `a = 7`: `a` is `7`, `b` is `2`.
2. Store the sides of a rectangle and print its area and perimeter.
3. Trace the swap program assignment by assignment.

Continue with [operators and expressions](/docs/operators).
