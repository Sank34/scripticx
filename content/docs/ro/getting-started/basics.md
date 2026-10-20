---
title: Bazele MiniScript+
description: Învață structura, valorile, operatorii și comentariile folosite într-un program MiniScript+.
slug: /basics
sidebar_position: 1
keywords: [sintaxă MiniScript+, primul program, bazele programării]
---

MiniScript+ este un limbaj compact, creat pentru învățarea gândirii algoritmice. Un program este citit de sus în jos, instrucțiune cu instrucțiune.

:::tip[Încearcă fiecare exemplu]
Deschide [editorul ScripticX](/editor), creează un proiect MiniScript+ și rulează exemplele modificând câte o valoare.
:::

## De la problemă la program

Un algoritm descrie o succesiune finită de pași prin care transformi date de intrare în rezultate. Înainte să scrii cod, răspunde la trei întrebări: ce primești, ce trebuie să obții și prin ce pași ajungi acolo? Pentru prețul a trei caiete de câte 7 lei, datele sunt `3` și `7`, operația este înmulțirea, iar rezultatul este `21`.

Ordinea recomandată este [variabile](/docs/variables), [operatori](/docs/operators), [intrare și ieșire](/docs/input-output), [condiții](/docs/conditions), [bucle](/docs/loops), apoi [șiruri de caractere](/docs/strings). Continuă cu algoritmii elementari și funcțiile. Fiecare lecție introduce o idee, o urmărește pe un exemplu și propune exerciții.

## Primul program

Folosește `PRINT` pentru a afișa o valoare:

```msp
PRINT "Salut, ScripticX!"
PRINT 2 + 3
```

Cuvintele-cheie și funcțiile încorporate nu diferențiază literele mari de cele mici. Numele variabilelor și ale funcțiilor definite de tine sunt sensibile la majuscule: `scor` și `Scor` sunt nume diferite. În documentație scriem cuvintele-cheie cu majuscule.

## Instrucțiuni

Fiecare linie conține o instrucțiune sau o atribuire. Nu sunt necesare punct și virgulă.

```msp
scor = 10
bonus = 5
PRINT scor + bonus
```

Liniile goale sunt ignorate și pot separa secțiunile logice ale programului.

## Valori și operatori

MiniScript+ acceptă numere, texte și valori logice.

| Tip | Exemplu | Utilizare obișnuită |
| --- | --- | --- |
| Număr | `42`, `3.14` | Calcule și contoare |
| Text | `"salut"` | Mesaje și etichete |
| Logic | `TRUE`, `FALSE` | Condiții și decizii |

Operatorii aritmetici uzuali sunt `+`, `-`, `*`, `/`, `DIV` și `MOD`.

```msp
total = 8 + 4
jumatate = total / 2
rest = 17 MOD 5

PRINT jumatate
PRINT rest
```

## Comentarii

Tot ce urmează după `#` pe o linie este comentariu și nu va fi executat.

```msp
# Calculează scorul final
baza = 80
bonus = 10  # acordat pentru viteză
PRINT baza + bonus
```

## Listă de verificare

- [x] Scrie câte o instrucțiune pe linie.
- [x] Pune textele între ghilimele duble.
- [x] Folosește `#` pentru explicații.
- [ ] Continuă cu [variabilele](/docs/variables).

:::warning
Folosește ghilimele duble drepte (`"`) în cod. Ghilimelele tipografice copiate din editoare rich-text nu delimitează corect un text.
:::

## Urmărește execuția

În exemplul cu `scor = 10` și `bonus = 5`, prima atribuire creează valoarea `10`, a doua creează valoarea `5`, iar `PRINT scor + bonus` calculează și afișează `15`. Instrucțiunea `PRINT` nu schimbă variabilele. În editor, modul pas cu pas arată următoarea instrucțiune și starea variabilelor; folosește-l când rezultatul diferă de predicția ta.

MiniScript+ acceptă valori scalare, condiții, bucle, șiruri și funcții. Nu folosi aici sintaxă C++ precum `int`, `cin`, tablouri sau `#include`; editorul oferă proiecte C++ separat. Nici citirea fișierelor prin `<fstream>` nu face parte din limbajul MiniScript+.

## Verifică o soluție

Testează un caz obișnuit, un caz-limită și un caz care ar putea contrazice presupunerea ta. Pentru maximul a două numere, folosește valori diferite, egale și negative. O eroare de sintaxă împiedică interpretarea instrucțiunii; o eroare de execuție apare la o operație invalidă, cum este împărțirea la zero; o eroare de logică poate produce un rezultat greșit fără niciun mesaj de eroare.

Executorul educațional are o limită de pași. Începe cu intrări mici, prezice rezultatul pe hârtie și compară-l cu rezultatul programului.

## Exersează

1. Modifică primul program ca să afișeze numele tău și rezultatul lui `6 * 7`.
2. Inversează două linii dependente una de cealaltă. Explică de ce o variabilă trebuie definită înainte de utilizare.
3. Calculează costul a cinci caiete de câte 8 lei. Rezultatul așteptat este `40`.
