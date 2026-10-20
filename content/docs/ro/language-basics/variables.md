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

Pentru lungime, caractere și porțiuni de text, vezi [Șiruri de caractere](/docs/strings).

## Ce păstrează o variabilă?

Valoarea are un tip: număr, șir de caractere sau boolean. `12` este număr, `"12"` este text, iar `TRUE` este o valoare logică. Ghilimelele schimbă sensul: `"12" + 3` produce textul `"123"`, în timp ce `12 + 3` produce numărul `15`.

Variabilele nu au o declarație de tip separată. O atribuire ulterioară poate înlocui valoarea cu una de alt tip, dar astfel de schimbări fac programul mai greu de urmărit. Păstrează un rol clar pentru fiecare nume.

## Atribuirea nu este o ecuație

În `scor = scor + 5`, se citește valoarea veche a lui `scor`, se adună `5`, apoi se memorează rezultatul. Dacă `scor` nu a fost definit înainte, expresia nu are valoarea necesară. După `copie = scor`, schimbarea lui `scor` nu schimbă automat `copie`: ai copiat valoarea din acel moment, nu ai creat o legătură între variabile.

Numele sunt sensibile la majuscule: `total` și `Total` sunt diferite. Folosește litere ASCII, cifre după primul caracter și `_`; evită spațiile, diacriticele în identificatori și numele rezervate.

## Schimbarea a două valori

Dacă vrei să interschimbi două variabile, salvează prima valoare înainte să o suprascrii.

```msp
a = 4
b = 9
temporar = a
a = b
b = temporar
PRINT a
PRINT b
```

Rezultatul este `9`, apoi `4`. Fără `temporar`, instrucțiunile `a = b` și `b = a` ar lăsa ambele variabile cu valoarea `9`.

## Exersează

1. Prezice starea după `a = 2`, `b = a`, `a = 7`: `a` este `7`, `b` este `2`.
2. Stochează lungimea și lățimea unui dreptunghi și afișează aria și perimetrul.
3. Scrie programul de interschimbare și urmărește fiecare atribuire în editor.

Continuă cu [operatorii și expresiile](/docs/operators).
