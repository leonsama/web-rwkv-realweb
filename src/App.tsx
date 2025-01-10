import { Suspense, useEffect } from "react";
import { useLocation, useRoutes, useMatch } from "react-router";
import routes from "~react-pages";
import { Bar } from "./components/Bar";
import { WebRWKVBanner } from "./components/WebRWKVBanner";
import { useSessionStorage } from "./store/PageStorage";
import { isMobile } from "./utils/utils";

function Placeholder() {
  return (
    <div className="h-screen w-screen flex items-center justify-center flex-col select-none">
      <p className="text-slate-50 text-3xl font-medium">WebRWKV</p>
      <p className="text-slate-50 text-2xl font-medium">Loading...</p>
    </div>
  );
}

export function App() {
  const sessionStorage = useSessionStorage((s) => s);
  const isLocationRoot = useMatch("");
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setIsBarOpen(!isMobile());
  }, []);

  useEffect(() => {
    sessionStorage.setShowLargeBanner(isLocationRoot !== null);
    if (isMobile()) {
      sessionStorage.setIsBarOpen(false);
    }
  }, [location]);

  return (
    <Suspense fallback={<Placeholder></Placeholder>}>
      <div className="h-screen w-screen flex bg-white text-black">
        <Bar></Bar>
        <div className="flex-1 overflow-auto relative">
          <WebRWKVBanner></WebRWKVBanner>
          {useRoutes(routes)}
        </div>
      </div>
    </Suspense>
  );
}
