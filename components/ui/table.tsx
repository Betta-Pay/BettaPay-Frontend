"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface VirtualWindowParams {
  count: number
  rowHeight?: number
  viewportHeight?: number
  scrollTop?: number
  overscan?: number
}

export interface VirtualItem {
  index: number
  start: number
  size: number
}

export interface VirtualWindowResult {
  startIndex: number
  endIndex: number
  topPadding: number
  bottomPadding: number
  totalSize: number
  virtualItems: VirtualItem[]
}

export function calculateVirtualWindow({
  count,
  rowHeight = 48,
  viewportHeight = 480,
  scrollTop = 0,
  overscan = 5,
}: VirtualWindowParams): VirtualWindowResult {
  const safeCount = Math.max(0, count)
  const safeRowHeight = Math.max(1, rowHeight)
  const safeViewportHeight = Math.max(safeRowHeight, viewportHeight)
  const safeOverscan = Math.max(0, overscan)
  const clampedScrollTop = Math.max(0, scrollTop)

  const totalSize = safeCount * safeRowHeight
  if (safeCount === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topPadding: 0,
      bottomPadding: 0,
      totalSize: 0,
      virtualItems: [],
    }
  }

  const visibleStart = Math.min(
    safeCount - 1,
    Math.floor(clampedScrollTop / safeRowHeight)
  )
  const visibleCount = Math.ceil(safeViewportHeight / safeRowHeight)

  const startIndex = Math.max(0, visibleStart - safeOverscan)
  const endIndex = Math.min(
    safeCount,
    visibleStart + visibleCount + safeOverscan
  )

  const topPadding = startIndex * safeRowHeight
  const bottomPadding = Math.max(0, (safeCount - endIndex) * safeRowHeight)

  const virtualItems: VirtualItem[] = []
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * safeRowHeight,
      size: safeRowHeight,
    })
  }

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    totalSize,
    virtualItems,
  }
}

export function useVirtualTableRows({
  count,
  rowHeight = 48,
  viewportHeight = 480,
  overscan = 5,
  initialScrollTop = 0,
}: {
  count: number
  rowHeight?: number
  viewportHeight?: number
  overscan?: number
  initialScrollTop?: number
}) {
  const [scrollTop, setScrollTop] = React.useState(initialScrollTop)
  const [measuredHeight, setMeasuredHeight] = React.useState(viewportHeight)

  const onScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const target = event.currentTarget
      setScrollTop(target.scrollTop)
      if (target.clientHeight > 0) {
        setMeasuredHeight(target.clientHeight)
      }
    },
    []
  )

  const windowResult = React.useMemo(
    () =>
      calculateVirtualWindow({
        count,
        rowHeight,
        viewportHeight: measuredHeight || viewportHeight,
        scrollTop,
        overscan,
      }),
    [count, rowHeight, measuredHeight, viewportHeight, scrollTop, overscan]
  )

  return {
    ...windowResult,
    scrollTop,
    setScrollTop,
    onScroll,
  }
}

interface TableVirtualContextValue {
  virtualized: boolean
  rowHeight: number
  viewportHeight: number
  overscan: number
  scrollTop: number
}

const TableVirtualContext =
  React.createContext<TableVirtualContextValue | null>(null)

export interface TableProps extends React.ComponentProps<"table"> {
  virtualized?: boolean
  rowHeight?: number
  maxHeight?: number
  overscan?: number
}

