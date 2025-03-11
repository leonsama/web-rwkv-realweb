import { ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate, useNavigation, useParams } from "react-router";
import {
  ChatInterface,
  ChatSessionConfigurationBar,
} from "../components/ChatInterfaceComponents";
import {
  cn,
  debounce,
  throttle,
  Timer,
  useSuspendUntilValid,
} from "../utils/utils";
import {
  CompletionGenerator,
  DEFAULT_SESSION_CONFIGURATION,
  SessionConfiguration,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { Modal, ModalInterface } from "../components/popup/Modals";
import { useChatModelSession } from "../store/ModelStorage";
import { ModelLoaderCard } from "../components/ModelConfigUI";
import { ChatTextarea } from "../components/ChatTextarea";
import { ChatInterfaceContext } from "../components/ChatInterfaceContext";
import {
  useChatSession,
  useChatSessionStore,
} from "../store/ChatSessionStorage";
import { WebRWKVHomePage } from "../targets/webrwkv/webrwkv-homepage";
import { usePageStorage } from "../store/PageStorage";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import path from "path";
import { RWKVHfSpaceHomePage } from "../targets/rwkv-hf-space/rwkv-hf-space-homepage";

function AnimatedOutlet({ children }: { children: ReactNode }) {
  const [outlet] = useState(children);
  return outlet;
}

export default function ChatRouter() {
  const { "*": urlStr } = useParams();
  const navigate = useNavigate();

  // const [showSessionConfigurationBar, setShowSessionConfigurationBar] =
  //   useState(false);
  const [currentModelName, setCurrentModelName] = useState<string | null>(null);
  const [generalSessionConfiguration, setGeneralSessionConfiguration] =
    useState<SessionConfiguration>(DEFAULT_SESSION_CONFIGURATION);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { llmModel: webRWKVLLMInfer, loadingModelTitle } = useChatModelSession(
    (s) => s,
  );
  const { selectedModelTitle, completion, defaultSessionConfiguration } =
    useWebRWKVChat(webRWKVLLMInfer);
  const {
    getSessionConfigurationById,
    generateChatSessionObject,
    createChatSessionWithChatSession,
  } = useChatSessionStore((s) => s);

  const { showSideBar, setShowSideBar } = usePageStorage((s) => s);

  const loadModelModal = useRef<ModalInterface>(null!);
  const checkIsModelLoaded = useSuspendUntilValid(selectedModelTitle, () => {
    loadModelModal.current.setIsModalOpen(true);
  });
  const chatInterfaceRef = useRef<HTMLDivElement>(null);

  const generator = useRef<CompletionGenerator>(null!);
  const startGenerationTask = useRef<
    (prompt: string, newChat?: boolean) => Promise<void>
  >(null!);
  const chatInterfaceUpdateSessionConfiguration = useRef<
    (sessionConfiguration: SessionConfiguration) => void
  >(null!);

  const sessionConfigurationUpdater = useRef(
    debounce((s: SessionConfiguration) => {
      chatInterfaceUpdateSessionConfiguration.current(s);
    }, 300),
  );
  const generalUpdateSessionConfiguration = (
    sessionConfiguration: SessionConfiguration,
  ) => {
    const newSessionConfiguration =
      window.structuredClone(sessionConfiguration);
    setGeneralSessionConfiguration(newSessionConfiguration);
    if (sessionId !== null)
      sessionConfigurationUpdater.current(newSessionConfiguration);
  };

  // page transition

  const isChatInterface = (pathList: string[] | undefined) =>
    pathList
      ? pathList.length > 1 && pathList[0].toLocaleLowerCase() === "chat"
      : false;
  const isHomepage = (pathList: string[] | undefined) =>
    pathList ? pathList.length === 1 && pathList[0] === "" : false;

  const [currentPage, setCurrentPage] = useState<"homepage" | "chat">(
    isChatInterface(urlStr?.toLocaleLowerCase().split("/"))
      ? "chat"
      : "homepage",
  );
  const [renderPage, setRenderPage] = useState<"homepage" | "chat">(
    currentPage,
  );

  const pageTimer = useRef<Timer>();
  const pageTransitionTime = 300;
  useEffect(() => {
    if (urlStr === undefined) return;

    clearTimeout(pageTimer.current);

    const pathList = urlStr.split("/");

    if (isHomepage(pathList)) {
      setCurrentPage("homepage");
    } else if (isChatInterface(pathList)) {
      setCurrentPage("chat");
      if (pathList[1] !== sessionId) {
        setGeneralSessionConfiguration(
          getSessionConfigurationById({ id: pathList[1] }),
        );
        setSessionId(pathList[1]);
      }
    }

    pageTimer.current = setTimeout(() => {
      const target = isChatInterface(urlStr?.toLocaleLowerCase().split("/"))
        ? "chat"
        : "homepage";
      setRenderPage(target);
      if (target === "homepage") setSessionId(null);
    }, pageTransitionTime);
  }, [urlStr, sessionId]);

  // create new chat

  const submitPrompt = (prompt: string) => {
    if (currentPage === "homepage") {
      const newChatSession = generateChatSessionObject({
        title: prompt,
        sessionConfiguration: generalSessionConfiguration,
      });
      const newChatSessionId = createChatSessionWithChatSession({
        chatSession: newChatSession,
      });
      navigate(`/chat/${newChatSessionId}`, { state: { prompt } });
    } else if (currentPage === "chat") {
      startGenerationTask.current(prompt);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div
        className="flex h-full w-full flex-col items-stretch"
        data-clarity-unmask="true"
      >
        <div className="sticky top-0 flex h-16 items-center md:h-20">
          <div className="ml-auto flex size-16 items-center justify-center">
            <button
              className="flex size-10 items-center justify-center rounded-full text-slate-600 transition-all active:bg-slate-300 dark:text-zinc-300 dark:active:bg-zinc-500/50 md:hover:bg-slate-300/50 md:active:bg-slate-300 dark:md:hover:bg-zinc-700/50 dark:md:active:bg-zinc-500/50"
              onClick={() => {
                setShowSideBar(!showSideBar);
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
            <SwitchTransition>
              <CSSTransition
                key={currentPage}
                timeout={pageTransitionTime}
                nodeRef={chatInterfaceRef}
                classNames={{
                  enter: "opacity-0",
                  enterActive: "opacity-100",
                  exitActive: "opacity-0",
                }}
                unmountOnExit
              >
                <div
                  className="flex flex-1 flex-shrink-0 flex-col items-center overflow-hidden transition-opacity"
                  ref={chatInterfaceRef}
                >
                  {renderPage === "homepage" && (
                    <>
                      {import.meta.env.VITE_TARGET === "webrwkv" && (
                        <WebRWKVHomePage></WebRWKVHomePage>
                      )}
                      {import.meta.env.VITE_TARGET === "rwkv-hf-space" && (
                        <RWKVHfSpaceHomePage></RWKVHfSpaceHomePage>
                      )}
                    </>
                  )}
                  {renderPage === "chat" && sessionId !== null && (
                    <ChatInterfaceContext.Provider
                      value={{
                        isGenerating,
                        setIsGenerating,
                        startGenerationTask,
                        generator,
                        currentModelName,
                        setCurrentModelName,
                        checkIsModelLoaded,

                        chatInterfaceUpdateSessionConfiguration,
                        generalUpdateSessionConfiguration,
                      }}
                    >
                      <ChatInterface chatSessionId={sessionId}></ChatInterface>
                    </ChatInterfaceContext.Provider>
                  )}
                </div>
              </CSSTransition>
            </SwitchTransition>
            <div
              key={`chat-textarea`}
              className="relative flex w-full justify-center px-2 pt-1 md:px-4 md:pb-6"
            >
              <button
                className={cn(
                  "absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border bg-white py-1.5 pl-2 pr-4 transition-all dark:border-0 dark:bg-zinc-700",
                  isGenerating ? "-top-16 shadow-lg" : "-top-0 scale-95",
                )}
                onClick={() => {
                  if (isGenerating) {
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
                className="bottom-2 w-full max-w-screen-md bg-white dark:bg-zinc-700 md:bottom-4"
                onSubmit={submitPrompt}
                currentModelName={currentModelName || undefined}
              ></ChatTextarea>
            </div>
          </div>
          <ChatSessionConfigurationBar
            isOpen={showSideBar}
            setIsOpen={setShowSideBar}
            sessionConfiguration={generalSessionConfiguration}
            updateSessionConfiguration={generalUpdateSessionConfiguration}
          ></ChatSessionConfigurationBar>
        </div>
      </div>
    </div>
  );
}
