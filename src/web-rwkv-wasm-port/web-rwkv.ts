import { useEffect, useRef, useState } from "react";
import { Comlink } from "./comlink-helper";
import WebRWKVWorker from "./web-rwkv.worker?worker";
import { WEB_RWKV_WASM_PORT } from "./web-rwkv.worker";
import { Sampler } from "./types";
import { CustomError } from "../utils/utils";

export interface SessionConfiguration {
  stopTokens: number[];
  stopWords: string[];
  maxTokens: number;
  defaultSamplerConfig: Sampler;
  systemPrompt: string | null;
}

export type CompletionMessage =
  | { role: "User" | "Assistant" | string; content: string }
  | { text: string };

export const DEFAULT_STOP_TOKENS = [261, 0];
export const DEFAULT_STOP_WORDS = ["\n\nUser"];

export const DEFAULT_SAMPLER_CONFIG = {
  temperature: 1.0,
  top_p: 0.5,
  presence_penalty: 0.5,
  count_penalty: 0.5,
  half_life: 200,
};

export const DEFAULT_SESSION_CONFIGURATION = {
  stopTokens: DEFAULT_STOP_TOKENS,
  stopWords: DEFAULT_STOP_WORDS,
  maxTokens: 2048,
  systemPrompt: null,
  defaultSamplerConfig: DEFAULT_SAMPLER_CONFIG,
};

export function useWebRWKVChat(webRWKVInferPort: WebRWKVInferPort) {
  const [currentModelName, setCurrentModelName] = useState<string | null>(
    webRWKVInferPort.currentModelName,
  );

  const defaultSessionConfiguration = useRef<SessionConfiguration>(null!);

  const onChangeModelHook = (name: string | null) => {
    setCurrentModelName(name);
    defaultSessionConfiguration.current =
      webRWKVInferPort.defaultSessionConfiguration;
  };
  useEffect(() => {
    webRWKVInferPort.onCurrentModelChange(onChangeModelHook);

    defaultSessionConfiguration.current =
      webRWKVInferPort.defaultSessionConfiguration;

    return () => {
      webRWKVInferPort.removeCurrentModelChange(onChangeModelHook);
    };
  }, []);

  const unloadModel = async () => {
    webRWKVInferPort.unloadModel();
  };

  const loadModel = async (
    name: string,
    chunks: Uint8Array[],
    vocal_url: string,
    modeldefaultSessionConfiguration: SessionConfiguration,
  ) => {
    webRWKVInferPort.vacalUrl = vocal_url;

    webRWKVInferPort.defaultSessionConfiguration =
      modeldefaultSessionConfiguration;
    defaultSessionConfiguration.current = modeldefaultSessionConfiguration;

    await webRWKVInferPort.loadModel(name, chunks);
    warnup();
  };

  const warnup = async () => {
    const stream = completion({
      stream: true,
      messages: [{ role: "User", content: "Who are you?" }],
      max_tokens: 25,
    });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    console.log("warnup:", result);
  };

  const completion = async function* (
    {
      max_tokens,
      prompt,
      messages,
      temperature,
      top_p,
      presence_penalty,
      count_penalty,
      penalty_half_life,
      stream,
      new_message_role = "Assistant",
      stop_tokens = DEFAULT_STOP_TOKENS,
      stop_words = DEFAULT_STOP_WORDS,
    }: {
      max_tokens?: number;
      prompt?: string;
      messages?: CompletionMessage[];
      temperature?: number;
      top_p?: number;
      presence_penalty?: number;
      count_penalty?: number;
      penalty_half_life?: number;
      stream?: boolean;
      new_message_role?: string;
      stop_tokens?: number[];
      stop_words?: string[];
    },
    controller: AbortController = new AbortController(),
  ) {
    if (!messages && !prompt) {
      throw new Error("messages or prompt is required");
    }
    if (prompt && messages) {
      throw new Error("messages and prompt cannot be used at the same time");
    }

    // 格式化prompt参数
    const formattedPrompt =
      prompt !== undefined
        ? prompt
        : `${formatPromptObject(messages!)}\n\n${new_message_role}:`;

    const generator = await (async function* () {
      yield* webRWKVInferPort.completion(
        {
          max_tokens,
          prompt: formattedPrompt,
          temperature,
          top_p,
          presence_penalty,
          count_penalty,
          penalty_half_life,
          stream,
          stop_tokens,
          stop_words,
        },
        controller.signal,
      );
    })();

    // 添加controller.abort方法到生成器对象
    (generator as any).controller = {
      abort: () => controller.abort(),
    };

    yield* generator;
  };

  return {
    currentModelName,
    defaultSessionConfiguration,

    loadModel,
    unloadModel,
    completion,

    onConsoleLog: webRWKVInferPort.onConsoleLog,
    removeConsoleLog: webRWKVInferPort.removeConsoleLog,
  };
}

