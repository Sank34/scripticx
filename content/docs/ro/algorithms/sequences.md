---
title: Șiruri numerice și recurențe
description: Generează termeni, urmărește starea și evită memorarea inutilă.
slug: /sequences
sidebar_position: 4
keywords: [MiniScript+, sequences]
---

Un șir numeric este o succesiune ordonată de numere. Uneori termenul se calculează direct din poziție; alteori depinde de termenii anteriori. Stabilește întotdeauna de unde începe numerotarea.

## Progresie aritmetică

Dacă primul termen este `3` și diferența este `4`, șirul începe cu `3, 7, 11, 15`. După afișare, adunăm diferența ca să pregătim termenul următor.

```msp
termen = 3
FOR i FROM 1 TO 4
  PRINT termen
  termen = termen + 4
END
```

Formula directă a termenului de pe poziția `i >= 1` este `3 + (i - 1) * 4`. Folosește formula când ai nevoie de o singură poziție, parcurgerea când ai nevoie de toți termenii.

## Șirul lui Fibonacci

Alegem convenția `F(0) = 0`, `F(1) = 1`. Fiecare termen ulterior este suma celor doi precedenți. Sunt suficiente două valori și o variabilă temporară.

```msp
a = 0
b = 1
FOR i FROM 0 TO 6
  PRINT a
  urmator = a + b
  a = b
  b = urmator
END
```

Se afișează `0, 1, 1, 2, 3, 5, 8`, fiecare pe o linie. La începutul iterației `i`, `a` este `F(i)`, iar `b` este `F(i + 1)`. Dacă ai actualiza `a` înainte de a calcula suma, ai pierde termenul vechi.

## Cost și limite

Generarea primilor `n` termeni are timp `O(n)` și memorie suplimentară `O(1)`. Termenii cresc repede; la Fibonacci, valorile dincolo de `F(78)` nu mai sunt toate întregi exacte în reprezentarea numerică a limbajului. Limita de pași a executorului contează separat de precizia numerică.

## Exersează

1. Afișează primii cinci termeni ai progresiei cu primul termen `2` și diferența `3`: `2, 5, 8, 11, 14`.
2. Modifică exemplul Fibonacci ca să afișeze doar `F(6) = 8`.
3. Generează puterile lui `2` până la `32`, pornind de la `1` și înmulțind termenul cu `2`.
