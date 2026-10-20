---
title: Condiții
description: Exemple practice cu IF, ELSE, comparații și expresii logice.
slug: /conditions
sidebar_position: 2
keywords: [condiții MiniScript+, exemple IF ELSE, ramificare]
---

Condițiile aleg instrucțiunile executate de program.

## IF simplu

```msp title="if-simplu.msp"
temperatura = 28

IF temperatura > 25 THEN
  PRINT "Cald"
END
```

Rezultat așteptat: `Cald`.

## IF și ELSE

Este executată exact una dintre ramuri.

```msp title="if-else.msp"
scor = 72

IF scor >= 50 THEN
  PRINT "Promovat"
ELSE
  PRINT "Încearcă din nou"
END
```

Rezultat așteptat: `Promovat`.

## Par sau impar

`MOD` returnează restul împărțirii.

```msp title="par-impar.msp"
numar = 14

IF numar MOD 2 == 0 THEN
  PRINT "Par"
ELSE
  PRINT "Impar"
END
```

Rezultat așteptat: `Par`.

## Maximul a două valori

```msp title="maxim.msp"
primul = 5
alDoilea = 8

IF primul > alDoilea THEN
  PRINT primul
ELSE
  PRINT alDoilea
END
```

Rezultat așteptat: `8`.

:::note
Testează fiecare condiție cu valori de ambele părți ale limitei și cu o valoare exact pe limită.
:::


## Testează limitele

Pentru promovare testează `49`, `50`, `51`: limita `50` este inclusă. La paritate testează `0`, `1`, `-3`; zero este par. Pentru maxim testează și două valori egale sau ambele negative. Comparația folosește `==`, iar atribuirea `=`. Explicația completă este în [condiții](/docs/conditions).
