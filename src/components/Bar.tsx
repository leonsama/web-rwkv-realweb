import { useLocation, useNavigate, useNavigation } from "react-router";
import {
  useChatSessionInformation,
  useChatSessionStore,
  useSessionStorage,
} from "../store/PageStorage";
import { cn } from "../utils/utils";
import { WebRWKVFixedBanner } from "./WebRWKVBanner";

function BarButtom({
  icon,
  children,
  className,
  ...prop
}: {
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const sessionStorage = useSessionStorage((s) => s);
  return (
    <button
      className={cn(
        "group h-12 w-12 gap-4 rounded-full hover:bg-slate-200 active:bg-slate-300 p-3.5 overflow-hidden break-keep inline-flex transition-all duration-200 text-slate-500 hover:text-slate-600",
        className,
        sessionStorage.isBarOpen ? "w-full" : ""
      )}
      {...prop}
    >
      <span className={cn("flex-shrink-0 transition-all duration-300")}>
        {icon}
      </span>
      <span className={cn("break-keep flex-shrink-0")}>{children}</span>
    </button>
  );
}

export function Bar() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();

  const location = useLocation();

  const chatSessionInformations = useChatSessionInformation();
  const chatSessionStorage = useChatSessionStore((state) => state);

  return (
    <>
      <button
        className="top-4 left-4 w-12 h-12 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 overflow-hidden fixed z-20"
        onClick={() => {
          sessionStorage.setIsBarOpen(!sessionStorage.isBarOpen);
        }}
      >
        <div
          className={cn(
            "h-12 w-24 flex absolute top-0  items-center justify-around transition-all duration-300",
            sessionStorage.isBarOpen ? "left-0" : "-left-12"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 2 10Z"
              clipRule="evenodd"
            />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      <div
        className={cn(
          "flex-shrink-0 z-10 h-full bg-slate-300 bg-opacity-0 fixed md:relative w-full md:w-auto transition-all duration-300 pointer-events-none select-none",
          sessionStorage.isBarOpen
            ? "bg-opacity-100 sm:bg-opacity-50 pointer-events-auto"
            : "md:pointer-events-auto"
        )}
        onClick={() => {
          sessionStorage.setIsBarOpen(false);
        }}
      >
        <div
          className={cn(
            "bg-slate-50 flex flex-col transition-all duration-300 p-4 h-full pt-20 md:pt-32 w-10/12",
            sessionStorage.isBarOpen
              ? "sm:w-72 -translate-x-0"
              : "md:w-20 -translate-x-full md:transform-none"
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <WebRWKVFixedBanner></WebRWKVFixedBanner>
          <button
            className={cn(
              "group h-12 w-12 gap-4 rounded-full bg-slate-200 hover:bg-slate-300 p-3.5 overflow-hidden break-keep inline-flex transition-all duration-200 text-slate-600",
              sessionStorage.isBarOpen ? "w-36" : ""
            )}
            onClick={() => {
              navigate("/");
            }}
          >
            <span
              className={cn(
                "flex-shrink-0 group-hover:rotate-90 transition-all duration-300"
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
            <span className={cn("break-keep flex-shrink-0")}>New Chat</span>
          </button>
          <div className={cn("overflow-auto flex flex-col gap-2 mt-4")}>
            {chatSessionInformations.reverse().map((v, k) => {
              return (
                <div
                  key={k}
                  onClick={() =>
                    navigate(`/chat/${v.id}`, { state: { prompt: null } })
                  }
                  className={cn(
                    "group text-left p-1 pl-4 pr-2 hover:bg-slate-100 rounded-lg flex items-center"
                  )}
                >
                  <span className={cn("py-1")}>{v.title}</span>
                  <button
                    className={cn(
                      "ml-auto p-1 bg-red-500 text-sm text-white rounded-md opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      chatSessionStorage.deleteSessionById(v.id);
                      if (location.pathname.includes(v.id)) {
                        navigate("/");
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
          <BarButtom
            className={cn("mt-auto")}
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
      </div>
    </>
  );
}
