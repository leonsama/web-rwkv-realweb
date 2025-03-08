import { create } from "zustand";
import {
  APIInferPort,
  InferPortInterface,
  SessionConfiguration,
} from "../web-rwkv-wasm-port/web-rwkv";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

import * as idb from "idb-keyval";
import { CustomError, dangerousUUIDV4 } from "../utils/utils";
import {
  APIModel,
  RWKVModelWeb,
} from "../components/ModelConfigUI";

interface ModelSession<T extends InferPortInterface = InferPortInterface> {
  llmModel: T;
  loadingModelName: null | string;
  setLoadingModelName: (name: null | string) => void;
  setLlmModel: (inferPort: T) => void;
}

export const useChatModelSession = create<ModelSession>()((set, get) => {
  return {
    loadingModelName: null,
    // llmModel: new WebRWKVInferPort(),
    llmModel: new APIInferPort(),
    setLoadingModelName(name) {
      set({ ...get(), loadingModelName: name });
    },
    setLlmModel(inferPort) {
      set({ ...get(), llmModel: inferPort });
    },
  };
});

// ====================== previous model storage interface ======================

interface RecentModel_V0 {
  name: string;
  lastLoadedTimestamp: number;
  from: "web" | "device" | "URL";
  size: number;
  cached: boolean;
  cacheItemKey: string | null;
  loadFromWebParam: RWKVModelWeb | null;
  vocal_url: string;
  vocalCacheItemKey: string | null;
  defaultSessionConfiguration: SessionConfiguration;
}

interface ModelStorage_V0 {
  recentModels: RecentModel_V0[];

  setRecentModel: ({
    name,
    from,
    cached,
    vocal_url,
    loadFromWebParam,
    size,
    cacheItemKey,
    vocalCacheItemKey,
    defaultSessionConfiguration,
  }: {
    name: string;
    from: "web" | "device" | "URL";
    vocal_url: string;
    vocalCacheItemKey?: string;
    cached: boolean;
    size: number;
    defaultSessionConfiguration: SessionConfiguration;
    loadFromWebParam?: RWKVModelWeb;
    cacheItemKey?: string;
  }) => Promise<void>;
  getRecentModel: ({ name }: { name: string }) => RecentModel | undefined;
  deleteRecentModel: ({
    name,
    deleteCacheOnly,
  }: {
    name: string;
    deleteCacheOnly?: boolean;
  }) => Promise<void>;
}

// ==============================================================================

interface RecentModel {
  name: string;
  description: string | null;
  supportReasoning: boolean;
  reasoningName: string | null;
  lastLoadedTimestamp: number;
  from: "web" | "device" | "URL" | "API";
  size: number;
  param: string | null;
  cached: boolean;
  cacheItemKey: string | null;
  loadFromWebParam: RWKVModelWeb | null;
  loadFromAPIModel: APIModel | null;
  vocal_url: string;
  vocalCacheItemKey: string | null;
  defaultSessionConfiguration: SessionConfiguration;
}

interface ModelStorage {
  recentModels: RecentModel[];

  setRecentModel: ({
    name,
    from,
    cached,
    vocal_url,
    loadFromWebParam,
    loadFromAPIModel,
    size,
    cacheItemKey,
    vocalCacheItemKey,
    defaultSessionConfiguration,
    reasoningName,
    supportReasoning,
    param,
    description,
  }: {
    name: string;
    from: "web" | "device" | "URL" | "API";
    vocal_url: string;
    vocalCacheItemKey?: string;
    cached: boolean;
    size: number;
    defaultSessionConfiguration: SessionConfiguration;
    loadFromWebParam?: RWKVModelWeb;
    loadFromAPIModel?: APIModel;
    cacheItemKey?: string;
    reasoningName?: string;
    supportReasoning?: boolean;
    param?: string;
    description?: string | null;
  }) => Promise<void>;
  getRecentModel: ({ name }: { name: string }) => RecentModel | undefined;
  deleteRecentModel: ({
    name,
    deleteCacheOnly,
  }: {
    name: string;
    deleteCacheOnly?: boolean;
  }) => Promise<void>;
}

