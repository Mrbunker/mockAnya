import { ipcRenderer, contextBridge } from 'electron'
import {
  IPC_EVENT_WHITELIST,
  IPC_INVOKE_WHITELIST,
  type IpcEventChannel,
  type IpcEventArgs,
  type IpcInvokeChannel,
  type IpcInvokeArgs,
  type IpcInvokeRes,
  type IpcRendererBridge,
} from '../src/ipc/contract'

const invokeChannelSet = new Set<string>(IPC_INVOKE_WHITELIST)
const eventChannelSet = new Set<string>(IPC_EVENT_WHITELIST)
const sendChannelSet = new Set<string>()

// eslint-disable-next-line @typescript-eslint/ban-types
const onListenerMap = new Map<string, WeakMap<Function, Function>>()

function requireAllowed(set: Set<string>, channel: string) {
  if (!set.has(channel)) throw new Error(`IPC channel not allowed: ${channel}`)
}

const api: IpcRendererBridge = {
  on<C extends IpcEventChannel>(
    channel: C,
    listener: (
      event: import('electron').IpcRendererEvent,
      ...args: IpcEventArgs<C>
    ) => void,
  ) {
    requireAllowed(eventChannelSet, channel)
    let wm = onListenerMap.get(channel)
    if (!wm) {
      wm = new WeakMap()
      onListenerMap.set(channel, wm)
    }
    const wrapped = (event: import('electron').IpcRendererEvent, ...args: unknown[]) =>
      (listener as (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void)(
        event,
        ...(args as unknown[]),
      )
    wm.set(listener, wrapped)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcRenderer.on(channel, wrapped as any)
  },
  off<C extends IpcEventChannel>(
    channel: C,
    listener: (
      event: import('electron').IpcRendererEvent,
      ...args: IpcEventArgs<C>
    ) => void,
  ) {
    requireAllowed(eventChannelSet, channel)
    const wrapped = onListenerMap.get(channel)?.get(listener)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcRenderer.off(channel, (wrapped ?? listener) as any)
  },
  send(channel: string, ...args: unknown[]) {
    requireAllowed(sendChannelSet, channel)
    ipcRenderer.send(channel, ...args)
  },
  invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: IpcInvokeArgs<C>
  ): Promise<IpcInvokeRes<C>> {
    requireAllowed(invokeChannelSet, channel)
    return ipcRenderer.invoke(channel, ...(args as unknown[])) as Promise<IpcInvokeRes<C>>
  },
}

contextBridge.exposeInMainWorld('ipcRenderer', api)
