import { useEffect, useRef, useState } from "react";
import { usePageStorage } from "../store/PageStorage";
import { cn, isEnterIndex, Timer, useMaxWidthBreakpoint } from "../utils/utils";

import { Flipper, Flipped } from "react-flip-toolkit";
import { useLocation } from "react-router";

export function WebRWKVFixedBanner() {
  const sessionStorage = usePageStorage((s) => s);
  return (
    <div
      className={cn(
        "fixed left-20 top-4 z-20 select-none opacity-0 transition-opacity duration-300 md:left-20 md:top-6 md:hidden",
        sessionStorage.isBarOpen ? "opacity-100" : "",
      )}
    >
      <h1 className="text-2xl font-medium text-gray-300">
        {import.meta.env.VITE_PAGE_DEFAULT_TITLE}
      </h1>
    </div>
  );
}

export function WebRWKVBanner() {
  const { showLargeBanner, showSideBar } = usePageStorage((s) => s);

  const [isDivExpanded, setIsDivExpanded] = useState<boolean>(false);
  const isMobile = useMaxWidthBreakpoint({ breakpoint: 1250 });

  const timmer = useRef<Timer>();

  useEffect(() => {
    clearTimeout(timmer.current);
    // 先展开侧边栏再显示面板，收回倒放
    if (showSideBar) {
      if (!isMobile) {
        setIsDivExpanded(true);
      }
    } else {
      clearTimeout(timmer.current);
      if (!isMobile) {
        timmer.current = setTimeout(() => {
          setIsDivExpanded(false);
          timmer.current = undefined;
        }, 300);
      }
    }
  }, [showSideBar]);

  useEffect(() => {
    clearTimeout(timmer.current);
    setIsDivExpanded(false);
  }, [isMobile]);

  useEffect(() => {
    if (showLargeBanner) {
      setIsDivExpanded(showSideBar);
    } else {
      setIsDivExpanded(false);
    }
  }, [showLargeBanner]);

  return (
    <div
      className={cn(
        "pointer-events-none left-0 right-0 top-0 z-[1] select-none",
        // "[mask-image:linear-gradient(0deg,#0000,#ffff_4px)]",
        showLargeBanner
          ? "absolute flex items-center px-2 md:px-4"
          : "fixed left-0 md:absolute",
      )}
    >
      <div className={cn(showLargeBanner ? "flex w-full justify-center" : "")}>
        <div className={cn(showLargeBanner && "w-full max-w-screen-md")}>
          <Flipper flipKey={showLargeBanner}>
            <Flipped flipId="webrwkv">
              <h1
                className={cn(
                  "gradientColor mx-0 break-keep box-decoration-slice px-0 text-2xl font-medium leading-none text-transparent transition-colors duration-300",
                  showLargeBanner
                    ? "xl:mt-30 m mt-32 text-6xl md:mt-[7.5rem] xl:text-8xl"
                    : "ml-16 mt-5 text-gray-300 md:ml-7 md:mt-7",
                  (import.meta.env.VITE_TARGET === "rwkv-hf-space" ||
                    import.meta.env.VITE_TARGET === "RWKV7-G0-7.2B-llamacpp") &&
                    showLargeBanner
                    ? "md:-indent-1 xl:-indent-2"
                    : "",
                  import.meta.env.VITE_TARGET === "RWKV7-G0-7.2B-llamacpp" &&
                    showLargeBanner
                    ? "text-5xl md:text-7xl"
                    : "",
                  isEnterIndex() && "animate-[banner-gradient_3.5s_ease]",
                )}
              >
                {import.meta.env.VITE_PAGE_DEFAULT_TITLE}
              </h1>
            </Flipped>
          </Flipper>
        </div>
      </div>
      {showLargeBanner && (
        <div
          className={cn(
            "flex h-full flex-shrink-0 items-center justify-center overflow-hidden transition-all duration-300",
            isDivExpanded ? "w-[22rem] pb-10 pl-4 pr-4" : "w-0",
          )}
        ></div>
      )}
    </div>
  );
}
