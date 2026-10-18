"use client";

import { useEffect, useRef } from "react";
import { useMonaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { liveCursorColorIndex, type LiveEditorPeer, type LiveEditorSelection } from "@/lib/live-editor-presence";

export function useLiveMonacoCursors({ editor, fileId, peers, enabled, onSelection }: {
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  fileId: string | null;
  peers: LiveEditorPeer[];
  enabled: boolean;
  onSelection: (selection: LiveEditorSelection | null) => void;
}) {
  const monaco = useMonaco();
  const collectionRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const widgetsRef = useRef(new Map<string, { widget: MonacoEditor.IContentWidget; node: HTMLSpanElement; position: { lineNumber: number; column: number } }>());
  useEffect(() => {
    if (!editor || !enabled) return;
    const collection = editor.createDecorationsCollection();
    const widgets = widgetsRef.current;
    collectionRef.current = collection;
    return () => {
      collection.clear();
      collectionRef.current = null;
      for (const { widget } of widgets.values()) editor.removeContentWidget(widget);
      widgets.clear();
    };
  }, [editor, enabled, fileId]);
  useEffect(() => {
    if (!editor || !fileId || !enabled) return;
    const publish = () => {
      const selection = editor.getSelection();
      if (!selection) return;
      const position = selection.getPosition();
      onSelection({ fileId, startLineNumber: selection.startLineNumber, startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber, endColumn: selection.endColumn,
        positionLineNumber: position.lineNumber, positionColumn: position.column,
      });
    };
    const subscription = editor.onDidChangeCursorSelection(publish);
    publish();
    return () => { subscription.dispose(); onSelection(null); };
  }, [editor, enabled, fileId, onSelection]);

  useEffect(() => {
    if (!editor || !monaco || !fileId || !enabled) return;
    const model = editor.getModel();
    if (!model) return;
    const decorations: MonacoEditor.IModelDeltaDecoration[] = [];
    const visibleIds = new Set<string>();
    for (const peer of peers) {
      const selection = peer.selection;
      if (!selection || selection.fileId !== fileId) continue;
      const color = liveCursorColorIndex(peer.userId);
      const range = model.validateRange(new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn));
      const position = model.validatePosition({ lineNumber: selection.positionLineNumber, column: selection.positionColumn });
      if (!range.isEmpty()) decorations.push({ range, options: { className: `sx-live-selection sx-live-color-${color}`, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges } });
      decorations.push({ range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), options: { beforeContentClassName: `sx-live-caret sx-live-color-${color}`, showIfCollapsed: true } });
      visibleIds.add(peer.userId);
      let entry = widgetsRef.current.get(peer.userId);
      if (!entry) {
        const node = document.createElement("span");
        node.className = `sx-live-label sx-live-color-${color}`;
        node.setAttribute("aria-hidden", "true");
        const next = { node, position, widget: null as unknown as MonacoEditor.IContentWidget };
        next.widget = {
          getId: () => `scripticx-live-cursor-${peer.userId}`,
          getDomNode: () => node,
          getPosition: () => ({ position: next.position, preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE, monaco.editor.ContentWidgetPositionPreference.BELOW] }),
        };
        widgetsRef.current.set(peer.userId, next);
        editor.addContentWidget(next.widget);
        entry = next;
      }
      entry.node.textContent = peer.username;
      entry.position = position;
      editor.layoutContentWidget(entry.widget);
    }
    collectionRef.current?.set(decorations);
    for (const [id, entry] of widgetsRef.current) {
      if (visibleIds.has(id)) continue;
      editor.removeContentWidget(entry.widget);
      widgetsRef.current.delete(id);
    }
  }, [editor, enabled, fileId, monaco, peers]);
}
