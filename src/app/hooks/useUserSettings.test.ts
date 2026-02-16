import { act, renderHook, waitFor } from "@testing-library/react";
import { useUserSettings } from "@/app/hooks/useUserSettings";

describe("useUserSettings", () => {
  const originalMatchMedia = window.matchMedia;

  function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("returns defaults when local storage is empty", async () => {
    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.settings.backgroundPreset).toBe("stone");
      expect(result.current.settings.sortOrder).toBe("newest");
      expect(result.current.settings.defaultArticleCount).toBe(10);
      expect(result.current.isDarkMode).toBe(false);
    });
  });

  it("restores persisted valid settings", async () => {
    window.localStorage.setItem(
      "btj-rssreader-settings",
      JSON.stringify({
        backgroundPreset: "sky",
        compactMode: true,
        sortOrder: "oldest",
        themeMode: "dark",
        defaultArticleCount: 50,
      })
    );

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.settings.backgroundPreset).toBe("sky");
      expect(result.current.settings.compactMode).toBe(true);
      expect(result.current.settings.sortOrder).toBe("oldest");
      expect(result.current.settings.themeMode).toBe("dark");
      expect(result.current.settings.defaultArticleCount).toBe(50);
      expect(result.current.isDarkMode).toBe(true);
    });
  });

  it("uses system preference when theme mode is system", async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.settings.themeMode).toBe("system");
      expect(result.current.isDarkMode).toBe(true);
    });

    act(() => {
      result.current.setSettings((current) => ({
        ...current,
        themeMode: "light",
      }));
    });

    await waitFor(() => {
      expect(result.current.isDarkMode).toBe(false);
    });
  });
});
