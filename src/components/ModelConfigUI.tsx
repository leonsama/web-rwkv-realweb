import React, { useRef, useState } from "react";
import {
  DEFAULT_SESSION_CONFIGURATION,
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
  SessionConfiguration,
  useWebRWKVChat,
} from "../web-rwkv-wasm-port/web-rwkv";
import { Button } from "./Button";
import { Card, CardTitle, Entry } from "./Cards";
import { ComponentLoadLevel } from "./popup/Popup.d";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { loadFile } from "../utils/loadModels";
import { getMaxZIndex } from "./popup/utils";
import { Id, toast } from "react-toastify";
import {
  useIndexedDBCache,
  useChatModelSession,
  useModelStorage,
} from "../store/ModelStorage";
import { Sampler } from "../web-rwkv-wasm-port/types";

import DEFAULT_VOVAL_URL from "../../assets/rwkv_vocab_v20230424.json?url";
import { createModalForm, Modal, USER_CANCEL_ERROR } from "./popup/Modals";
import {
  cn,
  CustomError,
  formatFileSize,
  promiseWithTimeout,
  TIMEOUT_ERROR,
} from "../utils/utils";
import { createContextMenu, Menu, MenuItem } from "./popup/ContentMenu";

export interface RWKVModelWeb {
  name: string;
  size: string;
  ctx: string;
  dataset: string;
  update: string;
  fetchParams: Parameters<typeof fetch>;
  vocal_url: string;
  defaultSessionConfiguration: SessionConfiguration;
}

// const DEFAULT_VOVAL_URL = "/assets/rwkv_vocab_v20230424.json";

const DEFAULT_SYSTEM_PROMPT = `system: You are an AI assistant powered by the RWKV7 model, and you will communicate with users in markdown text format as per their requests. RWKV (pronounced RWaKuV) is an RNN that delivers performance on par with GPT-level large language models (LLMs) and can be trained directly like a GPT Transformer (parallelizable). RWKV combines the best features of RNNs and Transformers: excellent performance, constant memory usage, constant inference generation speed, "infinite" ctxlen, and free sentence embeddings, all while being 100% free of self-attention mechanisms.`;

const ONLINE_RWKV_MODELS: RWKVModelWeb[] = [
  {
    name: "RWKV x070 World",
    size: "0.1B",
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
    vocal_url: DEFAULT_VOVAL_URL,
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 2048,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 2.0,
        top_p: 0.5,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
  },
  {
    name: "RWKV x070 World",
    size: "0.4B",
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
    vocal_url: DEFAULT_VOVAL_URL,
    defaultSessionConfiguration: {
      stopTokens: DEFAULT_STOP_TOKENS,
      stopWords: DEFAULT_STOP_WORDS,
      maxTokens: 2048,
      systemPrompt: null,
      defaultSamplerConfig: {
        temperature: 1.0,
        top_p: 0.5,
        presence_penalty: 0.5,
        count_penalty: 0.5,
        half_life: 200,
      },
    },
  },
];

