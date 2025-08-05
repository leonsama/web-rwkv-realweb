import { useEffect, useRef, useState } from "react";
import { Comlink } from "./comlink-helper";
import WebRWKVWorker from "./web-rwkv.worker?worker";
import { WEB_RWKV_WASM_PORT } from "./web-rwkv.worker";
import { Sampler } from "./types";
import { CustomError, removeOuterThinkTags } from "../utils/utils";
import { APIModelParam } from "../components/ModelConfigUI";

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

export type CompletionGenerator = {
  [Symbol.asyncIterator]: () => InferPortGenerator;
  controller: {
    abort(): void;
  };
};

export const DEFAULT_STOP_TOKENS = [261, 0];
export const DEFAULT_STOP_WORDS = ["\n\nUser"];

export const DEFAULT_SAMPLER_CONFIG = {
  temperature: 1.0,
  top_p: 0.3,
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

export function useWebRWKVChat(webRWKVInferPort: InferPortInterface) {
  const [selectedModelTitle, setSelectedModelName] = useState<string | null>(
    webRWKVInferPort.selectedModelTitle,
  );
  const [supportReasoning, setSupportReasoning] = useState<boolean>(
    webRWKVInferPort.supportReasoning,
  );

  const currentInferPort = useRef<InferPortInterface>(null!);

  const defaultSessionConfiguration = useRef<SessionConfiguration>(null!);

  const onChangeModelHook = (name: string | null) => {
    setSelectedModelName(name);
    defaultSessionConfiguration.current =
      webRWKVInferPort.defaultSessionConfiguration;
  };
  useEffect(() => {
    defaultSessionConfiguration.current =
      webRWKVInferPort.defaultSessionConfiguration;

    setSupportReasoning(webRWKVInferPort.supportReasoning);

    currentInferPort.current = webRWKVInferPort;

    webRWKVInferPort.onSelectedModelChange(onChangeModelHook);

    return () => {
      webRWKVInferPort.removeCurrentModelChange(onChangeModelHook);
    };
  }, [webRWKVInferPort]);

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
    const stream = await completion({
      stream: true,
      messages: [{ role: "User", content: "Who are you?" }],
      max_tokens: 25,
    });
    let result = "";

    for await (const chunk of stream) {
      result += chunk.word;
    }
    console.log("warnup:", result);
  };

  const completion = async function (
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
      stop_tokens,
      stop_words,
      enableReasoning = false,
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
      enableReasoning?: boolean;
    },
    controller: AbortController = new AbortController(),
  ): Promise<CompletionGenerator> {
    if (!messages && !prompt) {
      throw new Error("messages or prompt is required");
    }
    if (prompt && messages) {
      throw new Error("messages and prompt cannot be used at the same time");
    }

    const formattedMessage =
      messages && formatMessages({ messages, removeThinkTag: enableReasoning });

    const formattedRWKVPromptStr =
      prompt !== undefined
        ? prompt
        : `${formatPromptObject(formatMessages({ messages: formattedMessage!, removeThinkTag: enableReasoning, formatForRWKV: true }))}\n\n${new_message_role}:${enableReasoning ? " <think" : ""}`;

    const generator = {
      [Symbol.asyncIterator]: async function* () {
        const innerCompletion = currentInferPort.current.completion(
          {
            max_tokens,
            messages:
              formattedMessage &&
              (formattedMessage.filter((v) => !v.hasOwnProperty("text")) as {
                role: string;
                content: string;
              }[]),
            prompt: formattedRWKVPromptStr,
            temperature,
            top_p,
            presence_penalty,
            count_penalty,
            penalty_half_life,
            stream,
            stop_tokens,
            stop_words,
            enableReasoning,
          },
          controller.signal,
        );

        for await (const result of innerCompletion) {
          yield result;
        }
      },
      controller: {
        abort() {
          controller.abort();
        },
      },
    };

    return generator;
  };

  return {
    selectedModelTitle,
    defaultSessionConfiguration,
    supportReasoning,
    currentInferPort,

    loadModel,
    unloadModel,
    completion,
    warnup,

    onConsoleLog: webRWKVInferPort.onConsoleLog,
    removeConsoleLog: webRWKVInferPort.removeConsoleLog,
  };
}

