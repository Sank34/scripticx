---
title: Algoritmi
description: Algoritmi clasici MiniScript+ cu stare ușor de urmărit și implementări compacte.
slug: /algorithms
sidebar_position: 2
keywords: [algoritmi MiniScript+, Fibonacci, CMMDC, număr prim]
---

Exemplele combină variabile, condiții și bucle în algoritmi compleți.

## Verificarea unui număr prim

```msp title="prim.msp"
n = 7
divizor = 2
estePrim = TRUE

WHILE divizor < n
  IF n MOD divizor = 0 THEN
    estePrim = FALSE
  END
  divizor = divizor + 1
END

IF estePrim THEN
  PRINT "Prim"
ELSE
  PRINT "Nu este prim"
END
```

## Șirul Fibonacci

```msp title="fibonacci.msp"
numarTermeni = 5
primul = 0
alDoilea = 1

FOR index = 1 TO numarTermeni
  PRINT primul
  urmatorul = primul + alDoilea
  primul = alDoilea
  alDoilea = urmatorul
END
```

## Cel mai mare divizor comun

Metoda scăderilor repetate reduce valoarea mai mare.

```msp title="cmmdc.msp"
primul = 12
alDoilea = 8

WHILE primul != alDoilea
  IF primul > alDoilea THEN
    primul = primul - alDoilea
  ELSE
    alDoilea = alDoilea - primul
  END
END

PRINT primul
```

## Maximul a trei valori

```msp title="maxim-trei.msp"
primul = 3
alDoilea = 7
alTreilea = 5
maxim = primul

IF alDoilea > maxim THEN
  maxim = alDoilea
END

IF alTreilea > maxim THEN
  maxim = alTreilea
END

PRINT maxim
```