export function useModelLoader() {
  const { createCacheItem, readCacheItem } = useIndexedDBCache((s) => s);
  const { setRecentModel, getRecentModel } = useModelStorage((s) => s);
  const { loadModel, defaultSessionConfiguration } = useWebRWKVChat(
    useChatModelSession((s) => s.llmModel),
  );
  const { setLoadingModelName } = useChatModelSession((s) => s);
  const modelLoadTaster = useRef<Id>(-1);

  const showError = async (error: Error) => {
    await createModalForm(
      <Card className="bg-white">
        <CardTitle className="bg-white">
          <span className="text-lg font-bold text-red-500">Error</span>
        </CardTitle>
        <Entry label="Name">{error.name}</Entry>
        <Entry label="Message">{error.message}</Entry>
        {error.stack && (
          <details>
            <summary>Stack</summary>
            <pre>{error.stack}</pre>
          </details>
        )}
        <div className="-mb-1 flex justify-end gap-2">
          <Button
            type="submit"
            className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
          >
            Close
          </Button>
        </div>
      </Card>,
      { closeOnBackgroundClick: true },
    )
      .open()
      .catch();
  };

  const shouldSaveModel = async () => {
    try {
      return (
        (
          await createModalForm<{ isCacheModel: string }>(
            <Card className="bg-white">
              <CardTitle className="bg-white">
                <span className="text-lg font-bold">Cache Model</span>
              </CardTitle>
              <div className="text-sm text-gray-600">
                <p>Cache model file in your browser storage?</p>
                <p className="text-gray-400">Default: Yes</p>
              </div>
              <div className="-mb-1 flex justify-end gap-2">
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
                  name="isCacheModel"
                  value={"No"}
                >
                  No
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
                  name="isCacheModel"
                  value={"Yes"}
                >
                  Yes
                </Button>
              </div>
            </Card>,
            { closeOnBackgroundClick: true },
          ).open()
        ).isCacheModel === "Yes"
      );
    } catch (error) {
      return true;
    }
  };

  const shouldOverwriteCacheWhenExisted = async (modelName: string) => {
    const checkCacheExist = getRecentModel({ name: modelName });
    if (checkCacheExist && checkCacheExist.cached) {
      const overwrite =
        (
          await createModalForm<{ overwriteExistingModel: string }>(
            <Card className="bg-white">
              <CardTitle className="bg-white">
                <span className="font-bold">Cache Model Existed</span>
              </CardTitle>
              <p>
                A model with the same filename exists in the cache. Overwrite
                the cache?
              </p>
              <details className="flex flex-col">
                <summary>Cached Model Details</summary>
                <Entry label="Filename">{checkCacheExist.name}</Entry>
                <Entry label="From">{checkCacheExist.from}</Entry>
                <Entry label="Size">
                  {formatFileSize(checkCacheExist.size)}
                </Entry>
                <Entry label="Last Loaded">
                  {new Date(
                    checkCacheExist.lastLoadedTimestamp,
                  ).toLocaleString()}
                </Entry>
              </details>
              <div className="-mb-1 flex justify-end gap-2">
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 text-red-500 active:scale-95"
                  name="overwriteExistingModel"
                  value={"Cancel"}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
                  name="overwriteExistingModel"
                  value={"Overwrite"}
                >
                  Overwrite
                </Button>
              </div>
            </Card>,
            { closeOnBackgroundClick: false },
          ).open()
        ).overwriteExistingModel === "Overwrite";
      if (!overwrite) throw Error("Should not overwrite.");
    }
  };

  const commonLoadHandler = async ({
    name,
    chunks,
    from,
    size,
    cacheItemKey,
    loadFromWebParam,
    defaultSessionConfiguration,
  }: {
    name: string;
    chunks: Uint8Array[];
    from: "web" | "device" | "URL";
    size: number;
    cacheItemKey: string | undefined;
    loadFromWebParam: RWKVModelWeb | undefined;
    defaultSessionConfiguration: SessionConfiguration;
  }) => {
    toast.update(modelLoadTaster.current, {
      progress: 0.99,
      render: "Loading Model",
    });

    setRecentModel({
      name,
      from,
      cached: !!cacheItemKey,
      cacheItemKey,
      size: size,
      defaultSessionConfiguration,
      vocal_url: DEFAULT_VOVAL_URL,
      loadFromWebParam: loadFromWebParam,
    });

    try {
      await promiseWithTimeout(
        loadModel(name, chunks, DEFAULT_VOVAL_URL, defaultSessionConfiguration),
        30 * 1000,
      );
    } catch (error) {
      toast.update(modelLoadTaster.current, {
        type: "error",
        render: "Load Model Failure",
        autoClose: 5000,
        isLoading: false,
      });
      if (error instanceof Error)
        if (error.name === TIMEOUT_ERROR) {
          await showError(
            new CustomError(
              "WASM Timemout",
              "Model loading failed, possibly due to memory constraints. Try using a smaller model.",
            ),
          );
        } else {
          await showError(error);
        }
    } finally {
      toast.done(modelLoadTaster.current);
      modelLoadTaster.current = -1;
    }
  };

  const fromDevice = async (file: File) => {
    setLoadingModelName(file.name);

    let isCacheModel = await shouldSaveModel();

    try {
      await shouldOverwriteCacheWhenExisted(file.name);
    } catch (error) {
      return;
    }

    const stream = file.stream();
    const reader = stream.getReader();
    let receivedLength = 0;
    let chunks: Uint8Array[] = [];
    let cacheItem = isCacheModel ? createCacheItem({ key: file.name }) : null;

    modelLoadTaster.current = toast.loading("Reading Model", { progress: 0 });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedLength += value.length;
      chunks.push(value);
      if (cacheItem?.isOpen()) {
        try {
          await cacheItem?.pushChunk(value);
        } catch (error) {
          cacheItem.cancel();
          console.error(error);
          showError(
            new CustomError(
              "Cache Failure",
              "Model cache failed, loading model directly.",
            ),
          );
        }
      }

      toast.update(modelLoadTaster.current, {
        progress: (receivedLength / file.size) * 0.9,
      });
    }

    await cacheItem?.close();
    await commonLoadHandler({
      name: file.name,
      chunks: chunks,
      from: "device",
      size: receivedLength,
      cacheItemKey: cacheItem?.isOpen() ? cacheItem?.key : undefined,
      defaultSessionConfiguration: DEFAULT_SESSION_CONFIGURATION,
      loadFromWebParam: undefined,
    });
    setLoadingModelName(null);
  };

  const fromWeb = async (
    model: RWKVModelWeb,
    name?: string,
    customUrl?: boolean,
  ) => {
    modelLoadTaster.current = toast.loading("Downloading Model");

    const modelName =
      name || `${model.name} ${model.size} ${model.dataset} CTX${model.ctx}`;
    console.log(name, modelName);
    setLoadingModelName(modelName);

    let isCacheModel = await shouldSaveModel();

    try {
      await shouldOverwriteCacheWhenExisted(modelName);
    } catch (error) {
      return;
    }

    let cacheItem = isCacheModel ? createCacheItem({ key: modelName }) : null;

    try {
      const response = await fetch(...model.fetchParams);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to read response body");

      const chunks: Uint8Array[] = [];

      let receivedLength = 0;
      const contentLength = parseInt(
        response.headers.get("Content-Length") || "0",
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedLength += value.length;
        chunks.push(value);

        if (cacheItem?.isOpen()) {
          try {
            await cacheItem?.pushChunk(value);
          } catch (error) {
            cacheItem.cancel();
            console.error(error);
            showError(
              new CustomError(
                "Cache Failure",
                "Model cache failed, loading model directly.",
              ),
            );
          }
        }

        toast.update(modelLoadTaster.current, {
          progress: contentLength
            ? (receivedLength / contentLength) * 0.9
            : undefined,
          render: (
            <div>
              <span>Downloading</span>
              {contentLength
                ? ` ${formatFileSize(receivedLength)}/${formatFileSize(contentLength)} ${((receivedLength / contentLength) * 100).toFixed(2)}%`
                : ""}
            </div>
          ),
        });
      }
      await cacheItem?.close();
      await commonLoadHandler({
        name: modelName,
        chunks: chunks,
        from: customUrl ? "URL" : "web",
        size: receivedLength,
        cacheItemKey: cacheItem?.isOpen() ? cacheItem?.key : undefined,
        defaultSessionConfiguration: model.defaultSessionConfiguration,
        loadFromWebParam: model,
      });
    } catch (error) {
      toast.update(modelLoadTaster.current, {
        type: "error",
        render: "Download failed",
        autoClose: 5000,
        isLoading: false,
      });
      await cacheItem?.cancel();
      if (error instanceof Error) await showError(error);
    } finally {
      setLoadingModelName(null);
      toast.done(modelLoadTaster.current);
      modelLoadTaster.current = -1;
    }
  };

  const fromCache = async (modelName: string) => {
    modelLoadTaster.current = toast.loading("Loading from Cache");
    setLoadingModelName(modelName);

    const { defaultSessionConfiguration, loadFromWebParam } = getRecentModel({
      name: modelName,
    })!;

    try {
      const chunks: Uint8Array[] = [];
      const generator = readCacheItem({ key: modelName });

      let chunkCount = 0;
      let receivedLength = 0;

      for await (const chunk of generator) {
        receivedLength += chunk.length;
        chunks.push(chunk);
        toast.update(modelLoadTaster.current, {
          progress: (1 - Math.exp((-1 * chunkCount) / 8)) * 0.9,
        });
      }

      await commonLoadHandler({
        name: modelName,
        chunks: chunks,
        from: "device",
        size: receivedLength,
        cacheItemKey: modelName,
        defaultSessionConfiguration: defaultSessionConfiguration,
        loadFromWebParam: loadFromWebParam || undefined,
      });
    } catch (error) {
      toast.update(modelLoadTaster.current, {
        type: "error",
        render: "Cache load failed",
      });
      throw error;
    } finally {
      setLoadingModelName(null);
    }
  };

  return { fromDevice, fromWeb, fromCache };
}

