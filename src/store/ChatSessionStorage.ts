import { useEffect, useRef, useState } from "react";
import { Sampler } from "../web-rwkv-wasm-port/types";
import { useShallow } from "zustand/react/shallow";
import { createJSONStorage, persist } from "zustand/middleware";
import { dangerousUUIDV4, throttle } from "../utils/utils";
import { create } from "zustand";
import {
  CompletionMessage,
  DEFAULT_SESSION_CONFIGURATION,
  SessionConfiguration,
} from "../web-rwkv-wasm-port/web-rwkv";
import { useChatModelSession } from "./ModelStorage";

export interface ChatSession {
  id: string;
  title: string;
  messageBlock: MessageBlock[];
  sessionConfiguration: SessionConfiguration;
  updateTimestamp: number;
}

export interface ChatSessionInfomation {
  id: string;
  title: string;
  updateTimestamp: number;
}

export interface MessageBlock {
  id: number;
  messageContents: MessageContent[];
  activeMessageContentIndex: number;
}

export interface MessageContent {
  id: number;
  role: string;
  content: string;
  nextMessagesBlockIds: number[];
  activeNextMessageBlockIndex: number;
  avatar: string | null;
  samplerConfig: Sampler | null;
  rank: number;
  modelName: string | null;
  timestamp: number;
  completionId: string | null;
}

export interface ChatStorage {
  sessions: { [id: string]: ChatSession };
  sessionInformations: ChatSessionInfomation[];

  setSessionById: (id: string, session: ChatSession) => void;
  createNewSession: (
    title: string,
    sessionConfiguration: SessionConfiguration,
  ) => string;
  generateChatSessionObject: ({
    title,
    sessionConfiguration,
  }: {
    title: string;
    sessionConfiguration: SessionConfiguration;
  }) => ChatSession;
  getSessionConfigurationById: ({ id }: { id: string }) => SessionConfiguration;
  createChatSessionWithChatSession: ({
    chatSession,
  }: {
    chatSession: ChatSession;
  }) => string;
  deleteSessionById: (id: string) => void;
  clearAllSession: () => void;
}

export const useChatSessionStore = create<ChatStorage>()(
  persist(
    // immer(
    (set, get) => ({
      sessions: {},
      sessionInformations: [],
      setSessionById: (id: string, session: ChatSession) => {
        const sessions: { [id: string]: ChatSession } = {
          ...get().sessions,
          [id]: { ...session },
        };
        const sessionInformations: ChatSessionInfomation[] =
          get().sessionInformations.map((info) => {
            if (info.id === id) {
              return {
                ...info,
                id: session.id,
                title: session.title,
                updateTimestamp: session.updateTimestamp,
              };
            }
            return info;
          });
        set((prev) => {
          return {
            ...prev,
            sessions: sessions,
            sessionInformations: sessionInformations,
          };
        });
      },
      createNewSession: (
        title: string,
        sessionConfiguration: SessionConfiguration,
      ) => {
        const session: ChatSession = {
          id: dangerousUUIDV4(),
          messageBlock: [],
          title: title || "New Session",
          updateTimestamp: Date.now(),
          sessionConfiguration: sessionConfiguration,
        };
        const sessionInformations: ChatSessionInfomation[] = [
          ...get().sessionInformations,
          {
            id: session.id,
            title: session.title,
            updateTimestamp: session.updateTimestamp,
          },
        ];

        set((prev) => ({
          ...prev,
          sessionInformations: sessionInformations,
          sessions: { ...prev.sessions, [session.id]: session },
        }));
        return session.id;
      },
      deleteSessionById: (id: string) => {
        const sessionInformations = get().sessionInformations.filter(
          (info) => info.id !== id,
        );
        const sessions = { ...get().sessions };
        delete sessions[id];
        set((prev) => ({
          ...prev,
          sessionInformations: sessionInformations,
          sessions: sessions,
        }));
      },

      clearAllSession: () => {
        const sessionInformations: ChatSessionInfomation[] = [];
        const sessions = {};
        set((prev) => ({
          ...prev,
          sessionInformations: sessionInformations,
          sessions: sessions,
        }));
      },
      createChatSessionWithChatSession: ({ chatSession }) => {
        const sessionInformations: ChatSessionInfomation[] = [
          ...get().sessionInformations,
          {
            id: chatSession.id,
            title: chatSession.title,
            updateTimestamp: chatSession.updateTimestamp,
          },
        ];
        set((prev) => ({
          ...prev,
          sessionInformations: sessionInformations,
          sessions: { ...prev.sessions, [chatSession.id]: chatSession },
        }));
        return chatSession.id;
      },
      generateChatSessionObject({ title, sessionConfiguration }) {
        const session: ChatSession = {
          id: dangerousUUIDV4(),
          messageBlock: [],
          title: title || "New Session",
          updateTimestamp: Date.now(),
          sessionConfiguration: sessionConfiguration,
        };
        return session;
      },
      getSessionConfigurationById({ id }) {
        return get().sessions[id].sessionConfiguration;
      },
    }),
    {
      name: "webrwkv-session-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(persistedState, version) {
        let currentVersion = version;
        if (currentVersion === 0) {
          currentVersion = 1;
          // Add completionId
          Object.keys((persistedState as ChatStorage).sessions).forEach(
            (sessionId) => {
              (persistedState as ChatStorage).sessions[sessionId].messageBlock =
                (persistedState as ChatStorage).sessions[
                  sessionId
                ].messageBlock.map((messageBlock) => {
                  messageBlock.messageContents =
                    messageBlock.messageContents.map((messageContent) => {
                      messageContent.completionId = null;
                      return messageContent;
                    });
                  return messageBlock;
                });
            },
          );
        }
        return persistedState;
      },
    },
  ),
  // )
);

