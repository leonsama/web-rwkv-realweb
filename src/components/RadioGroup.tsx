import { Children, isValidElement, useEffect, useRef, useState } from "react";
import { cn, throttle } from "../utils/utils";
import { ClassValue } from "clsx";

import style from "./RadioGroup.module.css";

export function RadioGroup({
  children,
  className,
  value,
  onChange,
  onValueIndexUpdate,
  triggerOnMount = false,
}: {
  children?: React.ReactNode;
  value?: any;
  onChange?: (value: any, index: number) => void;
  onValueIndexUpdate?: (values: string[]) => void;
  className?: ClassValue;
  triggerOnMount?: boolean;
}) {
  const groupEle = useRef<HTMLDivElement>(null);
  const [selectBgPos, setSelectBgPos] = useState({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: false,
    motionAnimate: false,
    xDirection: "left",
    yDirection: "top",
  });
  const selectedIndex = useRef(-1);

  const activeItem = (key: number) => {
    if (key < 0) return;
    selectedIndex.current = key;

    const itemRect =
      groupEle.current?.children[key + 1].getBoundingClientRect();
    const groupRect = groupEle.current?.getBoundingClientRect();
    if (itemRect && groupRect) {
      setSelectBgPos((prev) => {
        const leftPercent =
          ((itemRect.left - groupRect.left) / groupRect.width) * 100;
        const topPercent =
          ((itemRect.top - groupRect.top) / groupRect.height) * 100;
        const rightPercent =
          ((groupRect.right - itemRect.right) / groupRect.width) * 100;
        const bottomPercent =
          ((groupRect.bottom - itemRect.bottom) / groupRect.height) * 100;
        return {
          left: leftPercent,
          top: topPercent,
          right: rightPercent,
          bottom: bottomPercent,
          display: true,
          motionAnimate: prev.display,
          xDirection:
            prev.left > leftPercent
              ? style["move-to-left"]
              : style["move-to-right"],
          yDirection: prev.top > topPercent ? "top" : "bottom",
        };
      });
    }
  };

  const trigger = (key: number) => {
    if (key < 0) return;
    const target = Children.toArray(children)[key];

    if (!isValidElement(target)) return;
    if (target.props.disabled) return;
    onChange?.(target.props.value, key);

    activeItem(key);
  };

  const isDomReady = useRef(-1);
  useEffect(() => {
    // 窗口resize，节流
    const resize = throttle(() => {
      if (selectedIndex.current >= 0) {
        activeItem(selectedIndex.current);
      }
    }, 200);
    const callResize = () => resize();

    window.addEventListener("resize", callResize);
    setTimeout(() => {
      isDomReady.current = 1;
    }, 0);
    return () => {
      window.removeEventListener("resize", callResize);
    };
  }, []);

  useEffect(() => {
    if (value && isDomReady.current > 0) {
      const index = Children.toArray(children).findIndex((item) => {
        return isValidElement(item) && item.props.value === value;
      });
      if (index >= 0) {
        selectedIndex.current = index;
        activeItem(index);
      }
    }
  }, [value]);

  useEffect(() => {
    const valueMap =
      Children.map(children, (v) => {
        if (!isValidElement(v)) return v;
        return (v.props as React.ComponentProps<typeof RadioGroupOption>).value;
      }) || [];
    onValueIndexUpdate?.(valueMap);
  }, [children]);

  return (
    <div
      className={cn(
        "relative flex h-12 select-none justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-100 p-2 transition-all duration-300 dark:bg-zinc-900/50",
        className,
      )}
      ref={groupEle}
    >
      <div
        className={cn(
          "RadioGroupSlider absolute rounded-lg bg-white shadow-sm dark:bg-zinc-700",
          selectBgPos.display ? "opacity-100" : "opacity-0",
          selectBgPos.motionAnimate
            ? `${style["move-transition"]} ${selectBgPos.xDirection}`
            : "transition-[opacity]",
        )}
        style={{
          left: `${selectBgPos.left}%`,
          top: `${selectBgPos.top}%`,
          bottom: `${selectBgPos.bottom}%`,
          right: `${selectBgPos.right}%`,
        }}
      ></div>
      {Children.map(children, (child: React.ReactNode, key) => {
        if (!isValidElement(child)) return;
        const itemEle = useRef<HTMLDivElement>(null);
        const [isDisable, setIsDisable] = useState(
          child.props.disabled || false,
        );

        useEffect(() => {
          if (child.props.value === value && isDomReady.current === -1) {
            isDomReady.current = 0;
            if (triggerOnMount) {
              trigger(key);
            } else {
              activeItem(key);
            }
          }
        }, []);

        return (
          <div
            className={cn(
              "z-10 flex flex-1 items-center justify-center rounded-lg px-2",
              isDisable ? "cursor-not-allowed" : "cursor-pointer",
            )}
            key={key}
            ref={itemEle}
            onClick={() => trigger(key)}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

export function RadioGroupOption({
  children,
  disabled,
  value,
  className,
}: {
  disabled?: boolean;
  children?: React.ReactNode;
  value: any;
  className?: ClassValue;
}) {
  return children;
}
