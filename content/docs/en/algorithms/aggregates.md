---
title: Sums, counts, and extrema
description: Process a sequence without storing every value.
slug: /aggregates
sidebar_position: 1
keywords: [MiniScript+, aggregates]
---

After [loops](/docs/loops), you can process many inputs while keeping only a total, a counter, or the best value seen so far. Each input is examined once; the whole sequence need not be stored.

## Sum and count selected values

Initialize the sum and counter to zero. Check the required property for each input and update both variables only when it holds.

```msp
n = 5
sum = 0
count = 0
FOR i FROM 1 TO n
  INPUT x
  IF x MOD 2 == 0 THEN
    sum = sum + x
    count = count + 1
  END
END
PRINT sum
PRINT count
```

For inputs `3`, `8`, `-2`, `5`, `0`, the selected numbers are `8`, `-2`, `0`. Their sum is `6` and their count is `3`. Zero increases the count even though it leaves the sum unchanged.

After each iteration, the sum equals the total of the even numbers read so far. Such a property, preserved between iterations, is called an **invariant**. It explains why the final answer is correct.

## Maximum

Starting a maximum at zero fails when every input is negative. Read the first value separately and make it the initial candidate.

```msp
n = 4
INPUT maximum
FOR i FROM 2 TO n
  INPUT x
  IF x > maximum THEN
    maximum = x
  END
END
PRINT maximum
```

For `-9`, `-4`, `-12`, `-7`, the maximum is `-4`. This algorithm requires `n >= 1`. An empty sequence has no maximum and needs separate handling. Replace `>` with `<` to find a minimum.

## Product and average

Multiplication has neutral element `1`; a product initialized to `0` stays zero. The average of selected values is `sum / count` only when `count > 0`. Distinguish the number of all inputs from the number that satisfy your condition.

A traversal takes `O(n)` time and `O(1)` extra memory: the number of variables does not grow with the input count. MiniScript+ does not currently provide arrays; these patterns process values as they arrive.

## Practice

1. Count strictly positive values. For `-2, 0, 5, 7`, the answer is `2`.
2. Find the minimum and its frequency. For `4, 1, 3, 1`, report `1` and `2`.
3. Average the even inputs, handling the case where none exist. Test one value, all-negative values, and repeated values.
