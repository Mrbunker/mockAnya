import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nowString(): string {
  const raw = new Date().toLocaleString();
  return raw.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_");
}
