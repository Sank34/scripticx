---
title: Șiruri de caractere
description: Citește text, parcurge caractere și construiește șiruri în MiniScript+.
slug: /strings
sidebar_position: 4
keywords: [șiruri de caractere, text, MiniScript+, LEN, CHAR, SUBSTR, ORD, CHR]
---

Un șir de caractere păstrează text: un nume, o propoziție sau un cod precum `"00123"`. Scrie textul între ghilimele duble. Pentru un șir gol, folosește `""`.

## Citește și combină text

Cu `INPUT`, poți citi o propoziție întreagă, cu spații între cuvinte. În consola editorului, poți introduce `i love bananas` fără ghilimele. Numerele și valorile `true` sau `false` primesc automat tipul corespunzător; dacă vrei să păstrezi `00123` ca text, introdu `"00123"` cu ghilimele.

```msp title="citeste-text.msp"
INPUT text
PRINT LEN(text)
```

Pentru `i love bananas`, programul afișează `14`. O intrare goală are lungimea `0`; o intrare cu un singur spațiu are lungimea `1`. În cazurile de test ale unei probleme, intrările au deja un tip: păstrează valoarea ca șir, fără ghilimele suplimentare în text.

Operatorul `+` lipește două șiruri. Dacă unul dintre operanzi este text, îl convertește și pe celălalt la text. Poți folosi `STR` când vrei să faci conversia explicit.

```msp title="combina-text.msp"
nume = "Mara"
puncte = 12
PRINT "Salut, " + nume + "!"
PRINT "Puncte: " + STR(puncte)
```

Într-un șir, `\"` reprezintă o ghilimea, `\\` un backslash, `\n` o linie nouă și `\t` un tab. `==` și `!=` compară șirurile exact, ținând cont de literele mari și mici.

## Găsește un caracter sau o porțiune de text

Pozițiile încep de la **0**. În `"banana"`, primul caracter este la poziția `0`, iar ultimul la `5`. `SUBSTR` primește o poziție de început și un număr de caractere, nu o poziție de sfârșit.

```msp title="pozitii.msp"
text = "banana"
PRINT LEN(text)
PRINT CHAR(text, 0)
PRINT SUBSTR(text, 1, 3)
PRINT FIND(text, "na")
```

Rezultatul este:

```text
6
b
ana
2
```

| Funcție | Ce întoarce |
| --- | --- |
| `LEN(text)` | Numărul de puncte de cod Unicode. Pentru `""`, întoarce `0`. |
| `CHAR(text, index)` | Caracterul de la poziția `index`. Poziția trebuie să existe. |
| `SUBSTR(text, start, count)` | Cel mult `count` caractere, începând de la `start`. |
| `FIND(text, search)` | Poziția primei apariții a lui `search` sau `-1` dacă nu apare. Căutarea unui șir gol întoarce `0`. |
| `LOWER(text)` | Textul cu litere mici. |
| `UPPER(text)` | Textul cu litere mari. |
| `STR(value)` | Reprezentarea ca text a unui număr, șir sau boolean. |
| `ORD(character)` | Codul Unicode al unui singur caracter. |
| `CHR(code)` | Caracterul corespunzător unui cod Unicode scalar valid. |

Numele funcțiilor încorporate nu disting majusculele: `len(text)` și `LEN(text)` au același efect. Aceste nume sunt rezervate; alege alte nume pentru variabilele și funcțiile tale.

`CHAR`, `SUBSTR` și `FIND` primesc text, nu numere. Indicii și lungimile trebuie să fie întregi nenegativi. `CHAR("abc", 3)` produce o eroare. `SUBSTR("abc", 3, 2)` întoarce `""`, iar `SUBSTR("abc", 1, 10)` întoarce `"bc"`. Un început mai mare decât lungimea șirului produce o eroare.

## Parcurge un șir

O buclă de la `0` la `LEN(text) - 1` vizitează fiecare caracter o dată. Pentru un șir gol, bucla nu execută nicio iterație.

```msp title="numara-a.msp"
text = "banana"
aparitii = 0
FOR i FROM 0 TO LEN(text) - 1
  IF CHAR(text, i) == "a" THEN
    aparitii = aparitii + 1
  END
END
PRINT aparitii
```

Programul afișează `3`. Folosește `CHAR(text, i)` pentru a citi un caracter; sintaxa `text[i]` nu este disponibilă.

Șirurile sunt imutabile. Pentru a schimba un caracter, construiește un șir nou din porțiunea dinainte, caracterul ales și porțiunea de după.

```msp title="schimba-caracter.msp"
text = "banana"
i = 1
text = SUBSTR(text, 0, i) + "o" + SUBSTR(text, i + 1, LEN(text) - i - 1)
PRINT text
```

Rezultatul este `bonana`.

## Diacritice, emoji și coduri Unicode

Funcțiile numără puncte de cod Unicode. `ă` și `😀` ocupă fiecare o poziție, chiar dacă reprezentarea lor internă are dimensiuni diferite.

```msp title="unicode.msp"
text = "aă😀"
PRINT LEN(text)
PRINT CHAR(text, 2)
PRINT ORD("ă")
PRINT CHR(259)
PRINT UPPER("șțabc")
PRINT LOWER("ȘȚABC")
```

Programul afișează `3`, `😀`, `259`, `ă`, `ȘȚABC` și `șțabc`, fiecare pe o linie. Un simbol alcătuit din mai multe puncte de cod poate ocupa mai multe poziții. De exemplu, o literă urmată de un accent combinant are lungimea `2`; funcțiile nu normalizează textul.

`ORD` cere exact un caracter. `CHR` acceptă întregi de la `0` la `1114111`, cu excepția intervalului `55296..57343`, rezervat codurilor surogat. Conversiile `LOWER` și `UPPER` urmează regulile Unicode fără o limbă aleasă și pot schimba lungimea textului.

Încearcă [exemplul de codificare cu o cheie](/examples/string-encryption) pentru a combina parcurgerea unui șir, codurile Unicode și operațiile aritmetice.
