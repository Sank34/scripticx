---
title: Prelucrarea textului
description: Numără vocale, verifică palindroame și caută apariții suprapuse.
slug: /strings
sidebar_position: 3
keywords: [MiniScript+, exemple, strings]
---

Aceste programe folosesc funcțiile din [lecția despre șiruri](/docs/strings). Pozițiile încep de la `0`; numărul de caractere este dat de `LEN`.

## Numără vocalele fără diferență între majuscule și minuscule

```msp
text = LOWER("Ana are mere")
vocale = 0
FOR i FROM 0 TO LEN(text) - 1
  IF FIND("aeiou", CHAR(text, i)) != -1 THEN
    vocale = vocale + 1
  END
END
PRINT vocale
```

Rezultatul este `6`. `LOWER` uniformizează literele, iar `FIND != -1` verifică apartenența la alfabetul ales. Acest alfabet include numai cele cinci vocale scrise în cod; dacă problema include `ă`, `â`, `î`, extinde șirul de căutare. Pentru text gol rezultatul este `0`.

## Construiește inversul și verifică un palindrom

```msp
text = "radar"
invers = ""
FOR i FROM LEN(text) - 1 TO 0 INCR -1
  invers = invers + CHAR(text, i)
END
PRINT invers
PRINT text == invers
```

Se afișează `radar`, apoi `TRUE`. Cu `"ab"`, se afișează `ba` și `FALSE`. Comparația este exactă: majusculele, spațiile și semnele de punctuație contează. Prin această convenție, șirul gol este palindrom. Inversarea se face pe puncte de cod Unicode, nu pe simboluri vizuale compuse.

## Numără apariții suprapuse

```msp
text = "banana"
model = "ana"
count = 0
IF LEN(model) > 0 THEN
  FOR i FROM 0 TO LEN(text) - LEN(model)
    IF SUBSTR(text, i, LEN(model)) == model THEN
      count = count + 1
    END
  END
END
PRINT count
```

Rezultatul este `2`: modelul începe la pozițiile `1` și `3`. Deplasarea cu o singură poziție permite suprapunerea aparițiilor. În acest exemplu, modelul gol are prin convenție zero apariții. Un model mai lung decât textul nu este găsit.

## Încearcă

Schimbă textul în `"aaaa"` și modelul în `"aa"`: obții `3`. Testează lipsa modelului și textul gol. Programele sunt pentru texte mici; operațiile repetate pe șiruri imutabile pot fi costisitoare pentru intrări mari.
