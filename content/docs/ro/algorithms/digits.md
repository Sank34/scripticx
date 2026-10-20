---
title: Cifrele unui număr
description: Extrage cifre, calculează suma și construiește oglinditul unui număr natural.
slug: /digits
sidebar_position: 2
keywords: [MiniScript+, digits]
---

Pentru un număr natural, ultima cifră este restul împărțirii la `10`. Împărțirea întreagă la `10` elimină acea cifră. Repetând operațiile, parcurgem cifrele de la dreapta la stânga. Ai nevoie de [DIV și MOD](/docs/operators).

## Suma cifrelor

```msp
n = 4072
x = n
suma = 0
WHILE x > 0
  cifra = x MOD 10
  suma = suma + cifra
  x = x DIV 10
END
PRINT suma
PRINT n
```

| x înainte | Cifra extrasă | Suma după pas | x după pas |
| --- | --- | --- | --- |
| 4072 | 2 | 2 | 407 |
| 407 | 7 | 9 | 40 |
| 40 | 0 | 9 | 4 |
| 4 | 4 | 13 | 0 |

Se afișează `13`, apoi `4072`. Copia `x` este consumată de algoritm, în timp ce `n` rămâne disponibil pentru alte calcule. Pentru `n = 0`, bucla nu intră, dar suma inițială `0` este răspunsul corect.

## Oglinditul

Pentru a adăuga o cifră la dreapta unui număr, înmulțește numărul cu `10` și adună cifra.

```msp
n = 1204
x = n
oglindit = 0
WHILE x > 0
  oglindit = oglindit * 10 + x MOD 10
  x = x DIV 10
END
PRINT oglindit
```

Rezultatul este `4021`. Pentru `1200`, rezultatul numeric este `21`: un număr nu păstrează zerouri la început. Dacă zerourile fac parte dintr-un cod, folosește un [șir de caractere](/docs/strings), nu un număr.

## Numărul de cifre și cazuri-limită

Pornește un contor de la zero și mărește-l la fiecare eliminare. Tratează separat `n = 0`, fiindcă reprezentarea lui conține o cifră, deși bucla `WHILE x > 0` nu rulează. Pentru negative, decide dacă lucrezi pe `ABS(n)`; semnul minus nu este cifră.

Fiecare pas elimină o cifră, deci sunt `O(k)` pași pentru `k` cifre. Păstrează calculele în intervalul întregilor exacți al limbajului; oglindirea poate produce o valoare mai mare decât intrarea.

## Exersează

1. Numără cifrele pare ale lui `4072`: sunt `3`, inclusiv zero.
2. Verifică dacă `n` este palindrom comparându-l cu oglinditul; testează `0`, `7`, `1221`, `120`.
3. Calculează produsul cifrelor lui `205`: rezultatul este `0`, nu `10`.
