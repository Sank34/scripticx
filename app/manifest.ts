import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScripticX — Platformă educațională de programare",
    short_name: "ScripticX",
    description:
      "Învață programare cu MiniScript+, execuție pas cu pas, evaluare automată și colaborare live.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#ffffff",
    lang: "ro",
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
