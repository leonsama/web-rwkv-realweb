import { APIModel } from "../../components/ModelConfigUI";
import {
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
} from "../../web-rwkv-wasm-port/web-rwkv";

import { t } from "@lingui/core/macro";

export const RWKV_G1_MODELS: APIModel[] = [
  {
    title: "RWKV7 G1 0.4B",
    name: "rwkv7-g1-0.4b-20250324-ctx4096",
    description: t`A tiny but impressive reasoning model with only 0.4B parameters.`,
    supportReasoning: true,
    reasoningName: "rwkv7-g1-0.4b-20250324-ctx4096:thinking",
    param: "0.4B",
    dataset: "v2.8",
    update: "2025/03/24",
    ctx: "4096",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 8192,
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
      baseUrl: import.meta.env.VITE_API_MODEL_BASE_URL,
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
  {
    title: "RWKV7 G1 0.1B",
    name: "rwkv7-g1-0.1b-20250307-ctx4096",
    description: t`A tiny but impressive reasoning model with only 0.1B parameters. `,
    supportReasoning: true,
    reasoningName: "rwkv7-g1-0.1b-20250307-ctx4096:thinking",
    param: "0.1B",
    dataset: "v2.8",
    update: "2025/03/07",
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
      baseUrl: import.meta.env.VITE_API_MODEL_BASE_URL,
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
];

export const AVALIABLE_HF_MODELS: APIModel[] = [...RWKV_G1_MODELS];

export const AVALIABLE_TEMP_HF_MODELS: APIModel[] = [
  {
    title: "RWKV7 G1 2.9B 59%",
    name: "RWKV7-G1-2.9B-59%trained-20250424-ctx4k",
    description: t`RWKV G1 2.9B has shown promising potential in the early stages of training.`,
    supportReasoning: true,
    reasoningName: "RWKV7-G1-2.9B-59%trained-20250424-ctx4k:thinking",
    param: "2.9B",
    dataset: "v2.8",
    update: "2025/04/24",
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
      baseUrl: import.meta.env.VITE_API_MODEL_BASE_URL,
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
  {
    title: "RWKV7 G1 1.5B 80%",
    name: "RWKV7-G1-1.5B-80%trained-20250419-ctx4k",
    description: t`RWKV7 G1 1.5B shows amazing performance early in training.`,
    supportReasoning: true,
    reasoningName: "RWKV7-G1-1.5B-80%trained-20250419-ctx4k:thinking",
    param: "1.5B",
    dataset: "v2.8",
    update: "2025/04/19",
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
      baseUrl: import.meta.env.VITE_API_MODEL_BASE_URL,
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
];
