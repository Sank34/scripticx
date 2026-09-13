# Editor diagnostics

The editor settings include a persisted `liveErrors` switch, enabled by default. It controls Monaco validation decorations; ScripticX diagnostics stop and clear their markers when disabled. Shared editors also enable diagnostics by default.

MiniScript+ uses the runtime parser and static expression/block validation without running code or changing debugger state. JavaScript/TypeScript use Monaco diagnostics; JSON, CSS and SCSS use Monaco's language services. Python, C, C++, Java, C#, Go, Rust, HTML and shell use Tree-sitter syntax grammars in a local worker; YAML uses js-yaml. SQL, Markdown and plain text do not currently have a diagnostic provider. Syntax checks do not replace compilation, type checking or runtime checks for these worker-backed languages.

Custom checks debounce edits by 400 ms, ignore stale responses, cap markers at 50 and skip files above 200,000 characters. Tree-sitter parsing has a 100 ms timeout. Assets are copied by `npm run prepare:monaco`, already part of dev and prebuild. No source is sent to a server.

The debugger highlight represents the next instruction, using the runtime instruction pointer, including jumps and pending INPUT. The debugger state card reports the last executed line separately.
