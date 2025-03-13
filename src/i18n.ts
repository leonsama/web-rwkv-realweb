import { i18n } from "@lingui/core";

import {
  multipleDetect,
  fromUrl,
  fromStorage,
  fromNavigator,
  detect,
} from "@lingui/detect-locale";

// can be a function with custom logic or just a string, `detect` method will handle it
const DEFAULT_FALLBACK = () => "en";

export const detectLocal = () =>
  detect(
    fromUrl("lang"),
    fromStorage("lang"),
    fromNavigator(),
    DEFAULT_FALLBACK,
  )
    ?.split("-")[0]
    .toLocaleLowerCase();

export const detectLocals = () =>
  multipleDetect(
    fromUrl("lang"),
    fromStorage("lang"),
    fromNavigator(),
    DEFAULT_FALLBACK,
  ).map((v) => v.split("-")[0].toLocaleLowerCase());

export async function i18nSetLocale(locale: string) {
  const { messages } = await import(`./locales/${locale}/messages.po`);

  i18n.load(locale, messages);
  i18n.activate(locale);
  localStorage.setItem("lang", locale);
}
