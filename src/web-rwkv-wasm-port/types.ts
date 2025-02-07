export interface TensorInfo {
  shape: Uint32Array;
  data_offsets: [number, number];
}

export interface Sampler {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  count_penalty: number;
  half_life: number;
}

export interface Options {
  max_len: number;
  prompt: string;
  stop_tokens: number[];
  stop_words:string[];
  temperature: number;
  top_p: number;
  presence_penalty: number;
  count_penalty: number;
  penalty_decay: number;
  vocab: string;
  stream:boolean;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: {
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
      role?: string;
      refusal?: string | null;
    };
    logprobs: {
      content: Array<{
        token: string;
        logprob: number;
        bytes: Array<number> | null;
        top_logprobs: Array<{
          token: string;
          logprob: number;
          bytes: Array<number> | null;
        }>;
      }> | null;
      refusal: Array<{
        token: string;
        logprob: number;
        bytes: Array<number> | null;
      }> | null;
    } | null;
    finish_reason: string | null;
    index: number;
  }>;
  created: number;
  model: string;
  service_tier?: string | null;
  system_fingerprint: string;
  object: "chat.completion.chunk";
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  } | null;
}

export interface ChatCompletion {
  id: string;
  choices: Array<{
    finish_reason: string;
    index: number;
    message: {
      content: string | null;
      refusal: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
      role: string;
      function_call?: {
        name: string;
        arguments: string;
      };
      audio?: {
        id: string;
        expires_at: number;
        data: string;
        transcript: string;
      } | null;
    };
    logprobs?: {
      content: Array<{
        token: string;
        logprob: number;
        bytes: Array<number> | null;
        top_logprobs: Array<{
          token: string;
          logprob: number;
          bytes: Array<number> | null;
        }>;
      }> | null;
      refusal: Array<{
        token: string;
        logprob: number;
        bytes: Array<number> | null;
      }> | null;
    } | null;
  }>;
  created: number;
  model: string;
  service_tier?: string | null;
  system_fingerprint: string;
  object: "chat.completion";
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens_details?: {
      accepted_prediction_tokens: number;
      audio_tokens: number;
      reasoning_tokens: number;
      rejected_prediction_tokens: number;
    };
    prompt_tokens_details?: {
      audio_tokens: number;
      cached_tokens: number;
    };
  };
}
