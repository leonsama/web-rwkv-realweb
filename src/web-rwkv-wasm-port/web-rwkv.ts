import { useEffect, useRef, useState } from "react";
import { Comlink } from "./comlink-helper";
import WebRWKVWorker from "./web-rwkv.worker?worker";
import { WEB_RWKV_WASM_PORT } from "./web-rwkv.worker";

declare global {
  var __web_rwkv_worker: Comlink.Remote<typeof WEB_RWKV_WASM_PORT>;
  var __current_chat_model_name: string | null;
}

console.log("log");

if (!globalThis.__web_rwkv_worker) {
  globalThis.__web_rwkv_worker = Comlink.wrap(new WebRWKVWorker());
}

export function useWebRWKVChat() {
  const [currentModel, setCurrentModel] = useState<string | null>(
    globalThis.__current_chat_model_name
  );

  const rwkvChatMode = useRef<null | Comlink.Remote<WEB_RWKV_WASM_PORT>>(null);

  (async () => {
    rwkvChatMode.current = await new globalThis.__web_rwkv_worker();
  })();

  const unloadModel = async () => {
    await rwkvChatMode.current?.release();
    globalThis.__web_rwkv_worker = Comlink.wrap(new WebRWKVWorker());
    globalThis.__current_chat_model_name = null;
    setCurrentModel(globalThis.__current_chat_model_name);
  };

  const loadModel = async (name: string, chunks: Uint8Array[]) => {
    if (globalThis.__current_chat_model_name) {
      await unloadModel();
    }
    globalThis.__current_chat_model_name = name;
    await rwkvChatMode.current?.load(
      Comlink.transfer(
        chunks,
        chunks.map((x) => x.buffer)
      )
    );

    setCurrentModel(globalThis.__current_chat_model_name);
  };
  return { currentModel, loadModel, unloadModel };
}
