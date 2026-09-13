# MiniScript+ loops and functions

## FOR

```msp
FOR i FROM 1 TO 5
  PRINT i
END

FOR i FROM 5 TO 1 INCR -2
  PRINT i
END
```

Bounds are inclusive. INCR defaults to 1; use a negative increment to count down. Start, bound and increment can be expressions, including function calls. They are evaluated once when entering the loop. A range pointing in the wrong direction has zero iterations. Bounds and increments must be finite numbers; a zero increment is an error. Each END increments the variable, so after normal completion it contains the first value outside the range. Nested loops should use different variable names.

## FUNCTION and RETURN

```msp
FUNCTION build(x,y)
  PRINT x
  PRINT y
  RETURN x + y
END

build(1,2)
result = build(3,4)
PRINT result
```

The arrow in the original syntax discussion was explanatory; declarations do not contain `-> params`.

Functions are declared at the top level, can be called before their declaration, and can call themselves or other functions. Names and parameters are case-sensitive. Built-in names cannot be redefined. Arguments are evaluated left to right, exactly once, and the argument count must match the declaration.

Each call has its own parameters and local variables. Functions may read global variables; assigning a name inside a function creates or changes a local value. Caller-local variables are not visible in another function. Scalar values are passed by value.

RETURN exits the entire current function immediately, including nested IF, WHILE and FOR blocks. Bare RETURN and reaching END produce no value: this is allowed for standalone calls, but using such a call in an expression is an error. RETURN outside a function is an error. INPUT works inside functions and suspends execution until the caller supplies a value.

Execution is limited to 1,000 steps and 64 active function calls. Each runtime instance owns its own globals, scopes and instruction pointer. The problem evaluator creates a fresh instance for every test case.

## Editor

FUNCTION is cyan in light and dark themes. FOR, FROM, TO, INCR and RETURN have keyword highlighting; function declarations/calls have completions, signature hints and block indentation. Live errors share structural/expression validation with the runtime.

Step-by-step enters function bodies and resumes the calling expression after RETURN. A calling source line can appear twice in the trace: once while entering the function, then when its pending assignment/PRINT completes. The highlighted line is the next source line; runtime errors retain the line inside the function where they occurred.
