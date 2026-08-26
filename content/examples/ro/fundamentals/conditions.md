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

## Par sau impar

`MOD` returnează restul împărțirii.

```msp title="par-impar.msp"
numar = 14

IF numar MOD 2 = 0 THEN
  PRINT "Par"
ELSE
  PRINT "Impar"
END
```

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

:::note
Testează fiecare condiție cu valori de ambele părți ale limitei și cu o valoare exact pe limită.
:::
