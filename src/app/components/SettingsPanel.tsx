"use client";

import { useState } from "react";
import type {
  ArticleCountOption,
  BackgroundPreset,
  SortOrder,
  UserSettings,
} from "@/app/hooks/useUserSettings";

type SettingsPanelProps = {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  isDarkMode: boolean;
  primaryTextClass: string;
  mutedTextClass: string;
  subtleTextClass: string;
  panelClass: string;
  controlClass: string;
  articleCountOptions: ArticleCountOption[];
  onDefaultArticleCountChange: (nextCount: ArticleCountOption) => void;
};

function isBackgroundPreset(value: string): value is BackgroundPreset {
  return value === "sky" || value === "emerald" || value === "stone";
}

function isSortOrder(value: string): value is SortOrder {
  return value === "newest" || value === "oldest";
}

export function SettingsPanel({
  settings,
  setSettings,
  isDarkMode,
  primaryTextClass,
  mutedTextClass,
  subtleTextClass,
  panelClass,
  controlClass,
  articleCountOptions,
  onDefaultArticleCountChange,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-20">
      {isOpen ? (
        <section className={`w-64 rounded-lg border p-3 shadow-sm ${panelClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`text-sm font-semibold ${primaryTextClass}`}>Settings</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`text-xs ${subtleTextClass} ${isDarkMode ? "hover:text-slate-200" : "hover:text-slate-700"}`}
            >
              Close
            </button>
          </div>
          <label className={`mb-3 block text-xs ${mutedTextClass}`}>
            Use system theme
            <input
              type="checkbox"
              className="ml-2 h-4 w-4 align-middle"
              checked={settings.themeMode === "system"}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  themeMode: event.target.checked ? "system" : isDarkMode ? "dark" : "light",
                }));
              }}
            />
          </label>
          <label className={`mb-3 flex items-center gap-2 text-xs ${mutedTextClass}`}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={settings.themeMode === "dark"}
              disabled={settings.themeMode === "system"}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  themeMode: event.target.checked ? "dark" : "light",
                }));
              }}
            />
            Dark mode
          </label>
          <label className={`mb-3 block text-xs ${mutedTextClass}`}>
            Background
            <select
              value={settings.backgroundPreset}
              onChange={(event) => {
                const nextPreset = event.target.value;
                if (!isBackgroundPreset(nextPreset)) {
                  return;
                }

                setSettings((current) => ({
                  ...current,
                  backgroundPreset: nextPreset,
                }));
              }}
              className={`mt-1 w-full ${controlClass}`}
            >
              <option value="sky">Sky</option>
              <option value="emerald">Emerald</option>
              <option value="stone">Stone</option>
            </select>
          </label>
          <label className={`mb-3 block text-xs ${mutedTextClass}`}>
            Default sort
            <select
              value={settings.sortOrder}
              onChange={(event) => {
                const nextSortOrder = event.target.value;
                if (!isSortOrder(nextSortOrder)) {
                  return;
                }

                setSettings((current) => ({
                  ...current,
                  sortOrder: nextSortOrder,
                }));
              }}
              className={`mt-1 w-full ${controlClass}`}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label className={`mb-3 block text-xs ${mutedTextClass}`}>
            Default articles
            <select
              value={settings.defaultArticleCount}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (!articleCountOptions.includes(parsed as ArticleCountOption)) {
                  return;
                }

                const nextCount = parsed as ArticleCountOption;
                setSettings((current) => ({
                  ...current,
                  defaultArticleCount: nextCount,
                }));
                onDefaultArticleCountChange(nextCount);
              }}
              className={`mt-1 w-full ${controlClass}`}
            >
              {articleCountOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={settings.compactMode}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  compactMode: event.target.checked,
                }));
              }}
            />
            Compact mode
          </label>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`rounded-md border px-3 py-2 text-xs font-medium ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          Settings
        </button>
      )}
    </div>
  );
}
