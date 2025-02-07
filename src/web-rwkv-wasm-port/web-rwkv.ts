import { useEffect, useRef, useState } from "react";
import { Comlink } from "./comlink-helper";
import WebRWKVWorker from "./web-rwkv.worker?worker";
import { WEB_RWKV_WASM_PORT } from "./web-rwkv.worker";
import { Sampler } from "./types";

export const DEFAULT_STOP_TOKENS = [261, 0];
export const DEFAULT_STIO_WORDS = ["\n\nUser"];

export function useWebRWKVChat(webRWKVInferPort: WebRWKVInferPort) {
  const [currentModelName, setCurrentModelName] = useState<string | null>(
    webRWKVInferPort.currentModelName,
  );

  const defaultSamplerParam = useRef<Sampler | null>(null);

  useEffect(() => {
    const hook = (name: string | null) => setCurrentModelName(name);
    webRWKVInferPort.onCurrentModelChange(hook);

    defaultSamplerParam.current = webRWKVInferPort.defaultSamplerParam;

    return () => {
      webRWKVInferPort.removeCurrentModelChange(hook);
    };
  }, []);

  const unloadModel = async () => {
    webRWKVInferPort.unloadModel();
  };

  const loadModel = async (
    name: string,
    chunks: Uint8Array[],
    vocal_url: string,
    default_sampler_param?: Sampler,
  ) => {
    webRWKVInferPort.vacalUrl = vocal_url;

    defaultSamplerParam.current = {
      temperature: 1.0,
      top_p: 0.5,
      presence_penalty: 0.5,
      count_penalty: 0.5,
      half_life: 200,
      ...default_sampler_param,
    };
    webRWKVInferPort.defaultSamplerParam = defaultSamplerParam.current;
    await webRWKVInferPort.loadModel(name, chunks);
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
      stop_words = DEFAULT_STIO_WORDS,
    }: {
      max_tokens?: number;
      prompt?: string;
      messages?: { role: "User" | "Assistant" | string; content: string }[];
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
    defaultSamplerParam,

    loadModel,
    unloadModel,
    completion,

    onConsoleLog: webRWKVInferPort.onConsoleLog,
    removeConsoleLog: webRWKVInferPort.removeConsoleLog,
  };
}

export function formatPromptObject(
  prompt: { role: "User" | "Assistant" | string; content: string }[],
) {
  return prompt
    .map((v) => {
      return `${v.role}: ${cleanChatPrompt(v.content)}`;
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

  defaultSamplerParam: Sampler = {
    temperature: 1.0,
    top_p: 0.5,
    presence_penalty: 0.5,
    count_penalty: 0.5,
    half_life: 200,
  };

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
          options.temperature ?? this.defaultSamplerParam.temperature,
        top_p: options.top_p ?? this.defaultSamplerParam.top_p,
        presence_penalty:
          options.presence_penalty ?? this.defaultSamplerParam.presence_penalty,
        count_penalty:
          options.count_penalty ?? this.defaultSamplerParam.count_penalty,
        penalty_decay: Math.exp(
          -0.69314718 /
            Math.max(
              options.penalty_half_life ?? this.defaultSamplerParam.half_life,
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
