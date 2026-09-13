"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { bindingFromEvent, defaultShortcuts, formatShortcut, shortcutConflict, shortcutDefinitions, shortcutIds, type ShortcutBindings, type ShortcutId } from "@/lib/keyboard-shortcuts";

export function KeyboardShortcutsCard() {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const { bindings, save } = useKeyboardShortcuts();
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function persist(next: ShortcutBindings) {
    try {
      save(next);
      setRecording(null);
      setError(false);
      setMessage(ro ? "Scurtăturile au fost salvate." : "Shortcuts saved.");
    } catch {
      setError(true);
      setMessage(ro ? "Browserul nu permite salvarea setărilor locale." : "Your browser could not save these local settings.");
    }
  }

  function update(id: ShortcutId, binding: string | null) {
    const conflict = shortcutConflict(bindings, id, binding);
    if (conflict) {
      setError(true);
      setMessage(`${ro ? "Combinație folosită de" : "Already assigned to"}: ${shortcutDefinitions[conflict][ro ? "ro" : "en"]}.`);
      return;
    }
    persist({ ...bindings, [id]: binding });
  }

  return (
    <Card id="keyboard-shortcuts" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{ro ? "Scurtături de tastatură" : "Keyboard shortcuts"}</CardTitle>
        <CardDescription>
          {ro ? "Apasă pe o combinație, apoi tastează noua scurtătură cu Ctrl/⌘ sau Alt. Escape anulează. Se salvează automat pentru contul tău, în acest browser." : "Select a binding, then press a new shortcut with Ctrl/⌘ or Alt. Escape cancels. Changes save automatically for your account in this browser."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(["global", "editor", "menu"] as const).map(scope => (
          <section key={scope} aria-labelledby={`shortcuts-${scope}`}>
            <h3 id={`shortcuts-${scope}`} className="text-sm font-semibold">
              {scope === "global" ? (ro ? "Platformă" : "Platform") : scope === "editor" ? (ro ? "Cod și soluții" : "Code and solutions") : (ro ? "Navigare în meniul de căutare" : "Navigation inside the search menu")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {scope === "global" ? (ro ? "Sidebar-ul nu întrerupe scrierea în câmpuri." : "The sidebar shortcut does not interrupt typing in fields.") : scope === "editor" ? (ro ? "Submit funcționează la probleme și competiții, inclusiv din editor. Run rulează codul în pagina Editor." : "Submit works in problems and competitions, including inside the editor. Run executes code on the Editor page.") : (ro ? "Aceste scurtături sunt active doar cât timp meniul de căutare este deschis. Destinațiile depind de accesul contului." : "These shortcuts only work while the search menu is open. Destinations depend on your account access.")}
            </p>
            <div className="mt-2 divide-y">
              {shortcutIds.filter(id => shortcutDefinitions[id].scope === scope).map(id => {
                const label = shortcutDefinitions[id][ro ? "ro" : "en"];
                return (
                  <div key={id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span id={`shortcut-label-${id}`} className="text-sm">{label}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button" variant="outline" size="sm"
                        data-shortcut-recorder
                        aria-label={`${ro ? "Schimbă scurtătura pentru" : "Change shortcut for"} ${label}: ${formatShortcut(bindings[id]) || (ro ? "Dezactivată" : "Disabled")}`}
                        aria-pressed={recording === id}
                        aria-describedby="shortcut-status"
                        onClick={() => { setRecording(id); setMessage(ro ? "Apasă noua combinație. Escape anulează." : "Press a new combination. Escape cancels."); setError(false); }}
                        onBlur={() => { if (recording === id) { setRecording(null); setMessage(""); } }}
                        onKeyDown={event => {
                          if (recording !== id) return;
                          if (event.key === "Tab") { setRecording(null); setMessage(""); return; }
                          event.preventDefault();
                          event.stopPropagation();
                          if (event.key === "Escape") { setRecording(null); setMessage(""); return; }
                          const binding = bindingFromEvent(event.nativeEvent);
                          if (binding) update(id, binding);
                          else if (!["Control", "Meta", "Alt", "Shift"].includes(event.key)) {
                            setError(true);
                            setMessage(ro ? "Folosește Ctrl/⌘ sau Alt împreună cu o literă, cifră, Enter, Space, săgeată sau F1–F12." : "Use Ctrl/⌘ or Alt with a letter, digit, Enter, Space, arrow or F1–F12.");
                          }
                        }}
                      >
                        {recording === id ? (ro ? "Apasă tastele…" : "Press keys…") : formatShortcut(bindings[id]) || (ro ? "Dezactivată" : "Disabled")}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={bindings[id] === null} aria-label={`${ro ? "Dezactivează" : "Disable"} ${label}`} onClick={() => update(id, null)}>{ro ? "Dezactivează" : "Disable"}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        <p className="text-xs text-muted-foreground">{ro ? "Unele combinații sunt rezervate de browser sau de sistemul de operare și pot să nu ajungă la platformă." : "Some combinations are reserved by your browser or operating system and may not reach the platform."}</p>
        <p id="shortcut-status" role="status" aria-live="polite" className={`min-h-5 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
        <Button type="button" variant="outline" onClick={() => persist({ ...defaultShortcuts })}>{ro ? "Restabilește scurtăturile implicite" : "Restore default shortcuts"}</Button>
      </CardContent>
    </Card>
  );
}