export const useModelStorage = create<ModelStorage>()(
  persist(
    (set, get) => {
      return {
        recentModels: [],

        async setRecentModel({
          name,
          from,
          cached,
          vocal_url,
          vocalCacheItemKey,
          loadFromWebParam,
          loadFromAPIModel,
          size,
          cacheItemKey,
          defaultSessionConfiguration,
          reasoningName,
          supportReasoning,
          param,
          description,
        }) {
          set((prev) => ({
            ...prev,
            recentModels: [
              ...prev.recentModels.filter((v) => v.name !== name),
              {
                name,
                from,
                cached: cached,
                cacheItemKey: cacheItemKey || null,
                loadFromWebParam: loadFromWebParam || null,
                loadFromAPIModel: loadFromAPIModel || null,
                size: size,
                lastLoadedTimestamp: Date.now(),
                defaultSessionConfiguration,
                vocal_url,
                vocalCacheItemKey: vocalCacheItemKey || null,
                reasoningName: reasoningName || null,
                supportReasoning: supportReasoning || false,
                param: param || null,
                description: description || null,
              },
            ],
          }));
        },

        getRecentModel({ name }) {
          return get().recentModels.find((v) => v.name === name);
        },
        async deleteRecentModel({ name, deleteCacheOnly = false }) {
          const recentModel = get().getRecentModel({ name });
          if (!recentModel) {
            return; // Model not found, nothing to delete in recent models
          }

          await useIndexedDBCache
            .getState()
            .deleteCacheItem({ key: recentModel.cacheItemKey! });

          if (deleteCacheOnly) {
            set((prev) => ({
              ...prev,
              recentModels: prev.recentModels.map((v) =>
                v.name === recentModel.name
                  ? { ...v, cached: false, cacheItemKey: null }
                  : v,
              ),
            }));
          } else {
            set((prev) => ({
              ...prev,
              recentModels: prev.recentModels.filter((v) => v.name !== name),
            }));
          }
        },
      };
    },
    {
      name: "webrwkv-model-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ recentModels: state.recentModels }),
      version: 1,
      migrate(persistedState, version) {
        let currentVersion = version;
        if (currentVersion === 0) {
          // Add API storage
          (persistedState as ModelStorage).recentModels = (
            persistedState as ModelStorage_V0
          ).recentModels.map((v) => ({
            ...v,
            loadFromAPIModel: null,
            reasoningName: null,
            supportReasoning: false,
            param: null,
            description: null,
          }));
          currentVersion = 1;
        }
        return persistedState;
      },
    },
  ),
);

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await idb.get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idb.set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idb.del(name);
  },
};

export const CACHE_ERROR = "CacheError";

interface FileCacheItem {
  key: string;
  chunkBaseName: string;
  totalSize: number;
  chunkCount: number;
  timestamp: number;
}

interface IndexedDBCache {
  cacheItem: { [key: string]: FileCacheItem };
  createCacheItem: ({ key }: { key: string }) => {
    pushChunk: (chunk: Uint8Array) => Promise<void>;
    close: () => Promise<void>;
    key: string;
    withOpen: <T>(
      callback: ({
        pushChunk,
        close,
      }: {
        pushChunk: (chunk: Uint8Array) => Promise<void>;
        close: () => Promise<void>;
      }) => Promise<T> | T,
    ) => Promise<T>;
    cancel: () => Promise<void>;
    isOpen: () => boolean;
  };
  readCacheItem: ({
    key,
  }: {
    key: string;
  }) => AsyncGenerator<Uint8Array, void, void>;
  deleteCacheItem: ({ key }: { key: string }) => Promise<void>;
  getTotalCacheSize: () => Promise<number>;
  clearCache: () => Promise<void>;
}

