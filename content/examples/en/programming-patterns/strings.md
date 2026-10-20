---
title: Working with text
description: Count vowels, check palindromes, and find overlapping matches.
slug: /strings
sidebar_position: 3
keywords: [MiniScript+, exemple, strings]
---

These programs use the functions from [strings](/docs/strings). Positions begin at `0`; `LEN` gives the character count.

## Count vowels regardless of case

```msp
text = LOWER("Ana are mere")
vowels = 0
FOR i FROM 0 TO LEN(text) - 1
  IF FIND("aeiou", CHAR(text, i)) != -1 THEN
    vowels = vowels + 1
  END
END
PRINT vowels
```

The result is `6`. `LOWER` normalizes case; `FIND != -1` checks membership in the chosen alphabet. Only the five vowels written in the code are recognized; extend the search string for other letters. Empty input gives `0`.

## Reverse and check a palindrome

```msp
text = "radar"
reversed = ""
FOR i FROM LEN(text) - 1 TO 0 INCR -1
  reversed = reversed + CHAR(text, i)
END
PRINT reversed
PRINT text == reversed
```

The output is `radar`, then `TRUE`. With `"ab"`, it is `ba`, then `FALSE`. Comparison is exact: case, spaces, and punctuation count. Under this convention, empty text is a palindrome. Reversal operates on Unicode code points rather than composed visual symbols.

## Count overlapping matches

```msp
text = "banana"
pattern = "ana"
count = 0
IF LEN(pattern) > 0 THEN
  FOR i FROM 0 TO LEN(text) - LEN(pattern)
    IF SUBSTR(text, i, LEN(pattern)) == pattern THEN
      count = count + 1
    END
  END
END
PRINT count
```

The result is `2`: matches start at positions `1` and `3`. Advancing one position at a time includes overlaps. This example defines an empty pattern as having zero matches. A pattern longer than the text is not found.

## Try it

Set the text to `"aaaa"` and pattern to `"aa"`: expect `3`. Test an absent pattern and empty text. Use small inputs; repeated operations on immutable strings can become costly for large text.
