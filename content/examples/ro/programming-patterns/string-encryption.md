---
title: Codificarea textului cu o cheie
description: Citește un text și o cheie, apoi transformă fiecare caracter într-un număr.
slug: /string-encryption
sidebar_position: 3
keywords: [MiniScript+, șiruri, codificare, cheie, ORD, CHR]
---

Programul citește textul și cheia de la utilizator. Pentru fiecare caracter din text, înmulțim codul lui Unicode cu cel al caracterului corespunzător din cheie, apoi adunăm `1`.

## Regula

```text
y[i] = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
```

Dacă textul este mai lung decât cheia, reluăm cheia de la început. Expresia `i MOD LEN(key)` alege poziția din cheie, indiferent de lungimea ei. Spațiile și diacriticele se prelucrează la fel ca celelalte caractere.

De exemplu, pentru textul `salut` și cheia `abc`, primul calcul este `ORD("s") * ORD("a") + 1`, adică `115 * 97 + 1 = 11156`.

## Program complet

Funcția primește atât textul, cât și cheia ca parametri. Cheia trebuie să aibă cel puțin un caracter și să nu conțină caracterul cu codul `0`; programul verifică ambele condiții înainte de calcul.

Rezultatul este un singur șir de numere separate prin spații. Separatorul permite identificarea fiecărui număr la decodificare.

```msp title="codificare.msp"
FUNCTION encrypt(x, key)
  IF LEN(key) == 0 THEN
    RETURN "Cheia nu poate fi goală."
  END
  FOR j FROM 0 TO LEN(key) - 1
    IF ORD(CHAR(key, j)) == 0 THEN
      RETURN "Cheia nu poate conține caracterul cu codul 0."
    END
  END
  y = ""
  FOR i FROM 0 TO LEN(x) - 1
    n = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
    IF i > 0 THEN
      y = y + " "
    END
    y = y + STR(n)
  END
  RETURN y
END

INPUT x
INPUT key
PRINT encrypt(x, key)
```

La prima citire, introdu textul `salut`. La a doua, introdu cheia `abc`. Programul afișează:

```text
11156 9507 10693 11350 11369
```

Poți schimba textul și cheia la fiecare rulare. Cu o cheie validă, textul gol produce un șir gol. Dacă textul sau cheia conține doar cifre și vrei să rămână șir, introdu valoarea între ghilimele în consola editorului, de exemplu `"00123"`.

## Inversarea unui caracter

Scădem `1` din număr, împărțim la codul caracterului din cheie și convertim rezultatul cu `CHR`. Următorul program recuperează primul caracter din exemplu:

```msp title="decodifica-un-caracter.msp"
numar = 11156
cheie = "abc"
pozitie = 0
codCheie = ORD(CHAR(cheie, pozitie MOD LEN(cheie)))
PRINT CHR((numar - 1) / codCheie)
```

Rezultatul este `s`. Pentru întregul text, repetă operația la fiecare poziție, cu aceeași cheie. Pentru numere primite din altă sursă, verifică și divizibilitatea, și validitatea codului Unicode obținut.

Acest exercițiu arată o transformare reversibilă a textului. Nu îl folosi pentru protejarea parolelor reale.

Funcțiile folosite sunt explicate în [Șiruri de caractere](/docs/strings).
