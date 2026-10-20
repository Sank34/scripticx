---
title: Funcții și recursivitate
description: Reutilizează calcule, păstrează variabilele locale și urmărește apelurile recursive.
slug: /functions
sidebar_position: 6
keywords: [MiniScript+, exemple, functions]
---

Citește lecțiile despre [funcții](/docs/functions) și [recursivitate](/docs/recursion). Fiecare bloc de mai jos este un program complet, care poate fi deschis separat în editor.

## Suma cifrelor, reutilizată

```msp
FUNCTION sumaCifrelor(n)
  total = 0
  WHILE n > 0
    total = total + n MOD 10
    n = n DIV 10
  END
  RETURN total
END
x = 4072
PRINT sumaCifrelor(x)
PRINT sumaCifrelor(99)
PRINT x
```

Se afișează `13`, `18`, `4072`. Parametrul `n` se schimbă în interiorul apelului, dar `x` rămâne neschimbat. Fiecare apel are propriul `total`. Funcția presupune un număr natural și întoarce corect `0` pentru intrarea `0`.

## Factorial recursiv

```msp
FUNCTION factorial(n)
  IF n == 0 THEN
    RETURN 1
  END
  RETURN n * factorial(n - 1)
END
PRINT factorial(5)
```

Rezultatul este `120`. Apelurile coboară de la `5` la `0`; cazul de bază întoarce `1`, apoi fiecare apel înmulțește rezultatul primit cu propriul argument. Testează `0` și `1`: ambele au factorialul `1`.

Argumentul trebuie să fie întreg și nenegativ. Nu rula exemplul cu un argument negativ sau fracționar: nu ar ajunge la cazul de bază. Executorul are limite de pași și de apeluri active; folosește valori mici. Pentru valori mari se pierde și precizia numerică.

## Încearcă

Adaugă o funcție `estePalindrom(n)` care întoarce un boolean, folosind [oglinditul](/examples/digits). Compară apoi o variantă iterativă și una recursivă pentru suma numerelor de la `1` la `n`. Folosește `RETURN` pentru valori necesare altor calcule și `PRINT` doar pentru ieșire.
