"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function StopGenerationDialog({
  open,
  isStopping,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  isStopping: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  // DRAFT copy for Sandra approval before release.
  return (
    <Dialog open={open} onOpenChange={(next) => !isStopping && onOpenChange(next)}>
      <DialogContent className="max-w-sm" showCloseButton={!isStopping}>
        <DialogHeader>
          <DialogTitle>Stop this generation?</DialogTitle>
          <DialogDescription>
            If the photo does not complete, your credit will be refunded.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isStopping} onClick={() => onOpenChange(false)}>
            Keep creating
          </Button>
          <Button type="button" disabled={isStopping} onClick={onConfirm}>
            {isStopping ? "Stopping..." : "Stop generation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
