"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type ModalType = "error" | "success" | "info";

export function useModal() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ModalType>("info");

  function show(msg: string, t: ModalType = "info", customTitle?: string) {
    setMessage(msg);
    setType(t);

    if (customTitle) setTitle(customTitle);
    else {
      if (t === "error") setTitle("Something went wrong");
      if (t === "success") setTitle("Success");
      if (t === "info") setTitle("Info");
    }

    setOpen(true);

    setTimeout(() => setVisible(true), 10);
  }

  function close() {
    setVisible(false);

    setTimeout(() => {
      setOpen(false);
    }, 200); 
  }

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

  const buttonColor =
    type === "error"
      ? "bg-red-500 hover:bg-red-600"
      : type === "success"
      ? "bg-green-500 hover:bg-green-600"
      : "bg-black hover:bg-black/90";

  const Modal = () =>
    open ? (
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center
          bg-black/40 backdrop-blur-sm
          transition-opacity duration-200
          ${visible ? "opacity-100" : "opacity-0"}
        `}
      >
        <div
          className={`
            w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900
            shadow-xl p-6 space-y-5
            transition-all duration-200
            ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
          `}
        >
          {/* ICON */}
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-muted">
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>

          {/* TITLE */}
          <div className="text-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {message}
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={close}
              className="px-4 py-2 rounded-md border text-sm"
            >
              Close
            </button>

            <button
              onClick={close}
              className={`px-4 py-2 text-white rounded-md text-sm ${buttonColor}`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return { show, Modal };
}
