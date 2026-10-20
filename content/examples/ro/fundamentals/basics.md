---
title: Programe de bază
description: Programe MiniScript+ scurte pentru afișare, variabile, calcule și primele decizii.
slug: /basics
sidebar_position: 1
keywords: [exemple MiniScript+, programe începători, PRINT]
---

Exemplele izolează câte un concept. Deschide orice bloc în editor, rulează-l și modifică valorile.

## Afișarea a două mesaje

`PRINT` afișează câte o valoare pentru fiecare instrucțiune.

```msp title="salut.msp"
PRINT "Salut"
PRINT "ScripticX"
```

Rezultat așteptat: `Salut, apoi ScripticX`.

## Stocarea și afișarea unei valori

Prima instrucțiune atribuie numărul, iar a doua îl citește.

```msp title="variabila.msp"
scor = 5
PRINT scor
```

Rezultat așteptat: `5`.

## Calcularea unui rezultat

Expresiile pot reutiliza rezultate anterioare.

```msp title="calcul.msp"
primul = 5 + 3
rezultat = primul * 2
PRINT rezultat
```

Rezultat așteptat: `16`.

Rezultatul așteptat:

```text noLineNumbers
16
```

## Luarea unei decizii

Blocul rulează doar când condiția este adevărată.

```msp title="decizie.msp"
valoare = 10

IF valoare > 5 THEN
  PRINT "Mare"
END
```

Rezultat așteptat: `Mare`.

:::tip
Schimbă `valoare` în `3` și rulează din nou. Nu se afișează nimic deoarece condiția devine falsă.
:::


## Ce să modifici

Schimbă valoarea inițială, prezice ieșirea și rulează din nou. O atribuire modifică starea, în timp ce `PRINT` doar afișează o valoare. Dacă programul nu are `INPUT`, toate datele lui sunt deja în cod. Vezi [variabilele](/docs/variables) și [operatorii](/docs/operators).
