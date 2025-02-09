import { useLocation, useNavigate, useParams } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  cn,
  useMaxWidthBreakpoint,
  useSuspendUntilValid,
} from "../utils/utils";
import {
  DEFAULT_SESSION_CONFIGURATION,
  SessionConfiguration,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { useChatModelSession, useModelStorage } from "../store/ModelStorage";

import Markdown from "../components/marked-react";
import { RWKVOutputFormatter } from "../utils/RWKVOutputFormatter";
import { RWKVMarkdown } from "../components/MarkdownRender";
import { usePageStorage } from "../store/PageStorage";
import {
  CurrentMessageBlock,
  CurrentMessageContent,
  useChatSession,
} from "../store/ChatSessionStorage";
import { Sampler } from "../web-rwkv-wasm-port/types";
import {
  createModalForm,
  Modal,
  ModalInterface,
} from "../components/popup/Modals";
import { Card, CardTitle, Entry } from "../components/Cards";
import { Button } from "../components/Button";
import { PromptTextarea } from "../components/PromptTextarea";
import { InputList, InputRange, InputText } from "../components/Input";
import { ModelLoaderCard } from "../components/ModelConfigUI";

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

    currentModelName: string | null;
    loadingModelName: string | null;

    generator: React.MutableRefObject<{
      controller: { abort(): void };
      [Symbol.asyncIterator]: () => AsyncGenerator<string, void, unknown>;
    }>;
    completion: ReturnType<typeof useWebRWKVChat>["completion"];

    checkIsModelLoaded: (
      validate: (currentState: string | null) => boolean,
    ) => Promise<void>;
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
    <div className="z-10 flex flex-row-reverse motion-opacity-in-[0%] motion-duration-[0.4s]">
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
    sessionConfiguration,
    updateCurrentMessageBlock,
    currentModelName,
    loadingModelName,
    generator,
    completion,
    getActiveMessages,
    checkIsModelLoaded,
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
      samplerConfig: sessionConfiguration.defaultSamplerConfig,
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

    await checkIsModelLoaded((modelName) => modelName !== null);

    generator.current = await completion({
      stream: true,
      messages: getActiveMessages({
        isGenerating: true,
        systemPrompt: sessionConfiguration.systemPrompt || "",
      }),
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
    <div className="flex flex-col gap-4 motion-opacity-in-[0%] motion-duration-[0.4s] md:flex-row">
      <div className="z-20 mt-3">
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
            <span className="w-9 text-nowrap text-center text-sm">
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
      <div className="flex flex-1 flex-col gap-2">
        <div className="sticky top-0 z-10 -mt-8 h-6 bg-white [mask-image:linear-gradient(0deg,#0000,#ffff)]"></div>
        <div
          className="min-h-10 select-text motion-opacity-in-[0%] motion-duration-[0.4s]"
          key={`${currentMessageBlock.key}-${currentMessageBlock.activeMessageContentIndex}`}
        >
          {currentMessageBlock.messageContents[
            currentMessageBlock.activeMessageContentIndex
          ].isGenerating &&
            currentModelName === null && (
              <div className="my-5 text-sm text-gray-400">
                {loadingModelName === null
                  ? "Load a model to interact"
                  : "Loading model... Sit back and relax!"}
              </div>
            )}
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
            trigger={
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
            }
            closeWhenBackgroundOnClick={true}
          >
            {({ close }) => {
              return (
                <MessageInformationViewer
                  close={close}
                  currentMessageBlock={currentMessageBlock}
                ></MessageInformationViewer>
              );
            }}
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

function ChatSessionConfigurationCard({
  isOpen,
  setIsOpen,
  sessionConfiguration,
  updateSessionConfiguration,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sessionConfiguration: SessionConfiguration;
  updateSessionConfiguration: ReturnType<
    typeof useChatSession
  >["updateSessionConfiguration"];
}) {
  return (
    <Card
      className={cn(
        "h-full w-full overflow-auto transition-all md:h-3/4 md:w-2/3 md:max-w-md min-[1250px]:h-full min-[1250px]:w-full",
        isOpen ? "" : "scale-95 opacity-0",
      )}
    >
      <CardTitle
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5"
          >
            <path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
          </svg>
        }
      >
        <span className="min-[1220px]:text-base">Session Configuration</span>

        <Button
          className="ml-auto rounded-full p-2"
          onClick={() => setIsOpen(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </Button>
      </CardTitle>
      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2">
        <span>Sampler Options</span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500"
          onClick={() => {
            sessionConfiguration.defaultSamplerConfig =
              DEFAULT_SESSION_CONFIGURATION.defaultSamplerConfig;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          Reset
        </Button>
      </div>

      <div className="flex flex-col">
        <Entry label="Temperature" className="min-h-0 flex-row">
          {sessionConfiguration.defaultSamplerConfig.temperature}
        </Entry>
        <InputRange
          min={0}
          max={5}
          step={0.1}
          value={sessionConfiguration.defaultSamplerConfig.temperature}
          onChange={(v) => {
            sessionConfiguration.defaultSamplerConfig.temperature = v;
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="mb-10 text-xs text-gray-500"
        ></InputRange>

        <Entry label="Top P" className="min-h-0 flex-row">
          {sessionConfiguration.defaultSamplerConfig.top_p}
        </Entry>
        <InputRange
          min={0}
          max={1}
          step={0.01}
          value={sessionConfiguration.defaultSamplerConfig.top_p}
          onChange={(v) => {
            sessionConfiguration.defaultSamplerConfig.top_p = v;
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="mb-10 text-xs text-gray-500"
        ></InputRange>

        <Entry label="Presence Penalty" className="min-h-0 flex-row">
          {sessionConfiguration.defaultSamplerConfig.presence_penalty}
        </Entry>
        <InputRange
          min={0}
          max={5}
          step={0.1}
          value={sessionConfiguration.defaultSamplerConfig.presence_penalty}
          onChange={(v) => {
            sessionConfiguration.defaultSamplerConfig.presence_penalty = v;
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="mb-10 text-xs text-gray-500"
        ></InputRange>

        <Entry label="Count Penalty" className="min-h-0 flex-row">
          {sessionConfiguration.defaultSamplerConfig.count_penalty}
        </Entry>
        <InputRange
          min={0}
          max={5}
          step={0.1}
          value={sessionConfiguration.defaultSamplerConfig.count_penalty}
          onChange={(v) => {
            sessionConfiguration.defaultSamplerConfig.count_penalty = v;
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="mb-10 text-xs text-gray-500"
        ></InputRange>

        <Entry label="Half Life" className="min-h-0 flex-row">
          {sessionConfiguration.defaultSamplerConfig.half_life}
        </Entry>
        <InputRange
          min={1}
          max={2048}
          step={1}
          value={sessionConfiguration.defaultSamplerConfig.half_life}
          onChange={(v) => {
            sessionConfiguration.defaultSamplerConfig.half_life = v;
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="mb-10 text-xs text-gray-500"
        ></InputRange>
      </div>
      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2">
        <span>Completion Options</span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500"
          onClick={() => {
            sessionConfiguration.maxTokens =
              DEFAULT_SESSION_CONFIGURATION.maxTokens;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          Reset
        </Button>
      </div>

      <Entry label="Max Output Tokens" className="text-nowrap">
        <InputText
          value={sessionConfiguration.maxTokens.toString()}
          onChange={(v) => {
            sessionConfiguration.maxTokens = parseInt(v);
            updateSessionConfiguration(sessionConfiguration);
          }}
          verification={(v) => !isNaN(+v) && parseInt(v) > 0}
          className="w-full rounded-xl bg-white/60 p-2"
        ></InputText>
      </Entry>

      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2">
        <span>System Prompt</span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500"
          onClick={() => {
            sessionConfiguration.systemPrompt =
              DEFAULT_SESSION_CONFIGURATION.systemPrompt;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          Reset
        </Button>
      </div>
      <Entry
        label="System Prompt"
        className="md:flex-col md:items-start md:justify-end"
      >
        <div className="h-full max-h-56 min-h-20 w-full">
          <PromptTextarea
            value={sessionConfiguration.systemPrompt || ""}
            editable={true}
            onChange={(v) => {
              sessionConfiguration.systemPrompt = v;
              updateSessionConfiguration(sessionConfiguration);
            }}
            // style={{ height: "100%" }}
            className="h-full rounded-2xl bg-white/60 px-2"
          ></PromptTextarea>
        </div>
      </Entry>

      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2 text-sm">
        <span>Stop Words & Stop Tokens</span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500"
          onClick={() => {
            sessionConfiguration.stopTokens =
              DEFAULT_SESSION_CONFIGURATION.stopTokens;
            sessionConfiguration.stopWords =
              DEFAULT_SESSION_CONFIGURATION.stopWords;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          Reset
        </Button>
      </div>
      <Entry
        label="Stop Words"
        className="md:flex-col md:items-start md:justify-end"
      >
        <InputList
          value={sessionConfiguration.stopWords.map((v) => {
            return v.replaceAll("\n", "\\n");
          })}
          onChange={(v) => {
            sessionConfiguration.stopWords = v.map((v) => {
              return v.replaceAll("\\n", "\n");
            });
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="w-full rounded-xl bg-white/60 p-2"
        ></InputList>
      </Entry>

      <Entry
        label="Stop Tokens"
        className="mb-2 md:flex-col md:items-start md:justify-end"
      >
        <InputList
          value={sessionConfiguration.stopTokens.map((v) => v.toString())}
          onChange={(v) => {
            sessionConfiguration.stopTokens = v.map((v) => parseInt(v));
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="w-full rounded-xl bg-white/60 p-2"
        ></InputList>
      </Entry>
    </Card>
  );
}

function ChatSessionConfigurationBar({
  isOpen,
  setIsOpen,
  sessionConfiguration,
  updateSessionConfiguration,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sessionConfiguration: SessionConfiguration;
  updateSessionConfiguration: ReturnType<
    typeof useChatSession
  >["updateSessionConfiguration"];
}) {
  const [showConfigurationCard, setShowConfigurationCard] =
    useState<boolean>(false);
  const [isDivExpanded, setIsDivExpanded] = useState<boolean>(false);
  const isMobile = useMaxWidthBreakpoint({ breakpoint: 1250 });

  const {
    alwaysOpenSessionConfigurationPannel,
    setAlwaysOpenSessionConfigurationPannel,
  } = usePageStorage((s) => s);

  const timmer = useRef(-1);

  const modalOperation = useRef<ModalInterface>(null!);

  useEffect(() => {
    clearTimeout(timmer.current);
    // 先展开侧边栏再显示面板，收回倒放
    if (isOpen) {
      if (isMobile) {
        setShowConfigurationCard(true);
        modalOperation.current.setIsModalOpen(true);
      } else {
        setIsDivExpanded(true);
        timmer.current = setTimeout(() => {
          setShowConfigurationCard(true);
          timmer.current = -1;
        }, 300);
      }
    } else {
      clearTimeout(timmer.current);
      setShowConfigurationCard(false);
      if (!isMobile) {
        timmer.current = setTimeout(() => {
          setIsDivExpanded(false);
          timmer.current = -1;
        }, 300);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (showConfigurationCard) {
      shouldAlwaysDisplayPannel();
    } else {
      setIsOpen(false);
    }
  }, [showConfigurationCard]);

  useEffect(() => {
    clearTimeout(timmer.current);
    setIsOpen(false);
    setIsDivExpanded(false);
    setShowConfigurationCard(false);
  }, [isMobile]);

  const shouldAlwaysDisplayPannel = async () => {
    if (alwaysOpenSessionConfigurationPannel === null) {
      setTimeout(async () => {
        try {
          const { isAlwaysShow } = await createModalForm(
            <Card className="max-w-sm bg-white">
              <CardTitle className="bg-white">
                <span className="text-lg font-bold">
                  Always Display Pannel?
                </span>
              </CardTitle>
              <div className="flex flex-col gap-1 text-wrap text-sm text-gray-600">
                <p>
                  Always display the session configuration pannel when entering
                  a chat session?
                </p>
                <p>You can adjust this preference in the settings.</p>
                <p className="mt-4 text-gray-400">Default: No</p>
              </div>
              <div className="-mb-1 flex justify-end gap-2">
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
                  name="isAlwaysShow"
                  value={"No"}
                >
                  No
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
                  name="isAlwaysShow"
                  value={"Yes"}
                >
                  Yes
                </Button>
              </div>
            </Card>,
            { closeOnBackgroundClick: true },
          ).open();
          setAlwaysOpenSessionConfigurationPannel(isAlwaysShow === "Yes");
        } catch (error) {
          setAlwaysOpenSessionConfigurationPannel(false);
        }
      }, 300);
    }
  };

  const openTimmer = useRef(-1);
  useEffect(() => {
    clearTimeout(openTimmer.current);
    if (alwaysOpenSessionConfigurationPannel && isMobile === false) {
      openTimmer.current = setTimeout(() => {
        setIsOpen(true);
      }, 300);
    }
  }, [isMobile]);

  return isMobile ? (
    <Modal
      ref={modalOperation}
      backgroundCover={true}
      closeWhenBackgroundOnClick={true}
      onModalClose={() => {
        setIsOpen(false);
        setShowConfigurationCard(false);
      }}
    >
      {({ close }) => {
        useEffect(() => {
          if (!showConfigurationCard) {
            close();
          }
        }, [showConfigurationCard]);
        return (
          <ChatSessionConfigurationCard
            isOpen={showConfigurationCard}
            setIsOpen={setShowConfigurationCard}
            sessionConfiguration={sessionConfiguration}
            updateSessionConfiguration={updateSessionConfiguration}
          ></ChatSessionConfigurationCard>
        );
      }}
    </Modal>
  ) : (
    <div
      className={cn(
        "flex h-full flex-shrink-0 items-center justify-center overflow-hidden transition-all duration-300",
        isDivExpanded ? "w-[22rem] pb-10 pl-4 pr-4" : "w-0",
      )}
    >
      <ChatSessionConfigurationCard
        isOpen={showConfigurationCard}
        setIsOpen={setShowConfigurationCard}
        sessionConfiguration={sessionConfiguration}
        updateSessionConfiguration={updateSessionConfiguration}
      ></ChatSessionConfigurationCard>
    </div>
  );
}

type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

export default function Chat() {
  const sessionStorage = usePageStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const { chatSessionId } = useParams();
  const prevChatSessionId = useRef<string>(chatSessionId!);

  const {
    activeMessageBlocks,
    createNewMessasgeBlock,
    updateCurrentMessageBlock,
    updateChatSessionTitle,
    getActiveMessages,
    sessionConfiguration,
    updateSessionConfiguration,
    currentChatSessionId,
  } = useChatSession(chatSessionId!);

  const { llmModel: webRWKVLLMInfer, loadingModelName } = useChatModelSession(
    (s) => s,
  );
  const { currentModelName, completion, defaultSessionConfiguration } =
    useWebRWKVChat(webRWKVLLMInfer);

  const [showSessionConfigurationBar, setShowSessionConfigurationBar] =
    useState(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const generator = useRef<{
    controller: { abort(): void };
    [Symbol.asyncIterator]: () => AsyncGenerator<string, void, unknown>;
  }>(null!);

  const loadModelModal = useRef<ModalInterface>(null!);
  const checkIsModelLoaded = useSuspendUntilValid(currentModelName, () => {
    loadModelModal.current.setIsModalOpen(true);
  });

  const containerEle = useRef<HTMLDivElement>(null);
  const messagesEle = useRef<HTMLDivElement>(null);
  const messageLineHeight = useRef<number>(0);
  const resizeObserver = useRef<ResizeObserver>(null!);

  const isSubmited = useRef(false);
  useEffect(() => {
    if (!isSubmited.current) {
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
          samplerConfig: sessionConfiguration.defaultSamplerConfig,
          isGenerating: false,
        })
      : createNewMessasgeBlock({
          initialMessage: { role: "User", content: prompt },
          parentBlockId: activeMessageBlocks[activeMessageBlocks.length - 1].id,
          samplerConfig: sessionConfiguration.defaultSamplerConfig,
          isGenerating: false,
        });

    const resultBlock = createNewMessasgeBlock({
      initialMessage: { role: "Assistant", content: "" },
      parentBlockId: promptBlock.id,
      samplerConfig: sessionConfiguration.defaultSamplerConfig,
      isGenerating: true,
    });

    const activeMessageContentIndex = resultBlock.activeMessageContentIndex;

    setIsGenerating(true);

    generator.current = await completion({
      stream: true,
      messages: getActiveMessages({
        isGenerating: true,
        systemPrompt: sessionConfiguration.systemPrompt || "",
      }),
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

  const scrollToTimmer = useRef(-1);
  useEffect(() => {
    resizeObserver.current = new ResizeObserver((entries) => {
      if (
        containerEle.current?.scrollTop &&
        containerEle.current.scrollHeight <
          containerEle.current.scrollTop +
            containerEle.current.clientHeight +
            messageLineHeight.current * 3
      ) {
        // setTimeout(() => {
        containerEle.current?.scrollTo({
          top: containerEle.current.scrollHeight,
          behavior: "smooth",
        });
        // }, 50);
      }
    });
    if (messagesEle.current) {
      resizeObserver.current.observe(messagesEle.current);

      messageLineHeight.current = parseInt(
        window.getComputedStyle(messagesEle.current).lineHeight,
      );
      clearTimeout(scrollToTimmer.current);
      scrollToTimmer.current = setTimeout(() => {
        containerEle.current?.scrollTo({
          top: containerEle.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }

    return () => {
      resizeObserver.current.disconnect();
    };
  }, [currentChatSessionId]);

  useEffect(() => {
    clearTimeout(scrollToTimmer.current);
    if (isGenerating) {
      scrollToTimmer.current = setTimeout(() => {
        containerEle.current?.scrollTo({
          top: containerEle.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [isGenerating]);

  return (
    <div className="flex h-full w-full">
      <div
        className="flex h-full w-full flex-col items-stretch"
        data-clarity-unmask="true"
      >
        <div className="sticky top-0 flex h-16 items-center">
          <div className="ml-auto flex size-16 items-center justify-center">
            <button
              className="flex size-10 items-center justify-center rounded-full text-slate-600 transition-all active:bg-slate-300 md:hover:bg-slate-300/50 md:active:bg-slate-300"
              onClick={() => {
                setShowSessionConfigurationBar(!showSessionConfigurationBar);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6 md:size-7"
              >
                <path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-shrink-0 overflow-hidden">
          <div className="flex h-full w-full flex-col">
            <div
              className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-4 pb-0"
              style={{ scrollbarGutter: "stable both-edges" }}
              ref={containerEle}
            >
              <div
                className="flex w-full max-w-screen-md flex-col gap-6 motion-translate-y-in-[40px] motion-opacity-in-[0%] motion-duration-[0.4s] md:pb-5"
                key={chatSessionId}
                ref={messagesEle}
              >
                <ChatSession.Provider
                  value={{
                    activeMessageBlocks,
                    currentChatSessionId,
                    createNewMessasgeBlock,
                    updateCurrentMessageBlock,
                    updateChatSessionTitle,
                    getActiveMessages,

                    sessionConfiguration,
                    updateSessionConfiguration,

                    generator,
                    startGenerationTask,
                    isGenerating,
                    setIsGenerating,

                    currentModelName,
                    loadingModelName,

                    completion,

                    checkIsModelLoaded,
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
                <div className="sticky bottom-0 -mt-6 h-6 bg-white [mask-image:linear-gradient(180deg,#0000,#ffff)] md:-mt-8 md:h-8"></div>
              </div>
            </div>
            <div
              key={`chat-textarea`}
              className="relative flex w-full justify-center px-2 pt-1 md:px-4 md:pb-6"
            >
              <button
                className={cn(
                  "absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border bg-white py-1.5 pl-2 pr-4 transition-all",
                  isGenerating ? "-top-16 shadow-lg" : "-top-0 scale-95",
                )}
                onClick={() => {
                  if (isGenerating) {
                    console.log(generator.current);
                    generator.current.controller.abort();
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 0 1-1.313-1.313V9.564Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Stop</span>
              </button>
              <Modal ref={loadModelModal}>
                {({ close }) => {
                  return <ModelLoaderCard close={close}></ModelLoaderCard>;
                }}
              </Modal>
              <ChatTextarea
                className="bottom-2 w-full max-w-screen-md bg-white md:bottom-4"
                onSubmit={(value) => {
                  startGenerationTask(value);
                }}
              ></ChatTextarea>
            </div>
          </div>
          <ChatSessionConfigurationBar
            isOpen={showSessionConfigurationBar}
            setIsOpen={setShowSessionConfigurationBar}
            sessionConfiguration={sessionConfiguration}
            updateSessionConfiguration={updateSessionConfiguration}
          ></ChatSessionConfigurationBar>
        </div>
      </div>
    </div>
  );
}
