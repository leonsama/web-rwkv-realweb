/// <reference path="Popup.d.tsx" />

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { ComponentLoadLevel } from "./Popup.d";
import { createPortal } from "react-dom";

import {
  getRootPopup,
  inserCss,
  getMaxZIndex,
  POPUP_NAMESPACE,
  POPUP_ROOT_ID,
  Position,
  PositionList,
  PositionResult,
  Padding,
  getMaxDurationAmongChildren,
  getMaxDuration,
  calculatePosition,
  DomEventListener,
  CheckEventTrigger,
  FullscreenCover,
  liveClassName,
  loadLiveClassName,
  PopupNodeRender,
} from "./utils";

import { cn, CustomError } from "../../utils/utils";

import style from "./Modals.module.css";

export const USER_CANCEL_ERROR = "UserCancelError";

export function Tooltip({
  children,
  hover = true,
  click = false,
  hoverShowDelay = 300,
  hoverHideDelay = 300,
  position = "top",
  padding = { left: 0, right: 0, top: 0, bottom: 0 },
  tooltip,
}: {
  children?: React.ReactNode;
  hover?: boolean;
  click?: boolean;
  hoverShowDelay?: false | number;
  hoverHideDelay?: false | number;
  position?: PositionList;
  padding?: Padding;
  tooltip: React.ReactNode;
}) {
  const baseEle = useRef<HTMLElement | null>(null);
  const tooltipEle = useRef<HTMLDivElement | null>(null);

  const componentUnloadTimer = useRef<number>();
  const [tooltipPos, setTooltipPos] = useState<
    PositionResult & { posReady: boolean }
  >({
    left: 0,
    top: 0,
    relativePosition: "center",
    posReady: false,
  });

  const [isHover, setIsHover] = useState({ children: false, tooltip: false });
  const [showTooltip, setShowTooltip] = useState(false);
  const [componentLoadLevel, setComponentLoadLevel] =
    useState<ComponentLoadLevel>(ComponentLoadLevel.PRELOAD);

  useEffect(() => {
    if (isHover.children || isHover.tooltip) {
      if (!showTooltip) setComponentLoadLevel(ComponentLoadLevel.PRELOAD);
      setShowTooltip(true);
    } else {
      setComponentLoadLevel(ComponentLoadLevel.UNLOAD);
      setTimeout(() => {
        if (!tooltipEle.current) return;
        componentUnloadTimer.current = setTimeout(() => {
          setShowTooltip(false);
        }, getMaxDuration(tooltipEle.current));
      }, 0);
    }
  }, [isHover]);

  useEffect(() => {
    if (showTooltip && baseEle.current && tooltipEle.current) {
      clearTimeout(componentUnloadTimer.current);
      setComponentLoadLevel(ComponentLoadLevel.LOADED);
      setTooltipPos({
        ...calculatePosition(
          baseEle.current,
          tooltipEle.current,
          position,
          document.body,
          false,
          padding,
        ),
        posReady: true,
      });
    }
  }, [showTooltip]);

  return (
    <>
      {showTooltip &&
        createPortal(
          <>
            {
              <CheckEventTrigger
                hover={hover}
                hoverShowDelay={hoverShowDelay}
                hoverHideDelay={hoverHideDelay}
                onHoverChange={(onHover, elememt) => {
                  setIsHover((prev) => ({ ...prev, children: onHover }));
                }}
              >
                <div
                  ref={tooltipEle}
                  style={{
                    position: "fixed",
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    zIndex: getMaxZIndex(),
                    opacity: tooltipPos.posReady ? 1 : 0,
                  }}
                  className={cn(
                    "motion-preset-fade-lg rounded-lg bg-slate-900 p-2 text-white motion-duration-150",
                    componentLoadLevel === ComponentLoadLevel.LOADED &&
                      (() => {
                        switch (tooltipPos.relativePosition) {
                          case "right":
                            return "motion-translate-x-in-[-10px]";
                          case "left":
                            return "motion-translate-x-in-[10px]";
                          case "top":
                            return "motion-translate-y-in-[-10px]";
                          case "bottom":
                            return "motion-translate-y-in-[10px]";
                        }
                      })(),
                    componentLoadLevel === ComponentLoadLevel.UNLOAD &&
                      "motion-opacity-out-0",
                  )}
                >
                  {tooltip}
                </div>
              </CheckEventTrigger>
            }
          </>,
          getRootPopup(),
        )}
      {
        <CheckEventTrigger
          hover={hover}
          hoverShowDelay={hoverShowDelay}
          hoverHideDelay={hoverHideDelay}
          onHoverChange={(onHover, elememt) => {
            baseEle.current = elememt;
            setIsHover((prev) => ({ ...prev, children: onHover }));
          }}
        >
          {children}
        </CheckEventTrigger>
      }
    </>
  );
}

