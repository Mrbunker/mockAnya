import {
  IPC_INVOKE,
  IPC_INVOKE_WHITELIST,
  type IpcInvokeArgs,
  type IpcInvokeChannel,
  type IpcInvokeRes,
} from "./contract";
import {
  ERROR_CODE,
  err,
  getErrorMessageFromUnknown,
  type ErrorCode,
} from "../lib/result";

const DEFAULT_TIMEOUT_MS = 15000;

const invokeChannelSet = new Set<string>(IPC_INVOKE_WHITELIST);

function clientError<C extends IpcInvokeChannel>(
  code: ErrorCode,
  message: string,
) {
  return err(code, message) as IpcInvokeRes<C>;
}

function timeoutMsForInvoke(
  channel: IpcInvokeChannel,
  payload: unknown | undefined,
) {
  if (channel === IPC_INVOKE.generateVideo) {
    const d =
      typeof payload === "object" && payload && "duration" in payload
        ? Number((payload as { duration?: unknown }).duration)
        : 0;
    const base = (Number.isFinite(d) && d > 0 ? d : 0) * 1000;
    return Math.min(
      2 * 60 * 60 * 1000,
      Math.max(DEFAULT_TIMEOUT_MS, base + 60000),
    );
  }
  if (channel === IPC_INVOKE.generateAudio) {
    const d =
      typeof payload === "object" && payload && "duration" in payload
        ? Number((payload as { duration?: unknown }).duration)
        : 0;
    const base = (Number.isFinite(d) && d > 0 ? d : 0) * 1000;
    return Math.min(
      2 * 60 * 60 * 1000,
      Math.max(DEFAULT_TIMEOUT_MS, base + 60000),
    );
  }
  if (channel === IPC_INVOKE.generatePdf) {
    return Math.max(DEFAULT_TIMEOUT_MS, 30000);
  }
  return DEFAULT_TIMEOUT_MS;
}

export class IpcClient {
  isAvailable() {
    return Boolean(window.ipcRenderer?.invoke);
  }

  async invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: IpcInvokeArgs<C>
  ): Promise<IpcInvokeRes<C>> {
    if (!invokeChannelSet.has(channel)) {
      return clientError(
        ERROR_CODE.invalidChannel,
        `invalid channel: ${channel}`,
      );
    }

    const ipc = window.ipcRenderer;
    if (!ipc?.invoke) return clientError(ERROR_CODE.unavailable, "unavailable");

    const payload = (args as unknown[])[0];
    const timeoutMs = timeoutMsForInvoke(channel, payload);
    let timer: number | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = window.setTimeout(
          () => reject(new Error("timeout")),
          timeoutMs,
        );
      });
      const res = (await Promise.race([
        ipc.invoke(channel, ...args),
        timeoutPromise,
      ])) as IpcInvokeRes<C>;
      return res;
    } catch (e: unknown) {
      const msg = getErrorMessageFromUnknown(e);
      const code = msg === "timeout" ? ERROR_CODE.timeout : ERROR_CODE.rejected;
      return clientError(code, msg);
    } finally {
      if (typeof timer === "number") window.clearTimeout(timer);
    }
  }
}

export const ipcClient = new IpcClient();
