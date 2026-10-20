---
title: Functions and parameters
description: Split a program into reusable calculations with FUNCTION and RETURN.
slug: /functions
sidebar_position: 1
keywords: [MiniScript+, functions]
---

A function groups instructions under a name. Parameters receive its input values; `RETURN` sends a value back to the caller. This separates a calculation from input and output.

## Declaration and call

```msp
FUNCTION sum(a, b)
  RETURN a + b
END
PRINT sum(7, 5)
result = sum(2, 9)
PRINT result
```

The program prints `12`, then `11`. In the first call, `a` receives `7` and `b` receives `5`; the next call supplies new values. The argument count must match the parameter count.

Declare functions at the top level, outside other functions or blocks. Calls may appear before their declarations. User-defined function names are case-sensitive. Do not redefine built-in names such as `LEN` or `ABS`.

## Local variables

```msp
x = 10
FUNCTION double(x)
  x = x * 2
  RETURN x
END
PRINT double(x)
PRINT x
```

The output is `20`, then `10`. Parameter `x` is local and does not overwrite the global variable with that name. Each call owns its variables. Functions can read globals, but an assignment inside a function creates or updates a local value. Caller-local variables are not visible to other functions.

Arguments are evaluated from left to right, exactly once. Scalar values are passed by value. Return and explicitly assign a result to use it outside the function.

## RETURN and PRINT have different roles

`PRINT` displays a value in the console. `RETURN` supplies it to another calculation and immediately exits the current function, even inside a loop or `IF`. Remaining instructions in that call do not run.

A function that returns no value can be called as a standalone instruction, but cannot be used in an expression. A bare `RETURN` has the same effect. `RETURN` outside a function raises an error.

## Practice

1. Write `maximum(a, b)` and test equal and negative arguments.
2. Write `digitSum(n)` using the [digits lesson](/docs/digits). For `4072`, return `13`.
3. Combine two calls in one expression. Continue with [recursion](/docs/recursion).
