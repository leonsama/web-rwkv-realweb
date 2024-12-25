import { useLocation, useNavigate } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { useChatSession, useSessionStorage } from "../store/PageStorage";
import { useEffect, useRef } from "react";
import { cn } from "../utils/utils";

export default function Chat() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const { activeMessageList, submitMessage } = useChatSession(
    location.pathname.split("/")[2]
  );
  const isSubmited = useRef(false);

  useEffect(() => {
    // console.log(location.state.prompt);
    if (!isSubmited.current) {
      if (location.state.prompt) {
        submitMessage("user", location.state.prompt);
      }
      isSubmited.current = true;
    }
  }, []);

  const submitPrompt = (prompt: string) => {
    submitMessage("user", prompt);
  };
  return (
    <div className="w-full h-full flex flex-col">
      <div className={cn("flex-1 overflow-y-auto")}>
        {activeMessageList.map((v, k) => {
          return (
            <div key={k} className="flex flex-col">
              <div>{v.role}</div>
              <div>{v.content}</div>
            </div>
          );
        })}
      </div>
      <ChatTextarea
        className="absolute bottom-2 left-2 right-2 bg-white md:static md:mt-auto md:mb-7"
        onSubmit={(value) => {
          submitPrompt(value);
        }}
      ></ChatTextarea>
    </div>
  );
}
