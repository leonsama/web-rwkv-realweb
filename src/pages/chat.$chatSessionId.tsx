import { useLocation, useNavigate, useParams } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { useChatSession, useSessionStorage } from "../store/PageStorage";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/utils";
// import { WebRWKVChat } from "../web-rwkv-wasm-port/web-rwkv";

// const client = new WebRWKVChat()

export default function Chat() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const { chatSessionId } = useParams();

  const { activeMessageList, submitMessage, updateChatSessionTitle } =
    useChatSession(chatSessionId!);
  const isSubmited = useRef(false);

  useEffect(() => {
    if (!isSubmited.current) {
      if (location.state?.prompt!) {
        submitMessage("user", location.state.prompt);
        updateChatSessionTitle(location.state.prompt);
      }
      isSubmited.current = true;
    }
  }, []);

  const submitPrompt = (prompt: string) => {
    submitMessage("user", prompt);
  };
  return (
    <div className="w-full h-full flex flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex-1 overflow-auto flex flex-col items-center flex-shrink-0 px-4 pb-24 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="w-full max-w-screen-md flex flex-col gap-4">
          {activeMessageList.map((v, k) => {
            return (
              <div
                key={`${chatSessionId}-${k}`}
                className="flex flex-col gap-2 motion-translate-x-in-[0%] motion-translate-y-in-[20%] motion-opacity-in-[0%] motion-duration-[0.4s]"
              >
                <div className="font-bold">{v.role}</div>
                <div>{v.content}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-full flex justify-center md:p-4 md:pb-10">
        <ChatTextarea
          key={`index-textarea`}
          className="fixed md:static bottom-4 left-4 right-4 bg-white md:w-full max-w-screen-md"
          onSubmit={(value) => {
            submitPrompt(value);
          }}
        ></ChatTextarea>
      </div>
    </div>
  );
}
