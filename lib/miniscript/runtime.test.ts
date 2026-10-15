import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MiniScriptRuntime, parseLine, validateProgramSyntax } from "../engine";
import { miniScriptDiagnostics } from "../editor-diagnostics";

function execute(code: string, input: Array<string | number | boolean> = []) {
  const runtime = new MiniScriptRuntime();
  const program = code.trim().split("\n").map(parseLine);
  const output: Array<string | number | boolean> = [];
  const trace: Array<{ executedLine: number; currentLine: number }> = [];
  let variables = {};
  let inputIndex = 0;
  for (;;) {
    const event = runtime.step(program);
    if (!event) break;
    trace.push(event);
    variables = event.variables;
    if (event.output !== null) output.push(event.output);
    if (event.inputRequest) {
      if (inputIndex === input.length) throw new Error("Missing input");
      runtime.setVariable(event.inputRequest, input[inputIndex++]);
      runtime.advanceLine();
    }
  }
  return { output, variables, trace };
}

describe("FOR", () => {
  it.each([
    ["1 TO 5", [1, 2, 3, 4, 5]],
    ["1 TO 5 INCR 2", [1, 3, 5]],
    ["5 TO 1 INCR -2", [5, 3, 1]],
    ["5 TO 1", []],
    ["1 TO 5 INCR -1", []],
    ["2 TO 2", [2]],
    ["0 TO 1 INCR 0.5", [0, 0.5, 1]],
  ])("uses inclusive numeric bounds: %s", (range, output) => {
    expect(execute(`FOR i FROM ${range}\nPRINT i\nEND`).output).toEqual(output);
  });
  it("supports expressions and evaluates bounds once", () => {
    expect(execute('n = 3\nFOR i FROM ABS(-1) TO n INCR 1 + 0\nn = 0\nPRINT i\nEND').output).toEqual([1, 2, 3]);
  });
  it("reinitializes an inner loop each time the outer loop runs", () => {
    expect(execute('FOR i FROM 1 TO 2\nFOR j FROM 1 TO 2\nPRINT i * 10 + j\nEND\nEND').output).toEqual([11, 12, 21, 22]);
  });
  it("supports IF/ELSE and WHILE inside FOR", () => {
    expect(execute('FOR i FROM 1 TO 3\nIF i MOD 2 == 0 THEN\nx = 0\nWHILE x < 2\nPRINT i\nx = x + 1\nEND\nELSE\nPRINT -i\nEND\nEND').output).toEqual([-1, 2, 2, -3]);
  });
  it.each(['0', '"step"', '1 / 0'])('rejects invalid increments: %s', increment => {
    expect(() => execute(`FOR i FROM 1 TO 2 INCR ${increment}\nEND`)).toThrow();
  });
  it("reports the source of a nonnumeric bound", () => {
    try { execute('x = 1\nFOR i FROM 1 TO "end"\nEND'); throw new Error("Expected failure"); }
    catch (error) { expect(error).toMatchObject({ line: 2 }); }
  });
  it("stops a loop whose variable is reset by its body", () => {
    expect(() => execute('FOR i FROM 1 TO 3\ni = 0\nEND')).toThrow("Possible infinite loop");
  });
});

