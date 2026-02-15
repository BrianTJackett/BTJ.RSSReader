"use client";

import { useEffect, useMemo, useState } from "react";

export type ArticleCountOption = 10 | 25 | 50 | 100;
export type BackgroundPreset = "sky" | "emerald" | "stone";
export type SortOrder = "newest" | "oldest";
export type ThemeMode = "system" | "light" | "dark";

export type UserSettings = {
  backgroundPreset: BackgroundPreset;
  compactMode: boolean;
  sortOrder: SortOrder;
  themeMode: ThemeMode;
  defaultArticleCount: ArticleCountOption;
};

const USER_SETTINGS_STORAGE_KEY = "btj-rssreader-settings";
const DEFAULT_SETTINGS: UserSettings = {
  backgroundPreset: "stone",
  compactMode: false,
  sortOrder: "newest",
  themeMode: "system",
  defaultArticleCount: 10,
};

const ARTICLE_COUNT_OPTIONS: ArticleCountOption[] = [10, 25, 50, 100];

function isBackgroundPreset(value: string): value is BackgroundPreset {
  return value === "sky" || value === "emerald" || value === "stone";
}

function isThemeMode(value: string): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function isSortOrder(value: string): value is SortOrder {
  return value === "newest" || value === "oldest";
}

function isArticleCountOption(value: number): value is ArticleCountOption {
  return ARTICLE_COUNT_OPTIONS.includes(value as ArticleCountOption);
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<UserSettings>;

      setSettings({
        backgroundPreset:
          parsed.backgroundPreset && isBackgroundPreset(parsed.backgroundPreset)
            ? parsed.backgroundPreset
            : DEFAULT_SETTINGS.backgroundPreset,
        compactMode: Boolean(parsed.compactMode),
        sortOrder: parsed.sortOrder && isSortOrder(parsed.sortOrder) ? parsed.sortOrder : DEFAULT_SETTINGS.sortOrder,
        themeMode: parsed.themeMode && isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_SETTINGS.themeMode,
        defaultArticleCount:
          typeof parsed.defaultArticleCount === "number" && isArticleCountOption(parsed.defaultArticleCount)
            ? parsed.defaultArticleCount
            : DEFAULT_SETTINGS.defaultArticleCount,
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyPreference = () => setSystemPrefersDark(mediaQuery.matches);

    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);

    return () => {
      mediaQuery.removeEventListener("change", applyPreference);
    };
  }, []);

  const isDarkMode = useMemo(
    () => settings.themeMode === "dark" || (settings.themeMode === "system" && systemPrefersDark),
    [settings.themeMode, systemPrefersDark]
  );

  useEffect(() => {
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  return {
    settings,
    setSettings,
    isDarkMode,
  };
}
