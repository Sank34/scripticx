---
title: Encode text with a key
description: Read text and a key, then turn each character into a number.
slug: /string-encryption
sidebar_position: 7
keywords: [MiniScript+, strings, encoding, key, ORD, CHR]
---

The program reads the text and key from the user. For each text character, multiply its Unicode code by the code of the matching key character, then add `1`.

## The rule

```text
y[i] = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
```

If the text is longer than the key, start the key again from the beginning. The expression `i MOD LEN(key)` chooses the key position for any key length. Spaces and accented letters are processed just like other characters.

For example, with the text `salut` and the key `abc`, the first calculation is `ORD("s") * ORD("a") + 1`, or `115 * 97 + 1 = 11156`.

## Complete program

The function takes both the text and key as parameters. The key must have at least one character and must not contain the character with code `0`; the program checks both conditions before calculating.

The result is one string of numbers separated by spaces. The separator lets us identify each number when decoding.

```msp title="encode.msp"
FUNCTION encrypt(x, key)
  IF LEN(key) == 0 THEN
    RETURN "The key cannot be empty."
  END
  FOR j FROM 0 TO LEN(key) - 1
    IF ORD(CHAR(key, j)) == 0 THEN
      RETURN "The key cannot contain the character with code 0."
    END
  END
  y = ""
  FOR i FROM 0 TO LEN(x) - 1
    n = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
    IF i > 0 THEN
      y = y + " "
    END
    y = y + STR(n)
  END
  RETURN y
END

INPUT x
INPUT key
PRINT encrypt(x, key)
```

At the first input, enter the text `salut`. At the second, enter the key `abc`. The program prints:

```text
11156 9507 10693 11350 11369
```

You can change the text and key on every run. With a valid key, empty text produces an empty string. If the text or key contains only digits and should stay a string, enter the value in quotes in the editor console, such as `"00123"`.

## Recover one character

Subtract `1` from the number, divide by the key character code, and convert the result with `CHR`. This program recovers the first character in the example:

```msp title="decode-one-character.msp"
number = 11156
key = "abc"
position = 0
keyCode = ORD(CHAR(key, position MOD LEN(key)))
PRINT CHR((number - 1) / keyCode)
```

The result is `s`. To recover the whole text, repeat the operation at each position with the same key. For numbers from another source, also check divisibility and whether the resulting Unicode code is valid.

This exercise demonstrates a reversible text transformation. Do not use it to protect real passwords.

See [Strings](/docs/strings) for the functions used here.
