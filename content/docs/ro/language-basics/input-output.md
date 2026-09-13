---
title: Intrare și ieșire
description: Citește valori și prezintă rezultate clare cu INPUT și PRINT.
slug: /input-output
sidebar_position: 3
keywords: [intrare MiniScript+, ieșire MiniScript+, INPUT, PRINT]
---

Intrarea aduce valori într-un program. Ieșirea comunică rezultatul programului.

## Afișarea rezultatului

`PRINT` acceptă texte, numere, variabile și expresii.

```msp
nume = "Mara"
scor = 95

PRINT "Elev:"
PRINT nume
PRINT scor + 5
```

Folosește etichete scurte când un număr ar fi ambiguu fără context.

## Citirea datelor

`INPUT` oprește programul, citește o valoare și o stochează într-o variabilă.

```msp
INPUT varsta
PRINT varsta
```

Variabila devine disponibilă tuturor instrucțiunilor următoare.

## Exemplu complet

Programul citește două valori și afișează suma lor:

```msp
PRINT "Primul număr:"
INPUT primul

PRINT "Al doilea număr:"
INPUT alDoilea

suma = primul + alDoilea
PRINT "Suma:"
PRINT suma
```

## Listă de verificare

- Oferă fiecărei valori de intrare un nume relevant.
- Explică valoarea așteptată înainte de citire.
- Validează intervalul când sunt permise doar anumite valori.
- Păstrează rezultatul final scurt și neambiguu.

:::info[Testare]
Rulează același program cu valori normale, valori-limită și valori neașteptate. Presupunerile devin astfel vizibile înainte să producă erori.
:::

## Citirea repetată

Combină `INPUT` cu o buclă când trebuie procesate mai multe valori.

```msp
total = 0

FOR index = 1 TO 3
  INPUT valoare
  total = total + valoare
END

PRINT total
```

Programul citește exact trei valori și afișează totalul lor.
