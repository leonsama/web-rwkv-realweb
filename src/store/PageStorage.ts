import { create, StateCreator } from "zustand";

import { immer } from "zustand/middleware/immer";

import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import { StoreApi, UseBoundStore } from "zustand";
import { useEffect, useRef, useState } from "react";

const LOCAL_SESSION_ID_LIST = "LOCAL_SESSION_ID_LIST";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

interface SessionStorage {
  isBarOpen: boolean;
  showLargeBanner: boolean;
  setIsBarOpen: (isOpen: boolean) => void;
  setShowLargeBanner: (showLargeBanner: boolean) => void;
}

export const useSessionStorage = create<SessionStorage>((set) => ({
  isBarOpen: true,
  showLargeBanner: true,
  setShowLargeBanner: (showLargeBanner: boolean) =>
    set({ showLargeBanner: showLargeBanner }),
  setIsBarOpen: (isOpen: boolean) => set({ isBarOpen: isOpen }),
}));

interface NucleusSamplerConfig {
  temp: number;
  top_p: number;
  presence_penalty: number;
  count_penalty: number;
  penalty_decay: number;
}

interface ChatSession {
  id: string;
  title: string;
  messageBlock: MessageBlock[];
  samplerConfig: NucleusSamplerConfig;
  stop_tokens: number[];
  max_len: number;
  updateTimestamp: number;
}

interface ChatSessionInfomation {
  id: string;
  title: string;
  updateTimestamp: number;
}

interface MessageBlock {
  messageContents: MessageContent[];
  activeMessageContentIndex: number;
}

interface MessageContent {
  role: string;
  content: string;
  nextMessagesBlockIndexs: number[];
  activeNextMessageBlockIndex: number | null;
}

interface ChatStorage {
  sessions: { [id: string]: ChatSession };
  sessionInformations: ChatSessionInfomation[];

  setSessionById: (id: string, session: ChatSession) => void;
  createNewSession: () => string;
  deleteSessionById: (id: string) => void;
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
      createNewSession: () => {
        const session = {
          id: self.crypto.randomUUID(),
          messageBlock: [],
          messageContent: [],
          samplerConfig: {
            temp: 1.0,
            top_p: 0.5,
            presence_penalty: 0.5,
            count_penalty: 0.5,
            penalty_decay: 0.996,
          },
          stop_tokens: [],
          max_len: 2048,
          title: "New Session",
          updateTimestamp: Date.now(),
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
          (info) => info.id !== id
        );
        const sessions = { ...get().sessions };
        delete sessions[id];
        set((prev) => ({
          ...prev,
          sessionInformations: sessionInformations,
          sessions: sessions,
        }));
      },
    }),
    {
      name: "webrwkv-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
  // )
);

export function useChatSessionInformation() {
  const informations = useChatSessionStore(
    useShallow((state) => state.sessionInformations)
  );
  return informations;
}

interface ActiveMessage {
  role: string;
  content: string;
  currentBlockIndex: number;
  currentMessageContentIndex: number;
  totalMessageContentCount: number;
}

export function useChatSession(id: string) {
  const chatSessionStorage = useChatSessionStore((state) => state);
  const sessions = useChatSessionStore(useShallow((state) => state.sessions));

  const activeSession = useRef<ChatSession>(sessions[id]);
  const [activeMessageList, setActiveMessageList] = useState<ActiveMessage[]>(
    []
  );

  const getActiveMessageList = (session: ChatSession) => {
    const newActiveMessageList: ActiveMessage[] = [];
    let currentMessageBlockIndex = 0;
    if (activeSession.current.messageBlock.length === 0) {
      return newActiveMessageList;
    }

    while (true) {
      const activeMessage: ActiveMessage = {
        role: "",
        content: "",
        currentBlockIndex: -1,
        currentMessageContentIndex: -1,
        totalMessageContentCount: -1,
      };

      const messageBlock =
        activeSession.current.messageBlock[currentMessageBlockIndex];
      const messageContent =
        messageBlock.messageContents[messageBlock.activeMessageContentIndex];

      activeMessage.role = messageContent.role;
      activeMessage.content = messageContent.content;
      activeMessage.currentBlockIndex = currentMessageBlockIndex;
      activeMessage.currentMessageContentIndex =
        messageBlock.activeMessageContentIndex;
      activeMessage.totalMessageContentCount =
        messageBlock.messageContents.length;
      newActiveMessageList.push(activeMessage);
      if (messageContent.activeNextMessageBlockIndex === null) {
        break;
      } else {
        currentMessageBlockIndex = messageContent.activeNextMessageBlockIndex;
      }
    }

    return newActiveMessageList;
  };

  const submitMessage = (role: string, content: string) => {
    const newMessageBlock: MessageBlock = {
      activeMessageContentIndex: 0,
      messageContents: [
        {
          role,
          content,
          activeNextMessageBlockIndex: null,
          nextMessagesBlockIndexs: [],
        },
      ],
    };
    // activeSession.current.messageBlock.push(newMessageBlock);
    if (activeMessageList.length > 0) {
      const newMessageBlockIndex = activeSession.current.messageBlock.length;
      const previousMessageBlock =
        activeSession.current.messageBlock[
          activeMessageList[activeMessageList.length - 1].currentBlockIndex
        ];
      const previousMessageContent =
        previousMessageBlock.messageContents[
          previousMessageBlock.activeMessageContentIndex
        ];

      previousMessageContent.nextMessagesBlockIndexs.push(newMessageBlockIndex);
      previousMessageContent.activeNextMessageBlockIndex = newMessageBlockIndex;
    }
    activeSession.current.messageBlock.push(newMessageBlock);

    updateActiveMessageList();
  };

  const updateActiveMessageList = () => {
    setActiveMessageList(getActiveMessageList(activeSession.current));
    updateSession();
  };

  const updateSession = () => {
    chatSessionStorage.setSessionById(
      activeSession.current.id,
      activeSession.current
    );
  };

  const updateChatSessionTitle = (title: string) => {
    activeSession.current.title = title;
    updateSession();
  };

  useEffect(() => {
    activeSession.current = sessions[id];
    updateActiveMessageList();
  }, [id]);
  return { activeMessageList, submitMessage, updateChatSessionTitle };
}
