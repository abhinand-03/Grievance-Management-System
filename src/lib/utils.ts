import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const legacyPrefix = '/Grievance%20Management%20System/api';
  const isDevVite = typeof window !== 'undefined' && window.location.port === '8080';

  if (isDevVite && url.startsWith(legacyPrefix)) {
    return url.replace(legacyPrefix, '/api');
  }

  return url;
}
