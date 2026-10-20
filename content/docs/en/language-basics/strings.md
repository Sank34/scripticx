---
title: Strings
description: Read text, walk through characters, and build strings in MiniScript+.
slug: /strings
sidebar_position: 6
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

## Length, position, and content

Length tells you how many characters exist; a position identifies one of them. `"banana"` has length `6`, but no position `6`. The last valid position is `LEN(text) - 1` only when the string is non-empty.

| Position | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Character | b | a | n | a | n | a |

`CHAR(text, 2)` is `"n"`; `SUBSTR(text, 2, 3)` is `"nan"`, selecting positions `2`, `3`, `4`. The count is not the final position. A zero count in `SUBSTR` produces an empty string.


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

## Complete ASCII table

ASCII assigns codes `0..127` to characters and control commands. The first 32 codes and `127` are not ordinary printable characters. `SP` means space; `HT` is a tab (`9`), `LF` a line feed (`10`), and `CR` a carriage return (`13`). The table displays control names rather than executing those characters.

Accented letters and emoji are outside ASCII. MiniScript+ uses Unicode for `ORD` and `CHR`, preserving the same codes for the first 128 characters. There is no single universal “extended ASCII” for codes above `127`.

| Code | Character | Code | Character | Code | Character | Code | Character |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | NUL | 32 | SP | 64 | `@` | 96 | `` ` `` |
| 1 | SOH | 33 | `!` | 65 | `A` | 97 | `a` |
| 2 | STX | 34 | `"` | 66 | `B` | 98 | `b` |
| 3 | ETX | 35 | `#` | 67 | `C` | 99 | `c` |
| 4 | EOT | 36 | `$` | 68 | `D` | 100 | `d` |
| 5 | ENQ | 37 | `%` | 69 | `E` | 101 | `e` |
| 6 | ACK | 38 | `&` | 70 | `F` | 102 | `f` |
| 7 | BEL | 39 | `'` | 71 | `G` | 103 | `g` |
| 8 | BS | 40 | `(` | 72 | `H` | 104 | `h` |
| 9 | HT | 41 | `)` | 73 | `I` | 105 | `i` |
| 10 | LF | 42 | `*` | 74 | `J` | 106 | `j` |
| 11 | VT | 43 | `+` | 75 | `K` | 107 | `k` |
| 12 | FF | 44 | `,` | 76 | `L` | 108 | `l` |
| 13 | CR | 45 | `-` | 77 | `M` | 109 | `m` |
| 14 | SO | 46 | `.` | 78 | `N` | 110 | `n` |
| 15 | SI | 47 | `/` | 79 | `O` | 111 | `o` |
| 16 | DLE | 48 | `0` | 80 | `P` | 112 | `p` |
| 17 | DC1 | 49 | `1` | 81 | `Q` | 113 | `q` |
| 18 | DC2 | 50 | `2` | 82 | `R` | 114 | `r` |
| 19 | DC3 | 51 | `3` | 83 | `S` | 115 | `s` |
| 20 | DC4 | 52 | `4` | 84 | `T` | 116 | `t` |
| 21 | NAK | 53 | `5` | 85 | `U` | 117 | `u` |
| 22 | SYN | 54 | `6` | 86 | `V` | 118 | `v` |
| 23 | ETB | 55 | `7` | 87 | `W` | 119 | `w` |
| 24 | CAN | 56 | `8` | 88 | `X` | 120 | `x` |
| 25 | EM | 57 | `9` | 89 | `Y` | 121 | `y` |
| 26 | SUB | 58 | `:` | 90 | `Z` | 122 | `z` |
| 27 | ESC | 59 | `;` | 91 | `[` | 123 | `{` |
| 28 | FS | 60 | `<` | 92 | `\` | 124 | `\|` |
| 29 | GS | 61 | `=` | 93 | `]` | 125 | `}` |
| 30 | RS | 62 | `>` | 94 | `^` | 126 | `~` |
| 31 | US | 63 | `?` | 95 | `_` | 127 | DEL |

Check the table against [the ASCII standard, RFC 20](https://www.rfc-editor.org/rfc/rfc20.html). Digits occupy `48..57`, uppercase English letters `65..90`, and lowercase English letters `97..122`. Space has code `32`. Character `"0"` has code `48`; distinguish it from the number zero and NUL, whose code is `0`.

```msp
PRINT ORD("A")
PRINT ORD("0")
PRINT CHR(97)
PRINT CHR(32) + "X" + CHR(32)
```

The output is `65`, `48`, `a`, then `X` between two spaces. Convert a digit character to its numeric value by subtracting `ORD("0")`. The next example assumes every character is an ASCII digit.

```msp
text = "204"
total = 0
FOR i FROM 0 TO LEN(text) - 1
  total = total + ORD(CHAR(text, i)) - ORD("0")
