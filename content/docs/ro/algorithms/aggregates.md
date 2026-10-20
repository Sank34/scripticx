---
title: Sume, numărări și extreme
description: Procesează o secvență de valori fără să o memorezi integral.
slug: /aggregates
sidebar_position: 1
keywords: [MiniScript+, aggregates]
---

După [bucle](/docs/loops), poți rezolva probleme în care citești mai multe numere și păstrezi doar informația necesară: un total, un contor sau cea mai bună valoare întâlnită. Acesta este un algoritm de parcurgere: fiecare valoare este procesată o singură dată.

## Suma și numărarea valorilor selectate

Inițializează suma și contorul cu zero. La citirea fiecărui număr, verifică proprietatea cerută. Numai dacă ea este adevărată, actualizează ambele variabile.

```msp
n = 5
suma = 0
count = 0
FOR i FROM 1 TO n
  INPUT x
  IF x MOD 2 == 0 THEN
    suma = suma + x
    count = count + 1
  END
END
PRINT suma
PRINT count
```

Pentru intrările `3`, `8`, `-2`, `5`, `0`, valorile selectate sunt `8`, `-2`, `0`. Suma lor este `6`, iar numărul lor este `3`. Zero contribuie la contor, chiar dacă nu schimbă suma.

După fiecare iterație, suma conține exact totalul numerelor pare citite până atunci. Această proprietate, păstrată de la o iterație la alta, se numește **invariant**. Ea explică de ce rezultatul final este corect.

## Maximul

Inițializarea maximului cu zero nu este corectă când toate valorile sunt negative. Citește prima valoare separat și folosește-o drept candidat inițial.

```msp
n = 4
INPUT maxim
FOR i FROM 2 TO n
  INPUT x
  IF x > maxim THEN
    maxim = x
  END
END
PRINT maxim
```

Pentru `-9`, `-4`, `-12`, `-7`, maximul este `-4`. Algoritmul presupune `n >= 1`. Pentru o secvență goală nu există maxim și cazul trebuie tratat separat. Pentru minim, înlocuiește `>` cu `<`.

## Produsul și media

Elementul neutru al înmulțirii este `1`: un produs inițializat cu `0` va rămâne zero. Media valorilor selectate este `suma / count` numai când `count > 0`. Evită să confunzi numărul total de intrări cu numărul valorilor care îndeplinesc condiția.

Parcurgerea are timp `O(n)` și memorie suplimentară `O(1)`: numărul variabilelor nu crește odată cu numărul intrărilor. MiniScript+ nu oferă momentan tablouri; aceste modele funcționează direct cu valori citite pe rând.

## Exersează

1. Numără valorile strict pozitive. Pentru `-2, 0, 5, 7`, răspunsul este `2`.
2. Află minimul și de câte ori apare. Pentru `4, 1, 3, 1`, obții `1` și `2`.
3. Calculează media numerelor pare și afișează un mesaj când nu există. Testează o singură valoare, toate valorile negative și valori repetate.
