import { create } from "zustand";

import { immer } from "zustand/middleware/immer";

import { StoreApi, UseBoundStore } from "zustand";

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
  message: MessageContent[]; // 这是一个链表
  samplerConfig: NucleusSamplerConfig;
  stop_tokens: number[];
  max_len: number;
}

interface MessageContent {
  role: string;
  content: string;
  nextMessagesID: number[]; // 可用的下一个messagecontent的id，id是messagecontent在message列表中的id。
  activeNextMessageID: number | null; // 当前激活的下一个messagecontent的id
}

interface ChatStorage {
  sessions: ChatSession[];

  init: () => void;

  getSessionById: (id: string) => ChatSession | undefined;
  setSessionById: (id: string, session: ChatSession) => void;

  createNewSession: () => ChatSession;
  deleteSessionById: (id: string) => void;

  getActiveMessageList: (session: ChatSession) => MessageContent[];
  // createNewMessageContent: (
  //   session: ChatSession,
  //   parentMessasgeContentId: number,
  //   role: string,
  //   prompt: string
  // ) => MessageContent[];
}

// 使用localstorage持久化储存session
export const useChatSession = createSelectors(
  create<ChatStorage>()((set, get) => ({
    sessions: [],
    init: () =>
      set((prev) => {
        const sessionIds: string[] = JSON.parse(
          localStorage.getItem(LOCAL_SESSION_ID_LIST) || "[]"
        );
        const sessions: ChatSession[] = [];
        sessionIds.forEach((value: string, index: number) => {
          const session = localStorage.getItem(value);
          if (session) {
            sessions.push(JSON.parse(session));
          }
        });
        return {
          sessions: sessions,
        };
      }),
    getSessionById: (id: string) => {
      const session = localStorage.getItem(id);
      if (session) {
        return JSON.parse(session);
      }
      return undefined;
    },
    setSessionById: (id: string, session: ChatSession) => {
      localStorage.setItem(id, JSON.stringify(session));

      localStorage.setItem(
        LOCAL_SESSION_ID_LIST,
        JSON.stringify([...get().sessions, id])
      );
      const sessions: ChatSession[] = [...get().sessions, session];
      set((prev) => {
        return { sessions: sessions };
      });
    },
    createNewSession: () => {
      const session = {
        id: self.crypto.randomUUID(),
        message: [],
        samplerConfig: {
          temp: 1.0,
          top_p: 0.5,
          presence_penalty: 0.5,
          count_penalty: 0.5,
          penalty_decay: 0.996,
        },
        stop_tokens: [],
        max_len: 2048,
      };
      localStorage.setItem(session.id, JSON.stringify(session));
      return session;
    },
    deleteSessionById: (id: string) => {
      localStorage.removeItem(id);
    },
    getActiveMessageList: (session: ChatSession) => {
      // 生成活动MessageList方法：从ChatSession的message列表中的第0个messagecontent开始，根据activeNextMessageID，从message列表里选择下一个messagecontent，直到activeNextMessageID为null
      const activeMessageList: MessageContent[] = [];
      let currentMessageContent = session.message[0];
      while (true) {
        if (currentMessageContent.activeNextMessageID === null) break;
        activeMessageList.push(currentMessageContent);
        currentMessageContent =
          session.message[currentMessageContent.activeNextMessageID];
      }
      return activeMessageList;
    },
  }))
);
