import {
  MemoryRouter,
  Route,
  Routes,
  To,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router";
import { usePageStorage } from "../store/PageStorage";
import { cn, isEnterIndex } from "../utils/utils";
import { WebRWKVFixedBanner } from "./WebRWKVBanner";
import { useEffect } from "react";
import { Navigate } from "react-router";
import { RadioGroup, RadioGroupOption } from "./RadioGroup";
import { Tooltip } from "./popup/Popup";
import {
  CloseAllMenu,
  createContextMenu,
  Menu,
  MenuItem,
} from "./popup/ContentMenu";
import {
  useChatSessionInformation,
  useChatSessionStore,
} from "../store/ChatSessionStorage";

import URANUS_SVG from "../../assets/icons/SVG/uranus.svg";
import { Flipped, Flipper, spring } from "react-flip-toolkit";
import { useShallow } from "zustand/react/shallow";

function usePageNavigate() {
  const sessionStorage = usePageStorage((s) => s);

  // useEffect(()=>{
  //   console.log(sessionStorage.pageLocation)
  // },[sessionStorage.pageLocation])

  const navigate = (to: To, options?: any) => {
    if (
      sessionStorage.pageLocation.to === "/" &&
      sessionStorage.pageLocation.to !== to
    ) {
      sessionStorage.setShowLargeBanner(false);
      setTimeout(() => {
        sessionStorage.setPageLocation(to, options);
      }, 150);
    } else {
      sessionStorage.setPageLocation(to, options);
    }
  };
  return navigate;
}

const onListExit = () => (el, index, removeElement) => {
  spring({
    config: { overshootClamping: true },
    onUpdate: (val) => {
      el.style.transform = `scaleY}(${1 - val})`;
    },
    delay: index * 50,
    onComplete: removeElement,
  });

  return () => {
    el.style.opacity = "";
    removeElement();
  };
};

function BarButtom({
  icon,
  children,
  className,
  ...prop
}: {
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sessionStorage = usePageStorage((s) => s);
  return (
    <button
      className={cn(
        "group inline-flex h-12 w-12 flex-shrink-0 gap-4 overflow-hidden break-keep rounded-full p-3.5 text-slate-500 transition-all duration-200 hover:bg-slate-200 hover:text-slate-600 active:bg-slate-300",
        className,
        sessionStorage.isBarOpen ? "w-full" : "",
      )}
      {...prop}
    >
      <span className={cn("flex-shrink-0 transition-all duration-300")}>
        {icon}
      </span>
      <span className={cn("flex-shrink-0 break-keep")}>{children}</span>
    </button>
  );
}

export function Bar() {
  const sessionStorage = usePageStorage((s) => s);

  return (
    <>
      {/* nav bar switch btn */}
      <button
        className={cn(
          "fixed left-2 top-2 z-20 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full transition-all duration-200 active:scale-90 md:left-4 md:top-4 md:hover:bg-slate-200",
          isEnterIndex() &&
            "CircleMask animate-[CircleMaskFadeIn_1000ms_ease_1300ms]",
        )}
        onClick={() => {
          sessionStorage.setIsBarOpen(!sessionStorage.isBarOpen);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 12"
          fill="currentColor"
          className="size-4"
        >
          <path
            fillRule="evenodd"
            d={
              sessionStorage.isBarOpen
                ? "M0,.75c0-.41.34-.75.75-.75h14.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75ZM0,11.25c0-.41.34-.75.75-.75h14.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75ZM0,6c0-.41.34-.75.75-.75h7.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75Z"
                : "M0,.75c0-.41.34-.75.75-.75h14.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75ZM0,11.25c0-.41.34-.75.75-.75h14.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75ZM0,6c0-.41.34-.75.75-.75h14.5c.41,0,.75.34.75.75s-.34.75-.75.75H.75c-.41,0-.75-.34-.75-.75Z"
            }
            className={cn(
              "transition-all duration-500",
              sessionStorage.isBarOpen
                ? "ease-[cubic-bezier(0.22,2.53,0.46,1.00)]"
                : "",
            )}
            clipRule="evenodd"
          />
        </svg>
      </button>
      {/* nav bar */}
      <MemoryRouter>
        <BarRoute />
      </MemoryRouter>
    </>
  );
}

function BarRoute() {
  const sessionStorage = usePageStorage((s) => s);

  const barLocation = useLocation();
  const barNavigate = useNavigate();

  useEffect(() => {
    barNavigate("chat");
  }, []);
  // navbar
  return (
    <div
      className={cn(
        "pointer-events-none fixed z-10 flex h-full w-full flex-shrink-0 select-none bg-slate-300 bg-opacity-0 transition-all duration-300 md:relative md:w-auto",
        sessionStorage.isBarOpen
          ? "pointer-events-auto bg-opacity-80 sm:bg-opacity-50"
          : "md:pointer-events-auto",
        isEnterIndex() &&
          "CircleMask animate-[CircleMaskFadeIn_3000ms_cubic-bezier(0.23,0.96,0.27,0.99)_1150ms]",
      )}
      onClick={() => {
        sessionStorage.setIsBarOpen(false);
      }}
    >
      <div
        className={cn(
          "flex h-full transition-all duration-300",
          sessionStorage.isBarOpen
            ? "-translate-x-0"
            : "-translate-x-full md:transform-none",
        )}
        onClick={(e) => {
          CloseAllMenu();
          e.stopPropagation();
        }}
      >
        <WebRWKVFixedBanner></WebRWKVFixedBanner>
        <BarFunctionMenu></BarFunctionMenu>
        <Routes>
          <Route
            path=""
            element={
              <div
                className={cn(
                  "h-full w-56 bg-slate-50 transition-all duration-300 md:w-72",
                  sessionStorage.isBarOpen ? "" : "md:w-20",
                )}
              ></div>
            }
          ></Route>
          <Route
            path="chat/*"
            element={<BarChatRouter></BarChatRouter>}
          ></Route>
        </Routes>
      </div>
    </div>
  );
}

function BarFunctionMenu() {
  const sessionStorage = usePageStorage((s) => s);
  return (
    <div
      className={cn(
        "flex h-full w-16 flex-col gap-2 overflow-hidden bg-slate-100 p-2 pt-16 transition-all duration-300 md:w-20 md:p-4 md:pt-20",
        sessionStorage.isBarOpen ? "" : "md:-ml-20",
      )}
    >
      <button className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-300/50 text-slate-500 transition-all duration-200 active:scale-90 md:hover:bg-slate-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
          />
        </svg>
      </button>
      <button className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all duration-200 active:scale-90 md:hover:bg-slate-200">
        <svg
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="7386"
          width="24"
          height="24"
        >
          <path
            d="M394.2 374.5c16-0.2 29.1 12.6 29.2 28.6 0.2 16-12.6 29.1-28.6 29.2h-142c-51.6-1.7-95.1 38.2-97.9 89.8v7.8c1.9 51.6 44.7 92.2 96.3 91.4h531.7c2.9 0 5.7 0.4 8.4 1.2 76.1 8 134.2 71.5 135.6 148v8.8c-3.2 83.2-72.5 148.5-155.8 146.7H198.7c-16-0.2-28.8-13.2-28.6-29.2 0.2-16 13.2-28.8 29.2-28.6h573.5c51.6 0.8 94.4-39.8 96.3-91.4V769c-2.8-51.6-46.3-91.5-97.9-89.8H252.8c-83.2 1.7-152.5-63.5-155.8-146.7v-8.9c1.8-83.2 69.9-149.6 153.2-149.3h144z m357.3-246.6c40-40 104.8-40 144.7 0 40 40 40 104.8 0 144.7L725.8 443.2c-28.1 28.1-64.2 46.9-103.4 53.7l-50 8.8c-27.9 4.8-54.4-13.8-59.2-41.7-1.2-6.9-1-13.9 0.7-20.7l11.9-49.5c8.4-34.6 26.1-66.2 51.3-91.4l174.4-174.6z m103.8 40.9c-17.4-17.3-45.5-17.3-62.9 0L618 343.3c-17.6 17.6-30.1 39.8-35.9 64.1l-9.6 39.5 39.9-7c26.9-4.7 51.7-17.5 71.2-36.5l1.1-1.1 170.4-170.4c17.3-17.4 17.3-45.5 0-62.9h0.1z"
            fill="currentColor"
            p-id="7387"
          ></path>
        </svg>
      </button>
      <button className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all duration-200 active:scale-90 md:hover:bg-slate-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-6"
        >
          <path
            fillRule="evenodd"
            d="M9 2.25a.75.75 0 0 1 .75.75v1.506a49.384 49.384 0 0 1 5.343.371.75.75 0 1 1-.186 1.489c-.66-.083-1.323-.151-1.99-.206a18.67 18.67 0 0 1-2.97 6.323c.318.384.65.753 1 1.107a.75.75 0 0 1-1.07 1.052A18.902 18.902 0 0 1 9 13.687a18.823 18.823 0 0 1-5.656 4.482.75.75 0 0 1-.688-1.333 17.323 17.323 0 0 0 5.396-4.353A18.72 18.72 0 0 1 5.89 8.598a.75.75 0 0 1 1.388-.568A17.21 17.21 0 0 0 9 11.224a17.168 17.168 0 0 0 2.391-5.165 48.04 48.04 0 0 0-8.298.307.75.75 0 0 1-.186-1.489 49.159 49.159 0 0 1 5.343-.371V3A.75.75 0 0 1 9 2.25ZM15.75 9a.75.75 0 0 1 .68.433l5.25 11.25a.75.75 0 1 1-1.36.634l-1.198-2.567h-6.744l-1.198 2.567a.75.75 0 0 1-1.36-.634l5.25-11.25A.75.75 0 0 1 15.75 9Zm-2.672 8.25h5.344l-2.672-5.726-2.672 5.726Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

function BarChatRouter() {
  const sessionStorage = usePageStorage((s) => s);

  const pageLocation = usePageStorage((s) => s.pageLocation);

  const chatSessionInformations = useChatSessionStore(
    useShallow((s) => s.sessionInformations),
  );
  const chatSessionStorage = useChatSessionStore((state) => state);

  const pageNavigate = usePageNavigate();

  const sessionMenu = createContextMenu(
    <Menu>
      <MenuItem
        className={"text-red-500"}
        onTrigger={(data: string) => {
          chatSessionStorage.deleteSessionById(data);
          if (pageLocation.to.toString().includes(data)) {
            requestAnimationFrame(() => {
              pageNavigate("/");
            });
          }
        }}
      >
        删除
      </MenuItem>
    </Menu>,
  );
  return (
    <div
      className={cn(
        "flex h-full w-56 flex-col bg-slate-50 py-2 pt-16 transition-all duration-300 md:w-72 md:py-4",
        sessionStorage.isBarOpen ? "" : "md:w-20",
      )}
    >
      <div
        className={cn(
          "flex flex-shrink-0 flex-col overflow-hidden px-2 transition-all duration-300 md:h-28 md:px-4",
          sessionStorage.isBarOpen
            ? "max-h-16 opacity-100"
            : "pointer-events-none max-h-28 opacity-0",
        )}
      ></div>
      <Routes>
        <Route
          path=""
          element={
            <>
              <div
                className={cn(
                  "px-2 md:px-4",
                  // sessionStorage.isBarOpen ? "md:pt-10" : "",
                )}
              >
                <button
                  className={cn(
                    "group inline-flex h-12 w-12 flex-shrink-0 gap-4 overflow-hidden break-keep rounded-full bg-slate-200 p-3.5 text-slate-600 transition-all duration-200 hover:bg-slate-300",
                    sessionStorage.isBarOpen ? "w-36" : "delay-75",
                  )}
                  onClick={() => {
                    pageNavigate("/");
                  }}
                >
                  <span
                    className={cn(
                      "flex-shrink-0 transition-all duration-300 group-hover:rotate-90",
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-5"
                    >
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  </span>
                  <span className={cn("flex-shrink-0 break-keep")}>
                    New Chat
                  </span>
                </button>
              </div>

              <Flipper
                className={cn(
                  "mt-4 flex flex-1 flex-col overflow-auto transition-opacity",
                  sessionStorage.isBarOpen
                    ? "opacity-100"
                    : "pointer-events-none opacity-0",
                )}
                // style={{ scrollbarGutter: "stable" }}
                flipKey={chatSessionInformations.length}
              >
                {[...chatSessionInformations].reverse().map((v, k) => {
                  return (
                    <Flipped key={v.id} onExit={onListExit}>
                      <sessionMenu.ContextMenuTrigger
                        data={v.id}
                        key={v.id}
                        click={true}
                      >
                        <div
                          onClick={() =>
                            pageNavigate(`/chat/${v.id}`, {
                              state: { prompt: null },
                            })
                          }
                          className={
                            "group/item flex cursor-pointer items-center gap-1 rounded-lg p-1 pl-4 pr-2 text-left hover:bg-slate-100"
                          }
                        >
                          {/* <Tooltip
                          tooltip={<span className="text-sm">{v.title}</span>}
                          position={"right center"}
                          hoverHideDelay={0}
                          padding={{ left: 30, right: 0, top: 0, bottom: 0 }}
                        > */}
                          <span
                            className={"text-fadeout flex-1 text-nowrap py-1"}
                          >
                            {v.title}
                          </span>
                          {/* </Tooltip> */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              CloseAllMenu();
                            }}
                          >
                            <sessionMenu.ContextMenuTrigger
                              click={true}
                              position="bottom right"
                              stopPropagation={true}
                              data={v.id}
                            >
                              <div
                                className={
                                  "trnasition-[background-color] flex gap-1 group-hover/item:motion-preset-fade group-hover/item:flex group-hover/item:motion-duration-200 md:hidden md:rounded-lg md:hover:bg-white/80"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  CloseAllMenu();
                                }}
                              >
                                <div className="h-7 w-7 rounded-full p-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-5"
                                  >
                                    <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                  </svg>
                                </div>
                              </div>
                            </sessionMenu.ContextMenuTrigger>
                          </span>
                        </div>
                      </sessionMenu.ContextMenuTrigger>
                    </Flipped>
                  );
                })}
              </Flipper>
              <div className="flex flex-col px-2 md:px-4">
                <BarButtom
                  className={cn("mt-auto")}
                  onClick={(e) => {
                    pageNavigate("settings");
                  }}
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  Settings
                </BarButtom>
              </div>
            </>
          }
        ></Route>
      </Routes>
    </div>
  );
}
