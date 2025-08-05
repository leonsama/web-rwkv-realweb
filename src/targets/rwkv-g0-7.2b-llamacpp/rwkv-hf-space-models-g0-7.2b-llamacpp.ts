import { APIModel } from "../../components/ModelConfigUI";
import {
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
} from "../../web-rwkv-wasm-port/web-rwkv";

import { t } from "@lingui/core/macro";

export const RWKV_G1_MODELS: APIModel[] = [
  {
    title: "RWKV7 G0 7.2B",
    name: "RWKV-v7-G0-7.2B",
    description: t`RWKV7 G0 7.2B deployed using llamacpp`,
    supportReasoning: true,
    reasoningName: "RWKV-v7-G0-7.2B-think",
    param: "2.9B",
    dataset: "v2.8",
    update: "2025/05/19",
    ctx: "4096",
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 4096,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 0.5,
        top_p: 0.3,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
    APIParam: {
      baseUrl: "https://mobius.sea-group.org/v1",
      key: "sk-test",
    },
    from: "API",
    defaultMode: "reasoning",
  },
];

export const AVALIABLE_HF_MODELS: APIModel[] = [...RWKV_G1_MODELS];

export const AVALIABLE_TEMP_HF_MODELS: APIModel[] = [];
