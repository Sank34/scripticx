"use client";

import { useState } from "react";

import { parseLine, step, reset } from "@/lib/engine";


export default function Home() {
  const [code, setCode] = useState(`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`);

  const [program, setProgram] = useState<any[]>([]);
  const [variables, setVariables] = useState<any>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [output, setOutput] = useState<string[]>([]);

  function compile() {
    const lines = code.split("\n");
    const parsed = lines.map(parseLine);

    setProgram(parsed);
    reset();

    setVariables({});
    setCurrentLine(0);
    setOutput([]);
  }

  function handleStep() {
    const result = step(program);

    if (!result) return;

    setVariables(result.variables);
    setCurrentLine(result.currentLine);

    if (result.output !== null) {
      setOutput(prev => [...prev, result.output]);
    }
  }

  function handleRun() {
    let res;
    let newOutput: any[] = [];

    while (true) {
      res = step(program);

      if (!res) break;

      if (res.output !== null) {
        newOutput.push(res.output);
      }

      setVariables(res.variables);
      setCurrentLine(res.currentLine);
    }

    setOutput(prev => [...prev, ...newOutput]);
  }

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      
      {/* code editor */}
      <div style={{ flex: 1 }}>
        <h2>MiniScript+ Editor</h2>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={15}
          style={{ width: "100%", fontFamily: "monospace", border: "1px solid #171717" , borderRadius: "10px", padding: "10px"}}
        />

        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button onClick={compile}>Compile</button>
          <button onClick={handleStep}>Step</button>
          <button onClick={handleRun}>Run</button>
        </div>
      </div>

      {/* debug panel */}
      <div style={{ width: "300px" }}>
        <h2>Variables</h2>
        <pre>{JSON.stringify(variables, null, 2)}</pre>

        <h2>Current Line</h2>
        <p>{currentLine}</p>

        <h2>Output</h2>
        <pre>{output.join("\n")}</pre>
      </div>

    </div>
  );
}