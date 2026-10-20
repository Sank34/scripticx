---
title: Functions and recursion
description: Reuse calculations, preserve local variables, and trace recursive calls.
slug: /functions
sidebar_position: 6
keywords: [MiniScript+, exemple, functions]
---

Read [functions](/docs/functions) and [recursion](/docs/recursion) first. Each block is a complete program that can be opened independently in the editor.

## Reuse a digit-sum calculation

```msp
FUNCTION digitSum(n)
  total = 0
  WHILE n > 0
    total = total + n MOD 10
    n = n DIV 10
  END
  RETURN total
END
x = 4072
PRINT digitSum(x)
PRINT digitSum(99)
PRINT x
```

The output is `13`, `18`, `4072`. Parameter `n` changes inside the call without changing `x`. Each call owns its `total`. The function assumes a non-negative integer and correctly returns `0` for zero.

## Recursive factorial

```msp
FUNCTION factorial(n)
  IF n == 0 THEN
    RETURN 1
  END
  RETURN n * factorial(n - 1)
END
PRINT factorial(5)
```

The result is `120`. Calls descend from `5` to `0`; the base case returns `1`, then each call multiplies the returned value by its own argument. Test `0` and `1`: both have factorial `1`.

The argument must be a non-negative integer. Do not run this example with negative or fractional arguments: they do not reach the base case. Execution has step and active-call limits; use small values. Large results also lose numeric precision.

## Try it

Add `isPalindrome(n)` returning a Boolean, using the [numeric reversal example](/examples/digits). Compare iterative and recursive versions of the sum from `1` through `n`. Use `RETURN` for a value needed in other calculations and `PRINT` for output.
