export enum ComponentLoadLevel {
  PRELOAD = 0,
  LOADED = 1,
  UNLOAD = -1,
}

export type LiveClassName =
  | ((componentLoadLevel: ComponentLoadLevel) => string)
  | string
  | undefined;
