import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScripticX — Interactive Programming Platform",
    short_name: "ScripticX",
    description:
      "Learn programming with MiniScript+, step-by-step execution, automatic evaluation, and live collaboration.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#ffffff",
    lang: "en",
    categories: ["education", "developer tools", "productivity"],
    icons: [
      {
        src: "/icons/notification-icon-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/icons/notification-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
