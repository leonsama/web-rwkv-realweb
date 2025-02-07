import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  Dispatch,
  Fragment,
} from "react";
import { ComponentLoadLevel, LiveClassName } from "./Popup.d";
import { createPortal } from "react-dom";

export const POPUP_NAMESPACE = "new-popup-";

export const POPUP_ROOT_ID = POPUP_NAMESPACE + "root";

export const getRootPopup = () => {
  let PopupRoot = document.getElementById(POPUP_ROOT_ID);

  if (PopupRoot === null) {
    PopupRoot = document.createElement("div");
    PopupRoot.setAttribute("id", POPUP_ROOT_ID);
    document.body.appendChild(PopupRoot);
  }

  return PopupRoot;
};

export const inserCss = (styke: string, id?: string) => {
  const styleElement = document.getElementById(id!);
  if (styleElement) {
    styleElement.innerHTML = styke;
  } else {
    const styleElement = document.createElement("style");
    styleElement.setAttribute("id", id!);
    styleElement.innerHTML = styke;
    document.head.insertBefore(styleElement, document.head.firstChild);
  }
};

export const getMaxZIndex = () =>
  Array.from(document.querySelectorAll("*")).reduce(
    (r, e) => Math.max(r, +window.getComputedStyle(e).zIndex || 0),
    0,
  );

export function getMaxDuration(element: HTMLElement): number {
  // 获取元素的所有动画
  const animations = element.getAnimations();

  // 计算最长的动画时间（delay + duration）
  let maxAnimationTime = 0;
  animations.forEach((animation) => {
    const timing = (animation as Animation).effect?.getTiming();
    if (timing) {
      // 将 delay 和 duration 转换为 number 类型
      const delay = typeof timing.delay === "number" ? timing.delay : 0;
      const duration =
        typeof timing.duration === "number" ? timing.duration : 0;
      const totalTime = delay + duration;
      if (totalTime > maxAnimationTime) {
        maxAnimationTime = totalTime;
      }
    }
  });

  // 获取计算样式中的 transition 属性
  const computedStyle = window.getComputedStyle(element);
  const transitionDelays = computedStyle.transitionDelay.split(", ");
  const transitionDurations = computedStyle.transitionDuration.split(", ");

  // 计算最长的过渡时间（delay + duration）
  let maxTransitionTime = 0;
  transitionDelays.forEach((delay, index) => {
    const delayTime = parseFloat(delay) * (delay.includes("ms") ? 1 : 1000);
    const durationTime =
      parseFloat(transitionDurations[index]) *
      (transitionDurations[index].includes("ms") ? 1 : 1000);
    const totalTime = delayTime + durationTime;
    if (totalTime > maxTransitionTime) {
      maxTransitionTime = totalTime;
    }
  });

  // 返回 animation 和 transition 中最长的时间
  return Math.max(maxAnimationTime, maxTransitionTime);
}

export function getMaxDurationAmongChildren(
  parentElement: HTMLElement,
): number {
  const stack: HTMLElement[] = [parentElement];
  let maxDuration = 0;

  while (stack.length > 0) {
    const currentElement = stack.pop()!;
    const currentDuration = getMaxDuration(currentElement);
    if (currentDuration > maxDuration) {
      maxDuration = currentDuration;
    }

    const children = Array.from(currentElement.children) as HTMLElement[];
    children.forEach((child) => stack.push(child));
  }

  return maxDuration;
}

export const DomEventListener = forwardRef<
  HTMLElement,
  {
    children: React.ReactNode;
    events?: { [event: string]: (event: Event, element: HTMLElement) => void };
  }
