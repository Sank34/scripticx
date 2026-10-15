---
title: Strings
description: Read text, walk through characters, and build strings in MiniScript+.
slug: /strings
sidebar_position: 4
keywords: [strings, text, MiniScript+, LEN, CHAR, SUBSTR, ORD, CHR]
---

A string holds text: a name, a sentence, or a code such as `"00123"`. Write strings in double quotes. Use `""` for an empty string.

## Read and combine text

`INPUT` reads a complete value, including spaces between words. In the editor console, you can enter `i love bananas` without quotes. Numbers and the values `true` and `false` receive their matching types automatically; to keep `00123` as text, enter `"00123"` with quotes.

```msp title="read-text.msp"
INPUT text
PRINT LEN(text)
```

For `i love bananas`, the program prints `14`. Empty input has length `0`; a single space has length `1`. Problem test cases already have typed inputs: keep the value as a string without adding quote characters to its contents.

The `+` operator joins strings. When either operand is text, it converts the other operand to text too. Use `STR` when you want to make that conversion explicit.

```msp title="combine-text.msp"
name = "Mara"
points = 12
PRINT "Hello, " + name + "!"
PRINT "Points: " + STR(points)
```

Inside a string, `\"` represents a quote, `\\` a backslash, `\n` a new line, and `\t` a tab. `==` and `!=` compare strings exactly, including letter case.

## Find a character or part of a string

Positions start at **0**. In `"banana"`, the first character is at position `0` and the last is at `5`. `SUBSTR` takes a starting position and a character count, rather than an ending position.

```msp title="positions.msp"
text = "banana"
PRINT LEN(text)
PRINT CHAR(text, 0)
PRINT SUBSTR(text, 1, 3)
PRINT FIND(text, "na")
```

The output is:

```text
6
b
ana
2
```

| Function | Return value |
| --- | --- |
| `LEN(text)` | The number of Unicode code points. Returns `0` for `""`. |
| `CHAR(text, index)` | The character at `index`. The position must exist. |
| `SUBSTR(text, start, count)` | Up to `count` characters, starting at `start`. |
| `FIND(text, search)` | The first position of `search`, or `-1` if absent. An empty search returns `0`. |
| `LOWER(text)` | The text in lowercase. |
| `UPPER(text)` | The text in uppercase. |
| `STR(value)` | The text representation of a number, string, or boolean. |
| `ORD(character)` | The Unicode code of exactly one character. |
| `CHR(code)` | The character for a valid Unicode scalar value. |

Built-in names are case-insensitive: `len(text)` and `LEN(text)` have the same effect. These names are reserved; choose different names for your own variables and functions.

`CHAR`, `SUBSTR`, and `FIND` take text, not numbers. Indices and lengths must be non-negative integers. `CHAR("abc", 3)` raises an error. `SUBSTR("abc", 3, 2)` returns `""`, while `SUBSTR("abc", 1, 10)` returns `"bc"`. A start beyond the string length raises an error.

## Walk through a string

A loop from `0` to `LEN(text) - 1` visits each character once. For an empty string, the loop runs zero times.

```msp title="count-a.msp"
text = "banana"
occurrences = 0
FOR i FROM 0 TO LEN(text) - 1
  IF CHAR(text, i) == "a" THEN
    occurrences = occurrences + 1
  END
END
PRINT occurrences
```

The program prints `3`. Use `CHAR(text, i)` to read a character; `text[i]` syntax is not available.

Strings are immutable. To replace a character, build a new string from the part before it, the replacement, and the part after it.

```msp title="replace-character.msp"
text = "banana"
i = 1
text = SUBSTR(text, 0, i) + "o" + SUBSTR(text, i + 1, LEN(text) - i - 1)
PRINT text
```

The result is `bonana`.

## Accents, emoji, and Unicode codes

The functions count Unicode code points. `ă` and `😀` each occupy one position, even though their internal representations have different sizes.

```msp title="unicode.msp"
text = "aă😀"
PRINT LEN(text)
PRINT CHAR(text, 2)
PRINT ORD("ă")
PRINT CHR(259)
PRINT UPPER("șțabc")
PRINT LOWER("ȘȚABC")
```

The program prints `3`, `😀`, `259`, `ă`, `ȘȚABC`, and `șțabc`, each on its own line. A symbol made from several code points may occupy several positions. For example, a letter followed by a combining accent has length `2`; the functions do not normalize text.

`ORD` requires exactly one character. `CHR` accepts integers from `0` to `1114111`, excluding `55296..57343`, the surrogate range. `LOWER` and `UPPER` follow Unicode rules without selecting a language and may change the text length.

Try [the example of encoding with a key](/examples/string-encryption) to combine string traversal, Unicode codes, and arithmetic.
