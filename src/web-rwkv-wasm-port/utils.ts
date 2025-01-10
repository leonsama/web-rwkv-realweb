export function dangerousUUIDV4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function cleanPrompt(prompt: string) {
  return prompt.trim().replace(/\n+/g, "\n");
}

class AsyncLock {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(name: string): Promise<() => void> {
    while (this.locks.has(name)) {
      // 等待锁释放
      await this.locks.get(name);
    }

    // 创建一个新的 Promise 并存储在 Map 中
    let resolve: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    this.locks.set(name, promise);

    // 返回一个释放锁的函数
    return () => {
      this.locks.delete(name);
      resolve!();
    };
  }
}

// 使用示例
export const lock = new AsyncLock();