>(({ children, events }, ref) => {
  const childRefs = useRef<(HTMLElement | null)[]>([]);
  const eventRefs = useRef<
    { type: string; eventListener?: EventListener; element?: HTMLElement }[]
  >([]);

  const eventListenerBuilder = (event: string, childElement: HTMLElement) => {
    return (e: Event) => {
      events?.[event](e, childElement);
    };
  };

  const cleanListener = () => {
    for (let i = 0; i < eventRefs.current.length; i++) {
      const eventListener = eventRefs.current[i];
      if (eventListener.element && eventListener.eventListener) {
        eventListener.element.removeEventListener(
          eventListener.type,
          eventListener.eventListener,
        );
      }
      delete eventListener.eventListener;
      delete eventListener.element;
      delete eventRefs.current[i];
    }
    eventRefs.current = [];
  };

  const setupListener = () => {
    if (!events) return;
    childRefs.current.map((childElement) => {
      if (childElement) {
        Object.keys(events).map((event) => {
          const eventListener = eventListenerBuilder(event, childElement);
          childElement.addEventListener(event, eventListener);
          eventRefs.current.push({
            type: event,
            eventListener: eventListener,
            element: childElement,
          });
        });
      }
    });
  };

  useEffect(() => {
    cleanListener();
    setupListener();

    return () => {
      cleanListener();
    };
  }, [children]);

  return Children.map(children, (child, index) => {
    if (!isValidElement(child)) {
      return child;
    }

    // 合并外部的 ref 和内部的 ref
    const combinedRef = (el: HTMLElement | null) => {
      childRefs.current[index] = el; // 内部 ref

      const element = child as React.ReactElement & {
        ref?:
          | React.RefObject<HTMLElement>
          | ((instance: HTMLElement | null) => void)
          | null;
      };

      // 处理外部的 ref（child.ref）
      if (element.props.ref) {
        if (typeof element.props.ref === "function") {
          element.props.ref(el); // 如果 ref 是函数，直接调用
        } else if (element.props.ref && typeof element.props.ref === "object") {
          (
            element.props.ref as React.MutableRefObject<HTMLElement | null>
          ).current = el; // 如果 ref 是对象，赋值给 current
        }
      } else {
        if (typeof element.ref === "function") {
          element.ref(el); // 如果 ref 是函数，直接调用
        } else if (element.ref && typeof element.ref === "object") {
          (element.ref as React.MutableRefObject<HTMLElement | null>).current =
            el; // 如果 ref 是对象，赋值给 current
        }
      }

      // 处理 forwardRef 的 ref
      if (ref) {
        if (typeof ref === "function") {
          ref(el); // 如果 ref 是函数，直接调用
        } else if (ref && typeof ref === "object") {
          (ref as React.MutableRefObject<HTMLElement | null>).current = el; // 如果 ref 是对象，赋值给 current
        }
      }
    };

    return cloneElement(child as React.ReactElement, {
      ref: combinedRef,
    });
  });
});

