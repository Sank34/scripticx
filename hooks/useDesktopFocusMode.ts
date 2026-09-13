"use client";

import { useEffect, useState } from "react";

export function useDesktopFocusMode() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const closeOnMobile = () => {
      if (media.matches) setActive(false);
    };
    closeOnMobile();
    media.addEventListener("change", closeOnMobile);
    return () => media.removeEventListener("change", closeOnMobile);
  }, []);

  return { active, setActive };
}
