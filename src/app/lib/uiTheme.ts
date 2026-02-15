import type { BackgroundPreset } from "@/app/hooks/useUserSettings";

const BACKGROUND_PRESET_CLASSES: Record<BackgroundPreset, { light: string; dark: string }> = {
  sky: { light: "bg-sky-100", dark: "bg-sky-950" },
  emerald: { light: "bg-emerald-100", dark: "bg-emerald-950" },
  stone: { light: "bg-stone-100", dark: "bg-stone-900" },
};

export function getUiThemeTokens(isDarkMode: boolean, backgroundPreset: BackgroundPreset) {
  const selectedBackgroundPreset =
    BACKGROUND_PRESET_CLASSES[backgroundPreset] ?? BACKGROUND_PRESET_CLASSES.stone;

  return {
    backgroundClassName: isDarkMode ? selectedBackgroundPreset.dark : selectedBackgroundPreset.light,
    primaryTextClass: isDarkMode ? "text-slate-100" : "text-slate-900",
    mutedTextClass: isDarkMode ? "text-slate-300" : "text-slate-600",
    subtleTextClass: isDarkMode ? "text-slate-400" : "text-slate-500",
    panelClass: isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white",
    panelInnerBorderClass: isDarkMode ? "border-slate-700" : "border-slate-100",
    rowHoverClass: isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50",
    rowSelectedClass: isDarkMode ? "bg-slate-700" : "bg-slate-100",
    controlClass: isDarkMode
      ? "rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100"
      : "rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700",
  };
}
