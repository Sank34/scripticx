# MiniScript+ curriculum

The current course covers MiniScript+ only, in Romanian and English. Its reading
order is defined by category positions and page `sidebar_position` values:

1. Basics and tracing a program.
2. Variables, expressions, input/output, decisions, loops, strings.
3. Streaming aggregates, decimal digits, divisibility, sequences, number bases.
4. Functions, local scope, recursion.

Each lesson explains the idea, walks through a small example, discusses boundaries
and mistakes, and provides exercises. Existing public slugs remain valid. The
strings chapter includes all 128 ASCII codes, Unicode distinctions, string
operations, reversal, palindromes, and word counting.

## Editorial references

The topic progression was checked against the pbinfo educational index and its
strings resource. These are references for curriculum coverage, not text or code
sources to reproduce:

- https://old.pbinfo.ro/articole/5547/informatica-clasa-a-ix-a
- https://www.pbinfo.ro/?id=19&pagina=articole&subpagina=afisare
- https://www.pbinfo.ro/articole/18942/algoritmul-lui-euclid-extins-invers-modular

Some individual pbinfo article URLs returned HTTP 403 during research. Do not
claim that every article was read or imported. Arrays, matrices, C++ pointers,
containers, and graph/backtracking courses are outside this MiniScript+ edition.
They should not be described as supported language features.

The examples and explanations are original and use the actual MiniScript+
contracts in `lib/miniscript/` and `docs/miniscript-language.md`. ASCII code values
are checked against RFC 20: https://www.rfc-editor.org/rfc/rfc20.html.

## Verification

`lib/server/docsCurriculum.test.ts` executes the new lesson examples through the
real interpreter, checks published outputs and boundary cases, verifies bilingual
page parity and internal links, and checks complete ASCII coverage.
`lib/server/stringDocs.test.ts` exercises every string example, including empty
text and Unicode. `lib/server/docsNavigation.test.ts` uses disposable filesystem
fixtures to check additions, deletions, drafts, ordering, and translation fallback.
