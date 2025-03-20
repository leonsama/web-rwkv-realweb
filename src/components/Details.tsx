import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../utils/utils";

export function Details({
  children,
  open = false,
  summary,
  onTrigger,
  classNameContent,
  className,
  ...prop
}: {
  children?: ReactNode;
  open?: boolean;
  summary?: ReactNode;
  classNameContent?: string;
  className?: string;
  onTrigger?: (isOpen: boolean) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [isOpen, setIsOpen] = useState(open);
  const [contentHeight, setContentHeight] = useState(0);
  const [enableAnimation, setEnableAnimaiton] = useState(false);
  const contentEle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeOberserver = new ResizeObserver(() => {
      setContentHeight(contentEle.current?.clientHeight || 0);
    });
    if (contentEle.current) {
      resizeOberserver.observe(contentEle.current);
    }
    return () => {
      resizeOberserver.disconnect();
    };
  }, []);

  return (
    <div
      {...prop}
      className={cn(
        "rounded-2xl transition-[background-color] duration-300",
        isOpen && "bg-white dark:bg-zinc-700",
      )}
    >
      {summary && (
        <div
          onClick={(e) => {
            if (onTrigger) onTrigger(!isOpen);
            setIsOpen(!isOpen);
            setEnableAnimaiton(true);
          }}
          className={cn("flex cursor-pointer justify-center px-2 py-4")}
        >
          {summary}
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="motion-preset-slide-up-md ml-auto size-5"
              key={2}
            >
              <path
                fillRule="evenodd"
                d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="motion-preset-slide-down-md ml-auto size-5"
              key={3}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      )}
      <div
        className={cn(
          "overflow-hidden",
          !isOpen && "opacity-0 select-none",
          enableAnimation &&
            "transition-[height,opacity,transform] duration-300",
        )}
        style={{
          height: isOpen
            ? contentHeight > 0
              ? `${contentHeight}px`
              : undefined
            : `0px`,
        }}
      >
        <div
          ref={contentEle}
          className={cn(
            "transition-[transform] duration-300",
            !isOpen && "scale-95",
          )}
        >
          <div className={cn(className)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