export function CheckEventTrigger({
  hover = false,
  hoverShowDelay = 300,
  hoverHideDelay = 300,
  onHoverChange,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: {
  hover?: boolean;
  hoverShowDelay?: false | number;
  hoverHideDelay?: false | number;
  onHoverChange?: (onHover: boolean, element: HTMLElement) => void;
  onClick?: (
    event: React.MouseEvent<HTMLElement>,
    element: HTMLElement,
  ) => void;
  onDoubleClick?: (
    event: React.MouseEvent<HTMLElement>,
    element: HTMLElement,
  ) => void;
  onContextMenu?: (
    event: React.MouseEvent<HTMLElement>,
    element: HTMLElement,
  ) => void;
  children: React.ReactNode;
}) {
  const checkHoverTimer = useRef<number>();
  const isHover = useRef<boolean>(false);

  const events: { [event: string]: any } = {};
  if (onHoverChange && hover) {
    events["mouseenter"] = (event: Event, element: HTMLElement) => {
      clearTimeout(checkHoverTimer.current);
      if (!isHover.current) {
        checkHoverTimer.current = setTimeout(() => {
          isHover.current = true;
          onHoverChange!(true, element);
        }, hoverShowDelay || 0);
      }
    };
    events["mouseleave"] = (event: Event, element: HTMLElement) => {
      clearTimeout(checkHoverTimer.current);
      if (isHover.current) {
        checkHoverTimer.current = setTimeout(() => {
          isHover.current = false;
          onHoverChange!(false, element);
        }, hoverHideDelay || 0);
      }
    };
  }
  if (onClick) {
    events["click"] = onClick;
  }
  if (onDoubleClick) {
    events["dblclick"] = onDoubleClick;
  }
  if (onContextMenu) {
    events["contextmenu"] = onContextMenu;
  }

  return <DomEventListener events={events}>{children}</DomEventListener>;
}

export type Position =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top left"
  | "top center"
  | "top right"
  | "right top"
  | "right center"
  | "right bottom"
  | "bottom left"
  | "bottom center"
  | "bottom right"
  | "left top"
  | "left center"
  | "left bottom"
  | "center center";

export type PositionList = Position | Position[];

export type Padding = {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
};

export type PositionResult = {
  top: number;
  left: number;
  relativePosition: "top" | "left" | "bottom" | "right" | "center";
};

export function calculatePosition(
  base: HTMLElement,
  target: HTMLElement,
  position: PositionList,
  boundary: HTMLElement = document.body,
  canCover: boolean = false,
  basePadding: Padding = { top: 0, left: 0, bottom: 0, right: 0 },
  availablePositions: Position[] = [],
): PositionResult {
  const baseRect = base.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const boundaryRect = boundary.getBoundingClientRect();

  const padding = { top: 0, left: 0, bottom: 0, right: 0, ...basePadding };

  // 计算所有可能的 position 对应的坐标
  const positionMap: Record<Position, { top: number; left: number }> = {
    "top left": {
      top: baseRect.top - targetRect.height - padding.bottom,
      left: baseRect.left,
    },
    "top center": {
      top: baseRect.top - targetRect.height - padding.bottom,
      left: baseRect.left + (baseRect.width - targetRect.width) / 2,
    },
    "top right": {
      top: baseRect.top - targetRect.height - padding.bottom,
      left: baseRect.right - targetRect.width,
    },
    "right top": {
      top: baseRect.top,
      left: baseRect.right + padding.left,
    },
    "right center": {
      top: baseRect.top + (baseRect.height - targetRect.height) / 2,
      left: baseRect.right + padding.left,
    },
    "right bottom": {
      top: baseRect.bottom - targetRect.height,
      left: baseRect.right + padding.left,
    },
    "bottom left": {
      top: baseRect.bottom + padding.top,
      left: baseRect.left,
    },
    "bottom center": {
      top: baseRect.bottom + padding.top,
      left: baseRect.left + (baseRect.width - targetRect.width) / 2,
    },
    "bottom right": {
      top: baseRect.bottom + padding.top,
      left: baseRect.right - targetRect.width,
    },
    "left top": {
      top: baseRect.top,
      left: baseRect.left - targetRect.width - padding.right,
    },
    "left center": {
      top: baseRect.top + (baseRect.height - targetRect.height) / 2,
      left: baseRect.left - targetRect.width - padding.right,
    },
    "left bottom": {
      top: baseRect.bottom - targetRect.height,
      left: baseRect.left - targetRect.width - padding.right,
    },
    "center center": {
      top: baseRect.top + (baseRect.height - targetRect.height) / 2,
      left: baseRect.left + (baseRect.width - targetRect.width) / 2,
    },
    top: {
      top: baseRect.top - targetRect.height - padding.bottom,
      left: baseRect.left + (baseRect.width - targetRect.width) / 2,
    },
    right: {
      top: baseRect.top + (baseRect.height - targetRect.height) / 2,
      left: baseRect.right + padding.left,
    },
    bottom: {
      top: baseRect.bottom + padding.top,
      left: baseRect.left + (baseRect.width - targetRect.width) / 2,
    },
    left: {
      top: baseRect.top + (baseRect.height - targetRect.height) / 2,
      left: baseRect.left - targetRect.width - padding.right,
    },
  };

  // 检查 target 是否在 boundary 内（考虑 padding）
  function isPositionValid(pos: { top: number; left: number }): boolean {
    return (
      pos.top >= boundaryRect.top + padding.top &&
      pos.left >= boundaryRect.left + padding.left &&
      pos.top + targetRect.height <= boundaryRect.bottom - padding.bottom &&
      pos.left + targetRect.width <= boundaryRect.right - padding.right
    );
  }

  // 计算两个点之间的欧几里得距离
  function calculateDistance(
    pos1: { top: number; left: number },
    pos2: { top: number; left: number },
  ): number {
    return Math.sqrt(
      Math.pow(pos1.top - pos2.top, 2) + Math.pow(pos1.left - pos2.left, 2),
    );
  }

  // 计算 target 的中心点
  function getTargetCenter(pos: { top: number; left: number }): {
    top: number;
    left: number;
  } {
    return {
      top: pos.top + targetRect.height / 2,
      left: pos.left + targetRect.width / 2,
    };
  }

  // 计算 base 的中心点
  const targetCenter = getTargetCenter(
    positionMap[Array.isArray(position) ? position[0] : position],
  );

  // 如果 position 是列表，按顺序寻找第一个合法的位置
  if (Array.isArray(position)) {
    for (const pos of position) {
      const candidate = positionMap[pos];
      if (isPositionValid(candidate)) {
        return {
          top: candidate.top,
          left: candidate.left,
          relativePosition: getRelativePosition(
            candidate,
            baseRect,
            targetRect,
          ),
        };
      }
    }
  } else {
    // 如果 position 是单个值，检查是否合法
    const candidate = positionMap[position];
    if (isPositionValid(candidate)) {
      return {
        top: candidate.top,
        left: candidate.left,
        relativePosition: getRelativePosition(candidate, baseRect, targetRect),
      };
    }
  }

  // 如果没有合法的位置，计算最近的合法位置
  let closestPosition = positionMap["center center"];
  let minDistance = Infinity;

  for (const [key, pos] of Object.entries(positionMap)) {
    if (!canCover && key === "center center") continue;
    if (
      availablePositions.length > 0 &&
      !availablePositions.includes(key as Position)
    )
      continue;
    if (isPositionValid(pos)) {
      const distance = calculateDistance(getTargetCenter(pos), targetCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = pos;
      }
    }
  }

  // 如果所有 position 都不合法，选择 boundary 内距离原本位置最近的位置
  if (!isPositionValid(closestPosition)) {
    for (const [key, pos] of Object.entries(positionMap)) {
      const adjustedPos = {
        top: Math.max(
          boundaryRect.top + padding.top,
          Math.min(
            pos.top,
            boundaryRect.bottom - padding.bottom - targetRect.height,
          ),
        ),
        left: Math.max(
          boundaryRect.left + padding.left,
          Math.min(
            pos.left,
            boundaryRect.right - padding.right - targetRect.width,
          ),
        ),
      };
      const distance = calculateDistance(
        getTargetCenter(adjustedPos),
        targetCenter,
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = adjustedPos;
      }
    }
  }

  return {
    top: closestPosition.top,
    left: closestPosition.left,
    relativePosition: getRelativePosition(
      closestPosition,
      baseRect,
      targetRect,
    ),
  };
}

// 计算 target 相对于 base 的方位
function getRelativePosition(
  pos: { top: number; left: number },
  baseRect: DOMRect,
  targetRect: DOMRect,
): "top" | "left" | "bottom" | "right" | "center" {
  const baseCenter = {
    top: baseRect.top + baseRect.height / 2,
    left: baseRect.left + baseRect.width / 2,
  };
  const targetCenter = {
    top: pos.top + targetRect.height / 2,
    left: pos.left + targetRect.width / 2,
  };

  const deltaY = targetCenter.top - baseCenter.top;
  const deltaX = targetCenter.left - baseCenter.left;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? "right" : "left";
  } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return deltaY > 0 ? "bottom" : "top";
  } else {
    return "center";
  }
}

