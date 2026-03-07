"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  shareUrl: string;
  onClose: () => void;
}

export function ShareDialog({ open, shareUrl, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCopied(false);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  }, [shareUrl]);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Share Timeline</AlertDialogTitle>
          <AlertDialogDescription>
            Copy this link to share your prompt timeline. Anyone with this link
            can load the same prompts.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            readOnly
            value={shareUrl}
            className="flex-1 min-w-0 rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground truncate"
            onFocus={(e) => e.target.select()}
          />
          <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
