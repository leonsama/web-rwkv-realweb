import { create } from "zustand";

import { StoreApi, UseBoundStore } from "zustand";
import { isEnterIndex } from "../utils/utils";
import { To } from "react-router";

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

interface SessionStorage {
  isBarOpen: boolean;
  isFunctionBarOpen: boolean;
  showLargeBanner: boolean;
  pageLocation: { to: To | false; options?: any };
  setIsBarOpen: (isOpen: boolean) => void;
  setIsFunctionBarOpen: (isOpen: boolean) => void;
  setShowLargeBanner: (showLargeBanner: boolean) => void;
  setPageLocation: (to: To, options?: any) => void;
}

export const useSessionStorage = create<SessionStorage>((set) => ({
  isBarOpen: true,
  isFunctionBarOpen: false,
  showLargeBanner: isEnterIndex(),
  pageLocation: { to: false },
  setShowLargeBanner: (showLargeBanner: boolean) =>
    set({ showLargeBanner: showLargeBanner }),
  setIsBarOpen: (isOpen: boolean) => set({ isBarOpen: isOpen }),
  setIsFunctionBarOpen: (isOpen: boolean) => set({ isFunctionBarOpen: isOpen }),
  setPageLocation: (to: To, options?: any) =>
    set({ pageLocation: { to, options } }),
}));
