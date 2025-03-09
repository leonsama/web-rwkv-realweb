import { useNavigate } from "react-router";
import { ChatTextarea } from "../components/ChatTextarea";
import { usePageStorage } from "../store/PageStorage";
import { useEffect, useState } from "react";
import { cn, isEnterIndex } from "../utils/utils";
import { Card, CardTitle } from "../components/Cards";
import { useChatSessionStore } from "../store/ChatSessionStorage";
import { createModalForm, Modal } from "../components/popup/Modals";
import { ModelLoaderCard, useModelLoader } from "../components/ModelConfigUI";
import {
  RecentModel,
  useChatModelSession,
  useModelStorage,
} from "../store/ModelStorage";
import { Button } from "../components/Button";
import { useWebRWKVChat } from "../web-rwkv-wasm-port/web-rwkv";
import { RadioGroup, RadioGroupOption } from "../components/RadioGroup";
import { Flipped, Flipper } from "../components/Flipper";

function RecentModelsCard({
  recentModels,
  showUI,
}: {
  recentModels: RecentModel[];
  showUI: boolean;
}) {
  const [showCachedOnly, setShowCachedOnly] = useState(true);

  const { llmModel, loadingModelName } = useChatModelSession((s) => s);
  const { currentModelName, defaultSessionConfiguration } =
    useWebRWKVChat(llmModel);

  const { fromCache, fromWeb, fromAPI } = useModelLoader();

  const [renderList, setRenderList] = useState(
    recentModels
      .sort((a, b) => (a.lastLoadedTimestamp < b.lastLoadedTimestamp ? 1 : -1))
      .filter((v) =>
        showCachedOnly ? v.from === "API" || v.cached === true : true,
      ),
  );

  useEffect(() => {
    setRenderList(
      recentModels
        .sort((a, b) =>
          a.lastLoadedTimestamp < b.lastLoadedTimestamp ? 1 : -1,
        )
        .filter((v) =>
          showCachedOnly ? v.from === "API" || v.cached === true : true,
        ),
    );
  }, [recentModels, showCachedOnly]);

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

  return (
    <Card
      title={
        <>
          <span>Recent Models</span>
          <RadioGroup
            value={"cached"}
            className="ml-auto h-8 gap-0 bg-slate-200 p-1 text-sm text-gray-600 dark:text-zinc-300"
            onChange={(value) => setShowCachedOnly(value === "cached")}
          >
            <RadioGroupOption value={"all"}>All</RadioGroupOption>
            <RadioGroupOption value={"cached"}>Available</RadioGroupOption>
          </RadioGroup>
        </>
      }
      className={cn(
        "md:col-span-2 lg:col-span-1 lg:row-span-2",
        isEnterIndex()
          ? "motion-delay-[850ms]"
          : showUI && "motion-delay-[200ms]",
        showUI
          ? "motion-translate-y-in-[80px] motion-opacity-in-0 motion-duration-[800ms]"
          : "motion-opacity-out-0 motion-duration-300 motion-delay-0",
      )}
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
      <div className="flex flex-1 flex-shrink-0 flex-col gap-0">
        {renderList.length === 0 ? (
          <div className="-mt-2 flex flex-col items-center justify-center px-1 py-2 max-md:h-28 md:flex-1">
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
          </div>
        ) : (
          <div className="-mt-2 flex w-full flex-col gap-1 overflow-auto px-1 py-2 [mask-image:linear-gradient(0deg,_#0000_0px_,#ffff_8px,_#ffff_calc(100%_-_8px),_#0000_100%)] max-md:h-28 md:flex-1">
            <Flipper flipKey={renderList.map((v) => v.name)}>
              {renderList.map((v) => {
                return (
                  <Flipped key={v.name}>
                    <div className="flex items-center gap-1">
                      <div className="text-fadeout flex w-full flex-1 items-center overflow-hidden text-nowrap">
                        <span className="w-0">{v.name}</span>
                      </div>
                      {v.supportReasoning && (
                        <div>
                          <span
                            className={cn(
                              "border-g rounded-3xl border border-yellow-600 p-0.5 text-xs text-yellow-600",
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
                              "border-g rounded-3xl border border-purple-600 p-0.5 text-xs text-purple-600",
                            )}
                          >
                            Online
                          </span>
                        </div>
                      )}
                      {v.cached && (
                        <div>
                          <span className="rounded-3xl border border-green-700 p-0.5 text-xs text-green-700">
                            Cached
                          </span>
                        </div>
                      )}
                      {v.from !== "API" ? (
                        <Button
                          className={cn(
                            "rounded-xl p-1 px-2 font-medium",
                            loadingModelName === v.name &&
                              "pointer-events-none bg-transparent",
                            currentModelName === v.name &&
                              "pointer-events-none bg-transparent px-0.5 text-xs font-semibold hover:bg-white/0 dark:bg-white/0",
                            v.from === "device" &&
                              v.cached === false &&
                              "invisible",
                          )}
                          onClick={async () => {
                            if (
                              currentModelName === v.name ||
                              (v.from === "device" && v.cached === false)
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
                              ? "Selected"
                              : "Load"}
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            "rounded-xl p-1 px-3 font-medium",
                            loadingModelName === v.name &&
                              "pointer-events-none bg-transparent px-2",
                            currentModelName === v.name &&
                              "pointer-events-none bg-transparent px-0.5 text-xs font-semibold hover:bg-white/0 dark:bg-white/0",
                          )}
                          onClick={() => {
                            fromAPI(v.loadFromAPIModel!);
                          }}
                        >
                          {loadingModelName === v.name
                            ? "Loading"
                            : currentModelName === v.name
                              ? "Selected"
                              : "Use"}
                        </Button>
                      )}
                    </div>
                  </Flipped>
                );
              })}
            </Flipper>
          </div>
        )}

        <Modal
          trigger={
            <div
              className={cn(
                "-mb-1 flex min-h-10 cursor-pointer items-center justify-start gap-2 rounded-xl bg-[image:var(--web-rwkv-title-gradient)] px-2 font-bold text-white transition-all active:scale-[0.98] md:active:scale-[0.98]",
              )}
            >
              <div className="flex-1">Open Model Loader</div>
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
          }
          closeWhenBackgroundOnClick={true}
        >
          {({ close }) => {
            return <ModelLoaderCard close={close}></ModelLoaderCard>;
          }}
        </Modal>
      </div>
    </Card>
  );
}

