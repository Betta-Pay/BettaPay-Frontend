"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

/**
 * Opt-in configuration for mirroring a dropdown's open state into the URL.
 *
 * Pass a string for the common case (query-string key) or an object when the
 * menu needs the hash fragment instead of the query string, or a value other
 * than the default `"open"`.
 *
 * @example
 * <DropdownMenu urlParam="menu">        // ?menu=open while open
 * <DropdownMenu urlParam={{ key: "menu", hash: true }}>  // #menu=open while open
 */
export type DropdownMenuUrlParam =
  | string
  | {
      /** Query-string (or hash) key that mirrors the open state. */
      key: string
      /** Value written to the URL while the menu is open. Default: `"open"`. */
      value?: string
      /** Mirror the state into the hash fragment instead of the query string. */
      hash?: boolean
    }

const DEFAULT_URL_OPEN_VALUE = "open"

function readUrlOpenState(
  key: string,
  value: string,
  useHash: boolean
): boolean {
  if (typeof window === "undefined") return false
  try {
    if (useHash) {
      const hash = window.location.hash.replace(/^#/, "")
      if (!hash) return false
      const separator = hash.indexOf("=")
      // Both `#menu` and `#menu=open` mean "open".
      if (hash.slice(0, separator === -1 ? hash.length : separator) !== key) {
        return false
      }
      return separator === -1 || hash.slice(separator + 1) === value
    }
    return new URLSearchParams(window.location.search).get(key) === value
  } catch {
    return false
  }
}

function writeUrlOpenState(
  key: string,
  value: string,
  useHash: boolean,
  nextOpen: boolean
) {
  if (typeof window === "undefined") return
  try {
    const url = new URL(window.location.href)
    if (useHash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""))
      if (nextOpen) {
        hashParams.set(key, value)
      } else {
        hashParams.delete(key)
      }
      url.hash = hashParams.toString()
    } else if (nextOpen) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
    // `replaceState` (not `pushState`) so toggling a menu never floods the
    // history stack, and the existing state object is preserved because the
    // Next.js router keeps its own data there.
    window.history.replaceState(window.history.state, "", url.toString())
  } catch {
    // `replaceState` can throw in some sandboxed iframes — the menu still works.
  }
}

/**
 * Dropdown menu root.
 *
 * By default the open state is local to the component (ephemeral). Pass
 * `urlParam` to opt into URL-driven state for menus that carry critical
 * navigation: the menu then initialises from the URL, writes/removes the param
 * on every open/close, and follows back/forward navigation — so reloading or
 * sharing the URL keeps the menu open (issue #759).
 *
 * When both `urlParam` and `open` are supplied the caller stays the source of
 * truth for the open state and the URL is only kept in sync.
 */
function DropdownMenu({
  urlParam,
  open: openProp,
  onOpenChange,
  ...props
}: MenuPrimitive.Root.Props & { urlParam?: DropdownMenuUrlParam }) {
  const urlKey = typeof urlParam === "string" ? urlParam : urlParam?.key
  const urlValue =
    (typeof urlParam === "string" ? undefined : urlParam?.value) ??
    DEFAULT_URL_OPEN_VALUE
  const useUrlHash = (typeof urlParam === "string" ? false : urlParam?.hash) ?? false
  const [urlOpen, setUrlOpen] = React.useState(false)

  // Read the URL after mount rather than during render so server and client
  // markup match, and keep following back/forward navigation.
  React.useEffect(() => {
    if (!urlKey) return

    const syncFromUrl = () => {
      setUrlOpen(readUrlOpenState(urlKey, urlValue, useUrlHash))
    }

    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener("hashchange", syncFromUrl)

    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener("hashchange", syncFromUrl)
    }
  }, [urlKey, urlValue, useUrlHash])

  const handleOpenChange = React.useCallback<
    NonNullable<MenuPrimitive.Root.Props["onOpenChange"]>
  >(
    (nextOpen, eventDetails) => {
      if (urlKey) {
        setUrlOpen(nextOpen)
        writeUrlOpenState(urlKey, urlValue, useUrlHash, nextOpen)
      }
      onOpenChange?.(nextOpen, eventDetails)
    },
    [urlKey, urlValue, useUrlHash, onOpenChange]
  )

  // Without `urlParam` and without caller-supplied state this stays an
  // uncontrolled menu, exactly as before.
  if (!urlKey && openProp === undefined && onOpenChange === undefined) {
    return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
  }

  const open = openProp === undefined && urlKey ? urlOpen : openProp

  return (
    <MenuPrimitive.Root
      data-slot="dropdown-menu"
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  )
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn("z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
