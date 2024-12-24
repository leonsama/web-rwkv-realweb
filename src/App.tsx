import { Suspense, useEffect } from "react";
import { useLocation, useRoutes } from "react-router-dom";
import routes from "~react-pages";
import { Bar } from "./components/Bar";
import { WebRWKVBanner } from "./components/WebRWKVBanner";
import { useSessionStorage } from "./store/PageStorage";

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
  const location = useLocation();
  useEffect(() => {
    sessionStorage.setIsBarOpen(
      window.matchMedia("(min-width: 768px)").matches
    );
  }, []);
  useEffect(() => {
    sessionStorage.setShowLargeBanner(location.pathname === "/");
    if (window.matchMedia("(max-width: 768px)").matches) {
      sessionStorage.setIsBarOpen(false);
    }
  }, [location]);
  return (
    <Suspense fallback={<Placeholder></Placeholder>}>
      <div className="h-screen w-screen flex">
        <Bar></Bar>
        <div className="flex-1 overflow-auto relative px-4 md:px-7 flex justify-center">
          <div className="w-full h-full max-w-screen-md">
            <WebRWKVBanner></WebRWKVBanner>
            {useRoutes(routes)}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
