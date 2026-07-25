import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "EnglishTech | 调查总部",
  description: "中文优先的雅思悬疑冒险学习 PWA",
  applicationName: "EnglishTech",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EnglishTech",
  },
};

export const viewport: Viewport = {
  themeColor: "#17262a",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

