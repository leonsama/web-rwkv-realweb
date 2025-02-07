import { createPortal } from "react-dom";
import { ComponentLoadLevel, LiveClassName } from "./Popup.d";
import {
  calculatePosition,
  CheckEventTrigger,
  DomEventListener,
  getMaxDuration,
  getMaxDurationAmongChildren,
  getMaxZIndex,
  getRootPopup,
  inserCss,
  liveClassName,
  loadLiveClassName,
  Padding,
  POPUP_NAMESPACE,
  PositionList,
  refMiddleware,
} from "./utils";
import {
  Children,
  cloneElement,
  CSSProperties,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";

export const POPUP_CONTEXT_MENU = `${POPUP_NAMESPACE}context-menu`;

inserCss(
  `
.${POPUP_CONTEXT_MENU}-Menu {
  --gap: 10;
  position: fixed;
  /* z-index: 99999999999999; */
  border-radius: calc(var(--gap) * 0.1rem);
  box-shadow: 0px 0px 15px -3px rgba(0, 0, 0, 0.1),
    8px 21px 22px -3px rgba(0, 0, 0, 0.05);
  padding: calc(var(--gap) * 0.05rem);
  background-color: #fff;
  width: 100px;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  gap: calc(var(--gap) * 0.6px);
  font-size: 0.9rem;
  font-weight: 100;
  color: #616161;
  max-height: 60vh;
  overflow: auto;
  user-select: none !important;
}
.${POPUP_CONTEXT_MENU}-Menu::-webkit-scrollbar {
  display: none;
}

.${POPUP_CONTEXT_MENU}-Menu.fadeInOutPreload{
  opacity: 0;
  transform: scale(.9);
}

.${POPUP_CONTEXT_MENU}-Menu.fadeInOutLoaded{
  transition: transform ease-out 0.2s, opacity ease-out 0.2s;
}

.${POPUP_CONTEXT_MENU}-Menu.fadeInOutUnload{
  opacity: 0;
  transform: scale(.9);
  transition: transform ease-out 0.2s, opacity ease-out 0.2s;
}

.${POPUP_CONTEXT_MENU}-MenuItem {
  border-radius: calc(var(--gap) * 0.06rem);
  padding: calc(var(--gap) * 0.06rem) calc(var(--gap) * 0.06rem)
    calc(var(--gap) * 0.06rem) calc(var(--gap) * 0.06rem + 2rem);
  transition: background-color ease-out 0.2s;
  position: relative;
  font-weight: 400;
  cursor: pointer;
}
.${POPUP_CONTEXT_MENU}-MenuItem:hover {
  background-color: #eee;
}

.${POPUP_CONTEXT_MENU}-MenuDivider {
  height: 1px;
  border-radius: 1.5px;
  background-color: #eeeeee;
  margin: 0 1rem;
}`,
  POPUP_CONTEXT_MENU,
);

export const fadeInOutAnimation = liveClassName({
  PRELOAD: `fadeInOutPreload`,
  LOADED: `fadeInOutLoaded`,
  UNLOAD: `fadeInOutUnload`,
});

const POPUP_MENU_CLOSE_EVENT = POPUP_NAMESPACE + "MenuCloseEvent";

export const CloseAllMenu = () => {
  const closeEvent = new CustomEvent(POPUP_MENU_CLOSE_EVENT, {});
  document.dispatchEvent(closeEvent);
};

let isCloseEventListenerLoaded = false;
(() => {
  if (!isCloseEventListenerLoaded) {
    document.addEventListener("click", CloseAllMenu);
    document.addEventListener("contextmenu", CloseAllMenu);
  }
})();

interface Position {
  top: number;
  left: number;
}

function calculateContextMenuPositionOnPointer(
  event: React.MouseEvent<HTMLElement>,
  target: HTMLElement,
  boundary: HTMLElement = document.body,
  boundaryPadding: Padding = { top: 0, left: 0, bottom: 0, right: 0 },
): Position {
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  const targetRect = target.getBoundingClientRect();

  const boundaryRect = boundary.getBoundingClientRect();

  let top = mouseY;
  let left = mouseX;

  const contextMenuWidth = targetRect.width;
  const contextMenuHeight = targetRect.height;

  if (
    left + contextMenuWidth >
    boundaryRect.right - (boundaryPadding.right || 0)
  ) {
    left = mouseX - contextMenuWidth;
  }

  if (
    top + contextMenuHeight >
    boundaryRect.bottom - (boundaryPadding.bottom || 0)
  ) {
    top = mouseY - contextMenuHeight;
  }

  if (left < boundaryRect.left + (boundaryPadding.left || 0)) {
    left = boundaryRect.left + (boundaryPadding.left || 0);
  }

  if (top < boundaryRect.top + (boundaryPadding.top || 0)) {
    top = boundaryRect.top + (boundaryPadding.top || 0);
  }

  return { top, left };
}

export function createContextMenu(
  ContentMenu: // | React.FC<{
  //     closeMenu: () => void;
  //     componentLoadLevel?: ComponentLoadLevel;
  //   }>
  React.ReactElement<typeof Menu>,
) {
  function ContextMenuTrigger({
    children,
    click = false,
    doubleClick = false,
    contextMenu = true,
    hover = false,
    position = false,
    stopPropagation = false,
    stopClickEvent = false,
    data,
  }: {
    children?: React.ReactNode;
    click?: boolean;
    doubleClick?: boolean;
    contextMenu?: boolean;
    hover?: boolean | number;
    position?: PositionList | false;
    stopPropagation?: boolean;
    stopClickEvent?: boolean;
    data?: any;
  }) {
    const [contextMenus, setContextMenus] = useState<{
      [key: string]: React.ReactNode;
    }>({});

    const createMenu = (
      event: React.MouseEvent<HTMLElement>,
      element: HTMLElement,
    ) => {
      CloseAllMenu();
      const key = Math.random().toString();
      const unmount = () => {
        setTimeout(() => {
          setContextMenus((prev) => {
            const newContextMenus = { ...prev };
            delete newContextMenus[key];
            return newContextMenus;
          });
        }, 0);
      };
      setContextMenus((prev) => {
        const newContextMenus = { ...prev };
        newContextMenus[key] = (
          <ContextMenuBase
            unmount={unmount}
            event={event}
            position={position}
            element={element}
            ContentMenu={ContentMenu}
            data={data}
          ></ContextMenuBase>
        );
        return newContextMenus;
      });
    };
    const hoverTrigger = (onHover: boolean, element: HTMLElement) => {};

    return (
      <>
        {createPortal(
          Object.keys(contextMenus).map((key) => {
            return <Fragment key={key}>{contextMenus[key]}</Fragment>;
          }),
          getRootPopup(),
        )}
        <CheckEventTrigger
          hover={hover ? true : false}
          hoverShowDelay={hover ? hover && 300 : undefined}
          hoverHideDelay={hover ? hover && 300 : undefined}
          onClick={
            click
              ? (
                  event: React.MouseEvent<HTMLElement>,
                  element: HTMLElement,
                ) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  createMenu(event, element);
                }
              : undefined
          }
          onDoubleClick={
            doubleClick
              ? (
                  event: React.MouseEvent<HTMLElement>,
                  element: HTMLElement,
                ) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  createMenu(event, element);
                }
              : undefined
          }
          onContextMenu={
            contextMenu
              ? (
                  event: React.MouseEvent<HTMLElement>,
                  element: HTMLElement,
                ) => {
                  createMenu(event, element);
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  event.preventDefault();
                }
              : undefined
          }
          onHoverChange={hover ? hoverTrigger : undefined}
        >
          {children}
        </CheckEventTrigger>
      </>
    );
  }

  return { ContextMenuTrigger };
}

