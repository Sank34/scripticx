---
title: Basic programs
description: Small MiniScript+ programs for output, variables, calculations, and first decisions.
slug: /basics
sidebar_position: 1
keywords: [MiniScript+ examples, beginner programs, PRINT]
---

These examples isolate one concept at a time. Open any block in the editor, run it, and then change its values.

## Display two messages

`PRINT` displays one value per instruction.

```msp title="hello.msp"
PRINT "Hello"
PRINT "World"
```

## Store and display a value

The first instruction assigns a number; the second reads it.

```msp title="variable.msp"
score = 5
PRINT score
```

## Calculate a result

Expressions can reuse earlier results.

```msp title="calculation.msp"
first = 5 + 3
result = first * 2
PRINT result
```

Expected output:

```text noLineNumbers
16
```

## Make a decision

The block runs only when the condition is true.

```msp title="decision.msp"
value = 10

IF value > 5 THEN
  PRINT "Large"
END
```

:::tip
Change `value` to `3` and run the program again. No message is displayed because the condition becomes false.
:::
