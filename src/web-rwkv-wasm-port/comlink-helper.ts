import * as Comlink from "comlink";

import { asyncGeneratorTransferHandler } from "comlink-async-generator";
Comlink.transferHandlers.set("asyncGenerator", asyncGeneratorTransferHandler);

// abortsignal transfer handler from https://github.com/GoogleChromeLabs/comlink/issues/615

const signalFinalizers =
  "FinalizationRegistry" in globalThis
    ? // @ts-ignore
      new FinalizationRegistry(async (port: MessagePort) => {
        port.postMessage(null);
        port.close();
      })
    : undefined;

Comlink.transferHandlers.set("abortsignal", {
  canHandle(value) {
    return (
      value instanceof AbortSignal || value?.constructor?.name === "AbortSignal"
    );
  },
  serialize(signal) {
    if (signal.aborted) return [{ aborted: true }];

    const { port1, port2 } = new MessageChannel();
    signal.addEventListener(
      "abort",
      () => port1.postMessage({ reason: signal.reason }),
      { once: true }
    );

    port1.addEventListener("message", () => {}); // prevent port from being GC'd
    signalFinalizers?.register(signal, port1);

    return [{ aborted: false, port: port2 }, [port2]];
  },
  deserialize({ aborted, port }) {
    if (aborted || !port) return AbortSignal.abort();

    const ctrl = new AbortController();

    port.addEventListener(
      "message",
      (ev) => {
        if (ev.data && "reason" in ev.data) ctrl.abort(ev.data.reason);
        port.close();
      },
      { once: true }
    );

    port.start();

    return ctrl.signal;
  },
} as Comlink.TransferHandler<AbortSignal, { aborted: boolean; port?: MessagePort }>);

export { Comlink };
