---
title: Divizibilitate și numere prime
description: Găsește divizori, verifică primalitatea și calculează CMMDC.
slug: /divisibility
sidebar_position: 3
keywords: [MiniScript+, divisibility]
---

Un număr pozitiv `d` divide un întreg `n` dacă `n MOD d == 0`. Operația verifică dacă împărțirea nu lasă rest. În această lecție folosim numere naturale; pentru testarea divizorilor și primalității cerem `n >= 1`.

## Divizorii unui număr

```msp
n = 18
FOR d FROM 1 TO n
  IF n MOD d == 0 THEN
    PRINT d
  END
END
```

Programul afișează `1`, `2`, `3`, `6`, `9`, `18`. Este o variantă ușor de urmărit, cu `O(n)` teste. Divizorii vin în perechi `d` și `n DIV d`; pentru o variantă mai eficientă, ajunge să cauți până când `d * d > n`. La pătratele perfecte, cei doi membri ai unei perechi pot coincide și nu trebuie numărați de două ori.

## Numere prime

Un număr prim are exact doi divizori pozitivi: `1` și el însuși. `0` și `1` nu sunt prime. Dacă un număr compus are un divizor mai mare decât rădăcina sa pătrată, celălalt membru al perechii este mai mic decât aceasta; de aici limita testării.

```msp
n = 29
prim = n >= 2
d = 2
WHILE d * d <= n AND prim
  IF n MOD d == 0 THEN
    prim = FALSE
  END
  d = d + 1
END
PRINT prim
```

Pentru `29`, rezultatul este `TRUE`; pentru `49`, divizorul `7` produce `FALSE`. Condiția trebuie să includă egalitatea, altfel `49` ar trece testul. Sunt cel mult `O(√n)` încercări.

## Algoritmul lui Euclid

CMMDC al lui `a` și `b` este egal cu CMMDC al lui `b` și restului `a MOD b`. Repetăm până când al doilea număr devine zero.

```msp
a = 84
b = 30
WHILE b != 0
  rest = a MOD b
  a = b
  b = rest
END
PRINT a
```

Perechile devin `(84, 30)`, `(30, 24)`, `(24, 6)`, `(6, 0)`, deci rezultatul este `6`. Restul trebuie calculat înainte de a modifica `a`. Pentru un singur argument zero, rezultatul este celălalt. Cazul `(0, 0)` nu are un cel mai mare divizor pozitiv; stabilește separat convenția problemei.

Pentru `a` și `b` pozitive, CMMMC este `(a DIV cmmdc) * b`. Împărțirea înaintea înmulțirii reduce mărimea rezultatului intermediar, dar verifică în continuare limitele de precizie.

## Exersează

1. Numără divizorii lui `36`: sunt `9`.
2. Testează primalitatea pentru `1`, `2`, `4`, `49`, `97`.
3. Calculează CMMDC pentru `24` și `18`, apoi CMMMC: `6`, respectiv `72`.
4. Descompune `72` în factori primi prin împărțiri repetate: `2`, `2`, `2`, `3`, `3`. Mărește divizorul numai după ce nu mai divide valoarea rămasă.
