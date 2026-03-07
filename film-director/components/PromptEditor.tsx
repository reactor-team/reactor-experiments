"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles, Loader2 } from "lucide-react";

interface PromptEditorProps {
  open: boolean;
  chunk: number;
  initialPrompt?: string;
  isEditing: boolean;
  previousPrompts?: { chunk: number; prompt: string }[];
  onSave: (chunk: number, prompt: string) => void;
  onDelete?: (chunk: number) => void;
  onClose: () => void;
}

export function PromptEditor({
  open,
  chunk,
  initialPrompt = "",
  isEditing,
  previousPrompts = [],
  onSave,
  onDelete,
  onClose,
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setEnhancedPrompt("");
      setEnhanceError(null);
    }
  }, [open, initialPrompt]);

  const handleSave = useCallback(() => {
    const finalPrompt = enhancedPrompt.trim() || prompt.trim();
    if (finalPrompt) {
      onSave(chunk, finalPrompt);
      onClose();
    }
  }, [chunk, prompt, enhancedPrompt, onSave, onClose]);

  const handleEnhance = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setIsEnhancing(true);
    setEnhanceError(null);
    
    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          previousPrompts: previousPrompts.filter(p => p.chunk < chunk),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to enhance prompt");
      }
      
      setEnhancedPrompt(data.enhancedPrompt);
    } catch (error) {
      console.error("[PromptEditor] Enhancement error:", error);
      setEnhanceError(error instanceof Error ? error.message : "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  }, [prompt, previousPrompts, chunk]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(chunk);
      onClose();
    }
  }, [chunk, onDelete, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] grid-rows-[auto_1fr_auto]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isEditing ? "Edit Prompt" : "Add Prompt"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isEditing 
              ? `Editing prompt at chunk ${chunk}`
              : `Add a new prompt starting at chunk ${chunk}`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4 overflow-y-auto min-h-0">
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium">
              Prompt
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what should happen in the video..."
              className="mt-2 min-h-[80px] max-h-[150px] overflow-y-auto resize-none"
              autoFocus
            />
            
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleEnhance}
                disabled={!prompt.trim() || isEnhancing}
                className="gap-1.5"
              >
                {isEnhancing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
              </Button>
              {enhanceError && (
                <span className="text-xs text-destructive">{enhanceError}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="enhanced-prompt" className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Enhanced Prompt
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="enhanced-prompt"
              value={enhancedPrompt}
              onChange={(e) => setEnhancedPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Click 'Enhance Prompt' to generate an enhanced version, or leave empty to use the original..."
              className="mt-2 min-h-[80px] max-h-[150px] overflow-y-auto resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {enhancedPrompt.trim() 
                ? "This enhanced version will be used when you save."
                : "If empty, the original prompt above will be used."}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Press ⌘+Enter to save
          </p>
        </div>

        <AlertDialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {isEditing && onDelete && chunk !== 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={!prompt.trim() && !enhancedPrompt.trim()}
            >
              {isEditing ? "Update" : "Add"}
              {enhancedPrompt.trim() && " (Enhanced)"}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