// BaseModal 组件核心实现
export function BaseModal({
  isOpen,
  onClose,
  afterClose,
  children,
  backgroundCover = true,
  closeWhenBackgroundOnClick = false,
  enableModalDefaultAnimate = true,
  enableModalCloseFailureAnimation = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  afterClose?: () => void;
  backgroundCover?: boolean;
  closeWhenBackgroundOnClick?: boolean;
  enableModalDefaultAnimate?: boolean;
  enableModalCloseFailureAnimation?: boolean;
}) {
  const bgEle = useRef<HTMLDivElement>(null);
  const modalEle = useRef<HTMLDivElement>(null);
  const componentUnloadTimer = useRef<number>();
  const [componentLoadLevel, setComponentLoadLevel] =
    useState<ComponentLoadLevel>(ComponentLoadLevel.PRELOAD);
  const [renderModel, setRenderModel] = useState(false);

  const isModalOpen = useRef<boolean>(false);

  const PlayCloseFailureAnimation = () => {
    modalEle.current?.children[0]?.classList.remove(
      style["modal-close-failure"],
    );
    setTimeout(() => {
      modalEle.current?.children[0]?.classList.add(
        style["modal-close-failure"],
      );
    }, 0);
    modalEle.current?.children[0]?.addEventListener(
      "animationend",
      () => {
        modalEle.current?.children[0]?.classList.remove(
          style["modal-close-failure"],
        );
      },
      { once: true },
    );
  };

  useEffect(() => {
    if (renderModel && isModalOpen.current) {
      setComponentLoadLevel(ComponentLoadLevel.LOADED);
    }
  }, [renderModel]);

  useEffect(() => {
    if (isOpen) {
      setRenderModel(true);
      isModalOpen.current = true;
    } else {
      if (!isModalOpen.current) return;
      isModalOpen.current = false;
      setComponentLoadLevel(ComponentLoadLevel.UNLOAD);
      setTimeout(() => {
        componentUnloadTimer.current = setTimeout(
          () => {
            setRenderModel(false);
            afterClose?.();
          },
          Math.max(
            getMaxDuration(modalEle.current?.children[0] as HTMLElement),
            getMaxDuration(bgEle.current as HTMLElement),
          ),
        );
      }, 0);
    }
  }, [isOpen]);

  return (
    <>
      {renderModel && backgroundCover && (
        <FullscreenCover
          ref={bgEle}
          onMouseDown={() => {
            if (closeWhenBackgroundOnClick) {
              onClose();
            } else if (enableModalCloseFailureAnimation) {
              PlayCloseFailureAnimation();
            }
          }}
          componentLoadLevel={componentLoadLevel}
          className={liveClassName(style.modal_background_cover, {
            PRELOAD: style["modal_background_cover-enter"],
            UNLOAD: style["modal_background_cover-leave"],
          })}
          preventScroll={componentLoadLevel === ComponentLoadLevel.LOADED}
        />
      )}

      {renderModel &&
        createPortal(
          <div
            ref={modalEle}
            className={`${style.modal} ${
              (enableModalDefaultAnimate &&
                loadLiveClassName(
                  liveClassName({
                    PRELOAD: style["modal-enter"],
                    UNLOAD: style["modal-leave"],
                  }),
                  componentLoadLevel,
                )) ||
              ""
            }`}
            style={{ zIndex: getMaxZIndex() }}
          >
            {children}
          </div>,
          getRootPopup(),
        )}
    </>
  );
}

