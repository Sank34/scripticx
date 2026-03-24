"use client";

import { useState } from "react";

import { parseLine, step, reset } from "@/lib/engine";
import { setVariable } from "@/lib/engine";
import { advanceLine } from "@/lib/engine";


export default function Home() {
  const [code, setCode] = useState(`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`);
  type Value = string | number | boolean;
  const [program, setProgram] = useState<any[]>([]);
  const [variables, setVariables] = useState<Record<string, Value>>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [inputVar, setInputVar] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const codeLines = code.split("\n");

  function compile() {
    const lines = code.split("\n");
    const parsed = lines.map(parseLine);

    setProgram(parsed);
    reset();

    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false); //reset
    setErrorLine(null);
  }

  function handleStep() {
    if (program.length === 0) return;
    if (stopped) return;

    setIsRunning(false);

    try {
      const result = step(program);

      if (!result) {
        setStopped(true);
        return;
      }

      if (result.inputRequest) {
        setInputVar(result.inputRequest);
        return;
      }

      setVariables(result.variables);
      setCurrentLine(result.currentLine);

      if (result.output !== null) {
        setOutput(prev => [...prev, result.output]);
      }

    } catch (e: any) {
      setOutput(prev => [...prev, "ERROR: " + e.message]);

      setErrorLine(e.line ?? currentLine);
      setStopped(true);
    }
  }
  function handleSubmitInput() {
    if (!inputVar) return;

    let value: string | number | boolean;

    if (inputValue === "true" || inputValue === "false") {
      value = inputValue === "true";
    } else if (!isNaN(Number(inputValue))) {
      value = Number(inputValue);
    } else {
      value = inputValue;
    }

    setVariable(inputVar, value);

    setVariables(prev => ({
      ...prev,
      [inputVar]: value
    }));

    setInputVar(null);
    setInputValue("");

    advanceLine();
    setCurrentLine(prev => prev + 1);

    // execute program continously
    if(isRunning) runProgram();
  }
  function runProgram() {
    let res;
    let newOutput: any[] = [];

    try {
      while (true) {
        res = step(program);

        if (!res) break;

        if (res.inputRequest) {
          setInputVar(res.inputRequest);
          break;
        }

        if (res.output !== null) {
          newOutput.push(res.output);
        }

        setVariables(res.variables);
        setCurrentLine(res.currentLine);
      }
    } catch (e: any) {
      newOutput.push("ERROR: " + e.message);

      setErrorLine(e.line ?? currentLine);
      setStopped(true);
    }

    setOutput(prev => [...prev, ...newOutput]);
  }
  function handleRun() {
      if (program.length === 0) return;
      if (stopped) return;

      setIsRunning(true);

      runProgram();
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
        <div
          style={{
            marginTop: "20px",
            background: "#0f172a",
            padding: "10px",
            borderRadius: "10px",
            fontFamily: "monospace",
            color: "white"
          }}
        >
          {codeLines.map((line, index) => (
            <div
              key={index}
              style={{
                padding: "4px",
                background:
                  index === errorLine
                    ? "rgba(255, 0, 0, 0.5)" // error
                    : index === currentLine
                    ? "rgba(59, 130, 246, 0.5)" // current line
                    : "transparent"
              }}
            >
              {index + 1}. {line}
            </div>
          ))}
        </div>

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
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            maxHeight: "200px",
            overflowY: "auto"
          }}
        >
          {output.join("\n")}
        </pre>
        
        {inputVar && (
          
        <div style={{ marginTop: "10px" }}>
          
          <hr />
          <br />
          <p>Enter value for {inputVar}:</p>
          
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ padding: "5px", border: "2px solid #171717" , borderRadius: "10px", margin: "10px"}}
          />

          <button onClick={handleSubmitInput}>Submit</button>
        </div>
      )}
      </div>

    </div>
  );
}