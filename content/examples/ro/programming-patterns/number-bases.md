---
title: Conversii între baze
description: Transformă un număr în hexazecimal și validează o reprezentare binară.
slug: /number-bases
sidebar_position: 5
keywords: [MiniScript+, exemple, number-bases]
---

Aceste exemple completează [bazele de numerație](/docs/number-bases). Lucrăm cu numere naturale și reprezentări text, fără tablouri.

## Din zecimal în hexazecimal

```msp
n = 254
x = n
alfabet = "0123456789ABCDEF"
rezultat = ""
IF x == 0 THEN
  rezultat = "0"
END
WHILE x > 0
  rezultat = CHAR(alfabet, x MOD 16) + rezultat
  x = x DIV 16
END
PRINT rezultat
```

Rezultatul este `FE`, deoarece `15 * 16 + 14 = 254`. Resturile `14`, `15` selectează caracterele `E`, `F` din alfabet și sunt adăugate la începutul rezultatului. Pentru zero se afișează `0`.

## Din binar în zecimal, cu verificarea cifrelor

```msp
INPUT text
valid = LEN(text) > 0
valoare = 0
FOR i FROM 0 TO LEN(text) - 1
  caracter = CHAR(text, i)
  IF caracter == "0" OR caracter == "1" THEN
    valoare = valoare * 2 + ORD(caracter) - ORD("0")
  ELSE
    valid = FALSE
  END
END
IF valid THEN
  PRINT valoare
ELSE
  PRINT "Reprezentare invalida"
END
```

În consola editorului, introdu `"1101"` cu ghilimele, ca să fie citit ca text: rezultatul este `13`. Pentru `"102"` sau `""`, se afișează `Reprezentare invalida`. Fiecare cifră nouă mută valoarea acumulată cu o poziție în baza doi. Folosește texte scurte, ca rezultatul să rămână în limita întregilor exacți.

## Încearcă

Convertește `16`, `255`, `256`: rezultatele sunt `10`, `FF`, `100`. Pentru binar testează `"0"`, `"0011"` și un text care conține spații; spațiile sunt invalide în definiția de aici.