export function formatPromptObject(prompt: CompletionMessage[]) {
  return prompt
    .map((v) => {
      if ("text" in v && v.text.trim() !== "") {
        return v.text.trim();
      } else if ("role" in v) {
        return `${v.role}: ${cleanChatPrompt(v.content)}`;
      } else {
        throw new CustomError("MessageError", v);
      }
    })
    .join("\n\n");
}

export function cleanChatPrompt(prompt: string) {
  return prompt.trim().replace(/\n+/g, "\n");
}

export class WebRWKVInferPort {
  private workerClass: Comlink.Remote<typeof WEB_RWKV_WASM_PORT> | undefined =
    undefined;
  private worker: Comlink.Remote<WEB_RWKV_WASM_PORT> | null = null;

  private currentModelNameCallback: ((name: string | null) => void)[] = [];
  private consoleLogCallbackList: (typeof console.log)[] = [];

  isLoadingModel: boolean = false;
  currentModelName: string | null = null;

  // defaultSamplerParam: Sampler = {
  //   temperature: 1.0,
  //   top_p: 0.5,
  //   presence_penalty: 0.5,
  //   count_penalty: 0.5,
  //   half_life: 200,
  // };
  // defaultSystemPrompt: string | null = null;
  defaultSessionConfiguration: SessionConfiguration = null!;

  vacalUrl: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    this.workerClass = Comlink.wrap(new WebRWKVWorker()) as Comlink.Remote<
      typeof WEB_RWKV_WASM_PORT
    >;
    this.worker = await new this.workerClass();
    await this.setupConsoleLog();
  }

  // currentModelNameCallback

  private setCurrentModel(name: string | null) {
    this.currentModelName = name;
    this.currentModelNameCallback.forEach((cb) => cb(name));
  }
  onCurrentModelChange(cb: (name: string | null) => void) {
    this.currentModelNameCallback.push(cb);
  }
  removeCurrentModelChange(cb: (name: string | null) => void) {
    this.currentModelNameCallback = this.currentModelNameCallback.filter(
      (x) => x !== cb,
    );
  }

  // load & unload model

  async resetWorker() {
    await this.worker?.release();
    await this.init();
  }

  async unloadModel() {
    await this.resetWorker();
    this.setCurrentModel(null);
  }

  async loadModel(name: string, chunks: Uint8Array[]) {
    if (!this.worker) {
      throw new Error("worker not initialized");
    }

    if (this.isLoadingModel) {
      await Promise.reject("Model is loading");
    }

    this.isLoadingModel = true;

    await this.unloadModel();

    await this.worker.load(
      Comlink.transfer(
        chunks,
        chunks.map((x) => x.buffer),
      ),
    );
    this.setCurrentModel(name);
    this.isLoadingModel = false;
  }

  //console log

  async setupConsoleLog() {
    await this.worker?.setConsoleLogCallback(
      Comlink.proxy((...args: any[]) => {
        this.consoleLogCallbackList.forEach((cb) => cb(...args));
      }),
    );
  }
  onConsoleLog(cb: (...args: any[]) => void) {
    this.consoleLogCallbackList.push(cb);
  }
  removeConsoleLog(cb: (...args: any[]) => void) {
    this.consoleLogCallbackList = this.consoleLogCallbackList.filter(
      (x) => x !== cb,
    );
  }

  async *completion(
    options: {
      max_tokens?: number;
      prompt: string;
      temperature?: number;
      top_p?: number;
      presence_penalty?: number;
      count_penalty?: number;
      penalty_half_life?: number;
      stream?: boolean;
      stop_tokens?: number[];
      stop_words?: string[];
    },
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.worker) {
      throw new Error("worker not initialized");
    }

    if (!this.vacalUrl) {
      throw new Error("vocab not loaded");
    }

    const runner = await this.worker.run(
      {
        max_len: options.max_tokens || 2048,
        prompt: options.prompt,
        stop_tokens: options.stop_tokens || [],
        stop_words: options.stop_words || [],
        temperature:
          options.temperature ??
          this.defaultSessionConfiguration.defaultSamplerConfig.temperature,
        top_p:
          options.top_p ??
          this.defaultSessionConfiguration.defaultSamplerConfig.top_p,
        presence_penalty:
          options.presence_penalty ??
          this.defaultSessionConfiguration.defaultSamplerConfig
            .presence_penalty,
        count_penalty:
          options.count_penalty ??
          this.defaultSessionConfiguration.defaultSamplerConfig.count_penalty,
        penalty_decay: Math.exp(
          -0.69314718 /
            Math.max(
              options.penalty_half_life ??
                this.defaultSessionConfiguration.defaultSamplerConfig.half_life,
              1,
            ),
        ),
        vocab: this.vacalUrl,
        stream: options.stream || false,
      },
      signal,
    );

    for await (const result of runner) {
      if (result.type === "token") {
        yield result.word;
      }
      if (result.type === "completion") {
        yield result.word;
      }
      if (signal?.aborted) {
        break;
      }
    }
  }
}
