---
title: Recursivitate
description: Construiește apeluri care se reduc la o problemă mai mică și se opresc într-un caz de bază.
slug: /recursion
sidebar_position: 2
keywords: [MiniScript+, recursion]
---

O funcție recursivă se apelează pe ea însăși. Are nevoie de un **caz de bază**, care întoarce un rezultat fără alt apel, și de un pas care apropie argumentul de acel caz. Citește mai întâi [funcțiile](/docs/functions).

## Factorialul

Pentru un întreg nenegativ, `n!` este produsul numerelor de la `1` la `n`, cu convenția `0! = 1`. Relația `n! = n * (n - 1)!` se traduce direct într-o funcție.

```msp
FUNCTION factorial(n)
  IF n == 0 THEN
    RETURN 1
  END
  RETURN n * factorial(n - 1)
END
PRINT factorial(5)
```

Rezultatul este `120`. Apelurile coboară `5 → 4 → 3 → 2 → 1 → 0`. La întoarcere, rezultatele sunt `1`, `1`, `2`, `6`, `24`, `120`. Fiecare apel își păstrează propriul `n` cât timp așteaptă rezultatul următor.

Exemplul presupune `n` întreg și nenegativ. Pentru `-1`, argumentul s-ar îndepărta de zero; pentru `2.5`, nu ar ajunge exact la zero. Validează intrarea înainte de apel.

## Recursiv sau iterativ?

Factorialul poate fi calculat și cu un produs într-un `FOR`. Ambele variante folosesc `O(n)` operații, dar cea recursivă păstrează `O(n)` apeluri active; cea iterativă are nevoie de memorie suplimentară constantă. Alege recursivitatea când structura problemei o justifică.

Executorul MiniScript+ limitează numărul de apeluri active la `64` și execuția la `1000` de pași. Acestea sunt limite de rulare, nu reguli matematice. Factorialele mari pierd și precizia numerică înainte să fie utile ca exemple de adâncime mare.

## Greșeli frecvente

- Lipsește cazul de bază sau argumentul nu se apropie de el.
- Se afișează valoarea în loc să fie returnată.
- Se folosește rezultatul unui apel care nu întoarce nimic.
- Se recalculează aceleași subprobleme: Fibonacci recursiv naiv face mult mai multe apeluri decât varianta [iterativă](/docs/sequences).

## Exersează

1. Urmărește `factorial(3)` în editor pas cu pas. Rezultatul este `6`.
2. Scrie o funcție care întoarce suma `1 + 2 + ... + n`, cu baza `n = 0`.
3. Rescrie-o iterativ și compară numărul de apeluri și variabilele necesare.