export default function Home() {
  const sessionStorage = usePageStorage((s) => s);
  const navigate = useNavigate();

  const chatSessionStorage = useChatSessionStore((state) => state);

  const { recentModels } = useModelStorage((s) => s);

  const { llmModel, loadingModelName } = useChatModelSession((s) => s);
  const { currentModelName, defaultSessionConfiguration } =
    useWebRWKVChat(llmModel);

  const [showUI, setShowUI] = useState(true);

  const createNewConversation = (prompt: string) => {
    sessionStorage.setShowLargeBanner(false);
    setShowUI(false);

    const newSessionId = chatSessionStorage.createNewSession(
      prompt,
      defaultSessionConfiguration.current,
    );

    setTimeout(() => {
      navigate(`/chat/${newSessionId}`, { state: { prompt } });
    }, 420);
  };

  return (
    <div className="flex h-full w-full flex-col items-stretch">
      <div className="sticky top-0 h-16"></div>
      <div
        className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-2 md:px-4"
        style={{ scrollbarGutter: "stable" }}
        onScroll={(e) => {
          sessionStorage.setShowLargeBanner(
            (e.target as HTMLDivElement).scrollTop < 10,
          );
        }}
      >
        <div className="flex h-full w-full max-w-screen-md flex-1 flex-col gap-4">
          <h1
            className={cn(
              "mt-40 select-none text-6xl font-medium text-slate-300 min-[345px]:mt-28 xl:mt-36 xl:text-7xl",
              showUI
                ? "motion-translate-y-in-75 motion-opacity-in-0"
                : "motion-translate-y-out-75 motion-opacity-out-0",
              isEnterIndex() &&
                "motion-preset-fade motion-duration-1000 motion-delay-700",
            )}
          >
            LLM In Your Browser
          </h1>
          <div className={cn("flex flex-1 flex-col justify-center")}>
            <div className="grid gap-2 lg:grid-cols-2 lg:gap-5">
              <RecentModelsCard
                recentModels={recentModels}
                showUI={showUI}
              ></RecentModelsCard>
              <Card
                title="RWKV"
                className={cn(
                  "cursor-pointer transition-all md:hover:scale-[1.03]",
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
                onClick={(e) => {
                  window.open("https://github.com/BlinkDL/RWKV-LM", "_blank");
                }}
              >
                <p>A Cutting-Edge, RNN-Inspired Large Language Model</p>
                <p className="text-xs text-gray-500 underline">
                  Learn more about RWKV7
                </p>
              </Card>
              <Card
                title={"WEB RWKV"}
                className={cn(
                  "cursor-pointer transition-all md:hover:scale-[1.03]",
                  isEnterIndex()
                    ? "motion-delay-[1150ms]"
                    : showUI && "motion-delay-[350ms]",
                  showUI
                    ? "motion-translate-y-in-[80px] motion-opacity-in-0 motion-duration-[800ms]"
                    : "motion-opacity-out-0 motion-duration-300 motion-delay-0",
                )}
                icon={
                  <div
                    className="size-4 overflow-hidden rounded-full"
                    style={{
                      backgroundImage: "var(--web-rwkv-title-gradient)",
                    }}
                  ></div>
                }
                onClick={(e) => {
                  window.open("https://github.com/cryscan/web-rwkv", "_blank");
                }}
              >
                <p>Inference engine for RWKV implemented in pure WebGPU</p>
                <p className="text-xs text-gray-500 underline">
                  Learn more about WEBRWKV
                </p>
              </Card>
            </div>
          </div>
          <div className="md:hidden">
            <div className="max-md:h-20"></div>
          </div>
        </div>
      </div>
      <div
        key={`chat-textarea`}
        className={cn(
          "bottom-0 left-0 right-0 flex w-full justify-center max-md:fixed max-md:px-2 md:p-4 md:pb-8",
          isEnterIndex() &&
            "motion-preset-fade motion-duration-1000 motion-delay-[1100ms]",
        )}
      >
        <ChatTextarea
          className={cn(
            "bottom-2 z-10 max-w-screen-md bg-white dark:bg-zinc-700 md:w-full",
          )}
          onSubmit={(value) => {
            createNewConversation(value);
          }}
        ></ChatTextarea>
      </div>
    </div>
  );
}