END
PRINT total
```

The result is `6`. Validate each code against `48..57` for external input. This test recognizes ASCII digits, not every Unicode numeral.

## Reverse a string

Visit characters from the last position toward the first and append them to an initially empty result.

```msp
text = "abcd"
result = ""
FOR i FROM LEN(text) - 1 TO 0 INCR -1
  result = result + CHAR(text, i)
END
PRINT result
```

The result is `dcba`. For empty input, the start is `-1` and the descending loop runs zero times. One character remains unchanged. Reversal operates on code points and may split symbols made of several code points.

A palindrome equals its reversal. Compare pairs at equal distances from opposite ends:

```msp
text = "radar"
left = 0
right = LEN(text) - 1
palindrome = TRUE
WHILE left < right AND palindrome
  IF CHAR(text, left) != CHAR(text, right) THEN
    palindrome = FALSE
  END
  left = left + 1
  right = right - 1
END
PRINT palindrome
```

The output is `TRUE`. Under this check, an empty string is also a palindrome. Comparison is exact: `"Ana"` needs lowercasing to count as a palindrome. Spaces and punctuation matter unless explicitly removed.

## Count words

For this problem, a word is a non-empty run of characters other than the plain space `" "`. Count word starts rather than spaces; repeated spaces then create no extra words.

```msp
text = "  Ana  are mere "
inside = FALSE
words = 0
FOR i FROM 0 TO LEN(text) - 1
  IF CHAR(text, i) == " " THEN
    inside = FALSE
  ELSE
    IF NOT inside THEN
      words = words + 1
    END
    inside = TRUE
  END
END
PRINT words
```

The output is `3`. Variable `inside` records whether a word has already started. Tabs and newlines are not separators under this definition; extend the condition when required. Different problems may define words differently.

## Insertion and deletion

Strings cannot be changed by assigning a character to a position. To insert at `i`, join the prefix of length `i`, the inserted text, and the suffix starting at `i`. To delete a character, join that prefix to the suffix starting at `i + 1`.

```msp
text = "abcd"
i = 2
inserted = SUBSTR(text, 0, i) + "X" + SUBSTR(text, i, LEN(text) - i)
deleted = SUBSTR(text, 0, i) + SUBSTR(text, i + 1, LEN(text) - i - 1)
PRINT inserted
PRINT deleted
```

The results are `abXcd` and `abd`. Insertion allows `0 <= i <= LEN(text)`; deletion requires `0 <= i < LEN(text)`. Check bounds before calculating suffix lengths so that `SUBSTR` never receives a negative count.

## Search, cost, and common mistakes

`FIND` returns only the first occurrence. `FIND("banana", "ana")` returns `1`, not an occurrence count. Compare explicitly with `!= -1`: position `0` is a successful match.

A traversal performs `n` iterations, but the work inside each matters. Some current text functions rebuild code-point arrays; repeated `CHAR` calls and immutable concatenation may have quadratic total cost. These are small educational examples within the executor's limits, not promises of linear performance on large text.

## Practice

1. Count vowels in `"Ana are mere"`, ignoring case: there are `6`. Try `LOWER` and `FIND("aeiou", character)`.
2. Remove plain spaces from `" a b "`: expect `"ab"`.
3. Insert `"!"` at the end, including into an empty string.
4. Check `""`, `"a"`, `"radar"`, and `"ab"` for palindromes and explain each result.
5. Uppercase only ASCII lowercase letters through their codes. Compare the result for `ă` with `UPPER` and explain why the ASCII rule does not cover accented letters.
