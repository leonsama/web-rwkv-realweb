import { useLocation } from "react-router";
import { useSessionStorage } from "../store/PageStorage";
import { cn } from "../utils/utils";

import { Flipper, Flipped } from "react-flip-toolkit";
import { useEffect } from "react";

export function WebRWKVFixedBanner() {
  const sessionStorage = useSessionStorage((s) => s);
  return (
    <div
      className={cn(
        "fixed z-20 top-6 left-20 select-none opacity-0 transition-opacity duration-300 md:hidden",
        sessionStorage.isBarOpen ? "opacity-100" : ""
      )}
    >
      <h1 className="text-2xl font-medium text-gray-300">Web RWKV</h1>
    </div>
  );
}

export function WebRWKVBanner() {
  const sessionStorage = useSessionStorage((s) => s);
  return (
    <div
      className={cn(
        "pointer-events-none top-0 left-0 right-0 select-none",
        sessionStorage.showLargeBanner
          ? "flex flex-col items-center absolute px-4"
          : "fixed md:absolute left-0"
      )}
    >
      <div
        className={cn(
          sessionStorage.showLargeBanner ? "w-full max-w-screen-md" : ""
        )}
      >
        <Flipper flipKey={sessionStorage.showLargeBanner}>
          <Flipped flipId="webrwkv">
            <h1
              className={cn(
                "text-2xl font-medium leading-none break-keep mt-7 transition-colors duration-300 text-transparent gradientColor",
                sessionStorage.showLargeBanner
                  ? "text-6xl xl:text-8xl mt-[7.5rem] xl:mt-30"
                  : "text-gray-300 ml-20 md:ml-7"
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
