"use client";

import { useState } from "react";

import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Value = string | number | boolean;

export default function Home() {
  const [code, setCode] = useState(`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`);

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
    const parsed = code.split("\n").map(parseLine);

    setProgram(parsed);
    reset();

    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false);
    setErrorLine(null);
  }

  function handleStep() {
    if (program.length === 0 || stopped) return;

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

    let value: Value;

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

    if (isRunning) runProgram();
  }

  function runProgram() {
    let res;
    let newOutput: string[] = [];

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
    if (program.length === 0 || stopped) return;

    setIsRunning(true);
    runProgram();
  }
  function handleSave() {
    try {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "solution.msp";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success("Saved file!");
    } catch (e) {
      toast.error("Failed to save file");
    }
  }

  return (
    <div className="p-6 grid grid-cols-3 gap-6">

      {/* EDITOR */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>MiniScript+ Editor</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono h-[200px]"
          />

          {/* CODE PREVIEW */}
          <div className="bg-slate-900 text-white rounded-md p-3 font-mono text-sm">
            {codeLines.map((line, index) => (
              <div
                key={index}
                className={`px-2 py-1 rounded
                  ${index === errorLine ? "bg-red-500/50" :
                    index === currentLine ? "bg-blue-500/40" :
                    ""}`}
              >
                {index + 1}. {line}
              </div>
            ))}
          </div>

          {/* BUTTONS */}
          <div className="flex gap-2">
            <Button onClick={compile} variant="secondary">Compile</Button>
            <Button onClick={handleStep} disabled={stopped}>Step</Button>
            <Button onClick={handleRun} disabled={stopped}>Run</Button>
            <Button onClick={handleSave} variant="outline">Save .msp</Button>
          </div>

        </CardContent>
      </Card>

      {/* SIDEBAR */}
      <Card>
        <CardHeader>
          <CardTitle>Debugger</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* VARIABLES */}
          <div>
            <h3 className="font-semibold mb-1">Variables</h3>
            <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap break-words">
              {JSON.stringify(variables, null, 2)}
            </pre>
          </div>

          {/* CURRENT LINE */}
          <div>
            <h3 className="font-semibold">Current Line</h3>
            <p>{currentLine}</p>
          </div>

          {/* OUTPUT */}
          <div>
            <h3 className="font-semibold mb-1">Output</h3>
            <pre className="text-sm bg-muted p-2 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words">
              {output.join("\n")}
            </pre>
          </div>

          {/* INPUT UI */}
          {inputVar && (
            <div className="space-y-2">
              <p className="font-medium">Enter value for {inputVar}:</p>

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />

              <Button onClick={handleSubmitInput}>
                Submit
              </Button>
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  );
}