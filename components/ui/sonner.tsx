"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

const Toaster = ({
  className,
  style,
  toastOptions,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      {...props}
      theme="light"
      className={cn("toaster group", className)}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#18181b",
          "--normal-border": "#e4e4e7",
          "--border-radius": "var(--radius)",
          "--toast-close-button-start": "unset",
          "--toast-close-button-end": "0",
          "--toast-close-button-transform": "translate(35%, -35%)",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn("cn-toast", toastOptions?.classNames?.toast),
          closeButton: cn(
            "sonner-close-button",
            toastOptions?.classNames?.closeButton
          ),
        },
      }}
    />
  )
}

export { Toaster }
