---
title: Algoritmi
description: Algoritmi clasici MiniScript+ cu stare ușor de urmărit și implementări compacte.
slug: /algorithms
sidebar_position: 2
keywords: [algoritmi MiniScript+, Fibonacci, CMMDC, număr prim]
---

Exemplele combină variabile, condiții și bucle în algoritmi compleți.

## Verificarea unui număr prim

```msp title="prim.msp"
n = 7
divizor = 2
estePrim = n >= 2

WHILE divizor * divizor <= n AND estePrim
  IF n MOD divizor == 0 THEN
    estePrim = FALSE
  END
  divizor = divizor + 1
END

IF estePrim THEN
  PRINT "Prim"
ELSE
  PRINT "Nu este prim"
END
```

Rezultat așteptat: `Prim`.

## Șirul Fibonacci

```msp title="fibonacci.msp"
numarTermeni = 5
primul = 0
alDoilea = 1

FOR index FROM 1 TO numarTermeni
  PRINT primul
  urmatorul = primul + alDoilea
  primul = alDoilea
  alDoilea = urmatorul
END
```

Rezultat așteptat: `0, 1, 1, 2, 3`.

## Cel mai mare divizor comun

Metoda resturilor păstrează CMMDC și funcționează inclusiv când al doilea număr este zero. Folosim numere naturale, nu ambele zero.

```msp title="cmmdc.msp"
primul = 12
alDoilea = 8

WHILE alDoilea != 0
  rest = primul MOD alDoilea
  primul = alDoilea
  alDoilea = rest
END

PRINT primul
```

Rezultat așteptat: `4`.

## Maximul a trei valori

```msp title="maxim-trei.msp"
primul = 3
alDoilea = 7
alTreilea = 5
maxim = primul

IF alDoilea > maxim THEN
  maxim = alDoilea
END

IF alTreilea > maxim THEN
  maxim = alTreilea
END

PRINT maxim
```

Rezultat așteptat: `7`.


## De ce funcționează și ce să testezi

La primalitate excludem `0` și `1`, apoi căutăm un divizor până la rădăcina numărului, inclusiv. Testează `1`, `2`, `4`, `49`, `97`. Fibonacci păstrează doar doi termeni; variabila temporară salvează suma înainte să fie suprascrise valorile. La CMMDC, perechile sunt `(12, 8)`, `(8, 4)`, `(4, 0)`; pentru `(12, 0)` se afișează direct `12`. Maximul pornește de la prima valoare, ca să funcționeze și pentru valori negative.

Vezi [divizibilitatea](/docs/divisibility) și [șirurile numerice](/docs/sequences). Rulează exemplele cu numere mici, în limitele de pași și precizie ale executorului.