function Table({
  className,
  virtualized = false,
  rowHeight = 48,
  maxHeight = 480,
  overscan = 5,
  ...props
}: TableProps) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const [viewportHeight, setViewportHeight] = React.useState(maxHeight)

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!virtualized) return
      const target = event.currentTarget
      setScrollTop(target.scrollTop)
      if (target.clientHeight > 0) {
        setViewportHeight(target.clientHeight)
      }
    },
    [virtualized]
  )

  const contextValue = React.useMemo<TableVirtualContextValue>(
    () => ({
      virtualized,
      rowHeight,
      viewportHeight: viewportHeight || maxHeight,
      overscan,
      scrollTop,
    }),
    [virtualized, rowHeight, viewportHeight, maxHeight, overscan, scrollTop]
  )

  return (
    <TableVirtualContext.Provider value={contextValue}>
      <div
        data-slot="table-container"
        onScroll={virtualized ? handleScroll : undefined}
        style={virtualized ? { maxHeight } : undefined}
        className={cn(
          "relative w-full overflow-x-auto",
          virtualized && "overflow-y-auto"
        )}
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </TableVirtualContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

export interface TableBodyProps extends React.ComponentProps<"tbody"> {
  virtualized?: boolean
  rowHeight?: number
  viewportHeight?: number
  overscan?: number
}

function TableBody({
  className,
  children,
  virtualized: virtualizedProp,
  rowHeight: rowHeightProp,
  viewportHeight: viewportHeightProp,
  overscan: overscanProp,
  ...props
}: TableBodyProps) {
  const ctx = React.useContext(TableVirtualContext)
  const isVirtualized = virtualizedProp ?? ctx?.virtualized ?? false

  if (!isVirtualized) {
    return (
      <tbody
        data-slot="table-body"
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
      >
        {children}
      </tbody>
    )
  }

  const rows = React.Children.toArray(children)
  const rowHeight = rowHeightProp ?? ctx?.rowHeight ?? 48
  const viewportHeight = viewportHeightProp ?? ctx?.viewportHeight ?? 480
  const overscan = overscanProp ?? ctx?.overscan ?? 5
  const scrollTop = ctx?.scrollTop ?? 0

  const { startIndex, endIndex, topPadding, bottomPadding } =
    calculateVirtualWindow({
      count: rows.length,
      rowHeight,
      viewportHeight,
      scrollTop,
      overscan,
    })

  const visibleRows = rows.slice(startIndex, endIndex)

  return (
    <tbody
      data-slot="table-body"
      data-virtualized="true"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    >
      {topPadding > 0 && (
        <tr
          data-slot="table-virtual-spacer-top"
          aria-hidden="true"
          style={{ height: topPadding }}
        >
          <td colSpan={999} className="p-0 border-0" />
        </tr>
      )}
      {visibleRows}
      {bottomPadding > 0 && (
        <tr
          data-slot="table-virtual-spacer-bottom"
          aria-hidden="true"
          style={{ height: bottomPadding }}
        >
          <td colSpan={999} className="p-0 border-0" />
        </tr>
      )}
    </tbody>
  )
}

export interface VirtualizedTableBodyProps<T>
  extends Omit<React.ComponentProps<"tbody">, "children"> {
  items: readonly T[]
  renderRow: (item: T, index: number) => React.ReactNode
  rowHeight?: number
  viewportHeight?: number
  overscan?: number
}

function VirtualizedTableBody<T>({
  items,
  renderRow,
  rowHeight: rowHeightProp,
  viewportHeight: viewportHeightProp,
  overscan: overscanProp,
  className,
  ...props
}: VirtualizedTableBodyProps<T>) {
  const ctx = React.useContext(TableVirtualContext)
  const rowHeight = rowHeightProp ?? ctx?.rowHeight ?? 48
  const viewportHeight = viewportHeightProp ?? ctx?.viewportHeight ?? 480
  const overscan = overscanProp ?? ctx?.overscan ?? 5
  const scrollTop = ctx?.scrollTop ?? 0

  const { virtualItems, topPadding, bottomPadding } = calculateVirtualWindow({
    count: items.length,
    rowHeight,
    viewportHeight,
    scrollTop,
    overscan,
  })

  return (
    <tbody
      data-slot="table-body"
      data-virtualized="true"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    >
      {topPadding > 0 && (
        <tr
          data-slot="table-virtual-spacer-top"
          aria-hidden="true"
          style={{ height: topPadding }}
        >
          <td colSpan={999} className="p-0 border-0" />
        </tr>
      )}
      {virtualItems.map((virtualRow) => renderRow(items[virtualRow.index], virtualRow.index))}
      {bottomPadding > 0 && (
        <tr
          data-slot="table-virtual-spacer-bottom"
          aria-hidden="true"
          style={{ height: bottomPadding }}
        >
          <td colSpan={999} className="p-0 border-0" />
        </tr>
      )}
    </tbody>
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  VirtualizedTableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
