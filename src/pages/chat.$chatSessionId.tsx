import { useLocation, useNavigate, useParams } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../utils/utils";
import { useWebRWKVChat } from "../web-rwkv-wasm-port/web-rwkv";
import { useChatModelSession, useModelStorage } from "../store/ModelStorage";

import Markdown from "../components/marked-react";
import { RWKVOutputFormatter } from "../utils/RWKVOutputFormatter";
import { RWKVMarkdown } from "../components/MarkdownRender";
import { useSessionStorage } from "../store/PageStorage";
import {
  CurrentMessageBlock,
  CurrentMessageContent,
  useChatSession,
} from "../store/ChatSessionStorage";
import { Sampler } from "../web-rwkv-wasm-port/types";
import { Modal } from "../components/popup/Modals";
import { Card, CardTitle, Entry } from "../components/Cards";
import { Button } from "../components/Button";
import { PromptTextarea } from "../components/PromptTextarea";

// let colorbg = new BlurGradientBg({
// 	dom: "box",
// 	colors: ["#eea2a2","#d0b5ae","#a3d1bf","#8fcec8"],
// 	loop: true
// })

const ChatSession = createContext<
  ReturnType<typeof useChatSession> & {
    startGenerationTask: (prompt: string, newChat: boolean) => Promise<void>;
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;

    currentSamperConfig: React.RefObject<Sampler>;
    currentModelName: string | null;

    generator: React.MutableRefObject<AsyncGenerator<
      string,
      void,
      unknown
    > | null>;
    completion: ReturnType<typeof useWebRWKVChat>["completion"];
  }
>(null!);

function ToolButton({
  children,
  className,
  disabled,
  ...prop
}: {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...prop}
      disabled={disabled}
      className={cn(
        "rounded-lg p-1 transition-all",
        disabled
          ? "pointer-events-none text-slate-200"
          : "active:bg-slate-400/40 md:hover:bg-slate-400/20",
        className,
      )}
    >
      {children}
    </button>
  );
}

function MessageInformationViewer({
  close,
  currentMessageBlock,
}: {
  close: () => void;
  currentMessageBlock: CurrentMessageBlock;
}) {
  return (
    <Card className="md:2/3 h-2/3 max-h-full w-full overflow-auto md:w-2/3 md:max-w-xl">
      <CardTitle
        icon={
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
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
        }
      >
        <span>Message Information</span>
        <div className="flex-1"></div>
        {close && (
          <Button className="rounded-full p-2" onClick={() => close()}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </Button>
        )}
      </CardTitle>
      <Entry
        label="Content"
        className="min-h-min flex-1 flex-shrink-0 md:items-start"
      >
        <textarea
          value={
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].content
          }
          disabled={true}
          onChange={(e) => {}}
          className="h-full min-h-80 w-full rounded-lg bg-white p-2"
        ></textarea>
      </Entry>
      <Entry label="Sampler" className="md:items-start">
        <div className="w-full">
          {currentMessageBlock.messageContents[
            currentMessageBlock.activeMessageContentIndex
          ].samplerConfig !== null
            ? Object.entries(
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].samplerConfig as Sampler,
              ).map(([key, value]) => (
                <p key={key}>
                  {key}: {value}
                </p>
              ))
            : "Empty"}
        </div>
      </Entry>
      <Entry label="Model Name" className="text-nowrap">
        <div className="w-full text-wrap">
          {
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].modelName
          }
        </div>
      </Entry>
      <Entry label="Chat Time" className="text-nowrap">
        <div className="w-full">
          {new Date(
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].timestamp,
          ).toLocaleString()}
        </div>
      </Entry>
    </Card>
  );
}

function UserContent({
  currentMessageBlock,
}: {
  currentMessageBlock: CurrentMessageBlock;
}) {
  return (
    <div className="flex flex-row-reverse motion-translate-y-in-[40px] motion-opacity-in-[0%] motion-duration-[0.4s]">
      <div className="ml-10 flex max-w-screen-sm flex-col">
        <div className="w-full select-text overflow-hidden rounded-3xl rounded-tr-md bg-slate-100 p-4">
          <span className="whitespace-pre-wrap">
            {
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].content
            }
          </span>
        </div>
      </div>
    </div>
  );
}