const ContextMenuBase = ({
  unmount,
  event,
  position,
  element,
  ContentMenu,
  data,
}: {
  unmount: () => void;
  event: React.MouseEvent<HTMLElement>;
  position: PositionList | false;
  element: HTMLElement;
  ContentMenu: // | React.FC<{
  //     closeMenu: () => void;
  //     componentLoadLevel?: ComponentLoadLevel;
  //   }>
  React.ReactElement<typeof Menu>;
  data?: any;
}) => {
  const timmer = useRef(-1);
  const closeMenu = (menuEle: HTMLDivElement) => {
    setComponentLoadLevel(ComponentLoadLevel.UNLOAD);
    requestAnimationFrame(() => {
      if (!menuEle) {
        unmount();
        return;
      }
      clearTimeout(timmer.current);
      timmer.current = setTimeout(() => {
        unmount();
      }, getMaxDuration(menuEle));
    });
  };
  const menuEle = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [componentLoadLevel, setComponentLoadLevel] =
    useState<ComponentLoadLevel>(ComponentLoadLevel.PRELOAD);

  useEffect(() => {
    setComponentLoadLevel(ComponentLoadLevel.LOADED);
  }, []);

  return cloneElement(ContentMenu as React.ReactElement, {
    ...ContentMenu.props,
    closeMenu: closeMenu,
    componentLoadLevel: componentLoadLevel,
    element: element,
    event: event,
    position: position,
    data: data,
    isRootMenu: true,
  });
};

