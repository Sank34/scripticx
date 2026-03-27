"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProblemForm({ initialData, onSuccess }: any) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [starterCode, setStarterCode] = useState(initialData?.starter_code || "");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || "easy");

  const [testCases, setTestCases] = useState(
    initialData?.test_cases || [
      { input: [], output: "" }
    ]
  );

  const [loading, setLoading] = useState(false);

  function addTestCase() {
    setTestCases([...testCases, { input: [], output: "" }]);
  }

  function removeTestCase(index: number) {
    setTestCases(testCases.filter((_: any, i: number) => i !== index));
  }

  function updateInput(index: number, value: string) {
    const updated = [...testCases];

    try {
      updated[index].input = JSON.parse(value);
    } catch {
      updated[index].input = value;
    }

    setTestCases(updated);
  }

  function updateOutput(index: number, value: string) {
    const updated = [...testCases];
    updated[index].output = value;
    setTestCases(updated);
  }

  async function handleSubmit() {
    setLoading(true);

    let error;

    if (initialData?.id) {
      ({ error } = await supabase
        .from("problems")
        .update({
          title,
          description,
          starter_code: starterCode,
          difficulty,
          test_cases: testCases,
        })
        .eq("id", initialData.id));
    } else {
      ({ error } = await supabase
        .from("problems")
        .insert([
          {
            title,
            description,
            starter_code: starterCode,
            difficulty,
            test_cases: testCases,
          },
        ]));
    }

    setLoading(false);

    if (error) {
      toast.error("Failed to save problem");
      return;
    }

    toast.success(initialData ? "Problem updated" : "Problem created");

    onSuccess?.();
  }

  return (
    <div className="space-y-6">

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Textarea
        placeholder="Starter code"
        value={starterCode}
        onChange={(e) => setStarterCode(e.target.value)}
        className="font-mono"
      />

      <div className="space-y-2">
        <p className="text-lg font-medium">Difficulty</p>

        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger>
            <SelectValue placeholder="Select difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test Cases</h2>

        {testCases.map((test: any, index: number) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">

              <div className="flex justify-between items-center">
                <p className="font-medium">Test #{index + 1}</p>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeTestCase(index)}
                >
                  <Trash size={16} />
                </Button>
              </div>

              <Input
                placeholder='Input (ex: [3] or [1,2])'
                defaultValue={JSON.stringify(test.input)}
                onChange={(e) => updateInput(index, e.target.value)}
              />

              <Textarea
                placeholder="Expected Output"
                defaultValue={test.output}
                onChange={(e) => updateOutput(index, e.target.value)}
                className="font-mono"
              />

            </CardContent>
          </Card>
        ))}

        <Button onClick={addTestCase} variant="secondary" className="w-full">
          <Plus size={16} className="mr-2" />
          Add Test Case
        </Button>
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading
          ? "Saving..."
          : initialData
          ? "Update Problem"
          : "Create Problem"}
      </Button>

    </div>
  );
}