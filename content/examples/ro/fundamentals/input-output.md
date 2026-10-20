---
title: Citire și afișare
description: Programe interactive cu date numerice, coduri text și validare.
slug: /input-output
sidebar_position: 3
keywords: [MiniScript+, exemple, input-output]
---

Fiecare `INPUT` așteaptă o valoare completă. Trimite numerele separat, nu pe aceeași linie. Citește mai întâi [lecția despre intrare și ieșire](/docs/input-output).

## Aria și perimetrul unui dreptunghi

```msp
INPUT lungime
INPUT latime
IF lungime > 0 AND latime > 0 THEN
  PRINT lungime * latime
  PRINT 2 * (lungime + latime)
ELSE
  PRINT "Laturi invalide"
END
```

Introdu `6`, apoi `4`. Programul afișează `24` și `20`, pe linii separate. Pentru `0` și `4`, afișează `Laturi invalide`. Validarea se face înaintea calculelor, fiindcă în această problemă laturile trebuie să fie strict pozitive.

## Păstrează zerourile unui cod

```msp
INPUT cod
PRINT cod
PRINT LEN(cod)
```

Introdu `"0007"`, cu ghilimele JSON, în consola editorului. Ieșirea este textul `0007`, apoi numărul `4`. Dacă introduci `0007` fără ghilimele, consola îl interpretează ca număr; `LEN` cere text și produce eroare. În testele unei probleme, păstrează intrarea ca valoare de tip șir, fără ghilimele adăugate în conținut.

## Încearcă

Testează dreptunghiul cu `1` și `1`, apoi cu o latură negativă. Pentru coduri testează și șirul gol `""`. Dacă trimiți o soluție la evaluator, afișează doar rezultatele cerute, fără mesaje suplimentare de solicitare a datelor.
