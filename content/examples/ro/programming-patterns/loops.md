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

## Suma de la 1 la N

```msp title="suma.msp"
n = 5
total = 0

FOR valoare = 1 TO n
  total = total + valoare
END

PRINT total
```

## Numărătoare inversă

```msp title="numaratoare.msp"
contor = 5

WHILE contor >= 0
  PRINT contor
  contor = contor - 1
END
```

## Procesarea valorilor citite

```msp title="trei-valori.msp"
total = 0

FOR index = 1 TO 3
  INPUT valoare
  total = total + valoare
END

PRINT total
```

:::warning
Orice buclă `WHILE` trebuie să înainteze către o condiție falsă. Altfel va rula la nesfârșit.
:::
