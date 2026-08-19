import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function apiMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback
}
