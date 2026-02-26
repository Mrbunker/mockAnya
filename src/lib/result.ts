export const ERROR_CODE = {
  unknown: "unknown",
  canceled: "canceled",
  invalidParam: "invalid_param",
  notFound: "not_found",
  unavailable: "unavailable",
  timeout: "timeout",
  rejected: "rejected",
  invalidChannel: "invalid_channel",
  ffmpegNotFound: "ffmpeg_not_found",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export type AppError = {
  code: ErrorCode;
  message: string;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

const ERROR_MESSAGE: Record<ErrorCode, string> = {
  [ERROR_CODE.unknown]: "未知错误",
  [ERROR_CODE.canceled]: "已取消",
  [ERROR_CODE.invalidParam]: "参数错误",
  [ERROR_CODE.notFound]: "资源不存在",
  [ERROR_CODE.unavailable]: "当前环境不可用",
  [ERROR_CODE.timeout]: "请求超时",
  [ERROR_CODE.rejected]: "请求失败",
  [ERROR_CODE.invalidChannel]: "通道不可用",
  [ERROR_CODE.ffmpegNotFound]: "未找到 ffmpeg",
};

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: ErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

export function getErrorMessageFromUnknown(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

export function getErrorDisplayMessage(error: AppError, fallback?: string) {
  if (error.code === ERROR_CODE.unknown) {
    return error.message || fallback || ERROR_MESSAGE[ERROR_CODE.unknown];
  }
  return ERROR_MESSAGE[error.code] || error.message || fallback || "未知错误";
}

export function isCanceledResult(result: Result<unknown>) {
  return !result.ok && result.error.code === ERROR_CODE.canceled;
}
