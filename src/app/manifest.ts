import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnglishTech 调查总部",
    short_name: "EnglishTech",
    description: "中文优先的雅思悬疑冒险学习 PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#17262a",
    theme_color: "#17262a",
    lang: "zh-CN",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

