import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { TelegramThemeProvider } from "@/providers/TelegramThemeProvider";

export const metadata: Metadata = {
  title: "QR Suite",
  description: "Генератор, пакетная сборка и сканер QR-кодов"
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the Telegram WebApp SDK mutates <html> style
    // (--tg-viewport-height etc.) on the client before React hydrates — an
    // intentional, expected server/client diff (not a bug to "fix").
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://telegram.org" />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <TelegramThemeProvider>
          {children}
        </TelegramThemeProvider>
      </body>
    </html>
  );
}
