---
title: Bucle
description: Repetă instrucțiuni în siguranță cu buclele WHILE și FOR din MiniScript+.
slug: /loops
sidebar_position: 2
keywords: [bucle MiniScript+, bucla while, bucla for]
---

Buclele repetă un bloc de instrucțiuni. Sunt utile pentru parcurgerea unei secvențe, validarea datelor sau repetarea unui calcul.

## Bucla WHILE

O buclă `WHILE` se repetă cât timp condiția sa rămâne adevărată.

```msp
contor = 0

WHILE contor < 3
  PRINT contor
  contor = contor + 1
END
```

Rezultatul este:

```text
0
1
2
```

Bucla are trei părți:

1. inițializarea stării înaintea buclei;
2. verificarea condiției înaintea fiecărei iterații;
3. modificarea stării în interiorul buclei.

## Bucla FOR

Folosește `FOR` când începutul, sfârșitul și pasul sunt cunoscute.

```msp
FOR numar = 1 TO 5
  PRINT numar
END
```

Adaugă `STEP` pentru a modifica pasul:

```msp
FOR numar = 10 TO 0 STEP -2
  PRINT numar
END
```

## Alegerea buclei

| Situație | Buclă recomandată |
| --- | --- |
| Număr cunoscut de repetări | `FOR` |
| Repetare până se schimbă o condiție | `WHILE` |
| Parcurgerea unui interval numeric | `FOR` |
| Validarea repetată a datelor | `WHILE` |

## Evitarea buclelor infinite

O buclă infinită nu își face niciodată condiția falsă.

```msp
contor = 0
WHILE contor < 5
  PRINT contor
END
```

:::danger[Lipsește actualizarea]
Exemplul nu modifică `contor`. Adaugă `contor = contor + 1` în buclă înainte de rulare.
:::

## Bucle imbricate

O buclă poate conține altă buclă. Indentarea păstrează structura lizibilă.

```msp
FOR linie = 1 TO 3
  FOR coloana = 1 TO 3
    PRINT linie * coloana
  END
END
```

Buclele imbricate pot executa multe operații, așa că verifică numărul de iterații înainte de a folosi intervale mari.
