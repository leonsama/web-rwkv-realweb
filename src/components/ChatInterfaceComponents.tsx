import { createRef, useContext, useEffect, useRef, useState } from "react";
import {
  CurrentMessageBlock,
  CurrentMessageContent,
  useChatSession,
} from "../store/ChatSessionStorage";
import {
  cn,
  compareObject,
  Timer,
  useMaxWidthBreakpoint,
  useSuspendUntilValid,
} from "../utils/utils";
import { Sampler } from "../web-rwkv-wasm-port/types";
import { Button } from "./Button";
import { Card, CardTitle, Entry } from "./Cards";
import { ChatInterfaceContext, ChatSession } from "./ChatInterfaceContext";
import { RWKVMarkdown } from "./MarkdownRender";
import { RWKVOutputFormatter } from "../utils/RWKVOutputFormatter";
import { createModalForm, Modal, ModalInterface } from "./popup/Modals";
import { InputList, InputRange, InputText } from "./Input";
import { PromptTextarea } from "./PromptTextarea";
import {
  CompletionGenerator,
  DEFAULT_SESSION_CONFIGURATION,
  SessionConfiguration,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { usePageStorage } from "../store/PageStorage";
import { useChatModelSession } from "../store/ModelStorage";
import { useLocation, useNavigate, useParams } from "react-router";

import { Trans } from "@lingui/react/macro";
import { DivSizeTransition } from "./DivTransition";

import copy from "copy-to-clipboard";

const STICK_BOTTOM_LINE_COUNT = 6;

export function ToolButton({
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
          ? "pointer-events-none text-slate-200 dark:text-zinc-400"
          : "active:bg-slate-400/40 dark:active:bg-zinc-700/70 md:hover:bg-slate-400/20 dark:md:hover:bg-zinc-700/50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SwitchActiveMessageContent({
  currentMessageBlock,
  ...prop
}: {
  currentMessageBlock: CurrentMessageBlock;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { updateCurrentMessageBlock } = useContext(ChatSession);
  return (
    <div
      {...prop}
      className={cn(
        "ml-auto flex items-center text-slate-400 dark:text-zinc-300",
        currentMessageBlock.messageContents.length === 1 &&
          currentMessageBlock.messageContents[
            currentMessageBlock.activeMessageContentIndex
          ].isGenerating
          ? "pointer-events-none opacity-0"
          : "opacity-100",
        prop.className,
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
  );
}

export function MessageInformationViewer({
  close,
  currentMessageBlock,
}: {
  close: () => void;
  currentMessageBlock: CurrentMessageBlock;
}) {
  return (
    <Card className="h-full max-h-full w-full overflow-auto max-md:rounded-none md:h-2/3 md:w-2/3 md:max-w-xl">
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
        <span>
          <Trans>Message Information</Trans>
        </span>
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
        label={<Trans>Content</Trans>}
        className="min-h-min flex-1 flex-shrink-0 text-nowrap md:flex-col md:items-start"
      >
        <textarea
          value={
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].content
          }
          disabled={true}
          onChange={(e) => {}}
          className="h-full min-h-80 w-full rounded-lg bg-white p-2 dark:bg-zinc-700"
        ></textarea>
      </Entry>
      <Entry
        label={<Trans>Sampler params</Trans>}
        className="text-nowrap md:flex-col md:items-start"
      >
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
      <Entry
        label={<Trans>Model Name</Trans>}
        className="text-nowrap md:flex-col md:items-start"
      >
        <div className="w-full text-wrap">
          {
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].modelName
          }
        </div>
      </Entry>
      <Entry
        label={<Trans>Date</Trans>}
        className="text-nowrap md:flex-col md:items-start"
      >
        <div className="w-full">
          {new Date(
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].timestamp,
          ).toLocaleString()}
        </div>
      </Entry>
      <Entry
        label="Completion ID"
        className="text-nowrap md:flex-col md:items-start"
      >
        <div className="w-full select-all">
          {currentMessageBlock.messageContents[
            currentMessageBlock.activeMessageContentIndex
          ].completionId || "-"}
        </div>
      </Entry>
    </Card>
  );
}

export function UserContent({
  currentMessageBlock,
}: {
  currentMessageBlock: CurrentMessageBlock;
}) {
  const {
    updateCurrentMessageBlock,
    setCurrentModelName,
    isGenerating,
    setIsGenerating,
    sessionConfiguration,
    selectedModelTitle,
    checkIsModelLoaded,
    generator,
    completion,
    getActiveMessages,
    webRWKVLLMInfer,
    createNewMessasgeBlock,
  } = useContext(ChatSession);

  const [isEditing, setIsEditing] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [value, setValue] = useState(
    currentMessageBlock.messageContents[
      currentMessageBlock.activeMessageContentIndex
    ].content,
  );
  const prevContent = useRef<string>("");
  const startEdit = () => {
    prevContent.current =
      currentMessageBlock.messageContents[
        currentMessageBlock.activeMessageContentIndex
      ].content;
    setIsEditing(true);
    // setTimeout(() => {
    //   setIsFocus(true);
    // }, 0);
  };
  const cancelEdit = () => {
    setValue(prevContent.current);
    setTimeout(() => {
      setIsEditing(false);
    }, 0);
  };
  const saveEdit = () => {
    currentMessageBlock.messageContents[
      currentMessageBlock.activeMessageContentIndex
    ].content = value;
    currentMessageBlock.messageContents[
      currentMessageBlock.activeMessageContentIndex
    ].timestamp = Date.now();
    updateCurrentMessageBlock(currentMessageBlock);
    setIsEditing(false);
  };

  const sendEdit = () => {
    setIsEditing(false);
    createNewGeneration(value);
  };

  const createNewGeneration = async (content: string) => {
    if (isGenerating) throw new Error("Unexpected regenerate task.");

    const newMessageContent: CurrentMessageContent = {
      id: currentMessageBlock.messageContents.length,
      role: currentMessageBlock.messageContents[
        currentMessageBlock.activeMessageContentIndex
      ].role,
      content: content,
      activeNextMessageBlockIndex: -1,
      nextMessagesBlockIds: [],
      avatar: null,
      samplerConfig: sessionConfiguration.defaultSamplerConfig,
      isGenerating: false,
      rank: 0,
      modelName: selectedModelTitle,
      timestamp: Date.now(),
      completionId: null,
    };

    currentMessageBlock.messageContents.push(newMessageContent);
    currentMessageBlock.activeMessageContentIndex =
      currentMessageBlock.messageContents.length - 1;

    const resultBlock = createNewMessasgeBlock({
      initialMessage: { role: "Assistant", content: "" },
      parentBlockId: currentMessageBlock.id,
      samplerConfig: sessionConfiguration.defaultSamplerConfig,
      isGenerating: true,
    });

    console.log(resultBlock);

    updateCurrentMessageBlock(currentMessageBlock);
    updateCurrentMessageBlock(resultBlock);

    setIsGenerating(true);

    await checkIsModelLoaded((modelName) => modelName !== null);

    const activeMessageContentIndex = resultBlock.activeMessageContentIndex;

    generator.current = await completion({
      stream: true,
      messages: getActiveMessages({
        isGenerating: true,
        systemPrompt: sessionConfiguration.systemPrompt || "",
      }),
      max_tokens: sessionConfiguration.maxTokens,
      stop_tokens: sessionConfiguration.stopTokens,
      stop_words: sessionConfiguration.stopWords,
      temperature: sessionConfiguration.defaultSamplerConfig.temperature,
      top_p: sessionConfiguration.defaultSamplerConfig.top_p,
      presence_penalty:
        sessionConfiguration.defaultSamplerConfig.presence_penalty,
      count_penalty: sessionConfiguration.defaultSamplerConfig.count_penalty,
      penalty_half_life: sessionConfiguration.defaultSamplerConfig.half_life,
      enableReasoning: webRWKVLLMInfer.current.isEnableReasoning,
    });

    let result = "";
    for await (const chunk of generator.current) {
      result += chunk.word;
      resultBlock.messageContents[activeMessageContentIndex].content = result;
      resultBlock.messageContents[activeMessageContentIndex].modelName =
        chunk.model;
      resultBlock.messageContents[activeMessageContentIndex].completionId =
        chunk.completionId;
      setCurrentModelName(chunk.model);
      updateCurrentMessageBlock(resultBlock);
    }
    resultBlock.messageContents[activeMessageContentIndex].isGenerating = false;
    resultBlock.messageContents[activeMessageContentIndex].timestamp =
      Date.now();
    updateCurrentMessageBlock(resultBlock);

    setIsGenerating(false);
  };

  useEffect(() => {
    setValue(
      currentMessageBlock.messageContents[
        currentMessageBlock.activeMessageContentIndex
      ].content,
    );
  }, [currentMessageBlock.activeMessageContentIndex]);

  return (
    <div className="z-10 flex flex-col">
      <div
        className={cn(
          "flex justify-end pr-1 pt-1 motion-opacity-in-[0%] motion-duration-[0.4s]",
        )}
      >
        <DivSizeTransition
          trigger={isEditing}
          className={cn(
            "flex max-w-screen-sm flex-col transition-[width,height] duration-300",
            isEditing ? "w-full" : "",
          )}
        >
          <div
            className={cn(
              "flex w-full select-text flex-col overflow-hidden rounded-3xl rounded-tr-md bg-slate-100 p-4 shadow-slate-300 transition-[box-shadow,background-color,border-radius,padding] duration-300 dark:bg-zinc-800 dark:shadow-zinc-600",
              isEditing
                ? "rounded-tr-3xl bg-transparent shadow-[0px_0px_0px_0.1rem_var(--tw-shadow-color)] dark:bg-transparent"
                : "shadow-[0px_0px_0px_0rem_var(--tw-shadow-color)]",
            )}
            onClick={() => {
              if (isEditing) setIsFocus(true);
            }}
          >
            <PromptTextarea
              value={value}
              onChange={setValue}
              editable={isEditing}
              className={cn(
                "flex-1 caret-black dark:caret-zinc-300",
                !isEditing && "!select-text",
              )}
              isFocus={isFocus}
              setIsFocus={setIsFocus}
            ></PromptTextarea>
            <div
              className={cn(
                "relative flex-shrink-0 transition-[height] duration-300",
                isEditing ? "h-14" : "h-0",
              )}
            >
              <div
                className={cn(
                  "absolute left-0 right-0 top-4 flex h-10 justify-end gap-4 transition-[margin,height,opacity,transform] duration-300",
                  isEditing
                    ? "opacity-100"
                    : "pointer-events-none translate-y-7 opacity-0",
                )}
              >
                <Button
                  className="mr-auto rounded-3xl bg-transparent dark:bg-transparent"
                  onClick={saveEdit}
                >
                  <Trans>Save</Trans>
                </Button>
                <Button
                  className="rounded-3xl"
                  onClick={() => {
                    cancelEdit();
                  }}
                >
                  <Trans>Cancel</Trans>
                </Button>
                <Button className="rounded-3xl" onClick={sendEdit}>
                  <Trans>Send</Trans>
                </Button>
              </div>
            </div>
          </div>
        </DivSizeTransition>
      </div>
      <div className="flex h-9 items-center justify-end gap-2 text-slate-400">
        {/* switch active currentMessageContent */}
        <SwitchActiveMessageContent
          currentMessageBlock={currentMessageBlock}
          className={cn(
            currentMessageBlock.messageContents.length === 1 && "opacity-0",
          )}
        ></SwitchActiveMessageContent>
        {/* copy */}
        <ToolButton
          className="active:motion-preset-confetti"
          onClick={() => {
            copy(
              currentMessageBlock.messageContents[
                currentMessageBlock.activeMessageContentIndex
              ].content,
            );
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
              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
            />
          </svg>
        </ToolButton>
        {/* edit */}
        <ToolButton
          onClick={() => {
            if (isEditing) {
              cancelEdit();
            } else {
              startEdit();
            }
          }}
          className={cn(isEditing && "bg-slate-300/40 dark:bg-zinc-600/70")}
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
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </ToolButton>
      </div>
    </div>
  );
}

function AssistantMessageEditor({ content }: { content: string }) {
  const [value, setValue] = useState(content);
  return (
    <Card className="h-screen w-screen max-md:rounded-none md:h-[28rem] md:w-[36rem] lg:h-[36rem] lg:w-[44rem]">
      <CardTitle
        icon={
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
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        }
      >
        <span className="text-lg font-bold">
          <Trans>Edit Message</Trans>
        </span>
      </CardTitle>
      <Entry className="flex-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          name="newcontent"
          className="h-full min-h-80 w-full rounded-lg bg-white p-2 dark:bg-zinc-700"
        ></textarea>
      </Entry>
      <div className="-mb-1 flex justify-end gap-2">
        <Button
          type="submit"
          className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
          name="savecontent"
          value={"cancel"}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button
          type="submit"
          className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
          name="savecontent"
          value={"save"}
        >
          <Trans>Save</Trans>
        </Button>
      </div>
    </Card>
  );
}

export function AssistantContent({
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
    selectedModelTitle,
    loadingModelTitle,
    generator,
    completion,
    getActiveMessages,
    checkIsModelLoaded,
    webRWKVLLMInfer,
    setCurrentModelName,
  } = useContext(ChatSession);

  const avatarEle = useRef<HTMLDivElement>(null);
  const mdKeySuffix = useRef(Math.random());

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
      modelName: selectedModelTitle,
      timestamp: Date.now(),
      completionId: null,
    });

    const activeMessageContentIndex =
      currentMessageBlock.messageContents.length - 1;
    currentMessageBlock.activeMessageContentIndex = activeMessageContentIndex;
    updateCurrentMessageBlock(currentMessageBlock);

    setIsGenerating(true);

    await checkIsModelLoaded((modelName) => modelName !== null);
    const defaultSessionConfiguration =
      webRWKVLLMInfer.current.defaultSessionConfiguration;
    generator.current = await completion({
      stream: true,
      messages: getActiveMessages({
        isGenerating: true,
        systemPrompt: sessionConfiguration.systemPrompt || "",
      }),

      ...(sessionConfiguration.maxTokens !==
        defaultSessionConfiguration.maxTokens && {
        max_tokens: sessionConfiguration.maxTokens,
      }),
      ...(!compareObject(
        sessionConfiguration.stopTokens,
        defaultSessionConfiguration.stopTokens,
      ) && {
        stop_tokens: sessionConfiguration.stopTokens,
      }),
      ...(!compareObject(
        sessionConfiguration.stopWords,
        defaultSessionConfiguration.stopWords,
      ) && {
        stop_words: sessionConfiguration.stopWords,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.temperature !==
        defaultSessionConfiguration.defaultSamplerConfig.temperature && {
        temperature: sessionConfiguration.defaultSamplerConfig.temperature,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.top_p !==
        defaultSessionConfiguration.defaultSamplerConfig.top_p && {
        top_p: sessionConfiguration.defaultSamplerConfig.top_p,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.presence_penalty !==
        defaultSessionConfiguration.defaultSamplerConfig.presence_penalty && {
        presence_penalty:
          sessionConfiguration.defaultSamplerConfig.presence_penalty,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.count_penalty !==
        defaultSessionConfiguration.defaultSamplerConfig.count_penalty && {
        count_penalty: sessionConfiguration.defaultSamplerConfig.count_penalty,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.half_life !==
        defaultSessionConfiguration.defaultSamplerConfig.half_life && {
        penalty_half_life: sessionConfiguration.defaultSamplerConfig.half_life,
      }),

      enableReasoning: webRWKVLLMInfer.current.isEnableReasoning,
    });

    let result = "";
    for await (const chunk of generator.current) {
      result += chunk.word;
      currentMessageBlock.messageContents[activeMessageContentIndex].content =
        result;
      currentMessageBlock.messageContents[activeMessageContentIndex].modelName =
        chunk.model;
      currentMessageBlock.messageContents[
        activeMessageContentIndex
      ].completionId = chunk.completionId;
      setCurrentModelName(chunk.model);
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

  const startEdit = async () => {
    try {
      const result = await createModalForm<{
        newcontent: string;
        savecontent: "save" | "cancel";
      }>(
        <AssistantMessageEditor
          content={
            currentMessageBlock.messageContents[
              currentMessageBlock.activeMessageContentIndex
            ].content
          }
        ></AssistantMessageEditor>,
        { closeOnBackgroundClick: true },
      ).open();
      if (result.savecontent === "save") {
        currentMessageBlock.messageContents[
          currentMessageBlock.activeMessageContentIndex
        ].content = result.newcontent;
        currentMessageBlock.messageContents[
          currentMessageBlock.activeMessageContentIndex
        ].timestamp = Date.now();
        mdKeySuffix.current = Math.random();
        updateCurrentMessageBlock(currentMessageBlock);
      }
    } catch (error) {
      return true;
    }
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
          <SwitchActiveMessageContent
            currentMessageBlock={currentMessageBlock}
          ></SwitchActiveMessageContent>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="pointer-events-none sticky top-0 z-10 -mt-8 h-6 bg-white [mask-image:linear-gradient(0deg,#0000,#ffff)] dark:bg-zinc-900"></div>
        <div
          className="min-h-10 select-text motion-opacity-in-[0%] motion-duration-[0.4s] dark:motion-opacity-in-[0%]"
          key={`${currentMessageBlock.key}-${currentMessageBlock.activeMessageContentIndex}`}
        >
          {currentMessageBlock.messageContents[
            currentMessageBlock.activeMessageContentIndex
          ].isGenerating &&
            selectedModelTitle === null && (
              <div className="my-5 text-sm text-gray-400">
                {loadingModelTitle === null
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
            key={`${currentMessageBlock.key}-${currentMessageBlock.activeMessageContentIndex}-${mdKeySuffix.current}`}
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
          <ToolButton
            className="active:motion-preset-confetti"
            onClick={() => {
              copy(
                currentMessageBlock.messageContents[
                  currentMessageBlock.activeMessageContentIndex
                ].content,
              );
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
                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
              />
            </svg>
          </ToolButton>
          {/* edit */}
          <ToolButton
            onClick={() => {
              startEdit();
            }}
            disabled={isGenerating}
            className={cn(
              "transition-[margin,opacity,transform]",
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
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
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
              ].rank === 1 && "text-slate-700 dark:text-zinc-300",
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
              ].rank === -1 && "text-slate-700 dark:text-zinc-300",
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

export function MessageBlock({
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

export function ChatSessionConfigurationCard({
  isOpen,
  setIsOpen,
  sessionConfiguration,
  updateSessionConfiguration,
}: {
  isOpen: boolean;
  setIsOpen: (show: boolean) => void;
  sessionConfiguration: SessionConfiguration;
  updateSessionConfiguration: (
    sessionConfiguration: SessionConfiguration,
  ) => void;
}) {
  const { llmModel: webRWKVLLMInfer } = useChatModelSession((s) => s);

  return (
    <Card
      className={cn(
        "h-full w-full overflow-auto transition-all max-md:rounded-none md:h-3/4 md:w-2/3 md:max-w-md min-[1250px]:h-full min-[1250px]:w-full",
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
        <span className="min-[1220px]:text-base">
          <Trans>Session Configuration</Trans>
        </span>

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
      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2 dark:bg-zinc-700">
        <span>
          <Trans>Sampler Options</Trans>
        </span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500 dark:text-gray-300"
          onClick={() => {
            sessionConfiguration.defaultSamplerConfig = window.structuredClone(
              webRWKVLLMInfer.defaultSessionConfiguration.defaultSamplerConfig,
            );
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          <Trans>Reset</Trans>
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
      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2 dark:bg-zinc-700">
        <span>
          <Trans>Completion Options</Trans>
        </span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500 dark:text-gray-300"
          onClick={() => {
            sessionConfiguration.maxTokens =
              webRWKVLLMInfer.defaultSessionConfiguration.maxTokens;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          <Trans>Reset</Trans>
        </Button>
      </div>

      <Entry label={<Trans>Max Output Tokens</Trans>} className="text-nowrap">
        <InputText
          value={sessionConfiguration.maxTokens.toString()}
          onChange={(v) => {
            sessionConfiguration.maxTokens = parseInt(v);
            updateSessionConfiguration(sessionConfiguration);
          }}
          verification={(v) => !isNaN(+v) && parseInt(v) > 0}
          className="w-full rounded-xl bg-white/60 p-2 dark:bg-zinc-700 dark:caret-zinc-300"
        ></InputText>
      </Entry>

      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2 dark:bg-zinc-700">
        <span>System Prompt</span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500 dark:text-gray-300"
          onClick={() => {
            sessionConfiguration.systemPrompt =
              webRWKVLLMInfer.defaultSessionConfiguration.systemPrompt;
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          <Trans>Reset</Trans>
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
            className="h-full rounded-2xl bg-white/60 px-2 dark:bg-zinc-700 dark:caret-zinc-300"
          ></PromptTextarea>
        </div>
      </Entry>

      <div className="flex h-12 items-center rounded-2xl bg-slate-200 p-1 pl-2 text-sm dark:bg-zinc-700">
        <span>
          <Trans>Stop Words & Stop Tokens</Trans>
        </span>
        <Button
          className="ml-auto h-10 rounded-xl text-sm text-gray-500 dark:text-gray-300"
          onClick={() => {
            sessionConfiguration.stopTokens = window.structuredClone(
              webRWKVLLMInfer.defaultSessionConfiguration.stopTokens,
            );
            sessionConfiguration.stopWords = window.structuredClone(
              webRWKVLLMInfer.defaultSessionConfiguration.stopWords,
            );
            updateSessionConfiguration(
              window.structuredClone(sessionConfiguration),
            );
          }}
        >
          <Trans>Reset</Trans>
        </Button>
      </div>
      <Entry
        label={<Trans>Stop Words</Trans>}
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
          className="w-full rounded-xl bg-white/60 p-2 dark:bg-zinc-700 dark:caret-zinc-300"
          classNameItem="dark:bg-zinc-700 dark:hover:bg-zinc-600/50"
          classNameItemEdit="dark:bg-zinc-600"
        ></InputList>
      </Entry>

      <Entry
        label={<Trans>Stop Tokens</Trans>}
        className="mb-2 md:flex-col md:items-start md:justify-end"
      >
        <InputList
          value={sessionConfiguration.stopTokens.map((v) => v.toString())}
          onChange={(v) => {
            sessionConfiguration.stopTokens = v.map((v) => parseInt(v));
            updateSessionConfiguration(sessionConfiguration);
          }}
          className="w-full rounded-xl bg-white/60 p-2 dark:bg-zinc-700 dark:caret-zinc-300"
          classNameItem="dark:bg-zinc-700 dark:hover:bg-zinc-600/50"
          classNameItemEdit="dark:bg-zinc-600"
        ></InputList>
      </Entry>
    </Card>
  );
}

export function ChatSessionConfigurationBar({
  isOpen,
  setIsOpen,
  sessionConfiguration,
  updateSessionConfiguration,
}: {
  isOpen: boolean;
  setIsOpen: (show: boolean) => void;
  sessionConfiguration: SessionConfiguration;
  updateSessionConfiguration: (
    sessionConfiguration: SessionConfiguration,
  ) => void;
}) {
  const [showConfigurationCard, setShowConfigurationCard] =
    useState<boolean>(false);
  const [isDivExpanded, setIsDivExpanded] = useState<boolean>(false);
  const isMobile = useMaxWidthBreakpoint({ breakpoint: 1250 });

  const {
    alwaysOpenSessionConfigurationPannel,
    setAlwaysOpenSessionConfigurationPannel,
  } = usePageStorage((s) => s);

  const timmer = useRef<Timer>();

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
          timmer.current = undefined;
        }, 300);
      }
    } else {
      clearTimeout(timmer.current);
      setShowConfigurationCard(false);
      if (!isMobile) {
        timmer.current = setTimeout(() => {
          setIsDivExpanded(false);
          timmer.current = undefined;
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
            <Card className="m-4 max-w-sm bg-white">
              <CardTitle className="bg-white">
                <span className="text-lg font-bold">
                  <Trans>Always Display Pannel?</Trans>
                </span>
              </CardTitle>
              <div className="flex flex-col gap-1 text-wrap text-sm text-gray-600">
                <p>
                  <Trans>
                    Always display the session configuration pannel when
                    entering a chat session?
                  </Trans>
                </p>
                <p>
                  <Trans>You can adjust this preference in the settings.</Trans>
                </p>
                <p className="mt-4 text-gray-400">
                  <Trans>Default: No</Trans>
                </p>
              </div>
              <div className="-mb-1 flex justify-end gap-2">
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
                  name="isAlwaysShow"
                  value={"No"}
                >
                  <Trans>No</Trans>
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
                  name="isAlwaysShow"
                  value={"Yes"}
                >
                  <Trans>Yes</Trans>
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

  const openTimmer = useRef<Timer>();
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

export function ChatInterface({
  chatSessionId,
  ...prop
}: {
  ref?: React.RefObject<HTMLDivElement>;
  chatSessionId: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  //   const sessionStorage = usePageStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isGenerating,
    setIsGenerating,
    startGenerationTask,
    generator,
    checkIsModelLoaded,

    chatInterfaceUpdateSessionConfiguration,

    generalUpdateSessionConfiguration,

    currentModelName,
    setCurrentModelName,
  } = useContext(ChatInterfaceContext);

  const {
    activeMessageBlocks,
    createNewMessasgeBlock,
    updateCurrentMessageBlock,
    updateChatSessionTitle,
    getActiveMessages,
    sessionConfiguration,
    updateSessionConfiguration,
    currentChatSessionId,
  } = useChatSession(chatSessionId);

  const { llmModel, loadingModelTitle } = useChatModelSession((s) => s);
  const {
    selectedModelTitle,
    completion,
    defaultSessionConfiguration,
    currentInferPort: webRWKVLLMInfer,
  } = useWebRWKVChat(llmModel);

  const containerEle = useRef<HTMLDivElement>(null);
  const messagesRenderEle = useRef<HTMLDivElement>(null);
  const messageLineHeight = useRef<number>(0);

  // generation

  const isSubmited = useRef(false);
  useEffect(() => {
    if (!isSubmited.current) {
      if (location.state?.prompt!) {
        window.history.replaceState({}, "");
        startGenerationTask.current(location.state.prompt, true);
        updateChatSessionTitle(location.state.prompt);
      }
      isSubmited.current = true;
    }
  }, [activeMessageBlocks]);

  startGenerationTask.current = async (
    prompt: string,
    newChat: boolean = false,
  ) => {
    // debugger
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

      ...(sessionConfiguration.maxTokens !==
        defaultSessionConfiguration.current.maxTokens && {
        max_tokens: sessionConfiguration.maxTokens,
      }),
      ...(!compareObject(
        sessionConfiguration.stopTokens,
        defaultSessionConfiguration.current.stopTokens,
      ) && {
        stop_tokens: sessionConfiguration.stopTokens,
      }),
      ...(!compareObject(
        sessionConfiguration.stopWords,
        defaultSessionConfiguration.current.stopWords,
      ) && {
        stop_words: sessionConfiguration.stopWords,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.temperature !==
        defaultSessionConfiguration.current.defaultSamplerConfig
          .temperature && {
        temperature: sessionConfiguration.defaultSamplerConfig.temperature,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.top_p !==
        defaultSessionConfiguration.current.defaultSamplerConfig.top_p && {
        top_p: sessionConfiguration.defaultSamplerConfig.top_p,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.presence_penalty !==
        defaultSessionConfiguration.current.defaultSamplerConfig
          .presence_penalty && {
        presence_penalty:
          sessionConfiguration.defaultSamplerConfig.presence_penalty,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.count_penalty !==
        defaultSessionConfiguration.current.defaultSamplerConfig
          .count_penalty && {
        count_penalty: sessionConfiguration.defaultSamplerConfig.count_penalty,
      }),
      ...(sessionConfiguration.defaultSamplerConfig.half_life !==
        defaultSessionConfiguration.current.defaultSamplerConfig.half_life && {
        penalty_half_life: sessionConfiguration.defaultSamplerConfig.half_life,
      }),

      enableReasoning: webRWKVLLMInfer.current.isEnableReasoning,
    });
    resultBlock.messageContents[activeMessageContentIndex].modelName =
      selectedModelTitle;

    let result = "";
    for await (const chunk of generator.current) {
      result += chunk.word;
      resultBlock.messageContents[activeMessageContentIndex].content = result;
      resultBlock.messageContents[activeMessageContentIndex].modelName =
        chunk.model;
      resultBlock.messageContents[activeMessageContentIndex].completionId =
        chunk.completionId;
      setCurrentModelName(chunk.model);
      updateCurrentMessageBlock(resultBlock);
    }
    resultBlock.messageContents[activeMessageContentIndex].isGenerating = false;
    resultBlock.messageContents[activeMessageContentIndex].timestamp =
      Date.now();
    updateCurrentMessageBlock(resultBlock);

    setIsGenerating(false);
  };

  // before chat session change

  useEffect(() => {
    containerEle.current?.scrollTo({ top: 0, behavior: "instant" }); // reset container scroll anchor
    chatInterfaceUpdateSessionConfiguration.current =
      updateSessionConfiguration;
  }, [chatSessionId]);

  // chat session change

  useEffect(() => {
    setCurrentModelName(null);
    contentScrollToBottom(200); // scroll to bottom when change chat session
    generalUpdateSessionConfiguration(sessionConfiguration); // sync session configuration
  }, [currentChatSessionId]);

  // scroll

  const resizeObserver = useRef<ResizeObserver>(null!);
  const scrollerEle = useRef<HTMLDivElement>(null);

  const contentScrollToBottomTimmer = useRef<Timer>(null!);
  const contentScrollToBottom = (sleep: number = 0) => {
    clearTimeout(contentScrollToBottomTimmer.current);
    contentScrollToBottomTimmer.current = setTimeout(() => {
      scrollerEle.current?.scrollIntoView({ behavior: "smooth" });
    }, sleep);
  };

  useEffect(() => {
    resizeObserver.current?.disconnect();

    if (!isGenerating) return;
    contentScrollToBottom(0);

    resizeObserver.current = new ResizeObserver((e) => {
      if (
        containerEle.current !== null &&
        containerEle.current.scrollHeight <
          containerEle.current.scrollTop +
            containerEle.current.clientHeight +
            messageLineHeight.current * STICK_BOTTOM_LINE_COUNT
      ) {
        contentScrollToBottom(0);
      }
    });

    if (messagesRenderEle.current) {
      messageLineHeight.current = parseInt(
        window.getComputedStyle(messagesRenderEle.current).lineHeight,
      );
      resizeObserver.current.observe(messagesRenderEle.current);
    }

    return () => {
      resizeObserver.current.disconnect();
    };
  }, [currentChatSessionId, isGenerating]);

  return (
    <div
      {...prop}
      className={cn(
        "flex h-full w-full flex-1 flex-shrink-0 flex-col items-center overflow-auto px-4 pb-0",
        prop.className,
      )}
      style={{ scrollbarGutter: "stable both-edges", ...prop.style }}
      ref={containerEle}
    >
      <div
        className="flex w-full max-w-screen-md flex-col gap-6 motion-translate-y-in-[40px] motion-opacity-in-[0%] motion-duration-[0.4s] md:pb-5"
        key={currentChatSessionId}
        ref={messagesRenderEle}
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

            generator: generator,
            startGenerationTask: startGenerationTask.current,
            isGenerating,
            setIsGenerating,
            webRWKVLLMInfer,

            selectedModelTitle,
            loadingModelTitle,

            completion,

            checkIsModelLoaded,

            currentModelName,
            setCurrentModelName,
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
        <div ref={scrollerEle}></div>
        <div className="pointer-events-none sticky bottom-0 -mt-6 h-6 bg-white [mask-image:linear-gradient(180deg,#0000,#ffff)] dark:bg-zinc-900 md:-mt-8 md:h-8"></div>
      </div>
    </div>
  );
}