export function ModelLoaderCard({
  close,
  className,
  enterTabValue,
  ...prop
}: {
  close?: () => void;
  activeTab?: string;
  className?: string;
  enterTabValue?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const { recentModels, deleteRecentModel } = useModelStorage((s) => s);
  const { fromDevice, fromWeb, fromCache } = useModelLoader();
  const { loadingModelName, llmModel } = useChatModelSession((s) => s);
  const { currentModelName } = useWebRWKVChat(llmModel);

  const [activeTab, setActiveTab] = useState(enterTabValue || "recent");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const shouldLoadFromWeb = createModalForm<{ shoudLoadFromWeb: string }>(
    <Card className="bg-white">
      <CardTitle className="bg-white">
        <span className="text-lg font-bold">Load file from the web?</span>
      </CardTitle>
      <div className="text-sm text-gray-600">
        <p>This model is not cached; load from the web?</p>
        <p className="text-gray-400">Default: No</p>
      </div>
      <div className="-mb-1 flex justify-end gap-2">
        <Button
          type="submit"
          className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
          name="shoudLoadFromWeb"
          value={"No"}
        >
          No
        </Button>
        <Button
          type="submit"
          className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
          name="shoudLoadFromWeb"
          value={"Yes"}
        >
          Yes
        </Button>
      </div>
    </Card>,
  );

  const inputCustomUrl = createModalForm<{
    modelName: string;
    modelUrl: string;
    fetchOptions: string;
    vocalUrl: string;
  }>(
    ({ close }) => {
      return (
        <Card className="bg-white">
          <CardTitle className="bg-white">
            <span className="text-lg font-bold">Custom URL</span>
          </CardTitle>
          <Entry
            label={
              <span>
                URL<span className="text-red-500">*</span>
              </span>
            }
          >
            <input name="modelUrl" className="rounded-lg border p-2"></input>
          </Entry>
          <Entry label={"Name"}>
            <input
              name="modelName"
              className="rounded-lg border p-2"
              placeholder="Default: Model URL"
            ></input>
          </Entry>
          <details>
            <summary>Advance</summary>
            <div className="flex flex-col gap-4">
              <Entry
                label={
                  <a
                    href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit"
                    target="_blank"
                    className="text-sm underline"
                  >
                    Fetch Options
                  </a>
                }
              >
                <textarea
                  name="fetchOptions"
                  className="rounded-lg border p-2"
                  defaultValue={"{}"}
                ></textarea>
              </Entry>
              <Entry label="Vocal URL">
                <input
                  defaultValue={DEFAULT_VOVAL_URL}
                  className="rounded-lg border p-2"
                  name="vocalUrl"
                ></input>
              </Entry>
            </div>
          </details>
          <div className="-mb-1 flex justify-end gap-2">
            <Button
              type="submit"
              className="cursor-pointer rounded-xl bg-transparent px-4 py-2 active:scale-95"
              name="shoudLoadFromWeb"
              value={"No"}
              onClick={(e) => {
                e.preventDefault();
                close();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
              name="shoudLoadFromWeb"
              value={"Yes"}
            >
              Load
            </Button>
          </div>
        </Card>
      );
    },
    { closeOnBackgroundClick: true },
  );

  const loadModelFromCustomUrl = async () => {
    try {
      const { modelUrl, modelName, fetchOptions, vocalUrl } =
        await inputCustomUrl.open();
      if (modelUrl === "")
        throw new CustomError(
          "Invalid parameter",
          "Model Url can not be empty.",
        );
      if (fetchOptions === "")
        throw new CustomError(
          "Invalid parameter",
          "Fetch Options can not be empty.",
        );
      if (vocalUrl === "")
        throw new CustomError(
          "Invalid parameter",
          "Vocal Url can not be empty.",
        );
      const customFileParame: RWKVModelWeb = {
        name: modelName === "" ? modelUrl : modelName,
        size: "-",
        dataset: "-",
        ctx: "-",
        update: "-",
        fetchParams: [modelUrl, { ...JSON.parse(fetchOptions) }],
        vocal_url: vocalUrl,
        defaultSessionConfiguration: DEFAULT_SESSION_CONFIGURATION,
      };
      fromWeb(customFileParame, modelName, true);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === USER_CANCEL_ERROR) return;
        createModalForm(
          <Card className="bg-white">
            <CardTitle className="bg-white">
              <span className="text-lg font-bold">Error</span>
            </CardTitle>
            <Entry label="Name">{error.name}</Entry>
            <Entry label="Message">{error.message}</Entry>
            <div className="-mb-1 flex justify-end gap-2">
              <Button
                type="submit"
                className="cursor-pointer rounded-xl bg-transparent px-4 py-2 font-semibold active:scale-95"
              >
                Close
              </Button>
            </div>
          </Card>,
          { closeOnBackgroundClick: true },
        )
          .open()
          .catch(() => {});
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    close?.();
    await fromDevice(file);
  };

  const handelFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files.length !== 1) {
      toast.error("Single file only");
      return;
    } else if (!e.dataTransfer.files[0].name.endsWith(".st")) {
      toast.error(".st file only");
      return;
    }
    close?.();
    fromDevice(e.dataTransfer.files[0]);
  };

  const RecordManagement = createContextMenu(
    <Menu>
      <MenuItem
        className={"text-red-500"}
        onTrigger={(data) => {
          deleteRecentModel({ name: data });
        }}
      >
        Delete
      </MenuItem>
    </Menu>,
  );

  return (
    <Card
      {...prop}
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5"
        >
          <path
            fillRule="evenodd"
            d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm5.25-9.25a.75.75 0 0 0-1.5 0v4.59l-1.95-2.1a.75.75 0 1 0-1.1 1.02l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V7.75Z"
            clipRule="evenodd"
          />
        </svg>
      }
      title={
        <>
          <span>Load Model</span>
          <div className="flex-1"></div>
          {close && (
            <Button className="rounded-full p-2" onClick={() => close()}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </Button>
          )}
        </>
      }
      className="w-full bg-slate-100 md:w-2/3 md:max-w-2xl"
    >
      <Entry>
        <div className="flex flex-1 flex-col gap-5">
          <Tabs
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={(v) => setActiveTab(v)}
          >
            <TabsList className={"h-10 flex-shrink-0 gap-1 bg-slate-200 p-1"}>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="web">Web</TabsTrigger>
              <TabsTrigger value="device">Device</TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              {recentModels.length === 0 ? (
                <div className="flex h-80 flex-col items-center justify-center">
                  <svg
                    className="icon"
                    viewBox="0 0 1024 1024"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    p-id="13472"
                    width="48"
                    height="48"
                  >
                    <path
                      d="M164.00295914 892.56024086l-0.99867527-0.02202151c-5.77293763-0.18718279-35.78054194-2.11406452-55.77166452-20.85436559-20.49761721-19.22367311-22.94420645-46.86396559-23.22608172-52.21409032a27.02589247 27.02589247 0 0 1-0.03963871-1.51067526v-150.53901076c-0.2983914-6.20125592-0.69918279-27.15031398 6.32017205-50.41603441 6.72536774-22.30778495 15.03408172-36.9531871 17.41350537-40.90494624l75.57670538-133.70577204c0.37766882-0.67055484 0.77735914-1.31908818 1.20567742-1.9500043 2.35630108-3.49591398 15.02417205-21.4907871 32.39363441-32.29784086 18.27674839-11.38181505 40.39845161-12.26157419 46.74615053-12.2615742h477.39540645c0.6144 0 1.22219355 0.01761721 1.84980646 0.05725592 4.74563441 0.30389677 29.38769892 2.38382795 48.45832258 13.29328172 18.20958279 10.42938495 32.86709677 28.65438279 35.61868387 32.19544086a29.72903226 29.72903226 0 0 1 1.57233548 2.24949678l89.760757 142.2336c0.38317419 0.62651182 0.77185376 1.28055053 1.12199569 1.95110537 1.71987957 3.30322581 10.59234408 20.75747097 15.08583226 37.73164732 4.43733334 16.7936 5.5075785 35.35332473 5.67053763 38.89878709l0.02312258 1.2111828v150.56103225c0.10129892 7.96077419-1.36423226 35.28065376-24.02656343 55.5811785-21.46215914 19.21266237-50.35437419 20.70021505-58.69832259 20.70021505H164.00295914z m-7.68990967-285.95144946c-1.6516129 2.93656774-6.78812903 12.65135484-11.10654624 26.96423226-4.56065376 15.13097634-4.01892473 29.27538924-3.94625376 30.84221935a43.49247311 43.49247311 0 0 1 0.07377203 2.03588817v150.51588817l0.05615484 0.41620646c0.35564731 2.70644301 2.00726021 9.26334624 4.85464087 12.22193548l0.38317419 0.40739785 0.45144086 0.33142365c3.98589247 2.93766882 13.86253763 4.62341505 17.31220645 4.83151829l693.10816344 0.01101074c5.75091613-0.06716559 15.80263226-1.98413763 20.35778064-6.06582364 4.07507957-3.65336774 4.98787097-9.92178924 4.98787097-10.92486883l-0.05505376-1.74190107v-149.86735484c-0.31050323-5.84670968-1.44350968-17.49938924-3.7888-26.32670968-2.65579355-10.08584947-8.5971957-22.16794839-9.76433548-24.47910537l-0.32151399-0.56375054-88.0860215-139.59542366-0.27526882-0.33252472c-3.33846021-4.02002581-11.34327742-12.61171613-17.73612042-16.27609463-5.53620645-3.16779355-16.81121721-5.19707527-22.61828818-5.73880431l-0.60228817-0.02862795h-475.87372043c-4.45384947 0.03963871-12.72843011 1.21778924-16.55136344 3.60822366-5.38425806 3.35497634-11.75948387 11.02176344-14.38114409 14.60135913l-0.22572043 0.31050323-75.103243 132.86455054-0.81149248 1.36423226 0.01101075-0.03413334c-0.0220215 0.06716559-0.34904086 0.64853334-0.34904085 0.64853334z m353.02014623-252.79146667a28.71714408 28.71714408 0 0 1-28.68851613-28.68301075V160.12276989a28.71714408 28.71714408 0 0 1 28.67750538-28.68301075 28.72264947 28.72264947 0 0 1 28.6940215 28.68301075v165.00934193a28.71163871 28.71163871 0 0 1-28.68301075 28.68301076z m192.31821075-1.08786236a28.72264947 28.72264947 0 0 1-28.68301075-28.68961721 28.75127742 28.75127742 0 0 1 6.40825806-18.06864516l65.57123442-80.86957419a28.59382366 28.59382366 0 0 1 22.30778493-10.62097205c6.62847311 0 12.86936774 2.21536344 18.03341076 6.40385377a28.44738065 28.44738065 0 0 1 10.46902366 19.30295053 28.4627957 28.4627957 0 0 1-6.24089463 21.04485162l-65.56903225 80.87067527a28.4804129 28.4804129 0 0 1-22.25273118 10.62097204h-0.04404302z m-381.41137204-2.19334194a28.48591828 28.48591828 0 0 1-22.40908388-10.80154838l-64.45914838-80.86406882a28.71714408 28.71714408 0 0 1 4.54964301-40.31366882 28.37911398 28.37911398 0 0 1 17.85944086-6.25741075c8.79428818 0 16.97417634 3.93964731 22.44872258 10.80705376l64.46465377 80.86296774a28.71163871 28.71163871 0 0 1-4.53753119 40.30926452 28.79091613 28.79091613 0 0 1-17.87045161 6.25741075h-0.04624516z"
                      fill="currentcolor"
                      p-id="13473"
                      data-spm-anchor-id="a313x.search_index.0.i0.34973a81p7rWUS"
                      className="selected"
                    ></path>
                    <path
                      d="M510.42766452 774.5447914c-63.9064086 0-119.43143226-42.84504086-135.01384947-104.17603441l-1.25632687-4.94382796-254.74257205-0.15194838a28.74577205 28.74577205 0 0 1-28.68301076-28.70613334 28.71714408 28.71714408 0 0 1 28.68301076-28.672l280.51103656 0.17947527a28.74026666 28.74026666 0 0 1 28.6675957 28.6940215c0 45.08903226 35.94460215 80.40271828 81.83411613 80.40271829 45.72545376 0 81.54563441-35.31258495 81.5456344-80.40161721a28.75678279 28.75678279 0 0 1 28.68301076-28.69512258l277.9136-0.17507097c15.82355269 0 28.68301076 12.84844731 28.6940215 28.66098925s-12.84734624 28.69512258-28.66098924 28.71824516l-252.16495484 0.15194839-1.25742796 4.94382796c-15.5648 61.32989247-70.97090753 104.17052903-134.75289462 104.17052903z"
                      fill="currentcolor"
                      p-id="13474"
                      data-spm-anchor-id="a313x.search_index.0.i2.34973a81p7rWUS"
                      className="selected"
                    ></path>
                  </svg>
                  <span>No Recent Models</span>
                  <span className="text-sm text-gray-500">
                    Load Models from{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("web");
                      }}
                      className="font-semibold text-gray-700 underline"
                    >
                      Web
                    </a>{" "}
                    or{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("device");
                      }}
                      className="font-semibold text-gray-700 underline"
                    >
                      Your Device
                    </a>
                    .
                  </span>
                </div>
              ) : (
                <div className="flex h-80 flex-col overflow-auto">
                  <table className="w-full table-auto text-nowrap text-left text-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>From</th>
                        <th>Cache</th>
                        <th>Size</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentModels
                        .sort((a, b) =>
                          a.lastLoadedTimestamp < b.lastLoadedTimestamp
                            ? 1
                            : -1,
                        )
                        .map((v, k) => {
                          return (
                            <tr key={v.name}>
                              <td>
                                <div className={"text-fadeout text-nowrap"}>
                                  {v.name}
                                </div>
                              </td>
                              <td>
                                {v.from.slice(0, 1).toUpperCase() +
                                  v.from.slice(1)}
                              </td>
                              <td>
                                {v.cached && (
                                  <span className="rounded-3xl border border-green-700 p-0.5 text-xs text-green-700">
                                    Cached
                                  </span>
                                )}
                              </td>
                              <td className={cn(!v.cached && "text-gray-500")}>
                                {v.size ? formatFileSize(v.size) : ""}
                              </td>
                              <td className="flex justify-end gap-1">
                                <Button
                                  className={cn(
                                    "rounded-xl p-1 px-2 font-medium",
                                    loadingModelName === v.name &&
                                      "pointer-events-none bg-transparent",
                                    currentModelName === v.name &&
                                      "pointer-events-none bg-transparent font-semibold",
                                    v.from === "device" &&
                                      v.cached === false &&
                                      "invisible",
                                  )}
                                  onClick={async () => {
                                    if (
                                      currentModelName === v.name ||
                                      (v.from === "device" &&
                                        v.cached === false)
                                    )
                                      return;
                                    if (v.cached) {
                                      fromCache(v.name);
                                    } else {
                                      try {
                                        const { shoudLoadFromWeb } =
                                          await shouldLoadFromWeb.open();
                                        if (shoudLoadFromWeb === "Yes") {
                                          fromWeb(v.loadFromWebParam!);
                                        }
                                      } catch (error) {
                                        return;
                                      }
                                    }
                                    close!();
                                  }}
                                >
                                  {loadingModelName === v.name
                                    ? "Loading"
                                    : currentModelName === v.name
                                      ? "Loaded"
                                      : "Load"}
                                </Button>

                                <RecordManagement.ContextMenuTrigger
                                  click={true}
                                  data={v.name}
                                  position="bottom right"
                                >
                                  <span>
                                    <Button className="bg-transparent p-1.5">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-5"
                                      >
                                        <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                      </svg>
                                    </Button>
                                  </span>
                                </RecordManagement.ContextMenuTrigger>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="web">
              <div className="flex h-80 flex-col overflow-auto">
                <table className="w-full table-auto text-left text-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Dataset</th>
                      <th>CTX</th>
                      <th>Released</th>
                      <th className="text-center">Operation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ONLINE_RWKV_MODELS].map((v, k) => {
                      return (
                        <tr key={k}>
                          <td>{v.name}</td>
                          <td>{v.size}</td>
                          <td>{v.dataset}</td>
                          <td>{v.ctx}</td>
                          <td>{v.update}</td>
                          <td className="text-center">
                            <Button onClick={() => fromWeb(v)}>Load</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-center">
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      loadModelFromCustomUrl();
                    }}
                    className="text-sm font-semibold text-gray-500 underline"
                  >
                    Loading a model using a custom URL
                  </a>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="device">
              <div
                className={cn(
                  "flex h-80 cursor-pointer flex-col items-center justify-center rounded-lg bg-white transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-white/50",
                  isDragOver &&
                    "scale-[1.03] border border-green-500 bg-green-200",
                )}
                onClick={() => {
                  inputRef.current?.click();
                }}
                onDragEnter={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragOver={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  setIsDragOver(false);
                  handelFileDrop(e);
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDragOver(false);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-10"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.638 1.093a.75.75 0 0 1 .724 0l2 1.104a.75.75 0 1 1-.724 1.313L10 2.607l-1.638.903a.75.75 0 1 1-.724-1.313l2-1.104ZM5.403 4.287a.75.75 0 0 1-.295 1.019l-.805.444.805.444a.75.75 0 0 1-.724 1.314L3.5 7.02v.73a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .388-.657l1.996-1.1a.75.75 0 0 1 1.019.294Zm9.194 0a.75.75 0 0 1 1.02-.295l1.995 1.101A.75.75 0 0 1 18 5.75v2a.75.75 0 0 1-1.5 0v-.73l-.884.488a.75.75 0 1 1-.724-1.314l.806-.444-.806-.444a.75.75 0 0 1-.295-1.02ZM7.343 8.284a.75.75 0 0 1 1.02-.294L10 8.893l1.638-.903a.75.75 0 1 1 .724 1.313l-1.612.89v1.557a.75.75 0 0 1-1.5 0v-1.557l-1.612-.89a.75.75 0 0 1-.295-1.019ZM2.75 11.5a.75.75 0 0 1 .75.75v1.557l1.608.887a.75.75 0 0 1-.724 1.314l-1.996-1.101A.75.75 0 0 1 2 14.25v-2a.75.75 0 0 1 .75-.75Zm14.5 0a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-.388.657l-1.996 1.1a.75.75 0 1 1-.724-1.313l1.608-.887V12.25a.75.75 0 0 1 .75-.75Zm-7.25 4a.75.75 0 0 1 .75.75v.73l.888-.49a.75.75 0 0 1 .724 1.313l-2 1.104a.75.75 0 0 1-.724 0l-2-1.104a.75.75 0 1 1 .724-1.313l.888.49v-.73a.75.75 0 0 1 .75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Select / Drop to load a .st model file</span>
              </div>
              <input
                className="hidden"
                ref={inputRef}
                type="file"
                onChange={handleFileChange}
              ></input>
            </TabsContent>
          </Tabs>
        </div>
      </Entry>
    </Card>
  );
}