function formatMessages({
  messages,
  removeThinkTag = false,
  formatForRWKV = false,
}: {
  messages: CompletionMessage[];
  removeThinkTag: boolean;
  formatForRWKV?: boolean;
}): CompletionMessage[] {
  return messages.map((v) => {
    if ("text" in v && v.text.trim() !== "") {
      v.text = v.text.trim();
      return v;
    } else if ("role" in v) {
      if (v.role.toLocaleLowerCase() === "assistant") {
        v.content = removeThinkTag
          ? removeOuterThinkTags(v.content)
          : v.content;
      }

      if (formatForRWKV) {
        v.content = cleanChatPromptForRWKV(v.content);
      }
      v.content = v.content.trim();

      return v;
    } else {
      throw new CustomError("MessageError", v);
    }
  });
}

export function formatPromptObject(prompt: CompletionMessage[]) {
  return prompt
    .map((v) => {
      if ("text" in v && v.text.trim() !== "") {
        return v.text.trim();
      } else if ("role" in v) {
        return `${v.role}: ${v.content}`;
      } else {
        throw new CustomError("MessageError", v);
      }
    })
    .join("\n\n");
}

export function cleanChatPromptForRWKV(prompt: string) {
  return prompt.trim().replace(/\n+/g, "\n");
}

type InferPortGenerator = AsyncGenerator<
  {
    type: "token" | string;
    word: string;
    model: string;
    completionId: string | null;
  },
  void,
  unknown
>;

export interface InferPortInterface {
  portType: string;
  isLoadingModel: boolean;
  selectedModelTitle: string | null;
  defaultSessionConfiguration: SessionConfiguration;
  vacalUrl: string | null;

  supportReasoning: boolean;
  isEnableReasoning: boolean;

  init(): Promise<void>;

  onSelectedModelChange(cb: (name: string | null) => void): void;
  removeCurrentModelChange(cb: (name: string | null) => void): void;

  resetWorker(): Promise<void>;
  unloadModel(): Promise<void>;
  loadModel(name: string, chunks: Uint8Array[]): Promise<void>;

  onConsoleLog(cb: (...args: any[]) => void): void;
  removeConsoleLog(cb: (...args: any[]) => void): void;

  completion(
    options: {
      messages?: { role: string; content: string }[];
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
      enableReasoning?: boolean;
    },
    signal?: AbortSignal,
  ): InferPortGenerator;
}

export class WebRWKVInferPort implements InferPortInterface {
  private workerClass: Comlink.Remote<typeof WEB_RWKV_WASM_PORT> | undefined =
    undefined;
  private worker: Comlink.Remote<WEB_RWKV_WASM_PORT> | null = null;

  private selectedModelNameCallback: ((name: string | null) => void)[] = [];
  private consoleLogCallbackList: (typeof console.log)[] = [];

  portType: string = "wasm";

  supportReasoning: boolean = false;
  isEnableReasoning: boolean = false;

  isLoadingModel: boolean = false;
  selectedModelTitle: string | null = null;

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
    this.selectedModelTitle = name;
    this.selectedModelNameCallback.forEach((cb) => cb(name));
  }
  onSelectedModelChange(cb: (name: string | null) => void) {
    this.selectedModelNameCallback.push(cb);
    this.setCurrentModel(this.selectedModelTitle);
  }
  removeCurrentModelChange(cb: (name: string | null) => void) {
    this.selectedModelNameCallback = this.selectedModelNameCallback.filter(
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
      messages?: { role: string; content: string }[];
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
  ) {
    if (!this.worker) {
      throw new Error("worker not initialized");
    }

    if (!this.vacalUrl) {
      throw new Error("vocab not loaded");
    }

    if (!this.selectedModelTitle) {
      throw new Error("model not loaded");
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
        yield {
          type: "token",
          word: result.word,
          model: this.selectedModelTitle,
          completionId: null,
        };
      }
      if (result.type === "completion") {
        yield {
          type: "token",
          word: result.word,
          model: this.selectedModelTitle,
          completionId: null,
        };
      }
      if (signal?.aborted) {
        break;
      }
    }
  }
}

export class APIInferPort implements InferPortInterface {
  private selectedModelNameCallback: ((name: string | null) => void)[] = [];

  supportReasoning: boolean = false;
  reasoningModelName: string | null = null;
  isEnableReasoning: boolean = false;

  portType: string = "api";

  isLoadingModel: boolean = false;
  selectedModelTitle: string | null = null;

  defaultSessionConfiguration: SessionConfiguration = null!;

