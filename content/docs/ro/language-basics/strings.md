---
title: Șiruri de caractere
description: Citește text, parcurge caractere și construiește șiruri în MiniScript+.
slug: /strings
sidebar_position: 6
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

## Lungime, poziție și conținut

Lungimea spune câte caractere sunt, iar poziția identifică unul dintre ele. Pentru `"banana"`, lungimea este `6`, dar poziția `6` nu există. Ultima poziție validă este `LEN(text) - 1` numai dacă textul nu este gol.

| Poziție | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Caracter | b | a | n | a | n | a |

`CHAR(text, 2)` este `"n"`; `SUBSTR(text, 2, 3)` este `"nan"`, deoarece selectează pozițiile `2`, `3`, `4`. Nu confunda numărul de caractere cu poziția ultimului caracter selectat. În `SUBSTR`, o lungime zero produce șirul gol.


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

## Tabelul ASCII complet

ASCII asociază codurile `0..127` unor caractere sau comenzi de control. Primele 32 de coduri și `127` nu sunt caractere tipăribile obișnuite. `SP` este spațiul, `HT` este tabul (cod `9`), `LF` este linia nouă (`10`), iar `CR` este revenirea la începutul liniei (`13`). Tabelul arată numele comenzilor, nu execută aceste caractere.

Diacriticele și emoji nu fac parte din ASCII. În MiniScript+, `ORD` și `CHR` folosesc Unicode, care păstrează aceleași coduri pentru primele 128 de caractere. Nu există un singur „ASCII extins” universal pentru codurile peste `127`.

| Cod | Caracter | Cod | Caracter | Cod | Caracter | Cod | Caracter |
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

Datele tabelului pot fi verificate în [standardul ASCII, RFC 20](https://www.rfc-editor.org/rfc/rfc20.html). Cifrele au codurile `48..57`, literele mari englezești `65..90`, iar literele mici englezești `97..122`. Codul spațiului este `32`. Caracterul `"0"` are codul `48`; nu îl confunda cu numărul zero sau cu NUL, al cărui cod este `0`.

```msp
PRINT ORD("A")
PRINT ORD("0")
PRINT CHR(97)
PRINT CHR(32) + "X" + CHR(32)
```

Se afișează `65`, `48`, `a`, apoi `X` între două spații. Pentru a transforma o cifră în valoarea ei numerică, scade `ORD("0")` din codul caracterului. Exemplul următor presupune că toate caracterele sunt cifre ASCII.

```msp
text = "204"
total = 0
FOR i FROM 0 TO LEN(text) - 1
  total = total + ORD(CHAR(text, i)) - ORD("0")
END
PRINT total
```

Rezultatul este `6`. Pentru validare, verifică dacă fiecare cod este între `48` și `57`. Verificarea acestui interval nu recunoaște toate cifrele din toate sistemele de scriere Unicode.

## Inversarea unui șir

Parcurgem caracterele de la ultima poziție spre prima și le adăugăm într-un rezultat inițial gol.

```msp
text = "abcd"
result = ""
FOR i FROM LEN(text) - 1 TO 0 INCR -1
  result = result + CHAR(text, i)
END
PRINT result
```

Rezultatul este `dcba`. Pentru șirul gol, începutul este `-1` și bucla descrescătoare nu intră. Pentru un singur caracter, rezultatul este identic cu intrarea. Inversarea lucrează pe puncte de cod; simbolurile formate din mai multe puncte de cod pot fi despărțite.

Un palindrom este un text egal cu inversul lui. Compară perechi de caractere aflate la aceeași distanță de capete:

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

Se afișează `TRUE`. Prin convenția acestei verificări, textul gol este tot palindrom. Comparația este exactă: `"Ana"` nu este palindrom fără conversie la litere mici. Spațiile și semnele de punctuație contează dacă nu le elimini explicit.

## Numărarea cuvintelor

În această problemă definim un cuvânt drept o secvență nevidă de caractere care nu sunt spațiul simplu `" "`. Numărăm începuturile de cuvinte, nu spațiile; astfel, mai multe spații consecutive nu creează cuvinte în plus.

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

Se afișează `3`. Variabila `inside` reține dacă suntem deja într-un cuvânt. Taburile și liniile noi nu sunt separatori în această definiție; dacă cerința le include, extinde condiția. Nu presupune că toate problemele definesc „cuvânt” la fel.

## Inserare și ștergere

Un șir nu se modifică prin atribuirea unui caracter la o poziție. Pentru inserare la poziția `i`, unește prefixul de lungime `i`, textul de inserat și sufixul care începe la `i`. Pentru ștergerea unui caracter, unește prefixul cu sufixul care începe la `i + 1`.

```msp
text = "abcd"
i = 2
inserted = SUBSTR(text, 0, i) + "X" + SUBSTR(text, i, LEN(text) - i)
deleted = SUBSTR(text, 0, i) + SUBSTR(text, i + 1, LEN(text) - i - 1)
PRINT inserted
PRINT deleted
```

Rezultatele sunt `abXcd` și `abd`. Inserarea acceptă `0 <= i <= LEN(text)`; ștergerea cere `0 <= i < LEN(text)`. Verifică limitele înainte de a calcula lungimea sufixului, ca să nu trimiți o valoare negativă la `SUBSTR`.

## Căutare, cost și greșeli frecvente

`FIND` întoarce doar prima apariție. Pentru `FIND("banana", "ana")`, rezultatul este `1`, nu numărul de apariții. Testează explicit rezultatul cu `!= -1`: poziția `0` este o găsire validă, nu absența textului.

O parcurgere are `n` iterații, dar costul operațiilor din interior contează. Implementarea actuală a unor funcții de text reconstruiește lista punctelor de cod; repetarea lui `CHAR` și concatenarea șirurilor imutabile pot avea un cost total pătratic. Exemplele sunt pentru texte mici, în limitele executorului, și nu promit performanță liniară pentru texte mari.

## Exersează

1. Numără vocalele din `"Ana are mere"`, fără diferență între majuscule și minuscule: sunt `6`. Poți folosi `LOWER` și `FIND("aeiou", caracter)`.
2. Elimină toate spațiile simple din `" a b "`: rezultatul este `"ab"`.
3. Inserează `"!"` la sfârșitul unui șir și testează inclusiv șirul gol.
4. Verifică un palindrom pentru `""`, `"a"`, `"radar"`, `"ab"` și explică fiecare rezultat.
5. Transformă doar literele mici ASCII în majuscule folosind codurile. Compară rezultatul pentru `ă` cu cel obținut prin `UPPER` și explică de ce regula ASCII nu este suficientă pentru diacritice.
