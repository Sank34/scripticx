"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProblemForm({ initialData, onSuccess }: any) {
  const { t } = useLanguage();

  const [languages, setLanguages] = useState<string[]>(
    initialData?.title_i18n
      ? Object.keys(initialData.title_i18n)
      : ["en"]
  );

  const [activeLang, setActiveLang] = useState<string>(languages[0]);

  const [title_i18n, setTitleI18n] = useState<any>(
    initialData?.title_i18n || { en: "" }
  );

  const [description_i18n, setDescriptionI18n] = useState<any>(
    initialData?.description_i18n || { en: "" }
  );

  const [starterCode, setStarterCode] = useState(initialData?.starter_code || "");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || "easy");

  const [testCases, setTestCases] = useState(
    initialData?.test_cases || [
      { input: [], output: "" }
    ]
  );

  const [loading, setLoading] = useState(false);

  function updateTitle(lang: string, value: string) {
    setTitleI18n((prev: any) => ({ ...prev, [lang]: value }));
  }

  function updateDescription(lang: string, value: string) {
    setDescriptionI18n((prev: any) => ({ ...prev, [lang]: value }));
  }

  function addLanguage(lang: string) {
    if (languages.includes(lang)) return;
    setLanguages([...languages, lang]);
    setActiveLang(lang);
  }

  function removeLanguage(lang: string) {
    if (languages.length === 1) return;

    const updatedLangs = languages.filter((l) => l !== lang);
    setLanguages(updatedLangs);

    setTitleI18n((prev: any) => {
      const copy = { ...prev };
      delete copy[lang];
      return copy;
    });

    setDescriptionI18n((prev: any) => {
      const copy = { ...prev };
      delete copy[lang];
      return copy;
    });

    if (activeLang === lang) {
      setActiveLang(updatedLangs[0]);
    }
  }

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
    const hasTitle = Object.values(title_i18n || {}).some(
      (v: any) => typeof v === "string" && v.trim()
    );

    const hasDescription = Object.values(description_i18n || {}).some(
      (v: any) => typeof v === "string" && v.trim()
    );

    if (!hasTitle || !hasDescription) {
      toast.error(t("admin.problems.form.validation.required"));
      return;
    }

    setLoading(true);

    let error;

    if (initialData?.id) {
      ({ error } = await supabase
        .from("problems")
        .update({
          title_i18n,
          description_i18n,
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
            title_i18n,
            description_i18n,
            starter_code: starterCode,
            difficulty,
            test_cases: testCases,
          },
        ]));
    }

    setLoading(false);

    if (error) {
      toast.error(t("admin.problems.form.toast.saveError"));
      return;
    }

    toast.success(
      initialData
        ? t("admin.problems.form.toast.updated")
        : t("admin.problems.form.toast.created")
    );

    onSuccess?.();
  }

  return (
    <div className="space-y-6">

      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {languages.map((lang) => (
            <Button
              key={lang}
              size="sm"
              variant={activeLang === lang ? "default" : "outline"}
              onClick={() => setActiveLang(lang)}
            >
              {lang.toUpperCase()}
            </Button>
          ))}

          <Select onValueChange={(val) => addLanguage(val)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.problems.form.addLanguage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ro">Română</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {languages.length > 1 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => removeLanguage(activeLang)}
          >
            {t("admin.problems.form.deleteLanguage")} {activeLang.toUpperCase()}
          </Button>
        )}

        <Input
          placeholder={`${t("admin.problems.form.title")} (${activeLang})`}
          value={title_i18n[activeLang] || ""}
          onChange={(e) => updateTitle(activeLang, e.target.value)}
        />

        <Textarea
          placeholder={`${t("admin.problems.form.description")} (${activeLang})`}
          value={description_i18n[activeLang] || ""}
          onChange={(e) => updateDescription(activeLang, e.target.value)}
        />
      </div>

      <Textarea
        placeholder={t("admin.problems.form.starterCode")}
        value={starterCode}
        onChange={(e) => setStarterCode(e.target.value)}
        className="font-mono"
      />

      <div className="space-y-2">
        <p className="text-lg font-medium">
          {t("admin.problems.form.difficulty")}
        </p>

        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger>
            <SelectValue placeholder={t("admin.problems.form.selectDifficulty")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t("admin.problems.form.testCases")}
        </h2>

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
                placeholder={t("admin.problems.form.inputPlaceholder")}
                defaultValue={JSON.stringify(test.input)}
                onChange={(e) => updateInput(index, e.target.value)}
              />

              <Textarea
                placeholder={t("admin.problems.form.expectedOutput")}
                defaultValue={test.output}
                onChange={(e) => updateOutput(index, e.target.value)}
                className="font-mono"
              />

            </CardContent>
          </Card>
        ))}

        <Button onClick={addTestCase} variant="secondary" className="w-full">
          <Plus size={16} className="mr-2" />
          {t("admin.problems.form.addTestCase")}
        </Button>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={
          loading ||
          !Object.values(title_i18n || {}).some((v: any) => v?.trim?.()) ||
          !Object.values(description_i18n || {}).some((v: any) => v?.trim?.())
        }
        className="w-full"
      >
        {loading
          ? t("admin.problems.form.submit.saving")
          : initialData
          ? t("admin.problems.form.submit.update")
          : t("admin.problems.form.submit.create")}
      </Button>

    </div>
  );
}