# ScripticX documentation authoring

Public documentation lives in `content/docs/<locale>`, while runnable examples
live in `content/examples/<locale>`. Every `.md` file becomes a page and every
directory becomes a navigation category. Both collections use the same renderer,
frontmatter, code blocks, and navigation system.

## Add a category

Create a directory and add `_category_.json`:

```json
{
  "label": "Language basics",
  "position": 2,
  "collapsed": false,
  "description": "Optional internal description"
}
```

## Add a page

Create the same relative Markdown file under `en` and `ro`. Begin it with frontmatter:

```md
---
title: Conditions
description: Make decisions with IF, ELSE, and comparison operators.
slug: /conditions
sidebar_position: 4
keywords: [MiniScript+ conditions, IF, ELSE]
---
```

- `title` and `description` are used in the page header and metadata.
- `slug` controls the public URL independently of the directory structure.
- `sidebar_position` controls ordering inside a category.
- `draft: true` keeps a document out of navigation and static routes.
- If one locale is missing, the available version is used as a safe fallback.

## Supported Markdown

The renderer supports CommonMark and GitHub Flavored Markdown: all six heading levels, emphasis, strong text, strikethrough, links, images, ordered and unordered lists, task lists, blockquotes, tables, thematic breaks, inline code, and fenced code blocks.

Use a language after the opening fence for syntax highlighting:

````md
```msp
PRINT "Hello"
```

```cpp
#include <iostream>
```
````

Add `title="main.msp"` after the language to display a file name, or
`noLineNumbers` to hide line numbers:

````md
```msp title="main.msp" noLineNumbers
PRINT "Hello"
```
````

Supported highlighters include MiniScript+, C, C++, C#, JavaScript, TypeScript, Python, Java, Go, Rust, HTML, CSS, SCSS, JSON, Markdown, Shell, SQL, and YAML. Unknown languages fall back to readable plain text.

## Admonitions

Docusaurus-style admonitions are supported without allowing unsafe raw HTML:

```md
:::tip[Optional title]
Helpful content can contain **Markdown**, lists, and `inline code`.
:::
```

Available types are `note`, `tip`, `info`, `warning`, and `danger`.
