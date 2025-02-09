import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/utils";
import { PromptTextarea } from "./PromptTextarea";
import { cleanChatPrompt } from "../web-rwkv-wasm-port/web-rwkv";

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

  const [textareaPlaceholder, setTextareaPlaceholder] = useState(
    "What can I help you today?",
  );

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

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] outline outline-1 outline-slate-400 transition-[height] ease-out",
        className,
      )}
    >
      <div
        className={cn(
          "invisibleScrollbar hideScrollbar flex flex-nowrap items-center gap-3 overflow-auto overflow-y-hidden text-nowrap px-5 transition-all duration-500",
          isFocus ? "h-16" : "h-0",
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
              className={cn(isFocus ? "opacity-100" : "opacity-0")}
              style={{
                transitionDelay: isFocus ? `${300 + k * 50}ms` : undefined,
              }}
              isKeepFocus={isKeepFocus}
            >
              {v.title}
            </PromptSuggestion>
          );
        })}
      </div>
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
        <div className={cn("flex-1 overflow-auto py-4")}>
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
    </div>
  );
}
