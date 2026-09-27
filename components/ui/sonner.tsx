"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Below this width the fixed `MobileBottomNav` is on screen, so bottom-anchored
 * toasts sit on top of the primary navigation (issue #733). Matches the `sm`
 * breakpoint the rest of the app shell switches at.
 */
const MOBILE_VIEWPORT_QUERY = "(max-width: 639px)"

/**
 * Height of the sticky app header (`Topbar` is `h-16`). A top-anchored toast
 * would otherwise cover the header and its menu button, trading one obscured
 * control for another, so mobile toasts are pushed clear of it.
 */
const HEADER_OFFSET_REM = 4

/**
 * Sonner applies `--mobile-offset-*` instead of `--offset-*` below 600px, so the
 * mobile offset has to be passed as `mobileOffset` as well or it is ignored on
 * exactly the small phones this fix targets.
 */
const MOBILE_OFFSET = {
  top: `calc(${HEADER_OFFSET_REM}rem + env(safe-area-inset-top) + 0.5rem)`,
}

/**
 * Track whether the viewport is narrow enough to show the bottom navigation.
 *
 * Sonner has no responsive `position` prop, so the breakpoint is resolved here.
 * State starts `false` and is corrected in an effect: reading `matchMedia`
 * during render would produce a server/client mismatch, and toasts are only ever
 * triggered by a user action long after mount, so nothing is ever seen in the
 * wrong position.
 */
function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    setIsMobile(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const isMobileViewport = useIsMobileViewport()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Keep toasts off the mobile bottom nav, but preserve the desktop
      // bottom-right default. A caller-supplied `position` still wins, since
      // `props` is spread last.
      position={isMobileViewport ? "top-center" : "bottom-right"}
      offset={isMobileViewport ? MOBILE_OFFSET : undefined}
      mobileOffset={isMobileViewport ? MOBILE_OFFSET : undefined}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
