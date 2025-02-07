import { useEffect, useRef, useState } from "react";
import { useWebRWKVChat } from "../web-rwkv-wasm-port/web-rwkv";
import { loadFile } from "../utils/loadModels";
import { cn, formatFileSize } from "../utils/utils";
import { RadioGroup, RadioGroupOption } from "../components/RadioGroup";
import { Modal } from "../components/popup/Modals";
import { ComponentLoadLevel } from "../components/popup/Popup.d";
import {
  createContextMenu,
  Menu,
  MenuItem,
} from "../components/popup/ContentMenu";
import { Card, Entry } from "../components/Cards";
import { ModelLoaderCard } from "../components/ModelConfigUI";
import {
  useChatModelSession,
  useIndexedDBCache,
  useModelStorage,
} from "../store/ModelStorage";
import { useChatSessionStore } from "../store/ChatSessionStorage";

export default function Settings() {
  const webRWKVLLMInfer = useChatModelSession((s) => s.llmModel);
  const { currentModelName, unloadModel } = useWebRWKVChat(webRWKVLLMInfer);

  const { getTotalCacheSize, clearCache } = useIndexedDBCache((s) => s);
  const [totalCacheSize, setTotalCacheSize] = useState<number>(-1);

  const clearAllSession = useChatSessionStore((state) => state.clearAllSession);

  const { recentModels, deleteRecentModel } = useModelStorage((s) => s);

  const LanguageMenu = createContextMenu(
    <Menu>
      <MenuItem>中文</MenuItem>
      <MenuItem>English</MenuItem>
    </Menu>,
  );
  const ClearAllConversationsConfirmMenu = createContextMenu(
    <Menu>
      <MenuItem
        className={"text-red-500"}
        onTrigger={() => {
          clearAllSession();
        }}
      >
        确认删除
      </MenuItem>
    </Menu>,
  );

  const clearAllCache = async () => {
    recentModels.forEach((v) => {
      deleteRecentModel({ name: v.name, deleteCacheOnly: true });
    });
    await clearCache();
    setTotalCacheSize(await getTotalCacheSize());
  };

  useEffect(() => {
    (async () => {
      setTotalCacheSize(await getTotalCacheSize());
    })();
  }, [recentModels]);
  return (
    <div className="flex h-full w-full flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-2 pb-24 md:px-4 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex w-full max-w-screen-md flex-col gap-4 px-2 motion-translate-y-in-[20%] motion-opacity-in-[0%] motion-duration-[0.4s] md:gap-8">
          <h1 className="py-2 pb-8 pl-4 text-5xl">Settings</h1>
          <Card
            title="Language Model"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
              >
                <path d="M10.362 1.093a.75.75 0 0 0-.724 0L2.523 5.018 10 9.143l7.477-4.125-7.115-3.925ZM18 6.443l-7.25 4v8.25l6.862-3.786A.75.75 0 0 0 18 14.25V6.443ZM9.25 18.693v-8.25l-7.25-4v7.807a.75.75 0 0 0 .388.657l6.862 3.786Z" />
              </svg>
            }
          >
            <Entry label="Loaded model">
              {currentModelName || "No model loaded"}
              {currentModelName && (
                <Button
                  onClick={() => {
                    unloadModel();
                  }}
                >
                  Unload
                </Button>
              )}
            </Entry>
            <Modal
              modal={({ close }) => {
                return <ModelLoaderCard close={close}></ModelLoaderCard>;
              }}
            >
              <div className="-mb-1 flex min-h-10 cursor-pointer items-center justify-start gap-2 rounded-xl bg-[image:var(--web-rwkv-title-gradient)] px-2 font-bold text-white transition-all active:scale-[0.98] md:active:scale-[0.98]">
                <div className="flex-1">Click To Load Chat Model</div>
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Modal>
          </Card>
          <Card
            title="Appearance"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
              >
                <path d="M16.555 5.412a8.028 8.028 0 0 0-3.503-2.81 14.899 14.899 0 0 1 1.663 4.472 8.547 8.547 0 0 0 1.84-1.662ZM13.326 7.825a13.43 13.43 0 0 0-2.413-5.773 8.087 8.087 0 0 0-1.826 0 13.43 13.43 0 0 0-2.413 5.773A8.473 8.473 0 0 0 10 8.5c1.18 0 2.304-.24 3.326-.675ZM6.514 9.376A9.98 9.98 0 0 0 10 10c1.226 0 2.4-.22 3.486-.624a13.54 13.54 0 0 1-.351 3.759A13.54 13.54 0 0 1 10 13.5c-1.079 0-2.128-.127-3.134-.366a13.538 13.538 0 0 1-.352-3.758ZM5.285 7.074a14.9 14.9 0 0 1 1.663-4.471 8.028 8.028 0 0 0-3.503 2.81c.529.638 1.149 1.199 1.84 1.66ZM17.334 6.798a7.973 7.973 0 0 1 .614 4.115 13.47 13.47 0 0 1-3.178 1.72 15.093 15.093 0 0 0 .174-3.939 10.043 10.043 0 0 0 2.39-1.896ZM2.666 6.798a10.042 10.042 0 0 0 2.39 1.896 15.196 15.196 0 0 0 .174 3.94 13.472 13.472 0 0 1-3.178-1.72 7.973 7.973 0 0 1 .615-4.115ZM10 15c.898 0 1.778-.079 2.633-.23a13.473 13.473 0 0 1-1.72 3.178 8.099 8.099 0 0 1-1.826 0 13.47 13.47 0 0 1-1.72-3.178c.855.151 1.735.23 2.633.23ZM14.357 14.357a14.912 14.912 0 0 1-1.305 3.04 8.027 8.027 0 0 0 4.345-4.345c-.953.542-1.971.981-3.04 1.305ZM6.948 17.397a8.027 8.027 0 0 1-4.345-4.345c.953.542 1.971.981 3.04 1.305a14.912 14.912 0 0 0 1.305 3.04Z" />
              </svg>
            }
          >
            <Entry label="Language">
              <LanguageMenu.ContextMenuTrigger
                click={true}
                position="bottom right"
              >
                <span>English</span>
              </LanguageMenu.ContextMenuTrigger>
            </Entry>
            <Entry label="Theme">
              <RadioGroup
                className="-m-2 h-10 gap-1 bg-slate-200 p-1"
                value={"auto"}
                onChange={(value) => {
                  console.log(value);
                }}
              >
                <RadioGroupOption value={"light"}>Light</RadioGroupOption>
                <RadioGroupOption value={"dark"}>Dark</RadioGroupOption>
                <RadioGroupOption value={"auto"}>Auto</RadioGroupOption>
              </RadioGroup>
            </Entry>
          </Card>
          <Card
            title="Data"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                />
              </svg>
            }
          >
            <Entry label="Clear all conversations">
              <ClearAllConversationsConfirmMenu.ContextMenuTrigger
                click={true}
                position={"bottom right"}
              >
                {/* <span> */}
                <Button className="text-red-500">Clear</Button>
                {/* </span> */}
              </ClearAllConversationsConfirmMenu.ContextMenuTrigger>
            </Entry>
            <Entry label="Cache size">
              <Button
                onClick={async () => {
                  setTotalCacheSize(await getTotalCacheSize());
                }}
              >
                {totalCacheSize < 0 ? "Check" : formatFileSize(totalCacheSize)}
              </Button>
            </Entry>
            <Entry label="Clear Cache">
              <Button className="text-red-500" onClick={clearAllCache}>
                Clear
              </Button>
            </Entry>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Button({
  className,
  ...prop
}: { className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-lg bg-slate-200 px-4 py-2 transition-all hover:bg-slate-300 active:scale-90",
        className,
      )}
      {...prop}
    ></button>
  );
}
