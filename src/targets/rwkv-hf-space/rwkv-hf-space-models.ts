import { APIModel } from "../../components/ModelConfigUI";
import {
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
} from "../../web-rwkv-wasm-port/web-rwkv";

import { t } from "@lingui/core/macro";

export const RWKV_G1_MODELS: APIModel[] = [
  {
    title: "RWKV7 G1d 2.9B",
    name: "rwkv7-g1d-2.9b-20260131-ctx8192",
    description: t`A tiny but impressive multilingual reasoning model with only 2.9B parameters.`,
    supportReasoning: true,
    reasoningName: "rwkv7-g1d-2.9b-20260131-ctx8192:thinking",
    param: "2.9B",
    dataset: "c",
    update: "2026/01/31",
    ctx: "8192",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 8192,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
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
    title: "RWKV7 G1d 1.5B",
    name: "rwkv7-g1d-1.5b-20260212-ctx8192",
    description: t`A tiny but impressive multilingual reasoning model with only 1.5B parameters.`,
    supportReasoning: true,
    reasoningName: "rwkv7-g1d-1.5b-20260212-ctx8192:thinking",
    param: "1.5B",
    dataset: "a3",
    update: "2026/02/12",
    ctx: "8192",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 8192,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
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
    title: "RWKV7 G1d 0.4B",
    name: "rwkv7-g1d-0.4b-20260210-ctx8192",
    description: t`A tiny but impressive multilingual reasoning model with only 0.4B parameters.`,
    supportReasoning: true,
    reasoningName: "rwkv7-g1d-0.4b-20260210-ctx8192:thinking",
    param: "0.4B",
    dataset: "v2.8",
    update: "2026/02/10",
    ctx: "8192",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 8192,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
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
    title: "RWKV7 G1d 0.1B",
    name: "rwkv7-g1d-0.1b-20260129-ctx8192",
    description: t`A tiny but impressive multilingual reasoning model with only 0.1B parameters.`,
    supportReasoning: true,
    reasoningName: "rwkv7-g1d-0.1b-20260129-ctx8192:thinking",
    param: "0.1B",
    dataset: "v2.8",
    update: "2026/01/29",
    ctx: "8192",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 4096,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
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

export const AVALIABLE_TEMP_HF_MODELS: APIModel[] = [];
