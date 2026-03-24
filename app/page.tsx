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
  const [stopped, setStopped] = useState(false);

  function compile() {
    const lines = code.split("\n");
    const parsed = lines.map(parseLine);

    setProgram(parsed);
    reset();

    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false); //reset
  }

 function handleStep() {
  if (program.length === 0) return;
    if (stopped) return;

    try {
      const result = step(program);

      if (!result) {
        setStopped(true);
        return;
      }

      setVariables(result.variables);
      setCurrentLine(result.currentLine);

      if (result.output !== null) {
        setOutput(prev => [...prev, result.output]);
      }

    } catch (e: any) {
      setOutput(prev => [...prev, "ERROR: " + e.message]);
      setStopped(true);
    }
  }

 function handleRun() {
    if (program.length === 0) return;

    if (stopped) return;

    let res;
    let newOutput: any[] = [];

    try {
      while (true) {
        res = step(program);

        if (!res) break;

        if (res.output !== null) {
          newOutput.push(res.output);
        }

        setVariables(res.variables);
        setCurrentLine(res.currentLine);
      }
    } catch (e: any) {
      newOutput.push("ERROR: " + e.message);
      setStopped(true);
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
          style={{ width: "100%", fontFamily: "monospace", border: "2px solid #171717" , borderRadius: "10px", padding: "10px"}}
        />

        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button onClick={compile}>Compile</button>
          <button onClick={handleStep} disabled={stopped}>Step</button>
          <button onClick={handleRun} disabled={stopped}>Run</button>
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