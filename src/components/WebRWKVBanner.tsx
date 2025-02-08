import { useLocation } from "react-router";
import { usePageStorage } from "../store/PageStorage";
import { cn, isEnterIndex } from "../utils/utils";

import { Flipper, Flipped } from "react-flip-toolkit";
import { useEffect } from "react";

export function WebRWKVFixedBanner() {
  const sessionStorage = usePageStorage((s) => s);
  return (
    <div
      className={cn(
        "fixed left-20 top-4 z-20 select-none opacity-0 transition-opacity duration-300 md:left-20 md:top-6 md:hidden",
        sessionStorage.isBarOpen ? "opacity-100" : "",
      )}
    >
      <h1 className="text-2xl font-medium text-gray-300">Web RWKV</h1>
    </div>
  );
}

export function WebRWKVBanner() {
  const sessionStorage = usePageStorage((s) => s);
  return (
    <div
      className={cn(
        "pointer-events-none left-0 right-0 top-0 z-[1] select-none",
        // "[mask-image:linear-gradient(0deg,#0000,#ffff_4px)]",
        sessionStorage.showLargeBanner
          ? "absolute flex flex-col items-center px-2 md:px-4"
          : "fixed left-0 md:absolute",
      )}
    >
      <div
        className={cn(
          sessionStorage.showLargeBanner ? "w-full max-w-screen-md" : "",
        )}
      >
        <Flipper flipKey={sessionStorage.showLargeBanner}>
          <Flipped flipId="webrwkv">
            <h1
              className={cn(
                "gradientColor break-keep box-decoration-slice text-2xl font-medium leading-none text-transparent transition-colors duration-300",
                sessionStorage.showLargeBanner
                  ? "xl:mt-30 mt-32 text-6xl md:mt-[7.5rem] xl:text-8xl"
                  : "ml-16 mt-5 text-gray-300 md:ml-7 md:mt-7",
                isEnterIndex() && "animate-[banner-gradient_3.5s_ease]",
              )}
            >
              Web RWKV
            </h1>
          </Flipped>
        </Flipper>
      </div>
    </div>
  );
}
