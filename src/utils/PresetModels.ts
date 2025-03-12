import { APIModel, RWKVModelWeb } from "../components/ModelConfigUI";
import {
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
} from "../web-rwkv-wasm-port/web-rwkv";

import DEFAULT_VOCAB_URL from "../../assets/rwkv_vocab_v20230424.json?url";

export const DEFAULT_API_MODEL: APIModel = {
  title: "RWKV Latest",
  name: "rwkv-latest",
  description: "Latest RWKV Official Online Model",
  supportReasoning: true,
  reasoningName: "rwkv-latest:thinking",
  param: null,
  dataset: "v2.8",
  update: "2024/12/10",
  ctx: "4096",
  defaultSessionConfiguration: {
    stopTokens: DEFAULT_STOP_TOKENS,
    stopWords: DEFAULT_STOP_WORDS,
    maxTokens: 2048,
    systemPrompt: null,
    defaultSamplerConfig: {
      temperature: 2.0,
      top_p: 0.3,
      presence_penalty: 0.5,
      count_penalty: 0.5,
      half_life: 200,
    },
  },
  APIParam: {
    baseUrl: "https://rwkv-red-team-rwkv-latestspace.hf.space/api/v1",
    key: "sk-test",
  },
  from: "API",
  defaultMode: "reasoning",
};

export const LOCAL_API_MODELS: APIModel[] = [
  {
    title: "RWKV Latest Local",
    name: "rwkv-latest:local",
    description: "For local debug",
    supportReasoning: true,
    reasoningName: "rwkv-latest:thinking:local",
    param: null,
    dataset: "v2.8",
    update: "2024/12/10",
    ctx: "4096",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 2048,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 2.0,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
    APIParam: {
      baseUrl: "http://127.0.0.1:8000/api/v1",
      key: "sk-test",
    },
    from: "API",
    defaultMode: "generate",
  },
  {
    title: "RWKV7 G1 1.5B 16% trained",
    name: "RWKV7-G1-1.5B-16%trained-20250308-ctx4k",
    description: "Local",
    supportReasoning: true,
    reasoningName: "RWKV7-G1-1.5B-16%trained-20250308-ctx4k:thinking",
    param: null,
    dataset: "v2.8",
    update: "2025/03/08",
    ctx: "4096",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 4096,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 2.0,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
    APIParam: {
      baseUrl: "http://127.0.0.1:8000/api/v1",
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
];

export const ONLINE_API_MODELS = [
  DEFAULT_API_MODEL,
  ...(import.meta.env.DEV ? LOCAL_API_MODELS : []),
];

export const DEFAULT_SYSTEM_PROMPT = `system: You are an AI assistant powered by the RWKV7 model, and you will communicate with users in markdown text format as per their requests. RWKV (pronounced RWaKuV) is an RNN that delivers performance on par with GPT-level large language models (LLMs) and can be trained directly like a GPT Transformer (parallelizable). RWKV combines the best features of RNNs and Transformers: excellent performance, constant memory usage, constant inference generation speed, "infinite" ctxlen, and free sentence embeddings, all while being 100% free of self-attention mechanisms.`;

export const ONLINE_RWKV_MODELS: RWKVModelWeb[] = [
  {
    title: "RWKV x070 World",
    name: "RWKV x070 World",
    description: "Web RWKV model by Cryscan",
    param: "0.1B",
    size: 382105168,
    dataset: "v2.8",
    ctx: "4096",
    update: "2024/12/10",
    fetchParams: [
      "https://api-model.rwkvos.com/download/RWKV-x070-World-0.1B-v2.8-20241210-ctx4096.st",
      {
        method: "GET",
        headers: {
          "x-api-key":
            "4s5aWqs2f4PzKfgLjuRZgXKvvmal5Z5iq0OzkTPwaA2axgNgSbayfQEX5FgOpTxyyeUM4gsFHHDZroaFDIE3NtSJD6evdz3lAVctyN026keeXMoJ7tmUy5zriMJHJ9aM",
        },
      },
    ],
    vocal_url: DEFAULT_VOCAB_URL,
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 2048,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 2.0,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
    supportReasoning: false,
    from: "Web",
    defaultMode: "generate",
  },
  {
    title: "RWKV x070 World",
    name: "RWKV x070 World",
    description: "Web RWKV model by Cryscan",
    size: 945815552,
    param: "0.4B",
    dataset: "v2.8",
    ctx: "4096",
    update: "2025/01/07",
    fetchParams: [
      "https://api-model.rwkvos.com/download/0.4B-20250107-ctx4096.st",
      {
        method: "GET",
        headers: {
          "x-api-key":
            "4s5aWqs2f4PzKfgLjuRZgXKvvmal5Z5iq0OzkTPwaA2axgNgSbayfQEX5FgOpTxyyeUM4gsFHHDZroaFDIE3NtSJD6evdz3lAVctyN026keeXMoJ7tmUy5zriMJHJ9aM",
        },
      },
    ],
    vocal_url: DEFAULT_VOCAB_URL,
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 2048,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
    supportReasoning: false,
    from: "Web",
    defaultMode: "generate",
  },
];

export const AVALIABLE_ONLINE_MODEL_LIST = [
  ...ONLINE_API_MODELS,
  ...(import.meta.env.VITE_ENABLE_WASM_ENDPOINT === "true"
    ? ONLINE_RWKV_MODELS
    : []),
];