type AllowedMenuChildren =
  | typeof Menu
  | React.Component<typeof MenuItem>
  | typeof MenuDivider
  | typeof SubMenu;

const listenerOptions = {
  capture: false,
  passive: false,
};

export function Menu({
  children,
  className,
  menuAnimation = fadeInOutAnimation,
  componentLoadLevel = ComponentLoadLevel.LOADED,
  closeMenu,
  icon = true,
  element,
  event,
  position,
  isRootMenu = false,
  data,
  ...prop
}: {
  // children: AllowedMenuChildren;
  componentLoadLevel?: ComponentLoadLevel;
  className?: LiveClassName;
  menuAnimation?: LiveClassName;
  closeMenu?: (menuEle?: HTMLDivElement) => void;
  icon?: boolean;
  element?: HTMLElement;
  event?: React.MouseEvent<HTMLElement>;
  position?: PositionList | false;
  isRootMenu?: boolean;
  data?: any;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const [eleLoadLevel, setEleLoadLevel] = useState(ComponentLoadLevel.LOADED);
  const [eleStyle, setEleStyle] = useState<CSSProperties>({
    top: 0,
    left: 0,
    opacity: 0,
  });

  const menuEle = useRef<HTMLDivElement>(null);

  const preventContextMenu = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const preventClick = (e: MouseEvent) => {
    e.stopPropagation();
    // e.preventDefault();
  };

  const closeEventHandler = () => {
    closeMenu!(menuEle.current!);
  };

  useEffect(() => {
    menuEle.current?.addEventListener(
      "contextmenu",
      preventContextMenu,
      listenerOptions,
    );
    setTimeout(() => {
      document.addEventListener(POPUP_MENU_CLOSE_EVENT, closeEventHandler);
      // menuEle.current?.addEventListener("click", preventClick, listenerOptions);
    }, 0);

    return () => {
      menuEle.current?.removeEventListener(
        "contextmenu",
        preventContextMenu,
        listenerOptions,
      );
      // menuEle.current?.removeEventListener(
      //   "click",
      //   preventClick,
      //   listenerOptions
      // );
      document.removeEventListener(POPUP_MENU_CLOSE_EVENT, closeEventHandler);
    };
  }, []);

  useEffect(() => {
    if (componentLoadLevel === ComponentLoadLevel.UNLOAD) {
      setEleLoadLevel(ComponentLoadLevel.UNLOAD);
    } else if (componentLoadLevel === ComponentLoadLevel.LOADED) {
      let pos;
      if (position) {
        pos = calculatePosition(
          element!,
          menuEle.current!,
          position,
          document.body,
          false,
          {},
          [],
        );
      } else {
        pos = calculateContextMenuPositionOnPointer(
          event!,
          menuEle.current!,
          document.body,
          {},
        );
      }
      setEleStyle({
        top: pos.top,
        left: pos.left,
        opacity: 0,
        zIndex: getMaxZIndex(),
        transition: "unset",
      });
      setEleLoadLevel(ComponentLoadLevel.PRELOAD);
      requestAnimationFrame(() => {
        setEleStyle((prev) => ({
          ...prev,
          opacity: undefined,
          transition: undefined,
        }));
        requestAnimationFrame(() => {
          setEleLoadLevel(ComponentLoadLevel.LOADED);
        });
      });
    }
  }, [componentLoadLevel]);

  return (
    <div
      {...prop}
      ref={menuEle}
      className={`${POPUP_CONTEXT_MENU}-Menu ${loadLiveClassName(
        menuAnimation,
        eleLoadLevel,
      )} ${loadLiveClassName(className, eleLoadLevel)}`}
      style={{ ...eleStyle }}
    >
      {Children.map(children, (child, key) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child, {
          ...child.props,
          key,
          closeMenu: () => {
            if (isRootMenu) {
              closeMenu!(menuEle.current!);
            } else {
              closeMenu!();
            }
          },
          componentLoadLevel: componentLoadLevel,
          data: data,
        });
      })}
    </div>
  );
}

