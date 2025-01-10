import { useRef } from "react";
import { useWebRWKVChat } from "../web-rwkv-wasm-port/web-rwkv";
import { loadFile } from "../utils/loadModels";

export default function Settings() {
  const webrwkvchat = useWebRWKVChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      return;
    }

    console.log("fileObj is", fileObj);
    event.target.value = "";

    const chunks = await loadFile(fileObj, (e) => {
      console.log(e);
    });
    await webrwkvchat.loadModel(fileObj.name, chunks);
  };
  return (
    <div className="w-full h-full flex flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex-1 overflow-auto flex flex-col items-center flex-shrink-0 px-4 pb-24 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="w-full max-w-screen-md">
          <h1 className="text-5xl font-bold">Settings</h1>
          <h2 className="text-2xl font-bold">Models</h2>
          <p>
            {webrwkvchat.currentModel || "No model loaded"}
            {webrwkvchat.currentModel && (
              <button
                onClick={() => {
                  webrwkvchat.unloadModel();
                }}
              >
                Unload
              </button>
            )}
          </p>
          <div
            className="rounded-lg outline-dashed p-20"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Click to load model
          </div>
          <input
            className="hidden"
            ref={inputRef}
            type="file"
            onChange={fileChange}
          ></input>
        </div>
      </div>
    </div>
  );
}
