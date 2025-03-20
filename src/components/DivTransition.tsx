import { useEffect, useRef } from "react";

export function DivSizeTransition({
  children,
  trigger,
  ref: refProp,
  style,
  transitionProps = { height: false, width: true },
  ...prop
}: {
  children: React.ReactNode;
  trigger?: any;
  ref?: React.RefObject<HTMLDivElement>;
  style?: React.CSSProperties;
  transitionProps?: { height?: boolean; width?: boolean };
} & React.HTMLAttributes<HTMLDivElement>) {
  const eleRef = refProp || useRef<HTMLDivElement>(null);
  const prevDimensionsRef = useRef<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const element = eleRef.current;
    if (!element) return;

    const styles = window.getComputedStyle(element);

    const currentWidth =
      parseFloat(styles.width) +
      parseFloat(styles.paddingLeft) +
      parseFloat(styles.paddingRight);

    const currentHeight =
      parseFloat(styles.height) +
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom);

    if (prevDimensionsRef.current === null) {
      prevDimensionsRef.current = {
        width: currentWidth,
        height: currentHeight,
      };
      return;
    }

    if (
      currentWidth === prevDimensionsRef.current.width &&
      currentHeight === prevDimensionsRef.current.height
    )
      return;

    if (transitionProps.height) {
      element.style.height = `${prevDimensionsRef.current.height}px`;
      // element.style.maxHeight = "none";
    }
    if (transitionProps.width) {
      element.style.width = `${prevDimensionsRef.current.width}px`;
      // element.style.maxWidth = "none";
    }
    element.style.transition = "none";

    requestAnimationFrame(() => {
      if (transitionProps.height) {
        element.style.height = `${currentHeight}px`;
      }
      if (transitionProps.width) {
        element.style.width = `${currentWidth}px`;
      }
      element.style.transition = "";

      // Play: 在下一帧启动过渡到新尺寸
      const onTransitionEnd = () => {
        if (!element) return;

        if (transitionProps.height) {
          element.style.height = "";
          // element.style.maxHeight = "";
        }
        if (transitionProps.width) {
          element.style.width = "";
          // element.style.maxWidth = "";
        }

        element.style.transition = "";

        prevDimensionsRef.current = {
          width: currentWidth,
          height: currentHeight,
        };

        element.removeEventListener("transitionend", onTransitionEnd);
      };

      element.addEventListener("transitionend", onTransitionEnd);
    });
  }, [trigger !== undefined ? trigger : children]);

  return (
    <div
      {...prop}
      ref={eleRef}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}
