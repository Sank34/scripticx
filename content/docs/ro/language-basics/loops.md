---
title: Bucle
description: Repetă instrucțiuni în siguranță cu buclele WHILE și FOR din MiniScript+.
slug: /loops
sidebar_position: 5
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
FOR numar FROM 1 TO 5
  PRINT numar
END
```

Adaugă `INCR` pentru a modifica pasul:

```msp
FOR numar FROM 10 TO 0 INCR -2
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
FOR linie FROM 1 TO 3
  FOR coloana FROM 1 TO 3
    PRINT linie * coloana
  END
END
```

Buclele imbricate pot executa multe operații, așa că verifică numărul de iterații înainte de a folosi intervale mari.

## Urmărirea unei bucle

Pentru bucla `WHILE` de la începutul lecției, poți construi un tabel înainte să rulezi codul:

| contor înainte | contor < 3 | Ieșire | contor după |
| --- | --- | --- | --- |
| 0 | TRUE | 0 | 1 |
| 1 | TRUE | 1 | 2 |
| 2 | TRUE | 2 | 3 |
| 3 | FALSE | — | — |

Condiția se verifică și după ultima iterație. Dacă este falsă de la început, corpul nu rulează deloc. De aceea trebuie să verifici și cazul unei secvențe goale.

## Limitele și pasul lui FOR

Ambele capete ale intervalului sunt incluse. `FOR i FROM 1 TO 5` execută cinci iterații, nu patru. Pentru pas pozitiv și început mai mare decât sfârșitul, sunt zero iterații; pentru numărare descrescătoare trebuie specificat un pas negativ. Un pas zero este eroare.

Începutul, sfârșitul și pasul sunt evaluate o singură dată la intrarea în buclă. Schimbarea unei variabile folosite în expresia limitei nu schimbă automat limita deja calculată. Nu modifica variabila de control din corp. După terminarea normală, ea conține prima valoare care a depășit intervalul: după `1 TO 5`, valoarea este `6`.

Exemplul `10 TO 0 INCR -2` afișează `10, 8, 6, 4, 2, 0`: șase valori. În bucle imbricate folosește nume diferite pentru contoare. O buclă de trei pași în alta de trei pași execută corpul interior de nouă ori.

## Exersează

1. Afișează numerele pare de la `2` la `10`: sunt cinci valori.
2. Calculează suma de la `1` la `5`, inițializând totalul înainte de buclă: rezultatul este `15`.
3. Modifică bucla `WHILE` ca să pornească de la `3`. Explică de ce nu afișează nimic.
4. Corectează exemplul infinit înainte de rulare; limita de pași a editorului detectează execuții prea lungi, dar nu repară algoritmul.

Aplică aceste modele în [sume și numărări](/docs/aggregates) și în [parcurgerea textului](/docs/strings).
