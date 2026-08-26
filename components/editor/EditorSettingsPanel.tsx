"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_EDITOR_PREFERENCES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

type EditorSettingsPanelProps = {
  locale: "en" | "ro";
  onChange: (preferences: EditorPreferences) => void;
  preferences: EditorPreferences;
};

type SettingRowProps = {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

function SettingRow({
  checked,
  description,
  label,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </label>
  );
}

export function EditorSettingsPanel({
  locale,
  onChange,
  preferences,
}: EditorSettingsPanelProps) {
  const ro = locale === "ro";
  const update = <Key extends keyof EditorPreferences>(
    key: Key,
    value: EditorPreferences[Key]
  ) => onChange({ ...preferences, [key]: value });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div>
          <p className="text-xs font-semibold">
            {ro ? "Setările editorului" : "Editor settings"}
          </p>
          <p className="text-[10px] text-muted-foreground">Monaco</p>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => onChange(DEFAULT_EDITOR_PREFERENCES)}
        >
          {ro ? "Resetează" : "Reset"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section aria-labelledby="editor-settings-intelligence">
          <h3 id="editor-settings-intelligence" className="text-[11px] font-semibold text-foreground">
            {ro ? "Inteligența editorului" : "Editor intelligence"}
          </h3>
          <SettingRow
            label={ro ? "Completare automată" : "Auto completion"}
            description={ro ? "Sugerează sintaxă, funcții și snippets în timp ce scrii." : "Suggest syntax, functions and snippets while you type."}
            checked={preferences.autoCompletion}
            onCheckedChange={(checked) => update("autoCompletion", checked)}
          />
          <SettingRow
            label={ro ? "Sugestii rapide" : "Quick suggestions"}
            description={ro ? "Deschide sugestiile de la primele caractere." : "Open suggestions from the first characters."}
            checked={preferences.quickSuggestions}
            onCheckedChange={(checked) => update("quickSuggestions", checked)}
          />
          <SettingRow
            label={ro ? "Sugestii inline" : "Inline suggestions"}
            description={ro ? "Afișează completări discrete direct pe linie." : "Show subtle completions directly on the line."}
            checked={preferences.inlineSuggestions}
            onCheckedChange={(checked) => update("inlineSuggestions", checked)}
          />
          <SettingRow
            label={ro ? "Indicii pentru parametri" : "Parameter hints"}
            description={ro ? "Arată semnătura funcției în timpul apelului." : "Show a function signature while calling it."}
            checked={preferences.parameterHints}
            onCheckedChange={(checked) => update("parameterHints", checked)}
          />
        </section>

        <Separator className="my-3" />

        <section aria-labelledby="editor-settings-appearance">
          <h3 id="editor-settings-appearance" className="text-[11px] font-semibold text-foreground">
            {ro ? "Aspect și lizibilitate" : "Appearance and readability"}
          </h3>

          <div className="py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">{ro ? "Dimensiunea fontului" : "Font size"}</p>
                <p className="text-[11px] text-muted-foreground">{preferences.fontSize}px</p>
              </div>
            </div>
            <Slider
              aria-label={ro ? "Dimensiunea fontului" : "Font size"}
              min={12}
              max={22}
              step={1}
              value={[preferences.fontSize]}
              onValueChange={([value]) => update("fontSize", value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="text-xs font-medium">{ro ? "Dimensiunea tabului" : "Tab size"}</p>
              <p className="text-[11px] text-muted-foreground">
                {ro ? "Numărul de spații folosit la indentare." : "Spaces used for indentation."}
              </p>
            </div>
            <Select
              value={String(preferences.tabSize)}
              onValueChange={(value) => update("tabSize", Number(value) as 2 | 4 | 8)}
            >
              <SelectTrigger size="sm" className="w-16" aria-label={ro ? "Dimensiunea tabului" : "Tab size"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SettingRow
            label={ro ? "Minimap" : "Minimap"}
            description={ro ? "Afișează o vedere compactă a fișierului." : "Show a compact overview of the file."}
            checked={preferences.minimap}
            onCheckedChange={(checked) => update("minimap", checked)}
          />
          <SettingRow
            label={ro ? "Încadrare automată" : "Word wrap"}
            description={ro ? "Continuă liniile lungi pe rândul următor." : "Wrap long lines inside the editor."}
            checked={preferences.wordWrap}
            onCheckedChange={(checked) => update("wordWrap", checked)}
          />
          <SettingRow
            label={ro ? "Sticky scroll" : "Sticky scroll"}
            description={ro ? "Păstrează contextul vizibil când derulezi." : "Keep the current scope visible while scrolling."}
            checked={preferences.stickyScroll}
            onCheckedChange={(checked) => update("stickyScroll", checked)}
          />
          <SettingRow
            label={ro ? "Ligaturi pentru font" : "Font ligatures"}
            description={ro ? "Unește operatorii compatibili în simboluri tipografice." : "Render supported operators as typographic ligatures."}
            checked={preferences.fontLigatures}
            onCheckedChange={(checked) => update("fontLigatures", checked)}
          />
        </section>

        <Separator className="my-3" />

        <section aria-labelledby="editor-settings-formatting">
          <h3 id="editor-settings-formatting" className="text-[11px] font-semibold text-foreground">
            {ro ? "Editare" : "Editing"}
          </h3>
          <SettingRow
            label={ro ? "Formatează la lipire" : "Format on paste"}
            description={ro ? "Aplică formatarea limbajului după paste." : "Apply language formatting after paste."}
            checked={preferences.formatOnPaste}
            onCheckedChange={(checked) => update("formatOnPaste", checked)}
          />
          <SettingRow
            label={ro ? "Formatează în timpul scrierii" : "Format while typing"}
            description={ro ? "Ajustează indentarea pe măsură ce scrii." : "Adjust indentation while you type."}
            checked={preferences.formatOnType}
            onCheckedChange={(checked) => update("formatOnType", checked)}
          />
          <SettingRow
            label={ro ? "Culori pentru perechi" : "Bracket pair colors"}
            description={ro ? "Diferențiază vizual parantezele imbricate." : "Visually distinguish nested brackets."}
            checked={preferences.bracketPairColorization}
            onCheckedChange={(checked) => update("bracketPairColorization", checked)}
          />
        </section>
      </div>
    </div>
  );
}
