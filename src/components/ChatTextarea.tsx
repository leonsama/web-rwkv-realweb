import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/utils";
import { PromptTextarea } from "./PromptTextarea";
import {
  cleanChatPrompt,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { useChatModelSession } from "../store/ModelStorage";
import { Modal, ModalInterface } from "./popup/Modals";
import { ModelLoaderCard } from "./ModelConfigUI";
import { Slide, toast } from "react-toastify";

interface Suggestion {
  prompt: string;
  title: React.ReactNode;
}

const suggestions: Suggestion[] = [
  {
    prompt: "Tell me about the Eiffel Tower.",
    title: "Tell me about the Eiffel Tower.",
  },
  {
    prompt: "How many major planets are there in the Solar System?",
    title: "How many major planets are there in the Solar System?",
  },
];

function PromptSuggestion({
  promptContent,
  children,
  onClick,
  className,
  style,
  isKeepFocus,
  ...prop
}: {
  promptContent: string;
  children: React.ReactNode;
  onClick: (prompt: string) => void;
  isKeepFocus?: React.MutableRefObject<boolean>;
  className?: string;
  style?: React.CSSProperties;
  prop?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <button
      className={cn(
        "h-7 flex-shrink-0 select-none rounded-3xl px-2 py-1.5 text-xs shadow-md outline outline-1 outline-slate-400 transition-all duration-300 hover:bg-gray-100",
        className,
      )}
      onClick={(e) => {
        onClick(promptContent);
      }}
      onTouchStart={() => {
        if (isKeepFocus) {
          isKeepFocus.current = true;
          setTimeout(() => {
            isKeepFocus.current = false;
          }, 200);
        }
      }}
      style={style}
      {...prop}
    >
      {children}
    </button>
  );
}

export function ChatTextarea({
  className,
  maxLines = 8,
  onSubmit = () => {},
  submitShortcutOnMobile = false,
  ...props
}: {
  className?: string;
  maxLines?: number;
  onSubmit?: (value: string) => void;
  submitShortcutOnMobile?: boolean;
}) {
  const [value, setValue] = useState("");
  const textDisplayAreaRef = useRef<HTMLDivElement>(null);

  const [lineCount, setLineCount] = useState(1);
  const [isFocus, setIsFocus] = useState(false);
  const [isPannelExpaned, setIsPannelExpaned] = useState(false);

  const { llmModel, loadingModelName } = useChatModelSession((s) => s);
  const { currentModelName, unloadModel } = useWebRWKVChat(llmModel);

  const [textareaPlaceholder, setTextareaPlaceholder] = useState(
    "What can I help you today?",
  );

  const rootEle = useRef<HTMLDivElement>(null);

  const loadModelModal = useRef<ModalInterface>(null!);

  const isKeepFocus = useRef(false);

  const baseHeight = 56;
  const lineHeight = 24;

  useEffect(() => {
    setTimeout(() => {
      setLineCount(textDisplayAreaRef.current!.scrollHeight / lineHeight);
    }, 0);
  }, [value]);

  const submitPrompt = (value: string) => {
    if (cleanChatPrompt(value) === "") return;
    onSubmit(cleanChatPrompt(value));
    setValue("");
    hidePannel(0);
    setIsPannelExpaned(false);
    setIsFocus(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      e.stopPropagation();
      e.preventDefault();
      submitPrompt(value);
    }
  };

  const openModal = () => {
    loadModelModal.current.setIsModalOpen(true);
  };

  const blurTimmer = useRef<number>(-1);

  const hidePannel = (delay: number) => {
    clearTimeout(blurTimmer.current);
    blurTimmer.current = setTimeout(() => {
      setIsPannelExpaned(false);
      blurTimmer.current = -1;
    }, delay);
  };

  useEffect(() => {
    clearTimeout(blurTimmer.current);
    if (isFocus) {
      setIsPannelExpaned(true);
      blurTimmer.current = -1;
    } else if (value === "") {
      hidePannel(300);
    }
  }, [isFocus, value]);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] outline outline-1 outline-slate-400 transition-[height] ease-out",
        className,
      )}
    >
      <Modal ref={loadModelModal}>
        {({ close }) => {
          return <ModelLoaderCard close={close}></ModelLoaderCard>;
        }}
      </Modal>
      {/* suggestions */}
      <div
        className={cn(
          "invisibleScrollbar hideScrollbar flex flex-nowrap items-center gap-3 overflow-auto overflow-y-hidden text-nowrap px-5 transition-all duration-500",
          isPannelExpaned ? "h-16" : "h-0",
        )}
      >
        {suggestions.map((v: Suggestion, k: number) => {
          return (
            <PromptSuggestion
              key={k}
              promptContent={v.prompt}
              onClick={(e) => {
                setValue(e);
              }}
              className={cn(isPannelExpaned ? "opacity-100" : "opacity-0")}
              style={{
                transitionDelay: isPannelExpaned
                  ? `${400 + k * 50}ms`
                  : undefined,
              }}
              isKeepFocus={isKeepFocus}
            >
              {v.title}
            </PromptSuggestion>
          );
        })}
      </div>
      {/* current model info  */}
      <div
        className={cn(
          "flex items-center px-5 text-xs text-gray-300 transition-all duration-500",
          isPannelExpaned && lineCount < 2 ? "h-3" : "pointer-events-none h-0",
        )}
      >
        <span
          className={cn(
            "transition-all",
            isPannelExpaned && lineCount < 2 ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionDelay:
              isPannelExpaned && lineCount < 2 ? `350ms` : undefined,
          }}
        >
          Current Model: {currentModelName}{" "}
          <button className="underline" onClick={unloadModel}>
            Unload
          </button>
        </span>
      </div>
      {/* edit area */}
      <div
        className={cn(
          "flex flex-shrink-0 rounded-[1.75rem] transition-[height] ease-out",
        )}
        style={{
          height: `${
            baseHeight +
            (Math.min(Math.max(1, lineCount), maxLines) - 1) * lineHeight
          }px`,
        }}
        onKeyDown={(e) => handleKeyDown(e)}
      >
        <button
          className={cn(
            "m-2 h-10 w-10 self-end rounded-full p-2.5 text-slate-500 hover:bg-slate-100",
          )}
          onClick={() => {
            toast("🧷 File Upload is comming soon！", {
              position: "top-right",
              autoClose: 2500,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
              transition: Slide,
            });
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div
          className={cn("flex-1 cursor-text overflow-auto py-4")}
          onClick={() => {
            setIsFocus(true);
          }}
        >
          <PromptTextarea
            value={value}
            onChange={(e) => {
              setValue(e);
            }}
            placeholder={textareaPlaceholder}
            editable={true}
            innerRef={textDisplayAreaRef}
            invisibleScrollbar={lineCount <= maxLines}
            isFocus={isFocus}
            setIsFocus={setIsFocus}
            isKeepFocus={isKeepFocus}
          ></PromptTextarea>
        </div>
        <button
          className={cn(
            "m-2 h-10 w-10 self-end rounded-full p-2.5 text-slate-400 hover:bg-slate-100",
            cleanChatPrompt(value) !== "" && "text-slate-600",
          )}
          onClick={() => {
            submitPrompt(value);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
      {/* load model hint */}
      <div
        className={cn(
          "group absolute bottom-0 left-0 right-0 top-0 flex cursor-pointer items-center backdrop-blur-sm transition-all duration-300",
          currentModelName === null
            ? ""
            : "pointer-events-none scale-95 opacity-0",
        )}
        onClick={() => {
          if (loadingModelName === null) openModal();
        }}
      >
        <div
          className={cn(
            "m-2 flex h-10 w-10 items-center justify-center self-end rounded-full text-slate-800",
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6"
          >
            <path
              fillRule="evenodd"
              d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex h-14 w-0 flex-1 cursor-pointer items-center self-end p-2">
          {currentModelName === null &&
            (loadingModelName === null ? (
              <span className="transition-all group-active:scale-95">
                Model not loaded. Load to interact.
              </span>
            ) : (
              <>
                <span className="font-semibold underline transition-all group-active:scale-95">
                  Loading... Sit back and relax!
                </span>
                <span className="ml-2 text-sm text-slate-300 transition-all group-active:scale-95">
                  {loadingModelName}
                </span>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
