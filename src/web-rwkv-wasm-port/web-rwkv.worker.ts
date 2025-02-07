import { Comlink } from "./comlink-helper";

import wasm_bindgen from "web-rwkv-wasm";

import wasmFileUrl from "web-rwkv-wasm/web_rwkv_wasm_bg.wasm?url";

wasm_bindgen(wasmFileUrl);

import {
  Session,
  SessionType,
  NucleusSampler,
  SimpleSampler,
  Tensor,
  TensorReader,
  Tokenizer,
} from "web-rwkv-wasm";

import { TensorInfo, Options } from "./types";
import { dangerousUUIDV4, lock } from "./utils";

const config = {
  session_type: SessionType.Chat,
};

function getUint64(
  dataview: DataView,
  byteOffset: number,
  littleEndian?: boolean,
) {
  // split 64-bit number into two 32-bit (4-byte) parts
  const left = dataview.getUint32(byteOffset, littleEndian);
  const right = dataview.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  const combined = littleEndian
    ? left + 2 ** 32 * right
    : 2 ** 32 * left + right;

  if (!Number.isSafeInteger(combined))
    console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");

  return combined;
}

async function initReader(blob: Blob) {
  console.log(`📌 Model data size: ${blob.size}`);

  if (blob.size < 8) {
    throw "header too small";
  }

  const n = getUint64(
    new DataView(await blob.slice(0, 8).arrayBuffer()),
    0,
    true,
  );
  if (n > 100000000) {
    throw "header too large";
  }
  if (n > blob.size) {
    throw "invalid header len";
  }

  const str = new TextDecoder().decode(
    new Uint8Array(await blob.slice(8, n + 8).arrayBuffer()),
  );
  const metadata = JSON.parse(str);

  let tensors = new Array();
  for (const name in metadata) {
    if (name !== "__metadata__") {
      const info: TensorInfo = metadata[name];
      const start = 8 + n + info.data_offsets[0];
      const end = 8 + n + info.data_offsets[1];
      const tensor = new Tensor(
        name,
        info.shape,
        await blob.slice(start, end).arrayBuffer(),
      );
      tensors.push(tensor);
    }
  }

  return new TensorReader(tensors);
}

async function initTokenizer(url: string) {
  if (_tokenizers.has(url)) return _tokenizers.get(url)!;

  // await wasm_bindgen("web_rwkv_puzzles_bg.wasm");

  console.log("Attempting to load tokenizer from:", url);
  const req = await fetch(url);
  if (!req.ok) {
    console.error(`Failed to load tokenizer: ${req.status} ${req.statusText}`);
    throw new Error(`Failed to load tokenizer from ${url}`);
  }
  const vocab = await req.text();
  console.log(`📌 Tokenizer length:`, vocab.length);

  const tokenizer = new Tokenizer(vocab);
  _tokenizers.set(url, tokenizer);
  return tokenizer;
}

async function initSession(blob: Blob) {
  // await wasm_bindgen("web_rwkv_puzzles_bg.wasm");

  // var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
  // var bin = await req.arrayBuffer();
  // console.log("model: ", bin.byteLength);

  const reader = await initReader(blob);
  // @HaloWang: 修改这里的参数
  console.log(`📌 Loading Session`);
  let session;
  try {
    session = await new Session(reader, 0, 0, config.session_type);
  } catch (error) {
    session = null;
    console.log("Catch");
    throw error;
  }
  console.log("✅ Runtime loaded");
  return session;
}

async function* pipeline(
  session: Session,
  tokens: Uint16Array,
  sampler: SimpleSampler | NucleusSampler,
  stop_tokens: number[],
  max_len: number,
) {
  const info = session.info();
  let output = new Float32Array(info.num_vocab);
  let probs = new Float32Array(info.num_vocab);

  const state = new Float32Array(session.state_len());
  const cutoff = session.checkout(tokens, state, output);
  session.load(state);

  console.log(`📌 State cache checkout: ${cutoff}/${tokens.length}`);
  let history = Array.from(tokens.slice(0, cutoff));
  tokens = tokens.slice(cutoff);

  for (var i = 0; i < max_len; ++i) {
    if (tokens.length > 0) {
      await session.run(tokens, output);
    }

    history = history.concat(Array.from(tokens));

    switch (session.session_type()) {
      case SessionType.Puzzle:
        probs = output;
        break;
      case SessionType.Chat:
      case SessionType.Music:
        sampler.transform(output);
        await session.softmax(output, probs);
        break;
    }

    const token = sampler.sample(probs);
    tokens = new Uint16Array([token]);
    sampler.update(tokens);

    yield token, output;

    if (stop_tokens.includes(token)) {
      break;
    }
  }

  if (history.length > 0) {
    await session.back(state);
    session.cache(new Uint16Array(history), state, output);
    console.log(`📌 State cache check-in: ${history.length}`);
  }
}

