---
title: Bazele MiniScript+
description: Învață structura, valorile, operatorii și comentariile folosite într-un program MiniScript+.
slug: /basics
sidebar_position: 1
keywords: [sintaxă MiniScript+, primul program, bazele programării]
---

MiniScript+ este un limbaj compact, creat pentru învățarea gândirii algoritmice. Un program este citit de sus în jos, instrucțiune cu instrucțiune.

:::tip[Încearcă fiecare exemplu]
Deschide [editorul ScripticX](/editor), creează un proiect MiniScript+ și rulează exemplele modificând câte o valoare.
:::

## Primul program

Folosește `PRINT` pentru a afișa o valoare:

```msp
PRINT "Salut, ScripticX!"
PRINT 2 + 3
```

MiniScript+ nu diferențiază literele mari de cele mici, însă documentația scrie cuvintele-cheie cu majuscule pentru a fi ușor de recunoscut.

## Instrucțiuni

Fiecare linie conține o instrucțiune sau o atribuire. Nu sunt necesare punct și virgulă.

```msp
scor = 10
bonus = 5
PRINT scor + bonus
```

Liniile goale sunt ignorate și pot separa secțiunile logice ale programului.

## Valori și operatori

MiniScript+ acceptă numere, texte și valori logice.

| Tip | Exemplu | Utilizare obișnuită |
| --- | --- | --- |
| Număr | `42`, `3.14` | Calcule și contoare |
| Text | `"salut"` | Mesaje și etichete |
| Logic | `TRUE`, `FALSE` | Condiții și decizii |

Operatorii aritmetici uzuali sunt `+`, `-`, `*`, `/`, `DIV` și `MOD`.

```msp
total = 8 + 4
jumatate = total / 2
rest = 17 MOD 5

PRINT jumatate
PRINT rest
```

## Comentarii

Tot ce urmează după `#` pe o linie este comentariu și nu va fi executat.

```msp
# Calculează scorul final
baza = 80
bonus = 10  # acordat pentru viteză
PRINT baza + bonus
```

## Listă de verificare

- [x] Scrie câte o instrucțiune pe linie.
- [x] Pune textele între ghilimele duble.
- [x] Folosește `#` pentru explicații.
- [ ] Continuă cu [variabilele](/docs/variables).

:::warning
Folosește ghilimele duble drepte (`"`) în cod. Ghilimelele tipografice copiate din editoare rich-text nu delimitează corect un text.
:::
