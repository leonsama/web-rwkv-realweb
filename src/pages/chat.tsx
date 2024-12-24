import { useNavigate } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { useSessionStorage } from "../store/PageStorage";

export default function Chat() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();
  const submitPrompt = (prompt: string) => {
    console.log(prompt);
  };
  return (
    <div className="w-full h-full flex flex-col">
      <ChatTextarea
        className="absolute bottom-2 left-2 right-2 bg-white md:static md:mt-auto md:mb-7"
        onSubmit={(value) => {
          submitPrompt(value);
        }}
      ></ChatTextarea>
    </div>
  );
}