describe("FUNCTION and RETURN", () => {
  it("runs the requested example with PRINT and return values", () => {
    expect(execute('FUNCTION build(x,y)\nPRINT x\nPRINT y\nRETURN x + y\nEND\nresult = build(1,2)\nPRINT result').output).toEqual([1, 2, 3]);
  });
  it("allows standalone and forward calls, without running declarations", () => {
    expect(execute('build(1,2)\nFUNCTION build(x,y)\nPRINT x + y\nEND').output).toEqual([3]);
    expect(execute('FUNCTION unused()\nPRINT 99\nEND\nPRINT 1').output).toEqual([1]);
  });
  it("returns immediately through nested loops and IF", () => {
    expect(execute('FUNCTION first()\nFOR i FROM 1 TO 5\nWHILE TRUE\nIF i == 1 THEN\nRETURN i\nEND\nEND\nEND\nPRINT 999\nEND\nPRINT first()\nPRINT 2').output).toEqual([1, 2]);
  });
  it("supports bare return and fallthrough in standalone calls", () => {
    expect(execute('FUNCTION f()\nPRINT 1\nRETURN\nPRINT 2\nEND\nf()\nPRINT 3').output).toEqual([1, 3]);
  });
  it("rejects use of a function without a value in an expression", () => {
    expect(() => execute('FUNCTION f()\nRETURN\nEND\nx = f()')).toThrow("did not return a value");
    expect(() => execute('FUNCTION f()\nEND\nPRINT f()')).toThrow("did not return a value");
  });
  it("isolates locals and parameters while allowing reads of globals", () => {
    const result = execute('x = 9\ng = 2\nFUNCTION f(x)\ny = x + g\nx = 100\nRETURN y\nEND\nPRINT f(3)\nPRINT x');
    expect(result.output).toEqual([5, 9]);
    expect(result.variables).toEqual({ x: 9, g: 2 });
  });
  it("does not leak caller locals to another function", () => {
    expect(() => execute('FUNCTION a()\nsecret = 9\nRETURN b()\nEND\nFUNCTION b()\nRETURN secret\nEND\na()')).toThrow('Variable "secret" is not defined');
  });
  it("supports recursion and nested calls inside expressions", () => {
    expect(execute('FUNCTION fact(n)\nIF n <= 1 THEN\nRETURN 1\nEND\nRETURN n * fact(n - 1)\nEND\nPRINT fact(5) + fact(3)').output).toEqual([126]);
  });
  it("evaluates arguments left to right and only once", () => {
    expect(execute('FUNCTION f(x)\nPRINT x\nRETURN x\nEND\nFUNCTION sum(x,y)\nRETURN x+y\nEND\nPRINT sum(f(1), f(2))').output).toEqual([1, 2, 3]);
  });
  it("supports INPUT inside a function and resumes the caller", () => {
    expect(execute('FUNCTION read()\nINPUT x\nRETURN x + 1\nEND\nPRINT read()\nPRINT read()', [4, 8]).output).toEqual([5, 9]);
  });
  it("uses independent FOR state in recursive calls", () => {
    expect(execute('FUNCTION sum(n)\nIF n == 0 THEN\nRETURN 0\nEND\ntotal = 0\nFOR i FROM 1 TO n\ntotal = total + i\nEND\nRETURN total + sum(n - 1)\nEND\nPRINT sum(3)').output).toEqual([10]);
  });
  it("keeps a runtime error on its function source line", () => {
    try { execute('FUNCTION f(x)\nRETURN 1 / x\nEND\nPRINT f(0)'); throw new Error("Expected failure"); }
    catch (error) { expect(error).toMatchObject({ line: 2, message: "Division by zero is not allowed" }); }
  });
  it("limits recursion and short-circuits boolean expressions", () => {
    expect(() => execute('FUNCTION f()\nRETURN f()\nEND\nf()')).toThrow("Maximum function call depth");
    expect(execute('FUNCTION fail()\nRETURN 1 / 0\nEND\nPRINT FALSE AND fail()\nPRINT TRUE OR fail()').output).toEqual([false, true]);
  });
  it("does not treat special object property names as prototype access", () => {
    expect(execute('FUNCTION constructor(__proto__)\nRETURN __proto__\nEND\nPRINT constructor(4)').output).toEqual([4]);
  });
  it("reports a next line inside the called function", () => {
    const trace = execute('FUNCTION f(x)\nRETURN x + 1\nEND\na = f(2)\nPRINT a').trace;
    expect(trace.map(event => event.executedLine)).toEqual([1, 4, 2, 4, 5]);
    expect(trace[1].currentLine).toBe(1);
    expect(trace[2].currentLine).toBe(3);
  });
});

describe("syntax and isolated runtimes", () => {
  it.each([
    'RETURN 1', 'FOR x FROM 1 TO 5', 'FUNCTION f(x)\nPRINT x',
    'FUNCTION f(x,x)\nEND', 'FUNCTION f(x,)\nEND', 'FUNCTION ABS(x)\nEND',
    'FUNCTION f()\nFUNCTION g()\nEND\nEND', 'FUNCTION f()\nEND\nFUNCTION f()\nEND',
    'FUNCTION f(x)\nRETURN x\nEND\nf()', 'unknown(1)', 'FOR i FROM TO 3\nEND',
  ])("reports invalid syntax: %s", code => {
    expect(() => validateProgramSyntax(code.split('\n').map(parseLine))).toThrow();
    expect(miniScriptDiagnostics(code)).toHaveLength(1);
  });
  it("keeps #, colons and escaped quotes inside strings", () => {
    expect(execute('PRINT "a:#b" # comment\nPRINT "a\\"b"').output).toEqual(['a:#b', 'a"b']);
  });
  it("does not share globals or execution pointers between instances", () => {
    const first = new MiniScriptRuntime(); const second = new MiniScriptRuntime();
    const p1 = ['x = 1', 'PRINT x'].map(parseLine); const p2 = ['x = 2', 'PRINT x'].map(parseLine);
    first.step(p1); second.step(p2);
    expect(first.step(p1)?.output).toBe(1); expect(second.step(p2)?.output).toBe(2);
  });
});


