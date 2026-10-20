---
title: Baze de numerație
description: Înțelege notația pozițională și construiește reprezentări binare.
slug: /number-bases
sidebar_position: 5
keywords: [MiniScript+, number-bases]
---

În baza `b`, fiecare cifră are o valoare de la `0` la `b - 1`. Pozițiile, numărate de la dreapta, au ponderile `1`, `b`, `b * b` și așa mai departe. Baza zece folosește cifrele `0..9`; baza doi folosește doar `0` și `1`.

## Citește valoarea unei reprezentări

Numărul binar `1101` reprezintă `1 * 8 + 1 * 4 + 0 * 2 + 1 = 13`. Nu confunda textul `"1101"`, numărul zecimal `1101` și valoarea `13` a acelei reprezentări binare.

Pentru a procesa cifre de la stânga la dreapta, înmulțește rezultatul curent cu baza și adaugă cifra nouă.

```msp
text = "1101"
valoare = 0
FOR i FROM 0 TO LEN(text) - 1
  cifra = ORD(CHAR(text, i)) - ORD("0")
  valoare = valoare * 2 + cifra
END
PRINT valoare
```

Rezultatul este `13`. Valorile intermediare sunt `1`, `3`, `6`, `13`. Exemplul presupune un text nevid care conține doar cifre binare; pentru intrări citite, verifică fiecare caracter înainte de calcul.

## Din zecimal în binar

Împărțirile repetate la doi obțin cifrele în ordine inversă. Pune fiecare rest la începutul textului construit.

```msp
n = 13
x = n
binar = ""
IF x == 0 THEN
  binar = "0"
END
WHILE x > 0
  binar = STR(x MOD 2) + binar
  x = x DIV 2
END
PRINT binar
```

Resturile sunt `1`, `0`, `1`, `1`; textul final este `1101`. Zero are nevoie de cazul separat, altfel rezultatul ar fi șirul gol. Algoritmul presupune un întreg nenegativ.

Pentru o bază între `2` și `10`, poți înlocui divizorul `2` cu baza. Peste baza zece trebuie să alegi simboluri pentru cifrele suplimentare: în hexazecimal, `A..F` reprezintă valorile `10..15`. Nu concatena `STR(15)` pentru o singură cifră hexazecimală; folosește un alfabet precum `"0123456789ABCDEF"` și `CHAR`.

## Exersează

1. Convertește `0`, `1`, `8`, `15` în binar: `0`, `1`, `1000`, `1111`.
2. Verifică manual de ce `1010` în baza doi este `10` în baza zece.
3. Adaugă validare: `102` nu este o reprezentare binară validă. Păstrează rezultatele numerice în limita întregilor exacți.
