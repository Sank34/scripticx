---
title: Bucle
description: Contoare, sume, numărători inverse și citire repetată implementate cu bucle MiniScript+.
slug: /loops
sidebar_position: 1
keywords: [exemple bucle MiniScript+, WHILE, FOR]
---

Buclele repetă aceeași operație cât timp o condiție este adevărată sau pe un interval cunoscut.

## Numărare crescătoare

```msp title="contor.msp"
contor = 0

WHILE contor < 5
  PRINT contor
  contor = contor + 1
END
```

Rezultat așteptat: `0, 1, 2, 3, 4`.

## Suma de la 1 la N

```msp title="suma.msp"
n = 5
total = 0

FOR valoare FROM 1 TO n
  total = total + valoare
END

PRINT total
```

Rezultat așteptat: `15`.

## Numărătoare inversă

```msp title="numaratoare.msp"
contor = 5

WHILE contor >= 0
  PRINT contor
  contor = contor - 1
END
```

Rezultat așteptat: `5, 4, 3, 2, 1, 0`.

## Procesarea valorilor citite

```msp title="trei-valori.msp"
total = 0

FOR index FROM 1 TO 3
  INPUT valoare
  total = total + valoare
END

PRINT total
```

Rezultat așteptat: `6`. Introdu `1`, `2`, `3` la cele trei citiri, câte o valoare pe rând.

:::warning
Orice buclă `WHILE` trebuie să înainteze către o condiție falsă. Altfel va rula la nesfârșit.
:::


## Urmărește starea

În exemplul sumei, totalul devine `1`, `3`, `6`, `10`, `15`. Inițializarea lui trebuie să fie înaintea buclei; dacă ai pune `total = 0` în corp, ai pierde suma acumulată. `FOR` include ambele limite. Schimbă `n` în `0`: se execută zero iterații și suma rămâne `0`. Vezi [buclele](/docs/loops) și [sumele și numărările](/docs/aggregates).
