import type { Metadata } from "next";
import "./globals.css";
import { TelegramThemeProvider } from "@/providers/TelegramThemeProvider";

export const metadata: Metadata = {
  title: "QR Suite",
  description: "Генератор, пакетная сборка и сканер QR-кодов"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head></head>
      <body>
        <TelegramThemeProvider>
          {children}
        </TelegramThemeProvider>
      </body>
    </html>
  );
}
