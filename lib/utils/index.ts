import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ROUTES } from "@/lib/navigation/routes"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultRoute(role?: string | null) {
  return role === 'admin' ? ROUTES.OVERVIEW : ROUTES.DASHBOARD;
}
