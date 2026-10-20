---
title: Conditions and decisions
description: Choose which instructions run with IF, THEN, and ELSE.
slug: /conditions
sidebar_position: 4
keywords: [MiniScript+, conditions]
---

A condition answers a question with `TRUE` or `FALSE`. It lets a program choose a calculation or message. Read [operators](/docs/operators) and [input/output](/docs/input-output) first.

## IF and ELSE

Write a condition after `IF`, followed by `THEN`. Close the block with `END`. An optional `ELSE` branch runs only when the condition is false.

```msp
INPUT n
IF n MOD 2 == 0 THEN
  PRINT "even"
ELSE
  PRINT "odd"
END
```

For `8`, the remainder on division by two is zero, so the output is `even`. For `9`, the output is `odd`. Exactly one branch runs. Zero is even too.

## More than two cases

To distinguish negative, zero, and positive values, check zero inside the branch that has already excluded negative numbers.

```msp
INPUT n
IF n < 0 THEN
  PRINT "negative"
ELSE
  IF n == 0 THEN
    PRINT "zero"
  ELSE
    PRINT "positive"
  END
END
```

Each `IF` needs its own `END`. Indentation shows structure but does not replace these delimiters. Separate independent `IF` statements may execute several blocks; an `IF` with `ELSE` chooses one branch.

## Validate before calculating

Check an operation's restrictions before executing it. Do not calculate an average when there are zero values, or divide by an input without checking the divisor.

```msp
INPUT total
INPUT count
IF count > 0 THEN
  PRINT total / count
ELSE
  PRINT "There are no values."
END
```

With `total = 18` and `count = 4`, the output is `4.5`. With `count = 0`, the message is printed and the division never runs.

## Common mistakes

- `=` assigns; `==` compares.
- An interval needs two comparisons: `n >= 10 AND n <= 20`.
- Included boundaries use `<=` or `>=`; excluded boundaries use `<` or `>`.
- Compare numbers with numbers; preserve `"8"` as text only when that is intentional.

## Practice

1. Print the larger of two inputs. Include equal inputs in your tests.
2. Print `passed` for a grade in `[5, 10]`; handle invalid grades separately.
3. Test parity with `0`, `1`, `2`, and `-3`. Continue with [loops](/docs/loops).
