import { useNavigate } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { useSessionStorage } from "../store/PageStorage";
import { Flipped, Flipper } from "react-flip-toolkit";
import { useState } from "react";
import { cn } from "../utils/utils";

export default function Home() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();
  const createNewConversation = (prompt: string) => {
    sessionStorage.setShowLargeBanner(false);

    setTimeout(() => {
      navigate("/chat", { state: { prompt } });
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Flipper flipKey={sessionStorage.showLargeBanner}>
        <Flipped flipId="slogan">
          <h1
            className={cn(
              "mt-48 xl:mt-56 text-6xl xl:text-7xl font-medium select-none transition-colors",
              sessionStorage.showLargeBanner
                ? "text-slate-300 -translate-y-0"
                : "text-transparent -translate-y-10"
            )}
          >
            LLM In Your Browser
          </h1>
        </Flipped>
      </Flipper>

      <ChatTextarea
        className="absolute bottom-2 left-2 right-2 bg-white md:static md:mt-auto md:mb-7"
        onSubmit={(value) => {
          createNewConversation(value);
        }}
      ></ChatTextarea>
    </div>
  );
}