export function MenuItem({
  children,
  className,
  icon,
  componentLoadLevel = ComponentLoadLevel.LOADED,
  onTrigger,
  closeMenu,
  disabled = false,
  data,
  ...prop
}: {
  componentLoadLevel?: ComponentLoadLevel;
  className?: LiveClassName;
  icon?: React.ReactNode;
  onTrigger?: (
    data: any,
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent,
  ) => void;
  closeMenu?: () => void;
  disabled?:
    | ((
        data: any,
        event: React.MouseEvent<HTMLElement> | React.KeyboardEvent,
      ) => boolean)
    | boolean;
  data?: any;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  return (
    <div
      {...prop}
      className={`${POPUP_CONTEXT_MENU}-MenuItem ${(() => {
        switch (componentLoadLevel) {
          case ComponentLoadLevel.PRELOAD:
            return;
          case ComponentLoadLevel.LOADED:
            return;
          case ComponentLoadLevel.UNLOAD:
            return;
        }
      })()} ${loadLiveClassName(className, componentLoadLevel)}`}
      onClick={(event) => {
        if (disabled) {
          return;
        }
        if (onTrigger) {
          onTrigger(data, event);
        }
      }}
    >
      {children}
    </div>
  );
}

export function MenuDivider({
  className,
  componentLoadLevel = ComponentLoadLevel.LOADED,
  closeMenu,
  ...prop
}: {
  children: AllowedMenuChildren;
  componentLoadLevel?: ComponentLoadLevel;
  className?: LiveClassName;
  closeMenu?: () => void;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <div
      {...prop}
      className={`${POPUP_CONTEXT_MENU}-MenuDivider ${loadLiveClassName(
        className,
        componentLoadLevel,
      )}`}
    ></div>
  );
}

export function SubMenu({
  children,
  label,
  className,
  componentLoadLevel = ComponentLoadLevel.LOADED,
  closeMenu,
  data,
  ...prop
}: {
  children: AllowedMenuChildren;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  componentLoadLevel?: ComponentLoadLevel;
  className?: LiveClassName;
  closeMenu?: () => void;
  data?: any;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <div
      {...prop}
      className={`${POPUP_CONTEXT_MENU}-Menu ${(() => {
        switch (componentLoadLevel) {
          case ComponentLoadLevel.PRELOAD:
            return;
          case ComponentLoadLevel.LOADED:
            return;
          case ComponentLoadLevel.UNLOAD:
            return;
        }
      })()} ${loadLiveClassName(className, componentLoadLevel)}`}
    >
      {children}
    </div>
  );
  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  );
}
