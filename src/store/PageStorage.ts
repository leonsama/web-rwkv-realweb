import { create } from "zustand";

import { StoreApi, UseBoundStore } from "zustand";
import { isEnterIndex } from "../utils/utils";
import { To } from "react-router";
import { createJSONStorage, persist } from "zustand/middleware";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

// =================== previous interface ===================

interface SessionStorage_V0 {
  isBarOpen: boolean;
  isFunctionBarOpen: boolean;
  showLargeBanner: boolean;
  pageLocation: { to: To | false; options?: any };
  setIsBarOpen: (isOpen: boolean) => void;
  setIsFunctionBarOpen: (isOpen: boolean) => void;
  setShowLargeBanner: (showLargeBanner: boolean) => void;
  setPageLocation: (to: To, options?: any) => void;

  alwaysOpenSessionConfigurationPannel: boolean | null;
  setAlwaysOpenSessionConfigurationPannel: (show: boolean) => void;
}

// ==========================================================

interface SessionStorage {
  isBarOpen: boolean;
  isFunctionBarOpen: boolean;
  showLargeBanner: boolean;
  pageLocation: { to: To | false; options?: any };
  setIsBarOpen: (isOpen: boolean) => void;
  setIsFunctionBarOpen: (isOpen: boolean) => void;
  setShowLargeBanner: (showLargeBanner: boolean) => void;
  setPageLocation: (to: To, options?: any) => void;

  alwaysOpenSessionConfigurationPannel: boolean | null;
  setAlwaysOpenSessionConfigurationPannel: (show: boolean) => void;

  theme: "light" | "dark" | "auto";
  setTheme: (colorMode: "light" | "dark" | "auto") => void;
}

const setTheme = (colorMode: "light" | "dark" | "auto") => {
  switch (colorMode) {
    case "light":
      localStorage.setItem("theme", "light");
      break;
    case "dark":
      localStorage.setItem("theme", "dark");
      break;

    default:
      localStorage.removeItem("theme");
      break;
  }
  document.documentElement.classList.toggle(
    "dark",
    localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );
};

export const usePageStorage = create<SessionStorage>()(
  persist(
    (set) => {
      return {
        isBarOpen: true,
        isFunctionBarOpen: false,
        showLargeBanner: isEnterIndex(),
        pageLocation: { to: false },
        setShowLargeBanner: (showLargeBanner: boolean) =>
          set({ showLargeBanner: showLargeBanner }),
        setIsBarOpen: (isOpen: boolean) => set({ isBarOpen: isOpen }),
        setIsFunctionBarOpen: (isOpen: boolean) =>
          set({ isFunctionBarOpen: isOpen }),
        setPageLocation: (to: To, options?: any) =>
          set({ pageLocation: { to, options } }),

        alwaysOpenSessionConfigurationPannel: null,
        setAlwaysOpenSessionConfigurationPannel(show) {
          set({ alwaysOpenSessionConfigurationPannel: !!show });
        },
        theme: "auto",
        setTheme(theme) {
          set({ theme: theme });
          setTheme(theme);
        },
      };
    },
    {
      name: "webrwkv-page-config",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        alwaysOpenSessionConfigurationPannel:
          state.alwaysOpenSessionConfigurationPannel,
        theme: state.theme,
      }),
      migrate(persistedState, version) {
        let currentVersion = version;
        if (currentVersion == 0) {
          (persistedState as SessionStorage).theme = "auto";
          currentVersion = 1;
        }
        return persistedState;
      },
      version: 1,
    },
  ),
);
