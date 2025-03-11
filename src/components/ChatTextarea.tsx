import { useEffect, useRef, useState } from "react";
import { cn, Timer } from "../utils/utils";
import { PromptTextarea } from "./PromptTextarea";
import {
  APIInferPort,
  cleanChatPrompt,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { useChatModelSession } from "../store/ModelStorage";
import { Modal, ModalInterface } from "./popup/Modals";
import { ModelLoaderCard } from "./ModelConfigUI";

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

export function ReasoningIcon({
  enableReasoning,
  ...prop
}: {
  enableReasoning: boolean;
} & React.HTMLAttributes<HTMLOrSVGElement>) {
  return (
    <svg
      {...prop}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", prop.className)}
      strokeWidth={1.5}
    >
      <path
        d="M874.496 385.109333c-93.141333-39.68-218.282667-65.28-352-72.32-21.333333-1.28-42.112-1.706667-61.866667-1.706666 98.901333-120.746667 204.885333-201.813333 274.645334-204.373334 13.738667-0.554667 25.386667 2.346667 34.688 8.362667 30.122667 19.541333 38.613333 75.434667 23.253333 153.173333-1.706667 10.666667 5.12 21.034667 15.36 23.04 10.666667 2.133333 20.906667-4.693333 23.04-15.36 19.2-97.28 5.12-164.096-40.106667-193.621333-16.213333-10.581333-35.84-15.573333-57.6-14.762667-87.466667 3.285333-210.773333 98.133333-323.84 244.053334-49.237333 1.493333-95.573333 5.546667-137.898666 12.245333-27.562667-123.605333-16.64-212.352 25.344-233.685333 5.888-3.114667 12.16-4.693333 19.498666-5.290667 29.738667-2.304 70.826667 16.853333 115.626667 54.186667 8.277333 6.826667 20.736 5.973333 27.562667-2.56a19.541333 19.541333 0 0 0-2.56-27.52C403.882667 64.426667 354.304 42.666667 313.770667 45.653333a95.744 95.744 0 0 0-34.261334 9.386667c-50.773333 25.898667-71.253333 99.285333-58.453333 206.421333 2.986667 22.186667 6.826667 45.312 12.373333 69.12C93.44 358.570667 4.266667 414.634667 0.426667 485.205333c-2.56 49.92 36.906667 97.450667 114.346666 137.472a19.626667 19.626667 0 1 0 17.92-34.816C70.826667 556.032 37.546667 520.106667 39.552 487.253333c2.133333-46.08 75.605333-93.44 203.093333-118.613333 11.52 42.410667 26.453333 86.698667 44.8 131.84-43.434667 80.554667-74.922667 159.872-91.178666 230.4-23.893333 105.173333-11.093333 180.053333 36.693333 211.114667 15.36 9.984 33.28 14.933333 53.205333 14.933333 39.893333 0 88.192-19.626667 142.805334-58.538667a19.541333 19.541333 0 1 0-22.613334-31.829333c-65.877333 47.061333-121.344 62.805333-151.978666 42.794667-32.426667-21.12-39.509333-82.901333-19.626667-169.642667 13.653333-59.136 38.698667-125.013333 72.874667-192.853333 8.533333 18.688 17.493333 37.376 26.88 56.021333 60.8 119.296 135.253333 223.018667 209.493333 292.053333 59.136 55.04 114.090667 83.754667 159.36 83.754667 14.933333 0 29.013333-3.2 41.642667-9.514667 48.853333-24.96 69.973333-94.293333 59.648-195.2-9.557333-94.421333-45.226667-209.493333-100.437334-324.266666a19.626667 19.626667 0 1 0-35.413333 16.896c114.773333 239.018667 122.88 434.773333 58.453333 467.626666-67.84 34.688-231.424-100.48-357.973333-349.013333-14.506667-27.946667-27.178667-55.466667-38.4-82.346667 14.506667-25.941333 29.866667-52.053333 46.72-78.08 16.853333-25.770667 34.389333-50.688 52.224-74.453333h16.810667c23.04 0 48.042667 0.426667 73.984 2.048 278.613333 14.634667 468.266667 109.226667 464.384 184.917333-1.706667 32.64-39.424 65.621333-103.466667 90.453334a19.797333 19.797333 0 0 0-11.093333 25.429333 19.413333 19.413333 0 0 0 25.301333 11.178667c81.28-31.573333 125.866667-74.922667 128.426667-125.013334 2.986667-56.746667-49.92-111.36-149.333334-153.6v-0.426666zM344.746667 403.2c-11.52 17.706667-22.186667 35.285333-32.597334 53.077333a1009.493333 1009.493333 0 0 1-30.848-94.506666c30.421333-4.693333 63.36-8.106667 98.56-10.24-11.946667 16.64-23.637333 33.877333-34.986666 51.626666v-0.426666z"
        fill="currentColor"
        className={cn(
          "transition-all duration-500",
          enableReasoning
            ? "text-yellow-500"
            : "text-gray-500 dark:text-zinc-300",
        )}
      ></path>
      <path
        d="M512.213333 512m-58.666666 0a58.666667 58.666667 0 1 0 117.333333 0 58.666667 58.666667 0 1 0-117.333333 0Z"
        fill="currentColor"
        className="text-yellow-400"
      ></path>
    </svg>
  );
}

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
        "h-7 flex-shrink-0 select-none rounded-3xl px-2 py-1.5 text-xs shadow-md outline outline-1 outline-slate-400 transition-[opacity,background-color] duration-300 hover:bg-gray-100 dark:hover:bg-zinc-600/50",
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
          }, 500);
        }
      }}
      onMouseDown={() => {
        if (isKeepFocus) {
          isKeepFocus.current = true;
          setTimeout(() => {
            isKeepFocus.current = false;
          }, 500);
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
  currentModelName,
  ...props
}: {
  className?: string;
  maxLines?: number;
  onSubmit?: (value: string, enableReasoning: boolean) => void;
  submitShortcutOnMobile?: boolean;
  currentModelName?: string;
}) {
  const [value, setValue] = useState("");
  const textDisplayAreaRef = useRef<HTMLDivElement>(null);

  const [lineCount, setLineCount] = useState(1);
  const [isFocus, setIsFocus] = useState(false);
  const [isPannelExpaned, setIsPannelExpaned] = useState(false);

  const { llmModel, loadingModelTitle } = useChatModelSession((s) => s);
  const {
    selectedModelTitle,
    unloadModel,
    supportReasoning,
    currentInferPort,
  } = useWebRWKVChat(llmModel);

  const [isEnableReasoning, setEnableReasoning] = useState(
    llmModel.isEnableReasoning,
  );

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
      if (textDisplayAreaRef.current)
        setLineCount(textDisplayAreaRef.current.scrollHeight / lineHeight);
    }, 0);
  }, [value]);

  const submitPrompt = (value: string) => {
    if (cleanChatPrompt(value) === "") return;
    onSubmit(cleanChatPrompt(value), isEnableReasoning);
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

  const blurTimmer = useRef<Timer>();

  const hidePannel = (delay: number) => {
    clearTimeout(blurTimmer.current);
    blurTimmer.current = setTimeout(() => {
      setIsPannelExpaned(false);
      blurTimmer.current = undefined;
    }, delay);
  };

  useEffect(() => {
    clearTimeout(blurTimmer.current);
    if (isFocus) {
      setIsPannelExpaned(true);
      blurTimmer.current = undefined;
    } else if (value === "") {
      hidePannel(300);
    }
  }, [isFocus, value]);

  useEffect(() => {
    llmModel.isEnableReasoning = isEnableReasoning;
  }, [isEnableReasoning]);

  useEffect(() => {
    if (llmModel.supportReasoning) {
      llmModel.isEnableReasoning = llmModel.isEnableReasoning
        ? true
        : isEnableReasoning;
      setEnableReasoning(llmModel.isEnableReasoning);
    } else {
      setEnableReasoning(false);
    }
  }, [llmModel]);

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
          "invisibleScrollbar hideScrollbar flex flex-nowrap items-center gap-3 overflow-auto overflow-y-hidden text-nowrap px-3 transition-all duration-500 md:px-5",
          isPannelExpaned ? "h-12 md:h-16" : "h-0",
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
                  ? `${400 + k * 50}ms,0ms`
                  : undefined,
              }}
              isKeepFocus={isKeepFocus}
            >
              {v.title}
            </PromptSuggestion>
          );
        })}
      </div>
      {/* edit area */}
      <div
        className={cn(
          "flex flex-shrink-0 rounded-[1.75rem] transition-[height] ease-out",
        )}
        style={{
          height: `${
            (lineCount > 1 ? 32 : 56) +
            (Math.min(Math.max(1, lineCount), maxLines) - 1) * lineHeight
          }px`,
        }}
        onKeyDown={(e) => handleKeyDown(e)}
      >
        <div
          className={cn(
            "flex justify-end gap-1 transition-all duration-500",
            isPannelExpaned ? "pointer-events-none w-0 opacity-0" : "w-[52px]",
            !supportReasoning && "pointer-events-none w-0 opacity-0",
          )}
        >
          {/* <button
            className={cn(
              "my-2 h-10 w-10 self-end rounded-full p-2.5 text-slate-500 hover:bg-slate-100",
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
          </button> */}
          <button
            className={cn(
              "my-2 mr-1 h-10 w-10 self-end rounded-full p-2.5 text-slate-500 transition-[color,background-color] duration-500 dark:text-zinc-200",
              isEnableReasoning
                ? "md:hover:bg-yellow-500/10 dark:md:hover:bg-yellow-500/20"
                : "md:hover:bg-slate-100 dark:md:hover:bg-slate-200/20",
            )}
            onClick={() => setEnableReasoning(!isEnableReasoning)}
          >
            <ReasoningIcon enableReasoning={isEnableReasoning}></ReasoningIcon>
          </button>
        </div>
        <div
          className={cn(
            "flex-1 cursor-text overflow-auto py-4 transition-all duration-500",
            !supportReasoning && "pl-5",
            isPannelExpaned && "pl-3 md:pl-5",
            lineCount > 1 && "py-0",
          )}
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
            className="caret-black dark:caret-zinc-300"
          ></PromptTextarea>
        </div>
        <button
          className={cn(
            "absolute bottom-0 right-0 m-2 h-10 w-10 self-end rounded-full p-2.5 text-slate-400 transition-[background-color,margin] duration-[200ms,500ms] hover:bg-slate-100 dark:text-zinc-400",
            cleanChatPrompt(value) !== "" &&
              "text-slate-600 dark:text-zinc-300",
            isPannelExpaned ? "max-md:my-0" : "",
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
      {/* bottom bar */}
      <div
        className={cn(
          "center invisibleScrollbar mr-11 flex gap-1 overflow-hidden overflow-x-auto pl-3 pr-3 transition-all duration-500 [mask-image:linear-gradient(90deg,#ffff_calc(100%_-_1rem),_#0000_100%)] md:pl-5",
        )}
      >
        <div
          className={cn(
            "flex h-10 flex-shrink-0 items-center transition-all duration-500 md:h-14",
            supportReasoning && isPannelExpaned ? "" : "-mb-10 md:-mb-14",
          )}
        >
          <button
            className={cn(
              "flex h-6 items-center gap-2 rounded-full border px-2 text-slate-500 transition-all duration-500 dark:text-slate-300 md:hover:bg-slate-100 dark:md:hover:bg-zinc-600/70",
              supportReasoning && isPannelExpaned
                ? ""
                : "pointer-events-none opacity-0",
              isEnableReasoning
                ? "border-yellow-600 bg-yellow-500/10 text-yellow-600 dark:text-yellow-600 md:hover:bg-yellow-500/20 dark:md:hover:bg-yellow-500/30"
                : "border-slate-400 text-slate-500",
            )}
            onTouchStart={() => {
              if (isKeepFocus) {
                isKeepFocus.current = true;
                setTimeout(() => {
                  isKeepFocus.current = false;
                }, 500);
              }
            }}
            onMouseDown={() => {
              if (isKeepFocus) {
                isKeepFocus.current = true;
                setTimeout(() => {
                  isKeepFocus.current = false;
                }, 500);
              }
            }}
            onClick={() => setEnableReasoning(!isEnableReasoning)}
          >
            <ReasoningIcon enableReasoning={isEnableReasoning}></ReasoningIcon>
            <span>Reasoning</span>
          </button>
        </div>
        <div
          className={cn(
            "items-transition-all ml-auto flex h-10 flex-shrink-0 items-center text-sm text-gray-500/50 duration-500 dark:text-zinc-400 md:h-14",
            isPannelExpaned ? "" : "-mb-10 md:-mb-14",
          )}
        >
          <span
            className={cn(
              "flex h-8 items-center text-nowrap transition-all",
              isPannelExpaned ? "opacity-100" : "opacity-0",
            )}
          >
            {currentModelName ? (
              <span className="motion-preset-slide-left-sm" key={0}>
                Current Model:{" "}
                <span className="font-semibold">{currentModelName}</span>
              </span>
            ) : (
              <span className="motion-preset-slide-right-sm" key={1}>
                Selected Model:{" "}
                {currentInferPort.current &&
                  (isEnableReasoning
                    ? currentInferPort.current.portType === "api"
                      ? (currentInferPort.current as APIInferPort)
                          .reasoningModelName
                      : currentInferPort.current.selectedModelTitle
                    : currentInferPort.current.selectedModelTitle)}
              </span>
            )}
            <button className="pl-2" onClick={openModal}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        </div>
      </div>

      {/* load model hint */}
      <div
        className={cn(
          "group absolute bottom-0 left-0 right-0 top-0 flex cursor-pointer items-center backdrop-blur-sm transition-all duration-300",
          selectedModelTitle === null
            ? ""
            : "pointer-events-none scale-95 opacity-0",
        )}
        onClick={() => {
          if (loadingModelTitle === null) openModal();
        }}
      >
        <div
          className={cn(
            "m-2 flex h-10 w-10 items-center justify-center self-end rounded-full text-slate-800 dark:text-zinc-300",
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
          {selectedModelTitle === null &&
            (loadingModelTitle === null ? (
              <span className="transition-all group-active:scale-95">
                Model not loaded. Load to interact.
              </span>
            ) : (
              <>
                <span className="font-semibold underline transition-all group-active:scale-95">
                  Loading... Sit back and relax!
                </span>
                <span className="ml-2 hidden text-xs text-slate-300 transition-all group-active:scale-95 md:static">
                  {loadingModelTitle}
                </span>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