var _session: undefined | Promise<Session> = undefined;
var _tokenizers: Map<string, Tokenizer> = new Map();

async function abort(window: Window) {
  if ((await _session) === undefined) return;

  const session = await _session!;
  session.clear_cache();
}

async function load(data: Uint8Array[]) {
  console.log("🔄 Loading model");
  console.log(`📌 Session type: ${config.session_type}`);
  let blob = new Blob(data);
  _session = initSession(blob);
  try {
    await _session;
  } catch (error) {
    _session = undefined;
    throw error;
  }
  return;
}

// this.addEventListener(
//   "message",
//   async function (e: MessageEvent<Uint8Array[] | String>) {
//     // Load model
//     if (e.data instanceof Array) {
//       load(e.data, this);
//       return;
//     }
//     if (typeof e.data === "string") {
//       const options = JSON.parse(e.data);
//       const task = options.task;
//       switch (task) {
//         case "puzzle":
//         case "chat":
//         case "music":
//           run(e.data, this);
//           break;
//         case "set_session_type":
//           switch (options.type) {
//             case "puzzle":
//               config.session_type = SessionType.Puzzle;
//               break;
//             case "chat":
//               config.session_type = SessionType.Chat;
//               break;
//             case "music":
//               config.session_type = SessionType.Music;
//               break;
//           }
//           break;
//         case "replay":
//           replay(e.data, this);
//           break;
//         case "abort":
//           console.log("🔴 Abort received");
//           abort(this.window);
//           break;
//         case "info":
//           console.log("✅ Info received");
//           info(this);
//           break;
//         default:
//           console.warn(`🤔 Invalid task: ${task}`);
//       }
//     }
//   },
//   false
// );

export class WEB_RWKV_WASM_PORT {
  private originConsoleLog: typeof console.log | null = null;
  async load(model: Array<Uint8Array>) {
    await load(model);
  }
  async *run(options: Options, signal?: AbortSignal) {
    if ((await _session) === undefined) throw new Error("Model not loaded.");

    const {
      max_len,
      prompt,
      stop_tokens,
      stop_words,
      temperature,
      top_p,
      presence_penalty,
      count_penalty,
      penalty_decay,
      vocab,
      stream,
    } = options;

    const tokenizer = await initTokenizer(vocab);
    const session = await _session!;
    const info = session.info();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let sampler: SimpleSampler | NucleusSampler;
    switch (session.session_type()) {
      case SessionType.Chat:
      case SessionType.Music:
        sampler = new NucleusSampler(
          info,
          temperature,
          top_p,
          presence_penalty,
          count_penalty,
          penalty_decay,
        );
        break;
      case SessionType.Puzzle:
        sampler = new SimpleSampler(info);
        break;
    }

    console.log(prompt);
    let tokens = tokenizer.encode(encoder.encode(prompt));

    const release = await lock.acquire("generate");

    const p = pipeline(session, tokens, sampler, stop_tokens, max_len);

    let result = "";
    for await (const token of p) {
      if (signal?.aborted) break;
      const word = decoder.decode(tokenizer.decode(new Uint16Array([token])));
      result += word;

      if (stop_words.some((stop_word: string) => result.includes(stop_word)))
        break;

      if (stream) yield { type: "token", word, token };
    }

    if (!stream)
      yield {
        type: "completion",
        word: decoder.decode(tokenizer.decode(new Uint16Array(tokens))),
        tokens: tokens,
      };

    release();

    const state = new Float32Array(session.state_len());
    await session.back(state);

    // const visual = JSON.parse(new StateVisual(info, state).json());
    // window.postMessage({
    //   type: "state",
    //   state: new Float32Array(state),
    //   visual,
    // });

    // window.postMessage({ type: "generation_complete" });
  }
  async info() {
    if ((await _session) === undefined) throw new Error("Model not loaded.");

    const session = await _session!;
    return session.info();
  }

  release() {
    self.close();
  }

  // console cb
  async setConsoleLogCallback(cb: (...data: any[]) => void) {
    if (!this.originConsoleLog) this.originConsoleLog = globalThis.console.log;
    globalThis.console.log = (...data: any[]) => {
      cb(...data);
      this.originConsoleLog!(...data);
    };
  }
}

Comlink.expose(WEB_RWKV_WASM_PORT);