export function Modal({
  children,
  modal,
  clickToOpenModal = true,
  ...baseModalProps
}: {
  children: React.ReactNode;
  modal: React.ReactNode | React.FC<{ close: () => void }>;
  clickToOpenModal?: boolean;
} & Omit<
  React.ComponentProps<typeof BaseModal>,
  "isOpen" | "onClose" | "children"
>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        {...baseModalProps}
      >
        {typeof modal === "function"
          ? modal({ close: () => setIsOpen(false) })
          : modal}
      </BaseModal>

      <DomEventListener
        events={{ click: () => clickToOpenModal && setIsOpen(true) }}
      >
        {children}
      </DomEventListener>
    </>
  );
}

export interface ModalFormOptions {
  closeOnBackgroundClick?: boolean;
  enableModalDefaultAnimate?: boolean;
  enableModalCloseFailureAnimation?: boolean;
}

export function createModalForm<T extends Record<string, any>>(
  ModalContent:
    | React.ComponentType<{ close: () => void } & Record<string, any>>
    | React.ReactNode,
  options: ModalFormOptions = {
    closeOnBackgroundClick: false,
    enableModalDefaultAnimate: true,
    enableModalCloseFailureAnimation: true,
  },
) {
  const open = (prop: Record<string, any> = {}): Promise<T> => {
    return new Promise((resolve, reject) => {
      const ModalWrapper = () => {
        const [isOpen, setIsOpen] = useState(false);
        let formRef: HTMLFormElement | null = null;

        const handleSubmit = (event: React.FormEvent) => {
          event.preventDefault();
          if (!formRef) return;

          const formData = new FormData(formRef);
          const result = Object.fromEntries(formData.entries());

          if (
            ["BUTTON", "INPUT"].includes(
              (event.nativeEvent as SubmitEvent).submitter?.nodeName!,
            )
          ) {
            const name = (
              (event.nativeEvent as SubmitEvent).submitter as HTMLInputElement
            ).name;

            if (name)
              result[name] = (
                (event.nativeEvent as SubmitEvent).submitter as HTMLInputElement
              ).value;
          }

          setIsOpen(false);
          resolve(result as T);
        };

        const handleCancel = () => {
          if (options.closeOnBackgroundClick) {
            reject(
              new CustomError(USER_CANCEL_ERROR, "User closed the modal."),
            );
          }
        };

        useEffect(() => {
          setIsOpen(true);
        }, []);

        return (
          <BaseModal
            isOpen={isOpen}
            onClose={() => {
              setIsOpen(false);
              handleCancel();
            }}
            backgroundCover={true}
            afterClose={() => {
              PopupNodeRender.unmount(ModalNode);
            }}
            closeWhenBackgroundOnClick={options.closeOnBackgroundClick}
            enableModalDefaultAnimate={options.enableModalDefaultAnimate}
            enableModalCloseFailureAnimation={
              options.enableModalCloseFailureAnimation
            }
          >
            <form
              ref={(el) => {
                formRef = el;
              }}
              onSubmit={handleSubmit}
            >
              {typeof ModalContent === "function" ? (
                <ModalContent
                  close={() => {
                    setIsOpen(false);
                    handleCancel();
                  }}
                  {...prop}
                />
              ) : (
                ModalContent
              )}
            </form>
          </BaseModal>
        );
      };

      const ModalNode = <ModalWrapper />;
      PopupNodeRender.mount(ModalNode);
    });
  };

  return { open };
}
