import { useEffect, useState } from "react";
import { RecentModel, useChatModelSession } from "../../../store/ModelStorage";
import { useWebRWKVChat } from "../../../web-rwkv-wasm-port/web-rwkv";
import {
  ModelLoaderCard,
  useModelLoader,
} from "../../../components/ModelConfigUI";
import { createModalForm, Modal } from "../../../components/popup/Modals";
import { Card, CardTitle } from "../../../components/Cards";
import { Button } from "../../../components/Button";
import { RadioGroup, RadioGroupOption } from "../../../components/RadioGroup";
import { cn, isEnterIndex } from "../../../utils/utils";
import { Flipped, Flipper } from "../../../components/Flipper";

export function RecentModelsCard({
  recentModels,
  showUI,
}: {
  recentModels: RecentModel[];
  showUI: boolean;
}) {
  const [showCachedOnly, setShowCachedOnly] = useState(true);

  const { llmModel, loadingModelTitle } = useChatModelSession((s) => s);
  const { selectedModelTitle, defaultSessionConfiguration } =
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
    const newRenderList = recentModels
      .sort((a, b) => (a.lastLoadedTimestamp < b.lastLoadedTimestamp ? 1 : -1))
      .filter((v) =>
        showCachedOnly ? v.from === "API" || v.cached === true : true,
      );
    console.log(newRenderList);
    setRenderList(newRenderList);
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
                            "h-8 rounded-xl p-1 px-2 font-medium transition-[color,transform]",
                            loadingModelTitle === v.name &&
                              "pointer-events-none bg-transparent",
                            selectedModelTitle &&
                              [v.title, v.name, v.reasoningName].includes(
                                selectedModelTitle,
                              ) &&
                              "pointer-events-none bg-transparent px-0.5 text-xs font-semibold hover:bg-white/0 dark:bg-white/0",
                            v.from === "device" &&
                              v.cached === false &&
                              "invisible",
                          )}
                          onClick={async () => {
                            if (
                              (selectedModelTitle &&
                                [v.title, v.name, v.reasoningName].includes(
                                  selectedModelTitle,
                                )) ||
                              (v.from === "device" && v.cached === false)
                            )
                              return;
                            if (v.cached) {
                              fromCache(v.title);
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
                          {loadingModelTitle === v.name
                            ? "Loading"
                            : selectedModelTitle &&
                                [v.title, v.name, v.reasoningName].includes(
                                  selectedModelTitle,
                                )
                              ? "Selected"
                              : "Load"}
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            "h-8 rounded-xl p-1 px-3 font-medium transition-[color,transform]",
                            loadingModelTitle === v.name &&
                              "pointer-events-none bg-transparent px-2",
                            [v.title, v.name, v.reasoningName].includes(
                              selectedModelTitle,
                            ) &&
                              "pointer-events-none bg-transparent px-0.5 text-xs font-semibold hover:bg-white/0 dark:bg-white/0",
                          )}
                          onClick={() => {
                            fromAPI(v.loadFromAPIModel!);
                          }}
                        >
                          {loadingModelTitle === v.name
                            ? "Loading"
                            : selectedModelTitle &&
                                [v.title, v.name, v.reasoningName].includes(
                                  selectedModelTitle,
                                )
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
