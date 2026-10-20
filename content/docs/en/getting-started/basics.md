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

## From a problem to a program

An algorithm is a finite sequence of steps that transforms input into a result. Before coding, ask: what is given, what is required, and which steps connect them? For three notebooks costing 7 each, the inputs are `3` and `7`, the operation is multiplication, and the result is `21`.

Read [variables](/docs/variables), [operators](/docs/operators), [input/output](/docs/input-output), [conditions](/docs/conditions), [loops](/docs/loops), and [strings](/docs/strings), then elementary algorithms and functions. Each lesson introduces an idea, traces an example, and offers exercises.

## Your first program

Use `PRINT` to display a value:

```msp
PRINT "Hello, ScripticX!"
PRINT 2 + 3
```

Keywords and built-in functions are case-insensitive. Variable names and user-defined function names are case-sensitive: `score` and `Score` are different names. Documentation uses uppercase keywords.

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

## Trace execution

In the example with `score = 10` and `bonus = 5`, the first assignment stores `10`, the next stores `5`, and `PRINT score + bonus` calculates and displays `15`. Printing does not change the variables. The editor's step-by-step mode shows the next instruction and current variables; use it when execution differs from your prediction.

MiniScript+ supports scalar values, conditions, loops, strings, and functions. C++ constructs such as `int`, `cin`, arrays, and `#include` belong in a separate C++ project. Reading files through `<fstream>` is not part of MiniScript+ either.

## Check a solution

Test a normal case, a boundary case, and a case that challenges an assumption. For the maximum of two numbers, try different, equal, and negative values. A syntax error prevents an instruction from being parsed; a runtime error occurs at an invalid operation such as division by zero; a logic error may produce a wrong answer without any error message.

The educational executor has a step limit. Start with small inputs, predict the result on paper, then compare it with the program's output.

## Practice

1. Change the first program to print your name and the result of `6 * 7`.
2. Reverse two lines that depend on each other. Explain why a variable must be defined before use.
3. Find the cost of five notebooks priced at 8 each. Expect `40`.
