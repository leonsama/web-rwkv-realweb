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
import { useSessionStorage } from "./store/PageStorage";
import { isMiddle } from "./utils/utils";

import { HashRouter } from "react-router";
const BASENAME = import.meta.env.DEV ? "/" : "/web-rwkv-realweb/";
// const BASENAME = "/"

function Placeholder() {
  return (
    <div className="h-screen w-screen flex items-center justify-center flex-col select-none">
      <p className="text-slate-50 text-3xl font-medium">WebRWKV</p>
      <p className="text-slate-50 text-2xl font-medium">Loading...</p>
    </div>
  );
}

function PageContent() {
  const sessionStorage = useSessionStorage((s) => s);
  const pageLocation = useSessionStorage((s) => s.pageLocation);

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
        sessionStorage.pageLocation.options
      );
    }
  }, [pageLocation]);
  return useRoutes(routes);
}

export function App() {
  return (
    <Suspense fallback={<Placeholder></Placeholder>}>
      <div className="h-screen w-screen flex bg-white text-black select-none">
        <Bar></Bar>
        <div className="flex-1 overflow-auto relative">
          <WebRWKVBanner></WebRWKVBanner>
          <HashRouter basename={BASENAME}>
            <PageContent></PageContent>
          </HashRouter>
        </div>
      </div>
    </Suspense>
  );
}
