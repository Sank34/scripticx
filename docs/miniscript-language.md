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

## Strings

Strings are immutable values written with double quotes and JSON escapes (`\n`, `\t`, `\"`, `\\`). Existing `+` concatenation and `==`/`!=` equality apply. `+` converts a scalar to text when either operand is a string; other arithmetic operators still require numbers. Built-in names are case-insensitive and cannot be used for variables or user functions.

All positions and lengths below count Unicode code points, starting at **0**. A supplementary character such as `😀` counts as one. Combining marks count separately; no normalization or grapheme segmentation is performed.

| Function | Contract | Example |
| --- | --- | --- |
| `LEN(text)` | Number of code points | `LEN("aă😀")` returns `3` |
| `CHAR(text, index)` | One code point; invalid indices are errors | `CHAR("aă😀", 2)` returns `"😀"` |
| `SUBSTR(text, start, count)` | Up to `count` code points; `start == LEN(text)` returns `""`; larger starts are errors | `SUBSTR("abc", 1, 10)` returns `"bc"` |
| `FIND(text, search)` | First code-point index, `-1` if absent; empty search returns `0` | `FIND("😀ab", "b")` returns `2` |
| `ORD(character)` | Exactly one Unicode scalar value; empty strings, multiple code points and lone surrogates are errors | `ORD("a")` returns `97` |
| `CHR(code)` | A Unicode scalar from `0` to `1114111`, excluding `55296..57343` | `CHR(128512)` returns `"😀"` |
| `LOWER(text)` | Unicode lowercase conversion without locale selection | `LOWER("ȘȚABC")` returns `"șțabc"` |
| `UPPER(text)` | Unicode uppercase conversion; output length may change | `UPPER("abc")` returns `"ABC"` |
| `STR(value)` | Explicit scalar-to-text conversion | `STR(123)` returns `"123"` |

Indices, starts, counts and codes must be non-negative safe integers. Text functions reject non-string arguments. Wrong argument counts are errors in live syntax validation and execution. Errors retain the calling source line. `CHAR` is read-only; rebuild a string to replace a character:

```msp
s = "banana"
i = 1
s = SUBSTR(s, 0, i) + "o" + SUBSTR(s, i + 1, LEN(s) - i - 1)
PRINT s
```

`INPUT x` reads a complete value, including internal and surrounding spaces. In the editor, bare finite numbers and `true`/`false` retain their existing scalar behavior. Empty or whitespace-only input remains text. Use JSON quotes to force numeric or boolean-looking text: enter `"00123"`, `"true"` or `""`. Test cases already carry typed values: use a string input directly, without adding quote characters.

### Educational transform with a repeated key

The selected rule is defined on character codes, not string multiplication:

```text
k = "le papoi"
y[i] = ORD(CHAR(x, i)) * ORD(CHAR(k, i MOD LEN(k))) + 1
```

The key contains eight characters, including the space. Repeat it cyclically and serialize the resulting integers separated by spaces. Reversal uses `CHR((y[i] - 1) / ORD(CHAR(k, i MOD LEN(k))))`; for externally supplied ciphertext, validate integer divisibility and the resulting Unicode scalar first. No character in this key has code zero, so each position is invertible. This is an educational encoding, unsuitable for protecting real passwords.

See `MSP_code_ex/string_encryption.msp` for the complete program. For the input `i love bananas`, it prints:

```text
11341 3233 3457 12433 11447 11313 3553 10291 10477 11111 3105 12321 9410 12881
```

The earlier arbitrary numeric example does not define this rule. Empty input produces an empty output line. The runtime stores text values directly; parsing and function-call evaluation use the same implementation in the editor and the server grader.
