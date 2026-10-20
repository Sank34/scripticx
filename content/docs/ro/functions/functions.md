---
title: Funcții și parametri
description: Împarte un program în calcule reutilizabile cu FUNCTION și RETURN.
slug: /functions
sidebar_position: 1
keywords: [MiniScript+, functions]
---

O funcție grupează instrucțiuni sub un nume. Parametrii primesc datele de intrare ale funcției, iar `RETURN` trimite o valoare înapoi la locul apelului. Astfel poți separa un calcul de citirea și afișarea datelor.

## Declarare și apel

```msp
FUNCTION suma(a, b)
  RETURN a + b
END
PRINT suma(7, 5)
rezultat = suma(2, 9)
PRINT rezultat
```

Programul afișează `12`, apoi `11`. La primul apel, `a` primește `7` și `b` primește `5`. La al doilea apel, aceeași funcție are valori noi. Numărul argumentelor trebuie să coincidă cu numărul parametrilor.

Declară funcțiile la nivelul principal al programului, în afara altor funcții sau blocuri. Poți apela o funcție și înaintea declarației sale. Numele funcțiilor definite de tine sunt sensibile la majuscule. Nu redefini numele funcțiilor încorporate precum `LEN` sau `ABS`.

## Variabile locale

```msp
x = 10
FUNCTION dubleaza(x)
  x = x * 2
  RETURN x
END
PRINT dubleaza(x)
PRINT x
```

Se afișează `20` și `10`. Parametrul `x` este local și nu modifică variabila globală cu același nume. Fiecare apel are propriile variabile. O funcție poate citi variabile globale, dar o atribuire în funcție creează sau actualizează o valoare locală; nu modifică globalul. Variabilele locale ale apelantului nu sunt vizibile în altă funcție.

Argumentele sunt evaluate de la stânga la dreapta, o singură dată. Valorile scalare sunt transmise prin valoare. Pentru a folosi un rezultat în exterior, întoarce-l și atribuie-l explicit.

## RETURN și PRINT au roluri diferite

`PRINT` afișează un rezultat în consolă. `RETURN` îl pune la dispoziția altui calcul și oprește imediat funcția, chiar dacă se află într-o buclă sau într-un `IF`. Instrucțiunile rămase în apel nu se mai execută.

O funcție fără valoare returnată poate fi apelată ca instrucțiune separată, dar nu poate fi folosită într-o expresie. Un `RETURN` fără expresie se comportă la fel. `RETURN` în afara unei funcții este eroare.

## Exersează

1. Scrie `maxim(a, b)` și testează argumente egale sau negative.
2. Scrie `sumaCifrelor(n)` folosind lecția despre [cifre](/docs/digits). Pentru `4072`, întoarce `13`.
3. Folosește două apeluri ale aceleiași funcții într-o expresie. Continuă cu [recursivitatea](/docs/recursion).
