---
title: Probleme cu cifre
description: Calculează frecvențe de cifre și verifică palindroame numerice.
slug: /digits
sidebar_position: 4
keywords: [MiniScript+, exemple, digits]
---

Folosim numere naturale în limita întregilor exacți. `MOD 10` extrage ultima cifră, iar `DIV 10` o elimină. Vezi [cifrele unui număr](/docs/digits).

## Numără cifrele pare, inclusiv zero

```msp
n = 4072
x = n
count = 0
IF x == 0 THEN
  count = 1
END
WHILE x > 0
  IF (x MOD 10) MOD 2 == 0 THEN
    count = count + 1
  END
  x = x DIV 10
END
PRINT count
```

Rezultatul este `3`: cifrele `4`, `0`, `2`. Pentru `n = 0`, răspunsul este `1`, fiindcă reprezentarea lui zero are o cifră pară. Fără cazul separat, bucla nu ar rula și contorul ar rămâne zero.

## Verifică un palindrom numeric

```msp
n = 1221
x = n
oglindit = 0
WHILE x > 0
  oglindit = oglindit * 10 + x MOD 10
  x = x DIV 10
END
PRINT oglindit
PRINT n == oglindit
```

Se afișează `1221` și `TRUE`. Pentru `120`, oglinditul numeric este `21`, iar verificarea este `FALSE`. Pentru `0`, rezultatul este `0` și `TRUE`. Un număr nu păstrează zerouri la început; pentru coduri precum `"00100"` folosește text și exemplul de [palindrom pe șiruri](/examples/strings).

## Încearcă

Testează `7`, `20`, `135`, `2002`. Precizează rezultatul înainte de rulare. Dacă vrei să accepți numere negative, decide mai întâi dacă semnul se ignoră și lucrează explicit pe `ABS(n)`.
