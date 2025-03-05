import { clsx, type ClassValue } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export type Timer = ReturnType<typeof setTimeout>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMiddle() {
  return window.matchMedia("(max-width: 768px)").matches;
}

export function isSmall() {
  return window.matchMedia("(max-width: 640px)").matches;
}

export function dangerousUUIDV4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      func(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          lastTime = Date.now();
          timeoutId = null;
          func(...args);
        },
        wait - (now - lastTime),
      );
    }
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

let IS_ENTER_INDEX = ["", "#", "#/"].includes(window.location.hash);
if (IS_ENTER_INDEX) {
  setTimeout(() => {
    IS_ENTER_INDEX = false;
  }, 1500);
}

export function isEnterIndex() {
  return IS_ENTER_INDEX;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 0) {
    throw new Error("文件大小不能为负数");
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;

  while (bytes >= 1024 && unitIndex < units.length - 1) {
    bytes /= 1024;
    unitIndex++;
  }

  // 保留两位小数
  return `${bytes.toFixed(1)} ${units[unitIndex]}`;
}

export class CustomError extends Error {
  constructor(Name: string, ...params: any[]) {
    super(...params); // 调用父类 Error 的构造函数，传入剩余的参数
    this.name = Name; // 设置 Error 的 name 属性为传入的 Name
  }
}

export const TIMEOUT_ERROR = "TimeoutError";

/**
 * 为 Promise 添加超时控制的函数
 * @param promise 原始 Promise 对象 或 Promise 工厂函数（支持惰性执行）
 * @param timeoutMs 超时时间（毫秒）
 * @returns 带有超时控制的 Promise
 */
export function promiseWithTimeout<T>(
  promise: Promise<T> | (() => Promise<T>),
  timeoutMs: number,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    // 创建超时定时器
    const timeoutId = setTimeout(() => {
      reject(
        new CustomError(
          TIMEOUT_ERROR,
          `Promise timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    try {
      // 处理 Promise 工厂函数的情况
      const actualPromise = typeof promise === "function" ? promise() : promise;

      // 等待原始 Promise 完成
      const result = await actualPromise;

      // 清除超时定时器
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      // 清除超时定时器并传播错误
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

const MOBILE_BREAKPOINT = 768;

export function useMaxWidthBreakpoint({
  breakpoint = MOBILE_BREAKPOINT,
}: {
  breakpoint?: number;
}) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useSuspendUntilValid<T>(state: T, onSuspend?: () => void) {
  const pendingChecks = useRef<
    Array<{
      validate: (currentState: T) => boolean;
      resolve: () => void;
      reject: (reason?: any) => void;
    }>
  >([]);

  // 状态变化时触发挂起检查
  useEffect(() => {
    pendingChecks.current = pendingChecks.current.filter((check) => {
      const isValid = check.validate(state);
      if (isValid) check.resolve();
      return !isValid;
    });
  }, [state]);

  // 组件卸载时清理未完成检查
  useEffect(
    () => () => {
      pendingChecks.current.forEach((check) =>
        check.reject(new Error("Component unmounted")),
      );
      pendingChecks.current = [];
    },
    [],
  );

  const suspendUntilValid = useCallback(
    async (validate: (currentState: T) => boolean) => {
      if (validate(state)) return;

      onSuspend?.();

      return new Promise<void>((resolve, reject) => {
        pendingChecks.current.push({ validate, resolve, reject });
      });
    },
    [state, onSuspend],
  );

  return suspendUntilValid;
}
