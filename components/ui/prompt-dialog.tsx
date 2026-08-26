"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type PromptDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string;
  error?: string;
  label: string;
  onConfirm: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  open: boolean;
  placeholder?: string;
  title: string;
  value: string;
};

export function PromptDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Save",
  description,
  error,
  label,
  onConfirm,
  onOpenChange,
  onValueChange,
  open,
  placeholder,
  title,
  value,
}: PromptDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(value);
          }}
        >
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            value={value}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => onValueChange(event.target.value)}
          />
          {error ? (
            <p id={`${inputId}-error`} className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => onConfirm(value)}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
