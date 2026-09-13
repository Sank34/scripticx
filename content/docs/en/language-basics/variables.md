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
