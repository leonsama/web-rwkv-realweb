import { useNavigate } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { useChatSessionStore, useSessionStorage } from "../store/PageStorage";
import { Flipped, Flipper } from "react-flip-toolkit";
import { useState } from "react";
import { cn } from "../utils/utils";

export default function Home() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();

  const chatSessionStorage = useChatSessionStore((state) => state);
  const createNewConversation = (prompt: string) => {
    sessionStorage.setShowLargeBanner(false);

    const newSessionId = chatSessionStorage.createNewSession();

    setTimeout(() => {
      navigate(`/chat/${newSessionId}`, { state: { prompt } });
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col items-stretch">
      <div className="h-20"></div>
      <div className="flex-1 overflow-auto flex flex-col items-center flex-shrink-0 px-4">
        <div className="w-full max-w-screen-md">
          <Flipper flipKey={sessionStorage.showLargeBanner}>
            <Flipped flipId="slogan">
              <h1
                className={cn(
                  "mt-40 min-[370px]:mt-28 xl:mt-36 text-6xl xl:text-7xl font-medium select-none transition-colors",
                  sessionStorage.showLargeBanner
                    ? "text-slate-300 -translate-y-0"
                    : "text-transparent -translate-y-20"
                )}
              >
                LLM In Your Browser
              </h1>
            </Flipped>
          </Flipper>
        </div>
      </div>
      <div className="w-full flex justify-center md:p-4 md:pb-10">
        <ChatTextarea
          key={"index-textarea"}
          className={cn(
            "fixed md:static bottom-4 left-4 right-4 bg-white md:w-full max-w-screen-md"
          )}
          onSubmit={(value) => {
            createNewConversation(value);
          }}
        ></ChatTextarea>
      </div>
    </div>
  );
}
