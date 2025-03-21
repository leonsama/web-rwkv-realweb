import { Suspense, useEffect } from "react";
import { useLocation, useRoutes, useMatch, useNavigate } from "react-router";
import routes from "~react-pages";
import { Bar } from "./components/Bar";
import { WebRWKVBanner } from "./components/Banner";
import { usePageStorage } from "./store/PageStorage";
import { isMiddle } from "./utils/utils";

import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { HashRouter } from "react-router";
import { useChatModelSession } from "./store/ModelStorage";
import { useModelLoader } from "./components/ModelConfigUI";
import { Button } from "./components/Button";
import { DEFAULT_API_MODEL } from "./utils/PresetModels";
const BASENAME = import.meta.env.VITE_BASE_URL;

import { Trans } from "@lingui/react/macro";
import { I18nProvider } from "@lingui/react";
import { ToastContainer } from "react-toastify";
import { PopupRoot } from "./components/popup/utils";
import { i18n } from "@lingui/core";

function Placeholder() {
  return (
    <div className="flex h-screen w-screen select-none flex-col items-center justify-center">
      <p className="text-3xl font-medium text-slate-50">
        {import.meta.env.VITE_PAGE_DEFAULT_TITLE}
      </p>
      <p className="text-2xl font-medium text-slate-50">
        <Trans>Loading...</Trans>
      </p>
    </div>
  );
}

function PageContent() {
  const sessionStorage = usePageStorage((s) => s);
  const pageLocation = usePageStorage((s) => s.pageLocation);

  const isLocationRoot = useMatch("");
  const location = useLocation();

  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setIsBarOpen(!isMiddle());
  }, []);

  useEffect(() => {
    sessionStorage.setPageLocation(location.pathname);
    sessionStorage.setShowLargeBanner(isLocationRoot !== null);
    if (isMiddle()) {
      sessionStorage.setIsBarOpen(false);
    }
  }, [location]);

  useEffect(() => {
    if (
      sessionStorage.pageLocation.to &&
      location.pathname !== pageLocation.to
    ) {
      navigate(
        sessionStorage.pageLocation.to,
        sessionStorage.pageLocation.options,
      );
    }
  }, [pageLocation]);
  return useRoutes(routes);
}

function fallbackRender({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-2"
    >
      <p className="text-5xl font-light">
        <Trans>OOPS...</Trans>
      </p>
      <p>
        <Trans>Something went wrong</Trans>
      </p>
      <div className="max-w-md select-text overflow-auto rounded-lg bg-red-100 p-2">
        <code style={{ color: "red" }}>{error.message}</code>
      </div>
      <Button
        onClick={() => {
          window.location.hash = "";
          window.location.reload();
        }}
      >
        <Trans>Return to home page</Trans>
      </Button>
    </div>
  );
}

export function App() {
  const chatModelSession = useChatModelSession((s) => s);
  const { fromAPI } = useModelLoader();

  useEffect(() => {
    if (
      import.meta.env.VITE_AUTO_SET_HF_API === "true" &&
      !chatModelSession.llmModel.selectedModelTitle
    ) {
      console.log("Load API Model");
      (async () => {
        const { AVALIABLE_TEMP_HF_MODELS } = await import(
          "./targets/rwkv-hf-space/rwkv-hf-space-models"
        );
        if (import.meta.env.VITE_TARGET === "rwkv-hf-space") {
          fromAPI(AVALIABLE_TEMP_HF_MODELS[0]);
        } else {
          fromAPI(DEFAULT_API_MODEL);
        }
      })();
    }
  }, []);

  return (
    <I18nProvider i18n={i18n}>
      <Suspense fallback={<Placeholder></Placeholder>}>
        <div className="flex h-screen w-screen select-none bg-white text-black transition-[background-color] duration-500 dark:bg-zinc-900 dark:text-zinc-300">
          <Bar></Bar>

          <div className="relative flex-1 overflow-auto">
            <ErrorBoundary fallbackRender={fallbackRender}>
              <WebRWKVBanner></WebRWKVBanner>
              <HashRouter basename={BASENAME}>
                <PageContent></PageContent>
              </HashRouter>
            </ErrorBoundary>
          </div>
        </div>
        <ToastContainer></ToastContainer>
        <PopupRoot></PopupRoot>
      </Suspense>
    </I18nProvider>
  );
}
