---
title: Condiții și decizii
description: Alege instrucțiunile executate cu IF, THEN și ELSE.
slug: /conditions
sidebar_position: 4
keywords: [MiniScript+, conditions]
---

O condiție răspunde la o întrebare prin `TRUE` sau `FALSE`. Un program poate astfel să aleagă între două calcule sau mesaje. Înaintea acestei lecții, citește [operatorii](/docs/operators) și [intrarea datelor](/docs/input-output).

## IF și ELSE

După `IF` scrii condiția, apoi `THEN`. Blocul se termină cu `END`. Ramura opțională `ELSE` este executată numai când condiția este falsă.

```msp
INPUT n
IF n MOD 2 == 0 THEN
  PRINT "par"
ELSE
  PRINT "impar"
END
```

Pentru `8`, restul împărțirii la doi este zero și se afișează `par`. Pentru `9`, se execută cealaltă ramură și se afișează `impar`. Exact una dintre ramuri este aleasă. Zero este tot par.

## Mai mult de două situații

Pentru a distinge între negativ, zero și pozitiv, verificăm zero în interiorul ramurii care a exclus deja numerele negative.

```msp
INPUT n
IF n < 0 THEN
  PRINT "negativ"
ELSE
  IF n == 0 THEN
    PRINT "zero"
  ELSE
    PRINT "pozitiv"
  END
END
```

Fiecare `IF` are propriul `END`. Indentarea arată structura, dar nu înlocuiește delimitatorii. Mai multe instrucțiuni `IF` independente pot executa mai multe blocuri; un `IF` cu `ELSE` alege o singură ramură.

## Verifică datele înainte de calcul

Dacă o operație are o restricție, verific-o înainte. Nu calcula media dacă numărul de valori este zero și nu împărți la o valoare citită fără să verifici că este nenulă.

```msp
INPUT total
INPUT count
IF count > 0 THEN
  PRINT total / count
ELSE
  PRINT "Nu exista valori."
END
```

Pentru `total = 18` și `count = 4`, rezultatul este `4.5`. Pentru `count = 0`, se afișează mesajul și împărțirea nu se execută.

## Greșeli frecvente

- `=` atribuie; `==` compară.
- O condiție de interval are două comparații: `n >= 10 AND n <= 20`.
- Limitele incluse folosesc `<=` sau `>=`; limitele excluse folosesc `<` sau `>`.
- Compară numere cu numere; textul `"8"` trebuie păstrat ca text doar dacă acesta este scopul.

## Exersează

1. Afișează valoarea mai mare dintre două numere citite. Testează și două valori egale.
2. Afișează `admis` pentru o notă din intervalul `[5, 10]`; tratează separat o notă invalidă.
3. Pentru verificarea parității testează `0`, `1`, `2`, `-3`. Continuă cu [buclele](/docs/loops).