  vacalUrl: string | null = null;

  APIModelParam: APIModelParam | null = null;

  constructor() {}

  async init() {}

  // load & unload model

  async resetWorker() {}

  async unloadModel() {
    this.APIModelParam = null;
    this.setCurrentModel(null);
  }

  async loadModel(name: string, chunks: Uint8Array[]) {
    throw new Error("APIInferPort");
  }

  async loadModelFromAPI(modelName: string, APIModelParam: APIModelParam) {
    this.setCurrentModel(modelName);
    this.APIModelParam = APIModelParam;
  }

  // currentModelNameCallback

  private setCurrentModel(name: string | null) {
    this.selectedModelTitle = name;
    this.selectedModelNameCallback.forEach((cb) => cb(name));
  }
  onSelectedModelChange(cb: (name: string | null) => void) {
    this.selectedModelNameCallback.push(cb);
    this.setCurrentModel(this.selectedModelTitle);
  }
  removeCurrentModelChange(cb: (name: string | null) => void) {
    this.selectedModelNameCallback = this.selectedModelNameCallback.filter(
      (x) => x !== cb,
    );
  }

  //console log

  async setupConsoleLog() {}
  onConsoleLog(cb: (...args: any[]) => void) {}
  removeConsoleLog(cb: (...args: any[]) => void) {}

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
      enableReasoning?: boolean;
      messages?: { role: string; content: string }[];
    },
    signal?: AbortSignal,
  ) {
    if (!this.APIModelParam) {
      throw new Error("APIParam not initialized");
    }
    if (!this.selectedModelTitle) {
      throw new Error("ModelName not set");
    }

    const url = `${this.APIModelParam.baseUrl}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.APIModelParam.key}`,
    };

    const apiMessage = options.messages?.map((c) => ({
      role: c.role.toLowerCase(),
      content: c.content,
    }));

    const requestBody = {
      model:
        this.portType === "api" && options.enableReasoning
          ? (this as APIInferPort).reasoningModelName!
          : this.selectedModelTitle!,
      // prompt: options.prompt,
      messages: apiMessage,
      ...(options.max_tokens && { max_tokens: options.max_tokens }),
      ...(options.temperature && { temperature: options.temperature }),
      ...(options.top_p && { top_p: options.top_p }),
      ...(options.presence_penalty && {
        presence_penalty: options.presence_penalty,
      }),
      ...(options.count_penalty !== undefined && {
        count_penalty: options.count_penalty,
      }),
      ...(options.penalty_half_life !== undefined && {
        penalty_decay: Math.exp(
          -0.69314718 /
            Math.max(
              options.penalty_half_life ??
                this.defaultSessionConfiguration.defaultSamplerConfig.half_life,
              1,
            ),
        ),
      }),
      stream: true,
      ...(options.stop_words && { stop: options.stop_words }),
      ...(options.stop_tokens && { stop_tokens: options.stop_tokens }),
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      let isThinking = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let eventEndIndex;

          while ((eventEndIndex = buffer.indexOf("\n\n")) !== -1) {
            const eventData = buffer.slice(0, eventEndIndex);
            buffer = buffer.slice(eventEndIndex + 2);

            for (const line of eventData.split("\n")) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") continue;

                try {
                  const data = JSON.parse(jsonStr);
                  const reasoningContent =
                    data.choices[0]?.delta.reasoning_content || "";
                  const content = data.choices[0]?.delta.content || "";
                  if (reasoningContent != "" && !isThinking) {
                    isThinking = true;
                    yield {
                      type: "token",
                      word: `<think>`,
                      model: data.model,
                      completionId: data.id,
                    };
                  } else if (content !== "" && isThinking) {
                    isThinking = false;
                    yield {
                      type: "token",
                      word: `</think>`,
                      model: data.model,
                      completionId: data.id,
                    };
                  }
                  yield {
                    type: "token",
                    word: `${reasoningContent}${content}`,
                    model: data.model,
                    completionId: data.id,
                  };
                } catch (e) {
                  console.error("Failed to parse SSE data:", e);
                }
              }
            }
          }
        }

        // Process remaining buffer content
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              try {
                const data = JSON.parse(jsonStr);
                const text = data.choices[0]?.text || "";
                if (text) yield text;
              } catch (e) {
                console.error("Failed to parse remaining data:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if ((error as any).name === "AbortError") return;
      console.log("Error ", error);
    }
  }
}