export const liveClassName = (
  ...classNames: (
    | string
    | {
        PRELOAD?: string;
        LOADED?: string;
        UNLOAD?: string;
      }
  )[]
) => {
  return (componentLoadLevel: ComponentLoadLevel) => {
    return classNames
      .map(
        (
          className:
            | {
                PRELOAD?: string;
                LOADED?: string;
                UNLOAD?: string;
              }
            | string,
        ) => {
          if (typeof className === "string") {
            return className;
          } else {
            switch (componentLoadLevel) {
              case ComponentLoadLevel.PRELOAD:
                return className.PRELOAD;
              case ComponentLoadLevel.LOADED:
                return className.LOADED;
              case ComponentLoadLevel.UNLOAD:
                return className.UNLOAD;
            }
          }
        },
      )
      .join(" ");
  };
};

export const loadLiveClassName = (
  liveClassName: LiveClassName,
  componentLoadLevel: ComponentLoadLevel,
) => {
  switch (typeof liveClassName) {
    case "function":
      return liveClassName(componentLoadLevel) || "";
    case "object":
      return `${liveClassName["CONSTANT"] || ""} ${
        liveClassName[componentLoadLevel] || ""
      }`;
    default:
      return liveClassName || "";
  }
};

export function FullscreenCover({
  ref = useRef(null),
  componentLoadLevel = ComponentLoadLevel.LOADED,
  className,
  preventScroll,
  ...prop
}: {
  ref?: React.RefObject<HTMLDivElement>;
  componentLoadLevel?: ComponentLoadLevel;
  className?: LiveClassName;
  preventScroll?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const listenerOptions = {
    capture: false,
    passive: false,
  };

  const preventScrollEvent = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const preventTouchEvent = (event: TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const disableScroll = () => {
    ref.current?.addEventListener("wheel", preventScrollEvent, listenerOptions);
    ref.current?.addEventListener(
      "touchmove",
      preventTouchEvent,
      listenerOptions,
    );
  };
  const enableScroll = () => {
    ref.current?.removeEventListener(
      "wheel",
      preventScrollEvent,
      listenerOptions,
    );
    ref.current?.removeEventListener(
      "touchmove",
      preventTouchEvent,
      listenerOptions,
    );
  };

  useEffect(() => {
    if (preventScroll) {
      disableScroll();
    } else {
      enableScroll();
    }
    return () => enableScroll();
  }, [ref, preventScroll]);
  return createPortal(
    <div
      {...prop}
      ref={ref}
      className={`${loadLiveClassName(className, componentLoadLevel)}`}
      style={{
        zIndex: getMaxZIndex(),
        pointerEvents:
          componentLoadLevel !== ComponentLoadLevel.UNLOAD ? "auto" : "none",
      }}
    ></div>,
    getRootPopup(),
  );
}

export function refMiddleware<T>(
  forwardRef: React.RefObject<T> | React.MutableRefObject<T> | null,
  hookRef: React.MutableRefObject<T | null>,
) {
  if (forwardRef) {
    hookRef.current = forwardRef.current;
  }
  return forwardRef;
}

export const PopupNodeRender: {
  mount: (node: React.ReactNode) => void;
  unmount: (node: React.ReactNode) => void;
  _setNodeList: Dispatch<
    React.SetStateAction<{ id: number; node: React.ReactNode }[]>
  >;
} = {
  mount: (node: React.ReactNode) => {
    PopupNodeRender._setNodeList((prev) => [
      ...prev,
      { id: Math.random(), node: node },
    ]);
  },
  unmount: (node: React.ReactNode) => {
    PopupNodeRender._setNodeList((prev) => prev.filter((v) => v.node !== node));
  },
  _setNodeList: null!,
};

export function PopupRoot({}: {}) {
  const [nodeList, setNodeList] = useState<
    { id: number; node: React.ReactNode }[]
  >([]);
  PopupNodeRender._setNodeList = setNodeList;
  return createPortal(
    nodeList.map((v, k) => {
      return <Fragment key={v.id}>{v.node}</Fragment>;
    }),
    getRootPopup(),
  );
}
