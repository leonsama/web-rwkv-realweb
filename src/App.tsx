import { createContext, Suspense, useEffect } from "react";
import {
  useLocation,
  useRoutes,
  useMatch,
  To,
  useNavigate,
} from "react-router";
import routes from "~react-pages";
import { Bar } from "./components/Bar";
import { WebRWKVBanner } from "./components/WebRWKVBanner";
import { usePageStorage } from "./store/PageStorage";
import { isMiddle } from "./utils/utils";

import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { HashRouter } from "react-router";
// const BASENAME = import.meta.env.DEV ? "/" : "/web-rwkv-realweb/";
const BASENAME = "/";

function Placeholder() {
  return (
    <div className="flex h-screen w-screen select-none flex-col items-center justify-center">
      <p className="text-3xl font-medium text-slate-50">WebRWKV</p>
      <p className="text-2xl font-medium text-slate-50">Loading...</p>
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
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div
      role="alert"
      className="flex h-full w-full items-center justify-center"
    >
      <p>OOPS..</p>
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<Placeholder></Placeholder>}>
      <div className="flex h-screen w-screen select-none bg-white text-black">
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
    </Suspense>
  );
}
