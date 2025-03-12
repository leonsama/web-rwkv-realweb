import { createContext } from "react";
import { useChatSession } from "../store/ChatSessionStorage";
import {
  CompletionGenerator,
  InferPortInterface,
  SessionConfiguration,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { useSuspendUntilValid } from "../utils/utils";

export const ChatSession = createContext<
  ReturnType<typeof useChatSession> & {
    startGenerationTask: (prompt: string, newChat: boolean) => Promise<void>;
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;

    selectedModelTitle: string | null;
    loadingModelTitle: string | null;

    generator: React.MutableRefObject<CompletionGenerator>;
    completion: ReturnType<typeof useWebRWKVChat>["completion"];

    checkIsModelLoaded: (
      validate: (currentState: string | null) => boolean,
    ) => Promise<void>;

    webRWKVLLMInfer: InferPortInterface;

    currentModelName: string | null;
    setCurrentModelName: (name: string) => void;
  }
>(null!);

export const ChatInterfaceContext = createContext<{
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  startGenerationTask: React.MutableRefObject<
    (prompt: string, newChat?: boolean) => Promise<void>
  >;
  generator: React.MutableRefObject<CompletionGenerator>;

  currentModelName: string | null;
  setCurrentModelName: (name: string | null) => void;

  checkIsModelLoaded: (
    validate: (currentState: string | null) => boolean,
  ) => Promise<void>;

  chatInterfaceUpdateSessionConfiguration: React.MutableRefObject<
    (sessionConfiguration: SessionConfiguration) => void
  >;
  generalUpdateSessionConfiguration: (
    sessionConfiguration: SessionConfiguration,
  ) => void;
}>(null!);