export const useIndexedDBCache = create<IndexedDBCache>()(
  persist(
    (set, get) => {
      return {
        cacheItem: {},
        createCacheItem({ key }) {
          // 若 cacheItem 含有 key，则调用 deleteCacheItem 删除已存在的缓存
          if (get().cacheItem[key]) {
            get().deleteCacheItem({ key });
          }

          const chunkBaseName = dangerousUUIDV4();
          const CHUNK_SIZE = 1024 * 1024 * 20; // 20MB 每块
          let chunkCount = 0;
          let totalLength = 0;
          let buffer = new Uint8Array(); // 缓冲区
          let open = true;

          const pushChunk = async (chunk: Uint8Array) => {
            // 将新的 chunk 添加到缓冲区
            if (!open) throw new CustomError(CACHE_ERROR, "Cache item closed");
            const newBuffer = new Uint8Array(buffer.length + chunk.length);
            newBuffer.set(buffer, 0);
            newBuffer.set(chunk, buffer.length);
            buffer = newBuffer;

            // 当缓冲区大小超过 CHUNK_SIZE 时，分割 chunk 并存储
            while (buffer.length >= CHUNK_SIZE) {
              const currentChunk = buffer.slice(0, CHUNK_SIZE);
              buffer = buffer.slice(CHUNK_SIZE); // 更新缓冲区，移除已处理的 chunk

              const blob = new Blob([currentChunk]);
              const chunkKey = `idbcache-${chunkBaseName}-${chunkCount}`;
              await idb.set(chunkKey, blob); // 使用 idb-keyval 存储 Blob

              totalLength += currentChunk.length;
              chunkCount++;
            }
          };

          const close = async () => {
            // 处理缓冲区中剩余的数据
            if (!open) throw new CustomError(CACHE_ERROR, "Cache item closed");
            open = false;
            if (buffer.length > 0) {
              const blob = new Blob([buffer]);
              const chunkKey = `idbcache-${chunkBaseName}-${chunkCount}`;
              await idb.set(chunkKey, blob); // 存储剩余的 Blob
              totalLength += buffer.length;
              chunkCount++;
            }

            // 创建 FileCacheItem
            const fileCacheItem: FileCacheItem = {
              key,
              chunkBaseName,
              totalSize: totalLength,
              chunkCount,
              timestamp: Date.now(),
            };

            // 更新 Zustand store 中的 cacheItem
            set({ cacheItem: { ...get().cacheItem, [key]: fileCacheItem } });
          };

          const withOpen = async <T>(
            callback: ({
              pushChunk,
              close,
            }: {
              pushChunk: (chunk: Uint8Array) => Promise<void>;
              close: () => Promise<void>;
            }) => Promise<T> | T,
          ): Promise<T> => {
            try {
              return await callback({ pushChunk, close });
            } finally {
              await close();
            }
          };

          const cancel = async () => {
            if (!open) throw new CustomError(CACHE_ERROR, "Cache item closed");
            open = false;
            const allKeys = await idb.keys();
            const cacheKeys = allKeys.filter(
              (k) =>
                typeof k === "string" &&
                k.startsWith(`idbcache-${chunkBaseName}`),
            ) as string[];
            await idb.delMany(cacheKeys);
          };

          return {
            pushChunk,
            close,
            cancel,
            key,
            withOpen,
            isOpen: () => open,
          };
        },

        async *readCacheItem({ key }) {
          const cacheItem = get().cacheItem[key];
          if (!cacheItem) {
            throw new Error(`Cache model with key "${key}" not found`);
          }

          const { chunkBaseName, chunkCount } = cacheItem;

          for (let i = 0; i < chunkCount; i++) {
            const chunkKey = `idbcache-${chunkBaseName}-${i}`;
            const blob = await idb.get(chunkKey);
            if (blob instanceof Blob) {
              const arrayBuffer = await blob.arrayBuffer();
              const uint8ArrayChunk = new Uint8Array(arrayBuffer);
              yield uint8ArrayChunk; // 使用 yield 返回 Uint8Array chunk
            } else {
              throw new Error(`Chunk ${chunkKey} is not a Blob or not found`); // 理论上不应该发生
            }
          }
        },

        async deleteCacheItem({ key }) {
          const cacheItem = get().cacheItem[key];
          if (!cacheItem) {
            return; // 如果 cacheItem 不存在，则直接返回，无需删除
          }

          const { chunkBaseName, chunkCount } = cacheItem;
          const chunkKeys: string[] = [];
          for (let i = 0; i < chunkCount; i++) {
            chunkKeys.push(`idbcache-${chunkBaseName}-${i}`);
          }

          await idb.delMany(chunkKeys); // 使用 idb.delMany 批量删除 chunk

          // 从 Zustand store 中删除 cacheItem
          const updatedCacheItem = { ...get().cacheItem };
          delete updatedCacheItem[key];
          set({ cacheItem: updatedCacheItem });
        },
        async getTotalCacheSize() {
          // 方法1: 基于现有元数据的快速计算（可能不完整）
          const metaSize = Object.values(get().cacheItem).reduce(
            (sum, item) => sum + item.totalSize,
            0,
          );

          // 方法2: 遍历IndexedDB所有idbcache开头的key进行精确计算
          const allKeys = await idb.keys();
          const cacheKeys = allKeys.filter(
            (k) => typeof k === "string" && k.startsWith("idbcache-"),
          ) as string[];

          let actualSize = 0;
          for (const key of cacheKeys) {
            const blob = await idb.get(key);
            if (blob instanceof Blob) {
              actualSize += blob.size;
            }
          }

          // 返回两者较大值（应对元数据与实际情况不一致的场景）
          return Math.max(metaSize, actualSize);
        },

        async clearCache() {
          // 删除所有idbcache前缀的key
          const allKeys = await idb.keys();
          const cacheKeys = allKeys.filter(
            (k) => typeof k === "string" && k.startsWith("idbcache-"),
          ) as string[];

          await idb.delMany(cacheKeys);

          // 清空状态中的缓存项
          set({ cacheItem: {} });
        },
      };
    },
    {
      name: "idb-cache-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
