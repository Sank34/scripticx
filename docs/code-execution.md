# ScripticX code execution

ScripticX executes non-MiniScript+ programs through a dedicated, Piston-compatible
sandbox. The Next.js application only authenticates and validates a request before
forwarding it to that service. It must never execute user code with `child_process`,
Docker, or a host shell inside the web application deployment.

## Supported editor runtimes

- Python
- C and C++
- JavaScript and TypeScript
- Java
- C#
- Go
- Rust
- Bash / shell scripts

MiniScript+ continues to use the native ScripticX interpreter. HTML, CSS, Markdown,
JSON, YAML and other document formats remain editable but are not executable.

## Application configuration

Configure these server-only variables in `.env.local` and in the deployed Next.js
environment:

```dotenv
CODE_RUNNER_URL=https://runner.scripticx.org/api/v2
CODE_RUNNER_TOKEN=replace-with-the-runner-access-token
```

`CODE_RUNNER_TOKEN` is optional when the runner is protected by a private network or
an authenticated reverse proxy that does not require this header. Never expose either
value as a `NEXT_PUBLIC_` variable.

The configured base may be either `/api/v2` or the complete `/api/v2/execute` URL.
Production requires HTTPS. Local development can use an HTTP loopback URL such as:

```dotenv
CODE_RUNNER_URL=http://127.0.0.1:2000/api/v2
```

Restart `npm run dev` after changing environment variables.

## Runner deployment

Piston's public API requires authorization as of 15 February 2026, so the production
default should be a self-hosted Piston instance. Follow the upstream deployment guide,
then use its package manager to install the runtimes required by ScripticX:

```bash
cli/index.js ppman list
cli/index.js ppman install python
```

Use the names returned by `ppman list` to install packages providing C/C++, Node.js,
TypeScript, Java, .NET/C#, Go, Rust and Bash. Verify the final installation with:

```bash
curl https://runner.scripticx.org/api/v2/runtimes
```

The endpoint should return entries for the language names in the list above before the
corresponding Run actions are enabled in production.

## Terminal model

The editor terminal is an isolated job terminal, not a shell on the ScripticX server.
It supports command history, arguments, stdin, cancellation and compile/run streams.
Examples:

```text
run src/main.py -- first "second value"
python src/main.py
g++ src/main.cpp
node src/main.js
stdin 12\n4
```

`help`, `clear`, `pwd`, `ls` and `stdin` are safe client-side built-ins. Other commands
are parsed against an allowlist and converted into sandbox execution requests; they are
never passed to a host shell.

Piston also exposes an interactive WebSocket endpoint at `/api/v2/connect`. A future
stateful terminal can use it through a dedicated WebSocket gateway. It should not be
proxied through a serverless Next.js route handler.

## Enforced limits

The ScripticX API currently enforces:

- authenticated users only;
- 30 execution requests per user per minute;
- at most 32 files and 512 KB total source content;
- at most 16 KB of stdin and 16 program arguments;
- 10 seconds for compilation and 5 seconds for execution;
- 512 MB compilation memory and 256 MB execution memory;
- bounded response output.

The runner must also retain its own process, filesystem, network, CPU, memory and output
limits. Application validation is defense in depth, not a replacement for sandboxing.

No database migration is required for this integration.