function AssistantContent({
  currentMessageBlock,
}: {
  currentMessageBlock: CurrentMessageBlock;
}) {
  const {
    isGenerating,
    setIsGenerating,
    activeMessageBlocks,
    updateCurrentMessageBlock,
    currentSamperConfig,
    currentModelName,
    generator,
    completion,
    getActiveMessages,
  } = useContext(ChatSession);

  const avatarEle = useRef<HTMLDivElement>(null);

  const regenerate = async () => {
    if (isGenerating) throw new Error("Unexpected regenerate task.");

    currentMessageBlock.messageContents.push({
      id: currentMessageBlock.messageContents.length,
      role: currentMessageBlock.messageContents[
        currentMessageBlock.activeMessageContentIndex
      ].role,
      content: "",
      activeNextMessageBlockIndex: -1,
      nextMessagesBlockIds: [],
      avatar: null,
      samplerConfig: currentSamperConfig.current,
      isGenerating: true,
      rank: 0,
      modelName: currentModelName,
      timestamp: Date.now(),
    });

    const activeMessageContentIndex =
      currentMessageBlock.messageContents.length - 1;
    currentMessageBlock.activeMessageContentIndex = activeMessageContentIndex;
    updateCurrentMessageBlock(currentMessageBlock);

    setIsGenerating(true);

    generator.current = completion({
      stream: true,
      messages: getActiveMessages(true),
    });

    let result = "";
    for await (const chunk of generator.current) {
      result += chunk;
      currentMessageBlock.messageContents[activeMessageContentIndex].content =
        result;
      updateCurrentMessageBlock(currentMessageBlock);
    }
    currentMessageBlock.messageContents[
      activeMessageContentIndex
    ].isGenerating = false;
    currentMessageBlock.messageContents[activeMessageContentIndex].timestamp =
      Date.now();
    updateCurrentMessageBlock(currentMessageBlock);

    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col gap-4 motion-translate-y-in-[40px] motion-opacity-in-[0%] motion-duration-[0.4s] md:flex-row">
      <div className="mt-3">
        <div className="sticky top-0 flex items-center gap-5 md:flex-col">
          {/* avatar */}
          <div
            className="size-9 overflow-hidden rounded-full"
            style={{ backgroundImage: "var(--web-rwkv-title-gradient)" }}
            ref={avatarEle}
          ></div>
          {/* switch active currentMessageContent */}
          <div
            className={cn(
              "ml-auto flex items-center text-slate-400",
              currentMessageBlock.messageContents.length === 1 &&
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].isGenerating
                ? "pointer-events-none opacity-0"
                : "opacity-100",
            )}
          >
            <ToolButton
              disabled={currentMessageBlock.activeMessageContentIndex < 1}
              onClick={() => {
                if (currentMessageBlock.activeMessageContentIndex < 1) return;
                currentMessageBlock.activeMessageContentIndex =
                  currentMessageBlock.activeMessageContentIndex - 1;
                updateCurrentMessageBlock(currentMessageBlock);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </ToolButton>
            <span className="w-9 text-center text-sm">
              {currentMessageBlock.activeMessageContentIndex + 1}
              {" / "}
              {currentMessageBlock.messageContents.length}
            </span>
            <ToolButton
              disabled={
                currentMessageBlock.activeMessageContentIndex + 1 >=
                currentMessageBlock.messageContents.length
              }
              onClick={() => {
                if (
                  currentMessageBlock.activeMessageContentIndex + 1 >=
                  currentMessageBlock.messageContents.length
                )
                  return;
                currentMessageBlock.activeMessageContentIndex =
                  currentMessageBlock.activeMessageContentIndex + 1;
                updateCurrentMessageBlock(currentMessageBlock);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </ToolButton>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="min-h-10 select-text">
          <RWKVMarkdown
            stream={
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].isGenerating
            }
            key={`${currentMessageBlock.key}-${currentMessageBlock.activeMessageContentIndex}`}
          >
            {RWKVOutputFormatter(
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].content,
            )}
          </RWKVMarkdown>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 text-slate-400 transition-opacity",
            currentMessageBlock.messageContents.length === 1 &&
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].isGenerating
              ? "pointer-events-none opacity-0"
              : "opacity-100",
          )}
        >
          {/* information */}
          <Modal
            modal={({ close }) => {
              return (
                <MessageInformationViewer
                  close={close}
                  currentMessageBlock={currentMessageBlock}
                ></MessageInformationViewer>
              );
            }}
            closeWhenBackgroundOnClick={true}
          >
            <ToolButton>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            </ToolButton>
          </Modal>
          {/* copy */}
          <ToolButton className="active:motion-preset-confetti">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
              />
            </svg>
          </ToolButton>
          {/* regenerate */}
          <ToolButton
            onClick={regenerate}
            disabled={isGenerating}
            className={cn(
              "transition-all",
              isGenerating ? "-ml-7 scale-75 opacity-0" : "",
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </ToolButton>
          {/* rank like */}
          <ToolButton
            className={cn(
              "transition-all",
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].isGenerating
                ? "scale-75 opacity-0"
                : "delay-[50ms]",
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].rank === 1 && "text-slate-700",
            )}
            onClick={() => {
              if (
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank === 1
              ) {
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank = 0;
              } else {
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank = 1;
              }
              updateCurrentMessageBlock(currentMessageBlock);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
              />
            </svg>
          </ToolButton>
          {/* rank dislike */}
          <ToolButton
            className={cn(
              "transition-all",
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].isGenerating
                ? "scale-75 opacity-0"
                : "delay-[100ms]",
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].rank === -1 && "text-slate-700",
            )}
            onClick={() => {
              if (
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank === -1
              ) {
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank = 0;
              } else {
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].rank = -1;
              }
              updateCurrentMessageBlock(currentMessageBlock);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54"
              />
            </svg>
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({
  currentMessageBlock,
}: {
  currentMessageBlock: CurrentMessageBlock;
}) {
  const { updateCurrentMessageBlock } = useContext(ChatSession);
  if (
    currentMessageBlock.messageContents[
      currentMessageBlock.activeMessageContentIndex
    ].role.toLowerCase() === "user"
  ) {
    return (
      <UserContent currentMessageBlock={currentMessageBlock}></UserContent>
    );
  }

  return (
    <AssistantContent
      currentMessageBlock={currentMessageBlock}
    ></AssistantContent>
  );
}

export default function Chat() {
  const sessionStorage = useSessionStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const { chatSessionId } = useParams();
  const {
    activeMessageBlocks,
    createNewMessasgeBlock,
    updateCurrentMessageBlock,
    updateChatSessionTitle,
    getActiveMessages,
  } = useChatSession(chatSessionId!);

  const webRWKVLLMInfer = useChatModelSession((s) => s.llmModel);

  const { currentModelName, completion, defaultSamplerParam } =
    useWebRWKVChat(webRWKVLLMInfer);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const generator = useRef<AsyncGenerator<string, void, unknown> | null>(null);

  const currentSamperConfig = useRef<Sampler | null>(null!);
  const isSubmited = useRef(false);

  useEffect(() => {
    if (!isSubmited.current) {
      currentSamperConfig.current = defaultSamplerParam.current;
      if (location.state?.prompt!) {
        window.history.replaceState({}, "");
        startGenerationTask(location.state.prompt, true);
        updateChatSessionTitle(location.state.prompt);
      }
      isSubmited.current = true;
    }
  }, [activeMessageBlocks]);

  const startGenerationTask = async (
    prompt: string,
    newChat: boolean = false,
  ) => {
    const promptBlock = newChat
      ? createNewMessasgeBlock({
          initialMessage: { role: "User", content: prompt },
          parentBlockId: null,
          samplerConfig: currentSamperConfig.current,
          isGenerating: false,
        })
      : createNewMessasgeBlock({
          initialMessage: { role: "User", content: prompt },
          parentBlockId: activeMessageBlocks[activeMessageBlocks.length - 1].id,
          samplerConfig: currentSamperConfig.current,
          isGenerating: false,
        });

    const resultBlock = createNewMessasgeBlock({
      initialMessage: { role: "Assistant", content: "" },
      parentBlockId: promptBlock.id,
      samplerConfig: currentSamperConfig.current,
      isGenerating: true,
    });

    const activeMessageContentIndex = resultBlock.activeMessageContentIndex;

    setIsGenerating(true);

    generator.current = completion({
      stream: true,
      messages: getActiveMessages(true),
    });
    resultBlock.messageContents[activeMessageContentIndex].modelName =
      currentModelName;

    let result = "";
    for await (const chunk of generator.current) {
      result += chunk;
      resultBlock.messageContents[activeMessageContentIndex].content = result;
      updateCurrentMessageBlock(resultBlock);
    }
    resultBlock.messageContents[activeMessageContentIndex].isGenerating = false;
    resultBlock.messageContents[activeMessageContentIndex].timestamp =
      Date.now();
    updateCurrentMessageBlock(resultBlock);

    setIsGenerating(false);
  };

  return (
    <div className="flex h-full w-full flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-4 pb-24 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex w-full max-w-screen-md flex-col gap-4">
          <ChatSession.Provider
            value={{
              activeMessageBlocks,
              createNewMessasgeBlock,
              updateCurrentMessageBlock,
              updateChatSessionTitle,
              getActiveMessages,

              generator,

              startGenerationTask,
              isGenerating,
              setIsGenerating,

              currentSamperConfig,
              currentModelName,

              completion,
            }}
          >
            {activeMessageBlocks.map((v) => {
              return (
                <MessageBlock
                  currentMessageBlock={v}
                  key={v.key}
                  // 惨痛教训：用 chatSessionId 和 index 拼接 key ，
                  // 但 chatSessionId 和 activeMessageList 刷新时序不同，导致在较慢的设备上出现两次渲染，导致错误组件缓存
                ></MessageBlock>
              );
            })}
          </ChatSession.Provider>
        </div>
      </div>
      <div
        key={`chat-textarea`}
        className="flex w-full justify-center md:p-4 md:pb-10"
      >
        <ChatTextarea
          className="fixed bottom-4 left-4 right-4 max-w-screen-md bg-white md:static md:w-full"
          onSubmit={(value) => {
            startGenerationTask(value);
          }}
        ></ChatTextarea>
      </div>
    </div>
  );
}
