'use client';

import { useState } from "react";
import dynamic from "next/dynamic";
import classNames from "classnames";
import { GeneratorNew } from "@/components/GeneratorNew";
import { triggerHaptic } from "@/components/generator/haptics";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "@/components/Generator.module.css";
import "./page.css";

// Code-split heavy components to reduce initial bundle size
const BatchGenerator = dynamic(
  () => import("@/components/BatchGenerator").then((m) => ({ default: m.BatchGenerator })),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);

const Scanner = dynamic(
  () => import("@/components/Scanner").then((m) => ({ default: m.Scanner })),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);

type MainTab = "generator" | "batch" | "scanner";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MainTab>("generator");

  return (
    <main className="page">
      <div className={classNames(styles.tabs, styles.modeSwitch)} role="tablist" aria-label="Режим">
        <button
          role="tab"
          aria-selected={activeTab === "generator"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "generator" })}
          onClick={() => {
            setActiveTab("generator");
            triggerHaptic('light');
          }}
        >
          🎨 Генератор
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "batch"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "batch" })}
          onClick={() => {
            setActiveTab("batch");
            triggerHaptic('light');
          }}
        >
          📦 Пакет
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "scanner"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "scanner" })}
          onClick={() => {
            setActiveTab("scanner");
            triggerHaptic('light');
          }}
        >
          📷 Сканер
        </button>
      </div>

      {activeTab === "generator" && <GeneratorNew />}
      {activeTab === "batch" && <BatchGenerator />}
      {activeTab === "scanner" && <Scanner />}

      <footer className="page__footer">
        <p>
          Черновики хранятся локально. Поддерживается CSV поле <code>slug</code> для будущей миграции на
          динамические ссылки.
        </p>
      </footer>
    </main>
  );
}
