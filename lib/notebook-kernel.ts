import { pollExecutionSession, sendExecutionInput, startExecutionSession, stopExecutionSession } from "@/lib/code-session-client";
import { buildCodeRunnerFiles } from "@/lib/code-runner";
import { createProjectFile, type ProjectFile } from "@/lib/editor-project";

export const notebookKernelScript = `import ast
import contextlib
import io
import json
import sys
import traceback
from codeop import Compile

transport = sys.stdin
output = sys.stdout
compiler = Compile()
namespace = {'__name__': '__main__', '_scripticx_display': sys.displayhook}
count = 0

class CellOutput(io.StringIO):
    def write(self, text):
        remaining = 8000 - self.tell()
        if remaining > 0:
            super().write(text[:remaining])
        return len(text)

for line in transport:
    request = json.loads(line)
    stdin = io.StringIO(request['stdin'])
    for index, source in request['cells']:
        count += 1
        stdout, stderr = CellOutput(), CellOutput()
        error = False
        sys.stdin = stdin
        try:
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                name = f'<cell {index + 1}>'
                tree = ast.parse(source, name)
                if tree.body and isinstance(tree.body[-1], ast.Expr):
                    expression = tree.body[-1]
                    expression.value = ast.copy_location(ast.Call(
                        func=ast.Name(id='_scripticx_display', ctx=ast.Load()),
                        args=[expression.value], keywords=[]), expression.value)
                    ast.fix_missing_locations(tree)
                exec(compiler(tree, name, 'exec'), namespace)
        except BaseException:
            error = True
            stderr.write(traceback.format_exc(limit=6))
        finally:
            sys.stdin = transport
        result = {'requestId': request['id'], 'index': index, 'count': count, 'stdout': stdout.getvalue(), 'stderr': stderr.getvalue(), 'error': error}
        output.write(json.dumps(result, ensure_ascii=False) + '\\n')
        output.flush()
        if error:
            break
    output.write(json.dumps({'requestId': request['id'], 'done': True}) + '\\n')
    output.flush()
`;

export type NotebookCellResult = {
  index: number;
  count: number;
  stdout: string;
  stderr: string;
  error: boolean;
};

export type NotebookKernel = { token: string; sequence: number; cursor: number; expiresAt: number };

export async function startNotebookKernel(files: ProjectFile[]): Promise<NotebookKernel> {
  const projectFiles = files.filter((file) => file.language !== "notebook");
  const names = new Set(projectFiles.map((file) => file.name.toLowerCase()));
  let name = "__scripticx_notebook__.py";
  for (let suffix = 1; names.has(name); suffix++) name = `__scripticx_notebook_${suffix}__.py`;
  const { token, expiresInMs } = await startExecutionSession({
    language: "python",
    files: buildCodeRunnerFiles(createProjectFile(name, notebookKernelScript), projectFiles),
    stdin: "",
    args: [],
  }, "run");
  return { token, sequence: 0, cursor: 0, expiresAt: Date.now() + expiresInMs };
}

export function closeNotebookKernel(kernel: NotebookKernel) {
  return stopExecutionSession(kernel.token).catch(() => undefined);
}

function waitForPoll(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 600);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

export async function executeNotebookCells(
  kernel: NotebookKernel,
  cells: Array<[number, string]>,
  stdin: string,
  signal: AbortSignal,
  onResult: (result: NotebookCellResult) => void,
) {
  const id = crypto.randomUUID();
  const request = JSON.stringify({ id, cells, stdin }) + "\n";
  if (new TextEncoder().encode(request).byteLength > 60_000) {
    throw new Error("Notebook input exceeds the runner limit.");
  }

  let sent = false;
  let buffer = "";
  const requested = new Set(cells.map(([index]) => index));
  let diagnostics = "";
  while (Date.now() < kernel.expiresAt) {
    signal.throwIfAborted();
    const status = await pollExecutionSession(kernel.token, kernel.cursor, signal);
    for (const event of status.events) {
      if (event.seq <= kernel.cursor) continue;
      kernel.cursor = event.seq;
      if (event.stream === "stderr") diagnostics = (diagnostics + event.text).slice(-4_000);
      if (event.stream !== "stdout") continue;
      buffer += event.text;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message?.requestId !== id) continue;
        if (message.done === true) return;
        if (Number.isInteger(message?.index) && requested.delete(message.index)
          && Number.isInteger(message.count) && typeof message.stdout === "string"
          && typeof message.stderr === "string" && typeof message.error === "boolean") {
          onResult(message as NotebookCellResult);
        }
      }
    }
    if (status.phase === "exited" || status.phase === "error") {
      throw new Error(status.message || diagnostics || "The Python session ended.");
    }
    if (!sent && status.phase === "running") {
      // Send complete Unicode characters, with each chunk below the input endpoint limit.
      let chunk = "";
      let chunkBytes = 0;
      const encoder = new TextEncoder();
      for (const character of request) {
        const size = encoder.encode(character).byteLength;
        if (chunkBytes + size > 12_000) {
          signal.throwIfAborted();
          await sendExecutionInput(kernel.token, ++kernel.sequence, chunk);
          chunk = "";
          chunkBytes = 0;
        }
        chunk += character;
        chunkBytes += size;
      }
      signal.throwIfAborted();
      if (chunk) await sendExecutionInput(kernel.token, ++kernel.sequence, chunk);
      sent = true;
    }
    await waitForPoll(signal);
  }
  throw new Error("The Python session expired.");
}
