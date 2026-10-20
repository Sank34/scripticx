---
title: Operatori și expresii
description: Construiește calcule și condiții; înțelege împărțirea și ordinea evaluării.
slug: /operators
sidebar_position: 2
keywords: [MiniScript+, operators]
---

O expresie combină valori, variabile, operatori și apeluri de funcții pentru a produce o singură valoare. În `pret * bucati`, operatorul este `*`, iar operanzii sunt `pret` și `bucati`. Atribuirea `total = pret * bucati` memorează rezultatul expresiei în `total`.

## Operații aritmetice

| Operator | Semnificație | Exemplu | Rezultat |
| --- | --- | --- | --- |
| `+` | Adunare | `7 + 4` | `11` |
| `-` | Scădere | `7 - 4` | `3` |
| `*` | Înmulțire | `7 * 4` | `28` |
| `/` | Împărțire | `7 / 4` | `1.75` |
| `DIV` | Cât întreg, trunchiat spre zero | `7 DIV 4` | `1` |
| `MOD` sau `%` | Restul împărțirii | `7 MOD 4` | `3` |

Pentru numere naturale și un împărțitor pozitiv, `a = (a DIV b) * b + a MOD b`. Dacă împărțitorul este zero, programul se oprește cu eroare. La numere negative, `-7 DIV 4` este `-1`, iar `-7 MOD 4` este `-3`; nu presupune că restul este mereu pozitiv.

```msp
PRINT 23 DIV 5
PRINT 23 MOD 5
PRINT 23 / 5
```

Se afișează `4`, `3`, `4.6`: putem forma patru grupe complete de câte cinci obiecte și rămân trei obiecte.

## Ordinea operațiilor

Parantezele se evaluează înaintea operațiilor din exterior. Urmează operatorii unari (`-`, `NOT`), apoi `*`, `/`, `DIV`, `MOD`, apoi `+`, `-`, comparațiile, `AND` și la final `OR`. Operatorii binari de același nivel se evaluează de la stânga la dreapta.

```msp
PRINT 2 + 3 * 4
PRINT (2 + 3) * 4
PRINT 20 DIV 3 * 2
```

Rezultatele sunt `14`, `20`, `12`. Scrie `NOT (a == b)` când negi o comparație: parantezele fac intenția explicită.

## Comparații și logică

`==` verifică egalitatea, iar `!=` diferența. Pentru numere ai și `<`, `<=`, `>`, `>=`. Atribuirea folosește un singur `=`, comparația folosește două. Egalitatea respectă tipul: numărul `3` și textul `"3"` sunt diferite.

| A | B | A AND B | A OR B |
| --- | --- | --- | --- |
| `FALSE` | `FALSE` | `FALSE` | `FALSE` |
| `FALSE` | `TRUE` | `FALSE` | `TRUE` |
| `TRUE` | `FALSE` | `FALSE` | `TRUE` |
| `TRUE` | `TRUE` | `TRUE` | `TRUE` |

`NOT` inversează o valoare logică. Scrie apartenența la un interval ca `x >= 2 AND x <= 8`, nu ca `2 <= x <= 8`. `AND` și `OR` folosesc evaluare scurtcircuitată: dacă stânga decide rezultatul, dreapta nu se mai evaluează. În `b != 0 AND a / b > 2`, verificarea din stânga protejează împărțirea. Ordinea contează: nu pune împărțirea înaintea verificării.

## Funcții numerice

`ABS(x)` întoarce valoarea absolută. `INT(x)` și `TRUNC(x)` elimină partea fracționară spre zero; `FLOOR(x)` dă întregul inferior. `ROUND(x)` rotunjește la întreg, iar `ROUND(x, 2)` la două zecimale. La jumătăți, rotunjirea urmează regula spre plus infinit: `ROUND(-1.5)` este `-1`. Numerele folosesc precizie finită: evită comparațiile exacte între rezultate fracționare și păstrează întregii exacți în intervalul ±9007199254740991.

## Exersează

1. Pentru 37 de minute, află câte ore complete și câte minute rămân. Răspuns: `0` și `37`.
2. Prezice `18 DIV 4 + 18 MOD 4`, apoi verifică: `6`.
3. Scrie condiția „număr par și strict pozitiv”. Continuă cu [condițiile](/docs/conditions).
