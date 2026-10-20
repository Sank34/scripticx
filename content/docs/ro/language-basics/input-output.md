---
title: Intrare și ieșire
description: Citește valori și prezintă rezultate clare cu INPUT și PRINT.
slug: /input-output
sidebar_position: 3
keywords: [intrare MiniScript+, ieșire MiniScript+, INPUT, PRINT]
---

Intrarea aduce valori într-un program. Ieșirea comunică rezultatul programului.

## Afișarea rezultatului

`PRINT` acceptă texte, numere, variabile și expresii.

```msp
nume = "Mara"
scor = 95

PRINT "Elev:"
PRINT nume
PRINT scor + 5
```

Folosește etichete scurte când un număr ar fi ambiguu fără context.

## Citirea datelor

`INPUT` oprește programul, citește o valoare și o stochează într-o variabilă.

```msp
INPUT varsta
PRINT varsta
```

Variabila devine disponibilă tuturor instrucțiunilor următoare.

## Citirea textului

`INPUT` păstrează spațiile dintre cuvinte. Poți introduce `i love bananas` ca o singură valoare. O intrare goală rămâne șirul gol, iar spațiile introduse singure rămân text.

În consola editorului, numerele și valorile `true` sau `false` primesc automat tipul corespunzător. Ca să păstrezi un cod precum `00123` ca text, introdu `"00123"`, cu ghilimele duble. Pentru un șir gol poți introduce și `""`.

```msp
INPUT text
PRINT LEN(text)
```

Pentru `i love bananas`, programul afișează `14`. În cazurile de test ale unei probleme, setează intrarea ca șir; nu adăuga ghilimele în conținutul valorii.

Vezi [Șiruri de caractere](/docs/strings) pentru parcurgere, căutare și conversii.

## Exemplu complet

Programul citește două valori și afișează suma lor:

```msp
PRINT "Primul număr:"
INPUT primul

PRINT "Al doilea număr:"
INPUT alDoilea

suma = primul + alDoilea
PRINT "Suma:"
PRINT suma
```

## Listă de verificare

- Oferă fiecărei valori de intrare un nume relevant.
- Explică valoarea așteptată înainte de citire.
- Validează intervalul când sunt permise doar anumite valori.
- Păstrează rezultatul final scurt și neambiguu.

:::info[Testare]
Rulează același program cu valori normale, valori-limită și valori neașteptate. Presupunerile devin astfel vizibile înainte să producă erori.
:::

## Citirea repetată

Combină `INPUT` cu o buclă când trebuie procesate mai multe valori.

```msp
total = 0

FOR index FROM 1 TO 3
  INPUT valoare
  total = total + valoare
END

PRINT total
```

Programul citește exact trei valori și afișează totalul lor.

## Cum introduci datele în consolă

Fiecare instrucțiune `INPUT` așteaptă o valoare completă. Pentru două numere folosește două instrucțiuni și trimite valorile pe rând. Textul `2 3` introdus la un singur `INPUT` rămâne un șir, nu devine automat două numere. În exemplele cu trei citiri, introdu câte un număr și confirmă de trei ori.

| Ce introduci în consola editorului | Valoare citită | Tip |
| --- | --- | --- |
| `12` | 12 | Număr |
| `3.5` | 3.5 | Număr |
| `true` | true | Boolean |
| `Ana are mere` | Ana are mere | Șir |
| `"00123"` | 00123 | Șir |
| `""` | Șir gol | Șir |

Folosește punctul pentru zecimale. Spațiile unui text se păstrează, inclusiv cele de la margini. Introducerea datelor este o etapă a execuției: programul continuă de la instrucțiunea următoare după ce ai trimis valoarea.

## Afișarea pentru oameni și pentru evaluator

Fiecare `PRINT` produce o ieșire separată. Într-un exemplu interactiv, mesaje precum „Primul număr:” pot ajuta cititorul. Într-o soluție trimisă la o problemă, respectă exact formatul ieșirii cerute; mesajele suplimentare pot face rezultatul incorect. Etichetele nu sunt o cerință a limbajului.

Când construiești un mesaj cu numere și text, folosește `STR` sau concatenarea. Pentru o sumă numerică într-un mesaj, scrie `"Total: " + STR(a + b)`, ca adunarea să fie efectuată înainte de transformarea în text.

## Exersează

1. Citește lungimea și lățimea, apoi afișează doar aria. Pentru `6` și `4`, rezultatul este `24`.
2. Citește codul `"0007"` și verifică lungimea: `4`.
3. Citește un nume cu spații și afișează-l între două caractere `|`, ca să observi dacă păstrezi spațiile de la margini.
