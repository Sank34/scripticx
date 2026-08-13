"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { AlertCircle, CheckCircle2, Info, LoaderCircle } from "lucide-react";

type ModalType = "error" | "success" | "info";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  type?: ModalType;
  actionLabel?: string;
  actionLoading?: boolean;
  closeLabel?: string;
  onAction?: () => void | Promise<void>;
}

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  type = "info",
  actionLabel = "OK",
  actionLoading = false,
  closeLabel = "Close",
  onAction,
}: Props) {
  const Icon =
    type === "error"
      ? AlertCircle
      : type === "success"
      ? CheckCircle2
      : Info;

  const iconColor =
    type === "error"
      ? "text-red-500"
      : type === "success"
      ? "text-green-500"
      : "text-blue-500";

  const actionColor =
    type === "error"
      ? "bg-red-500 hover:bg-red-600"
      : type === "success"
      ? "bg-green-500 hover:bg-green-600"
      : "bg-black hover:bg-black/90";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">

        {/* ICON */}
        <div className="flex justify-center mb-2">
          <div className="p-3 rounded-full bg-muted">
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>

        {/* TEXT */}
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* BUTTONS */}
        <AlertDialogFooter className="flex justify-end gap-2">
          <AlertDialogCancel>{closeLabel}</AlertDialogCancel>

          <AlertDialogAction
            className={actionColor}
            disabled={actionLoading}
            onClick={(event) => {
              if (!onAction) return;
              event.preventDefault();
              void onAction();
            }}
          >
            {actionLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  );
}
