---
title: MiniScript+ basics
description: Learn the structure, values, operators, and comments used in a MiniScript+ program.
slug: /basics
sidebar_position: 1
keywords: [MiniScript+ syntax, first program, programming basics]
---

MiniScript+ is a compact language designed for learning algorithmic thinking. A program is read from top to bottom, one instruction at a time.

:::tip[Try each example]
Open the [ScripticX editor](/editor), create a MiniScript+ project, and run the examples while changing one value at a time.
:::

## Your first program

Use `PRINT` to display a value:

```msp
PRINT "Hello, ScripticX!"
PRINT 2 + 3
```

MiniScript+ is case-insensitive, although the documentation uses uppercase keywords to make instructions easy to recognize.

## Statements

Each line contains an instruction or an assignment. You do not need semicolons.

```msp
score = 10
bonus = 5
PRINT score + bonus
```

Blank lines are ignored, so you can use them to separate logical sections.

## Values and operators

MiniScript+ supports numbers, text, and boolean values.

| Kind | Example | Typical use |
| --- | --- | --- |
| Number | `42`, `3.14` | Calculations and counters |
| Text | `"hello"` | Messages and labels |
| Boolean | `TRUE`, `FALSE` | Conditions and decisions |

Common arithmetic operators are `+`, `-`, `*`, `/`, `DIV`, and `MOD`.

```msp
total = 8 + 4
half = total / 2
remainder = 17 MOD 5

PRINT half
PRINT remainder
```

## Comments

Everything after `#` on a line is a comment. Comments explain intent and are not executed.

```msp
# Calculate the final score
base = 80
bonus = 10  # awarded for speed
PRINT base + bonus
```

## Quick checklist

- [x] Write one instruction per line.
- [x] Put text between double quotes.
- [x] Use `#` for explanations.
- [ ] Continue with [variables](/docs/variables).

:::warning
Use straight double quotes (`"`) in code. Typographic quotes copied from rich-text editors are not valid string delimiters.
:::
