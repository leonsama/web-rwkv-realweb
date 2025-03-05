import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  ReactNode,
  isValidElement,
  Children,
} from "react";
import { RadioGroup, RadioGroupOption } from "./RadioGroup";
import { inserCss } from "./popup/utils";
import { Timer } from "../utils/utils";

interface TabsContextType {
  activeValue: string;
  setActiveValue: (value: string) => void;
  contentHeight: number;
  setContentHeight: (height: number) => void;
  currentValueIndex: React.MutableRefObject<string[]>;
  currentActiveIndex: React.MutableRefObject<number>;
  previousActiveIndex: React.MutableRefObject<number>;
}

const WEB_RWKV_TABS = "web-rwkv-tabs";

inserCss(
  `
.${WEB_RWKV_TABS}-tabs{
  position: relative;
}
.${WEB_RWKV_TABS}-tabsOnChange{
  position: relative;
  overflow: hidden;
}
.${WEB_RWKV_TABS}-tabsContent{
  position: absolute;
  width: 100%;
  box-sizing: border-box;
  opacity:0;
}
.${WEB_RWKV_TABS}-transition{
  transition:all 300ms ease-in-out;
}
.${WEB_RWKV_TABS}-transition .RadioGroupSlider{
  transition-duration: 300ms;
}
.${WEB_RWKV_TABS}-toLeft{
  transform: translateX(-50%);
}
.${WEB_RWKV_TABS}-toRight{
  transform: translateX(50%);
}
.${WEB_RWKV_TABS}-fadeIn{
  opacity:1;
}
`,
  WEB_RWKV_TABS,
);

const TabsContext = React.createContext<TabsContextType>(null!);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}) {
  const [activeValue, setActiveValue] = useState(defaultValue);
  const [contentHeight, setContentHeight] = useState(0);
  const [onChange, setOnChange] = useState(false);

  const currentValueIndex = useRef<string[]>([]);
  const currentActiveIndex = useRef<number>(-1);
  const previousActiveIndex = useRef<number>(-1);

  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const onChangeTimmer = useRef<Timer>();
  useEffect(() => {
    onValueChange?.(activeValue);
    setOnChange(true);
    clearTimeout(onChangeTimmer.current);
    onChangeTimmer.current = setTimeout(() => {
      requestAnimationFrame(() => setOnChange(false));
    }, 300);
  }, [activeValue]);

  useEffect(() => {
    if (value === undefined) return;

    const index = currentValueIndex.current.indexOf(value);

    if (index < 0) return;

    if (index != currentActiveIndex.current) {
      previousActiveIndex.current = currentActiveIndex.current;
      currentActiveIndex.current = index;
    }
    setActiveValue(value);
  }, [value]);

  return (
    <TabsContext.Provider
      value={{
        activeValue,
        setActiveValue,
        contentHeight,
        setContentHeight,
        currentActiveIndex,
        previousActiveIndex,
        currentValueIndex,
      }}
    >
      {Children.map(children, (child) => {
        if (
          isValidElement<React.ComponentProps<typeof TabsList>>(child) &&
          (typeof child.type === "function" ? child.type.name : child.type) ===
            TabsList.name
        ) {
          return child;
        }
      })}
      <div
        ref={contentWrapperRef}
        style={{
          height: contentHeight,
        }}
        className={`${WEB_RWKV_TABS}-tabs ${
          activeValue && previousActiveIndex.current != -1
            ? `${WEB_RWKV_TABS}-transition`
            : ""
        } ${(onChange && `${WEB_RWKV_TABS}-tabsOnChange`) || ""}`}
      >
        {Children.map(children, (child) => {
          if (
            isValidElement<React.ComponentProps<typeof TabsContent>>(child) &&
            (typeof child.type === "function"
              ? child.type.name
              : child.type) === TabsContent.name
          ) {
            return child;
          }
        })}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsContent({
  value,
  children,
  className,
  ...prop
}: {
  value: string;
  children: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const [isMount, setIsMount] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const timmer = useRef<Timer>();

  const {
    activeValue,
    setContentHeight,
    previousActiveIndex,
    currentActiveIndex,
  } = useContext(TabsContext);

  useEffect(() => {
    clearTimeout(timmer.current);

    if (activeValue === value) {
      setIsMount(true);
      if (contentRef.current) {
        setContentHeight(contentRef.current.offsetHeight);

        contentRef.current?.classList.remove(
          `${WEB_RWKV_TABS}-toRight`,
          `${WEB_RWKV_TABS}-toLeft`,
          `${WEB_RWKV_TABS}-transition`,
        );
        if (previousActiveIndex.current >= 0)
          contentRef.current?.classList.add(
            currentActiveIndex.current > previousActiveIndex.current
              ? `${WEB_RWKV_TABS}-toRight`
              : `${WEB_RWKV_TABS}-toLeft`,
          );
        contentRef.current.clientHeight;
        // setTimeout(() => {
        contentRef.current?.classList.remove(
          `${WEB_RWKV_TABS}-toRight`,
          `${WEB_RWKV_TABS}-toLeft`,
        );
        contentRef.current?.classList.add(
          `${WEB_RWKV_TABS}-fadeIn`,
          `${WEB_RWKV_TABS}-transition`,
        );
        // }, 10);
      }
    } else {
      contentRef.current?.classList.remove(`${WEB_RWKV_TABS}-fadeIn`);
      contentRef.current?.classList.add(
        currentActiveIndex.current > previousActiveIndex.current
          ? `${WEB_RWKV_TABS}-toLeft`
          : `${WEB_RWKV_TABS}-toRight`,
      );
      timmer.current = setTimeout(() => {
        setIsMount(false);
      }, 300);
    }
  }, [activeValue, isMount]);

  return (
    isMount && (
      <div
        {...prop}
        ref={contentRef}
        className={`${WEB_RWKV_TABS}-tabsContent`}
        style={{ zIndex: activeValue === value ? "10" : undefined }}
      >
        {children}
      </div>
    )
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const {
    activeValue,
    setActiveValue,
    currentActiveIndex,
    previousActiveIndex,
    currentValueIndex,
  } = useContext(TabsContext);
  return (
    <RadioGroup
      className={`${WEB_RWKV_TABS}-transition ${className}`}
      value={activeValue}
      onChange={(value, index) => {
        if (index != currentActiveIndex.current) {
          previousActiveIndex.current = currentActiveIndex.current;
          currentActiveIndex.current = index;
        }
        setActiveValue(value);
      }}
      triggerOnMount={true}
      onValueIndexUpdate={(values) => {
        currentValueIndex.current = values;
      }}
    >
      {children}
    </RadioGroup>
  );
}

export const TabsTrigger = RadioGroupOption;
