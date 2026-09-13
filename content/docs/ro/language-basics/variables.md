---
title: Variabile
description: Stochează, modifică și reutilizează valori cu nume clare în MiniScript+.
slug: /variables
sidebar_position: 1
keywords: [variabile MiniScript+, atribuire, date]
---

O variabilă oferă un nume unei valori. După atribuire, valoarea poate fi citită sau înlocuită mai târziu în program.

## Atribuirea unei valori

Folosește `=` pentru a atribui expresia din dreapta numelui din stânga.

```msp
scor = 100
numeElev = "Alex"
terminat = FALSE
```

Atribuirea nu afișează nimic. Folosește `PRINT` atunci când vrei să vezi valoarea.

```msp
scor = 100
PRINT scor
```

## Modificarea unei variabile

Partea dreaptă este evaluată prima, apoi rezultatul înlocuiește valoarea veche.

```msp
scor = 10
scor = scor + 5
PRINT scor  # 15
```

Acest model este util pentru contoare și totaluri.

## Denumirea variabilelor

Alege nume care descriu valoarea stocată.

| Recomandat | De evitat | Motiv |
| --- | --- | --- |
| `numarElevi` | `x` | Scopul rămâne clar |
| `scorMaxim` | `lucru` | Valoarea este explicită |
| `esteTerminat` | `flag1` | Intenția logică este vizibilă |

Numele ar trebui să înceapă cu o literă sau `_` și pot conține cifre după primul caracter.

:::note[Stil consecvent]
Ghidurile folosesc `camelCase`, dar consecvența este mai importantă decât alegerea unei convenții anume.
:::

## Expresii

Variabilele pot fi folosite în expresii la fel ca valorile literale.

```msp
latime = 8
inaltime = 5
arie = latime * inaltime

PRINT "Arie:"
PRINT arie
```

## Greșeli frecvente

1. Citirea unei variabile înainte de atribuire.
2. Folosirea unui nume între ghilimele când era necesară valoarea stocată.
3. Reutilizarea unui nume vag pentru valori fără legătură.

```msp
puncte = 25
PRINT "puncte"  # afișează textul puncte
PRINT puncte    # afișează 25
```

În continuare, folosește variabile în [bucle](/docs/loops).