describe("string processing", () => {
  it("handles Unicode consistently across length, access, slices and search", () => {
    expect(execute('s = "aă😀b"\nPRINT LEN(s)\nPRINT CHAR(s, 2)\nPRINT SUBSTR(s, 1, 2)\nPRINT FIND(s, "b")\nPRINT FIND(s, "z")\nPRINT FIND(s, "")\nPRINT SUBSTR(s, 4, 10)').output)
      .toEqual([4, "😀", "ă😀", 3, -1, 0, ""]);
  });
  it("converts characters, case and scalar values", () => {
    expect(execute('PRINT ORD("a")\nPRINT CHR(128512)\nPRINT ORD(CHR(1114111))\nPRINT LOWER("ȘȚABC")\nPRINT UPPER("șțabc")\nPRINT STR(12) + STR(TRUE)\nPRINT len("")\nPRINT SUBSTR("abc", 1, 100)').output)
      .toEqual([97, "😀", 1114111, "șțabc", "ȘȚABC", "12true", 0, "bc"]);
  });
  it.each([
    'CHAR("", 0)', 'CHAR("abc", 3)', 'CHAR("abc", -1)', 'CHAR("abc", 0.5)',
    'SUBSTR("abc", 4, 1)', 'SUBSTR("abc", 0, -1)', 'SUBSTR("abc", 0.5, 1)',
    'ORD("")', 'ORD("ab")', 'CHR(55296)', 'CHR(57343)', 'CHR(1114112)', 'CHR(-1)', 'CHR(1.5)',
    'LEN(1)', 'CHAR("a", "0")', 'FIND("a", 1)', 'UPPER(FALSE)', 'LOWER(1)', 'ORD(1)',
    'LEN()', 'CHAR("a")', 'SUBSTR("abc", 0)', 'STR(1, 2)',
  ])("reports string errors on the correct source line: %s", expression => {
    try { execute(`x = 1\nPRINT ${expression}`); throw new Error("Expected failure"); }
    catch (error) { expect(error).toMatchObject({ line: 2 }); }
  });
  it("accepts string builtins in live diagnostics and rejects invalid arity and reserved names", () => {
    expect(miniScriptDiagnostics('PRINT CHAR("abc", LEN("a"))')).toEqual([]);
    expect(miniScriptDiagnostics('PRINT LEN()')).toHaveLength(1);
    expect(miniScriptDiagnostics('FUNCTION len(x)\nRETURN x\nEND')).toHaveLength(1);
  });
  it("preserves complete input lines and builds one encrypted output line", () => {
    const code = `INPUT x
key = "le papoi"
y = ""
FOR i FROM 0 TO LEN(x) - 1
  code = ORD(CHAR(x, i)) * ORD(CHAR(key, i MOD LEN(key))) + 1
  IF i > 0 THEN
    y = y + " "
  END
  y = y + STR(code)
END
PRINT y`;
    expect(execute(code, ["i love bananas"]).output).toEqual([
      "11341 3233 3457 12433 11447 11313 3553 10291 10477 11111 3105 12321 9410 12881",
    ]);
    expect(execute(code, [""]).output).toEqual([""]);
    expect(execute(code, [" "]).output).toEqual(["3457"]);
    expect(execute(code, ["😀"]).output).toEqual(["13879297"]);
  });
});


it("runs the shipped encryption program in MiniScript+ for the sample and 50-character inputs", () => {
  const source = readFileSync(new URL("../../MSP_code_ex/string_encryption.msp", import.meta.url), "utf8");
  expect(miniScriptDiagnostics(source)).toEqual([]);
  expect(execute(source, ["i love bananas"]).output).toEqual([
    "11341 3233 3457 12433 11447 11313 3553 10291 10477 11111 3105 12321 9410 12881",
  ]);
  const input = "aă😀 ".repeat(12) + "xy";
  const key = Array.from("le papoi");
  const expected = Array.from(input, (char, i) => String(char.codePointAt(0)! * key[i % key.length].codePointAt(0)! + 1)).join(" ");
  expect(execute(source, [input]).output).toEqual([expected]);
  expect(execute(source, [""]).output).toEqual([""]);
});

it("decrypts character values using MiniScript arithmetic and CHR", () => {
  const source = `key = "le papoi"
result = ""
FOR i FROM 0 TO LEN(key) - 1
  n = ORD("😀") * ORD(CHAR(key, i)) + 1
  result = result + CHR((n - 1) / ORD(CHAR(key, i)))
END
PRINT result`;
  expect(execute(source).output).toEqual(["😀".repeat(8)]);
});
