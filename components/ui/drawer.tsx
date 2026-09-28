"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "@/lib/utils"

type DrawerContextProps = {
  modal: DrawerPrimitive.Root.Props["modal"]
  swipeAxis: "x" | "y"
}

const DrawerContext = React.createContext<DrawerContextProps | null>(null)

function useDrawer() {
  const context = React.useContext(DrawerContext)

  if (!context) {
    throw new Error("useDrawer must be used within a Drawer.")
  }

  return context
}

function Drawer({ swipeDirection = "down", ...props }: DrawerPrimitive.Root.Props) {
  const swipeAxis: "x" | "y" =
    swipeDirection === "down" || swipeDirection === "up" ? "y" : "x"
  const modal = props.modal ?? true
  const contextValue = React.useMemo(
    () => ({ modal, swipeAxis }),
    [modal, swipeAxis]
  )

  return (
    <DrawerContext.Provider value={contextValue}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerSwipeHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      className={cn(
        "relative z-10 mx-auto mt-3 h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-zinc-200 dark:bg-zinc-700 active:cursor-grabbing",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  const { modal, swipeAxis } = useDrawer()

  return (
    <DrawerPortal data-slot="drawer-portal">
      {modal === true && <DrawerOverlay />}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        data-modal={modal}
        className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          className={cn(
            // Floating card look: keep space from the viewport edges.
            "group/drawer-popup pointer-events-auto fixed z-50 flex min-h-0 flex-col",
            "rounded-2xl border border-black/[0.06] dark:border-white/[0.08]",
            "bg-white dark:bg-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
            "outline-none will-change-transform",
            // Transitions.
            "transition-[transform] duration-300 ease-out",
            // Axis x (left/right): full height floating from the vertical edges.
            "data-[swipe-axis=x]:inset-y-3 data-[swipe-axis=x]:w-3/4 data-[swipe-axis=x]:sm:w-96 data-[swipe-axis=x]:max-w-[92vw]",
            // Direction: right.
            "data-[swipe-direction=right]:right-2",
            "data-[swipe-direction=right]:data-starting-style:translate-x-[calc(100%+2.5rem)]",
            "data-[swipe-direction=right]:data-ending-style:translate-x-[calc(100%+2.5rem)]",
            // Direction: left.
            "data-[swipe-direction=left]:left-2",
            "data-[swipe-direction=left]:data-starting-style:-translate-x-[calc(100%+2.5rem)]",
            "data-[swipe-direction=left]:data-ending-style:-translate-x-[calc(100%+2.5rem)]",
            // Axis y (top/bottom).
            "data-[swipe-axis=y]:inset-x-3 data-[swipe-axis=y]:max-h-[calc(100dvh-1.5rem)]",
            "data-[swipe-direction=down]:bottom-1.5",
            "data-[swipe-direction=down]:data-starting-style:translate-y-[calc(100%+2.5rem)]",
            "data-[swipe-direction=down]:data-ending-style:translate-y-[calc(100%+2.5rem)]",
            "data-[swipe-direction=up]:top-1.5",
            "data-[swipe-direction=up]:data-starting-style:-translate-y-[calc(100%+2.5rem)]",
            "data-[swipe-direction=up]:data-ending-style:-translate-y-[calc(100%+2.5rem)]",
            className
          )}
          {...props}
        >
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex shrink-0 flex-col gap-0.5 p-4 pb-5 sm:p-5 sm:pb-6",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto flex shrink-0 flex-col gap-2 p-4 sm:p-5",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn(
        "text-[13px] font-light text-zinc-500 dark:text-zinc-400",
        className
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}