export function useChatSessionInformation() {
  const informations = useChatSessionStore(
    useShallow((state) => state.sessionInformations),
  );
  return informations;
}

export interface CurrentMessageContent extends MessageContent {
  isGenerating: boolean;
}

export interface CurrentMessageBlock extends MessageBlock {
  messageContents: CurrentMessageContent[];
  key: string;
}

export interface CurrentChatSession extends ChatSession {
  messageBlock: CurrentMessageBlock[];
}

export function useChatSession(id: string) {
  const chatSessionStorage = useChatSessionStore((state) => state);
  const sessions = useChatSessionStore(useShallow((state) => state.sessions));

  const [activeMessageBlocks, setActiveMessageBlocks] = useState<
    CurrentMessageBlock[]
  >([]);
  const [sessionConfiguration, setSessionConfiguration] =
    useState<SessionConfiguration>({
      stopTokens: [261, 0],
      stopWords: ["\n\nUser"],
      maxTokens: 4096,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 0.8,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    });
  const [currentChatSessionId, setCurrentChatSessionId] = useState<
    string | null
  >(null);

  // const { llmModel: webRWKVLLMInfer } = useChatModelSession((s) => s);

  const activeSession = useRef<CurrentChatSession>(
    sessions[id] as CurrentChatSession,
  );

  const getActiveMessageBlocks = () => {
    const newActiveMessageBlocks: CurrentMessageBlock[] = [];
    let currentMessageBlockId = 0;
    if (activeSession.current.messageBlock.length === 0) {
      return newActiveMessageBlocks;
    }

    while (true) {
      const messageBlock = (
        activeSession.current.messageBlock as CurrentMessageBlock[]
      )[currentMessageBlockId];

      messageBlock.key = `${id}-${messageBlock.id}`;

      newActiveMessageBlocks.push(messageBlock);

      if (
        messageBlock.messageContents[messageBlock.activeMessageContentIndex]
          .activeNextMessageBlockIndex === -1
      ) {
        break;
      } else {
        currentMessageBlockId =
          messageBlock.messageContents[messageBlock.activeMessageContentIndex]
            .nextMessagesBlockIds[
            messageBlock.messageContents[messageBlock.activeMessageContentIndex]
              .activeNextMessageBlockIndex
          ];
      }
    }

    return newActiveMessageBlocks;
  };

  const createNewMessasgeBlock = ({
    initialMessage: { role, content },
    parentBlockId,
    samplerConfig,
    isGenerating,
  }: {
    initialMessage: { role: string; content: string };
    parentBlockId: number | null;
    samplerConfig: Sampler | null;
    isGenerating: boolean;
  }) => {
    const newMessageBlock: CurrentMessageBlock = {
      id: activeSession.current.messageBlock.length,
      activeMessageContentIndex: 0,
      key: `${id}-${activeSession.current.messageBlock.length}`,
      messageContents: [
        {
          id: 0,
          role,
          content,
          activeNextMessageBlockIndex: -1,
          nextMessagesBlockIds: [],
          avatar: null,
          samplerConfig,
          isGenerating,
          rank: 0,
          modelName: null,
          timestamp: Date.now(),
          completionId: null,
        },
      ],
    };
    if (activeSession.current.messageBlock.length > 0 && parentBlockId === null)
      throw new Error(
        "`parentBlock` is null. Each MessageBlock should have a Parent MessageBlock unless it's a new session.",
      );
    if (parentBlockId !== null) {
      const activeContent =
        activeSession.current.messageBlock[parentBlockId].messageContents[
          activeSession.current.messageBlock[parentBlockId]
            .activeMessageContentIndex
        ];
      activeContent.activeNextMessageBlockIndex += 1;

      activeContent.nextMessagesBlockIds.push(newMessageBlock.id);
    }

    activeSession.current.messageBlock.push(newMessageBlock);

    updateActiveMessageList();
    return newMessageBlock;
  };

  const updateActiveMessageList = () => {
    setActiveMessageBlocks(getActiveMessageBlocks());
    syncSession();
  };

  const syncSession = () => {
    chatSessionStorage.setSessionById(activeSession.current.id, {
      ...activeSession.current,
      messageBlock: activeSession.current.messageBlock.map(
        ({
          id,
          messageContents,
          activeMessageContentIndex,
        }: CurrentMessageBlock): MessageBlock => {
          return {
            id,
            activeMessageContentIndex,
            messageContents: messageContents.map(
              ({
                id,
                role,
                content,
                activeNextMessageBlockIndex,
                nextMessagesBlockIds,
                avatar,
                samplerConfig,
                rank,
                modelName,
                timestamp,
                completionId,
              }: CurrentMessageContent) => {
                return {
                  id,
                  role,
                  content: content || "",
                  activeNextMessageBlockIndex,
                  nextMessagesBlockIds,
                  avatar,
                  samplerConfig,
                  rank,
                  modelName,
                  timestamp,
                  completionId,
                };
              },
            ),
          };
        },
      ),
      // sessionConfiguration: window.structuredClone(
      //   activeSession.current.sessionConfiguration,
      // ),
      sessionConfiguration: activeSession.current.sessionConfiguration,
    });
  };

  const updateChatSessionTitle = (title: string) => {
    activeSession.current.title = title;
    syncSession();
  };

  const updateCurrentMessageBlock = (
    currentMessageBlock: CurrentMessageBlock,
  ) => {
    activeSession.current.messageBlock = activeSession.current.messageBlock.map(
      (v) => (v.id === currentMessageBlock.id ? currentMessageBlock : v),
    );
    updateActiveMessageList();
  };

  const updateSessionConfiguration = (
    sessionConfiguration: SessionConfiguration,
  ) => {
    // activeSession.current.sessionConfiguration =
    //   window.structuredClone(sessionConfiguration);
    activeSession.current.sessionConfiguration = sessionConfiguration;
    setSessionConfiguration(
      window.structuredClone(activeSession.current.sessionConfiguration),
    );
    // window.requestAnimationFrame(() => syncSession());
    syncSession();
    // return activeSession.current.sessionConfiguration;
  };

  const getActiveMessages: ({
    isGenerating,
    systemPrompt,
  }: {
    isGenerating?: boolean;
    systemPrompt?: string;
  }) => CompletionMessage[] = ({ isGenerating, systemPrompt }) => {
    const messages = getActiveMessageBlocks().map((v) => {
      const message = v.messageContents[v.activeMessageContentIndex];
      return {
        role: message.role,
        content: message.content,
        isGenerating: message.isGenerating,
      };
    });

    const systemPromptList: CompletionMessage[] =
      systemPrompt && systemPrompt?.trim() !== ""
        ? [{ text: systemPrompt }]
        : [];

    if (isGenerating) {
      if (messages[messages.length - 1].isGenerating !== true)
        throw new Error(
          `\`isGenerating\` is true but the \`isGenerating\` value of the last CurrentMessageContent is false. ${JSON.stringify(messages[messages.length - 1])}`,
        );
      return [
        ...systemPromptList,
        ...messages
          .map(({ role, content }) => ({ role, content }))
          .slice(0, messages.length - 1),
      ];
    } else {
      if (messages[messages.length - 1].isGenerating !== false)
        throw new Error(
          `\`isGenerating\` is false but the The \`isGenerating\` value of the last CurrentMessageContent is true. ${JSON.stringify(messages[messages.length - 1])}`,
        );
      return [
        ...systemPromptList,
        ...messages.map(({ role, content }) => ({ role, content })),
      ];
    }
  };

  useEffect(() => {
    activeSession.current = sessions[id] as CurrentChatSession;
    console.log(
      "x",
      JSON.stringify(activeSession.current.sessionConfiguration),
    );

    setSessionConfiguration(
      window.structuredClone(activeSession.current.sessionConfiguration),
    );
    updateActiveMessageList();
    setCurrentChatSessionId(id);
  }, [id]);

  // useEffect(() => {
  //   console.log("update", webRWKVLLMInfer.defaultSessionConfiguration);
  //   setSessionConfiguration(webRWKVLLMInfer.defaultSessionConfiguration);
  // }, [webRWKVLLMInfer]);

  useEffect(() => {
    console.log("su", JSON.stringify(sessionConfiguration));
  }, [sessionConfiguration]);

  return {
    activeMessageBlocks,
    sessionConfiguration,
    currentChatSessionId,

    getActiveMessages,
    createNewMessasgeBlock,
    updateCurrentMessageBlock: throttle(updateCurrentMessageBlock, 50),
    updateChatSessionTitle,
    updateSessionConfiguration,
  };
}
