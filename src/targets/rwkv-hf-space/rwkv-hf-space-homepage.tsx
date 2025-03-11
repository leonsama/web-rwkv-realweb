import { createRef, useEffect, useState } from "react";
import { cn, isEnterIndex } from "../../utils/utils";
import {
  RecentModel,
  useChatModelSession,
  useModelStorage,
} from "../../store/ModelStorage";
import {
  DEFAULT_STOP_TOKENS,
  DEFAULT_STOP_WORDS,
  useWebRWKVChat,
} from "../../web-rwkv-wasm-port/web-rwkv";
import {
  APIModel,
  ModelLoaderCard,
  useModelLoader,
} from "../../components/ModelConfigUI";
import { createModalForm, Modal } from "../../components/popup/Modals";
import { Card, CardTitle, Entry } from "../../components/Cards";
import { Button } from "../../components/Button";
import { RadioGroup, RadioGroupOption } from "../../components/RadioGroup";
import { Flipped, Flipper } from "react-flip-toolkit";
import { usePageStorage } from "../../store/PageStorage";
import { useLocation, useNavigate } from "react-router";
import { RWKVMarkdown } from "../../components/MarkdownRender";
import { AVALIABLE_HF_MODELS } from "./rwkv-hf-space-models";

export function RWKVHfSpaceHomePage({
  ref = createRef<HTMLDivElement>(),
  ...prop
}: {
  ref?: React.RefObject<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { showLargeBanner, setShowLargeBanner } = usePageStorage((s) => s);
  const navigate = useNavigate();
  const location = useLocation();

  const { llmModel, loadingModelTitle } = useChatModelSession((s) => s);
  const { selectedModelTitle, defaultSessionConfiguration } =
    useWebRWKVChat(llmModel);

  const { fromAPI } = useModelLoader();

  const [showUI, setShowUI] = useState(true);
  useEffect(() => {
    if (location.pathname.includes("chat")) {
      setShowUI(false);
    }
  }, [location]);

  //   useEffect(() => {
  //     console.log(selectedModelTitle);
  //   }, [selectedModelTitle]);

  return (
    <div
      className="relative flex h-full w-full flex-1 flex-shrink-0 flex-col items-center overflow-auto px-2 md:px-4"
      style={{ scrollbarGutter: "stable" }}
      onScroll={(e) => {
        if (showLargeBanner !== (e.target as HTMLDivElement).scrollTop < 10)
          setShowLargeBanner(!showLargeBanner);
      }}
    >
      <div className="flex w-full max-w-screen-md flex-1 flex-col gap-4">
        <h1
          className={cn(
            "mt-40 select-none text-4xl font-medium text-slate-300 min-[345px]:mt-28 sm:text-6xl xl:mt-36 xl:text-7xl",
            showUI
              ? "motion-translate-y-in-75 motion-opacity-in-0"
              : "motion-translate-y-out-75 motion-opacity-out-0",
            isEnterIndex() &&
              "motion-preset-fade motion-duration-1000 motion-delay-700",
          )}
        >
          RNN-Inspired Large Language Model
        </h1>
        <div className={cn("flex flex-1 flex-col pt-4")}>
          <div className="grid gap-2 lg:gap-5">
            <Card
              title="Chat with RWKV"
              className={cn(
                "transition-all",
                isEnterIndex()
                  ? "motion-delay-[1000ms]"
                  : showUI && "motion-delay-[300ms]",
                showUI
                  ? "motion-translate-y-in-[80px] motion-opacity-in-0 motion-duration-[800ms]"
                  : "motion-opacity-out-0 motion-duration-300 motion-delay-0",
              )}
              icon={
                <svg
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                  fill="currentColor"
                >
                  <path
                    d="M208.256908 478.135376c0 0 40.640454-40.945475 73.560965-40.277333 0 0 13.776794-2.185986 22.724085 6.56522 8.925504 8.751206 6.732255 30.11722-14.401362 57.089816-21.126355 26.972596-58.113816 101.281589-54.293787 112.959546 0 0 30.175319-65.32539 195.707461-176.694468 165.524879-111.37634 245.244369-203.347518 292.239433-279.97322 0 0-44.947064 98.086128-74.592227 127.716766 0 0 34.728851-33.726638 62.326014-73.560965 0 0-48.019064 105.246865-165.532142 196.18678 0 0 172.678355-112.40034 280.982695-332.095546 0 0-9.18695 66.422014-37.800851 101.16539 0 0 48.019064-41.904113 71.527489-176.774355 0 0 7.153475 84.81044-25.549163 144.071716 0 0 19.419688-27.589901 29.637901-85.827177 0 0 2.040738 94.004652-75.616227 198.227518 0 0 24.525163-23.493901 53.131801-84.81044 0 0-21.460426 103.206128-110.35234 178.822355 0 0 99.102865-79.704965 147.136454-218.671206 0 0 1.031262 62.333277-35.760113 119.553816 0 0 18.388426-16.347688 39.848851-83.78644 0 0-11.23495 87.889702-79.704965 170.644879 0 0 34.728851-28.606638 69.472227-109.335603 0 0-10.726582 41.127035-26.841872 68.00522 0 0 11.910355-9.593645 19.00573-28.984284 0 0-9.985816 37.241645-28.018383 63.350014 0 0 19.194553-16.129816 40.495206-73.713475 0 0-12.810894 72.892823-72.195631 143.011404 0 0 9.964028-4.219461 31.802099-35.636652 0 0-41.373957 100.77322-173.193986 198.096794 0 0 78.927887-28.345191 196.194043-209.215546 0 0-36.784113 85.83444-64.374014 108.057418 0 0 54.402723-52.877617 86.596993-139.481872 0 0-19.920794 78.172596-48.280511 110.359603 0 0 10.741106 0 30.669163-41.388482 0 0-42.158298 112.661787-127.21566 175.503433 0 0 48.265986-26.827348 101.913418-103.467574 0 0-29.884823 55.179801-53.647433 76.632965 0 0 9.964028-4.597106 39.086298-39.079035 0 0-55.419461 115.595801-350.985078 296.582355-52.913929 32.397617-145.61861 127.222922-93.503546 229.898894 0 0-114.339404-16.870582-173.201248-114.956709-13.776794-22.985532-114.397504-148.937532 3.072-344.84834 8.279149-13.798582 24.416227-41.729816 33.806525-54.816681 5.635631-7.843404 20.893957-25.171518 7.807092-37.837163C240.24783 464.097135 206.927887 478.258837 208.256908 478.135376z"
                    p-id="14136"
                  ></path>
                </svg>
              }
            >
              {AVALIABLE_HF_MODELS.map((v, k) => {
                return (
                  <div
                    className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-2 dark:bg-zinc-700"
                    key={k}
                  >
                    <div
                      className={
                        "text-fadeout flex w-full overflow-auto text-nowrap pt-2 text-xl font-semibold"
                      }
                    >
                      <span className="w-0 flex-1">{v.title}</span>
                    </div>
                    <div>
                      {v.description ? (
                        <span>{v.description}</span>
                      ) : (
                        <span className="text-gray-500">No description.</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                        {v.supportReasoning && (
                          <div>
                            <span
                              className={cn(
                                "border-g flex items-center rounded-3xl border border-yellow-600 p-0.5 text-xs text-yellow-600",
                              )}
                            >
                              Reasoning
                            </span>
                          </div>
                        )}
                        {v.from === "API" && (
                          <div>
                            <span
                              className={cn(
                                "border-g flex items-center rounded-3xl border border-purple-600 p-0.5 text-xs text-purple-600",
                              )}
                            >
                              Online
                            </span>
                          </div>
                        )}
                        {v.param && (
                          <div>
                            <span
                              className={cn(
                                "border-g flex items-center rounded-3xl border border-blue-600 p-0.5 text-xs text-blue-600",
                              )}
                            >
                              {v.param}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          className={cn(
                            "h-8 rounded-xl p-1 px-4 font-medium transition-[background-color] dark:bg-zinc-600",
                            loadingModelTitle === v.title &&
                              "pointer-events-none bg-transparent px-2",
                            [v.title, v.name, v.reasoningName].includes(
                              selectedModelTitle,
                            ) &&
                              "pointer-events-none bg-transparent px-0.5 text-sm font-semibold hover:bg-white/0 dark:bg-transparent",
                          )}
                          onClick={() => {
                            fromAPI(v);
                          }}
                        >
                          {loadingModelTitle === v.title
                            ? "Loading"
                            : [v.title, v.name, v.reasoningName].includes(
                                  selectedModelTitle,
                                )
                              ? "Selected"
                              : "Use"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Entry className="block">
                {/* <RecentModelsCard
                  APIModels={AVALIABLE_HF_MODELS}
                  showUI={showUI}
                ></RecentModelsCard> */}
                <h1 className="mb-2 mt-3 text-2xl font-semibold">About RWKV</h1>
                <p className="my-4 text-base/7">
                  RWKV (pronounced RwaKuv) is an RNN with great LLM performance
                  and parallelizable like a Transformer. We are at RWKV7-G1
                  "GooseOne" reasoning model.
                </p>
              </Entry>
            </Card>
          </div>
        </div>
        <div className="h-5"></div>
      </div>
      <div className="pointer-events-none sticky bottom-0 -mt-6 min-h-6 w-full bg-white [mask-image:linear-gradient(180deg,#0000,#ffff)] dark:bg-zinc-900 md:-mt-8 md:h-8"></div>
    </div>
  );
}
