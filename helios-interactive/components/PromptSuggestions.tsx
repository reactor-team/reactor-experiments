"use client";

import { stories, type Story, type StoryPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  selectedStoryId: string | null;
  currentStep: number;
  onPromptSelect: (
    storyId: string,
    prompt: StoryPrompt,
    step: number,
  ) => void;
  disabled?: boolean;
}

export function PromptSuggestions({
  selectedStoryId,
  currentStep,
  onPromptSelect,
  disabled = false,
}: PromptSuggestionsProps) {
  const activeStory = selectedStoryId
    ? stories.find((s) => s.id === selectedStoryId)
    : null;
  const totalSteps = activeStory?.followUps.length ?? 0;
  const isComplete = activeStory ? currentStep >= totalSteps : false;
  const nextPrompt =
    activeStory && !isComplete ? activeStory.followUps[currentStep] : null;

  return (
    <div className="space-y-2">
      <span className="text-[11px] text-muted-foreground uppercase">
        {selectedStoryId ? "Your Story" : "Choose a Story"}
      </span>

      {/* Story cards — always visible */}
      <div className="grid grid-cols-1 gap-1.5">
        {stories.map((story) => {
          const isSelected = selectedStoryId === story.id;
          const isOther = selectedStoryId && !isSelected;

          return (
            <button
              key={story.id}
              onClick={() => {
                if (!isSelected) {
                  onPromptSelect(story.id, story.startPrompt, 0);
                }
              }}
              disabled={disabled || isSelected}
              className={cn(
                "group rounded-lg border px-2.5 text-left transition-all duration-300",
                isSelected
                  ? "border-green-500/30 bg-green-500/5 py-2"
                  : isOther
                    ? "border-border/50 bg-muted/20 py-1.5 opacity-50 hover:opacity-80"
                    : "border-border bg-muted/50 hover:bg-muted py-2 hover:border-foreground/20",
                disabled && !isSelected && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={cn(
                    "font-medium transition-all",
                    isSelected
                      ? "text-xs text-green-500"
                      : isOther
                        ? "text-[11px] text-muted-foreground"
                        : "text-xs text-foreground",
                  )}
                >
                  {isSelected && "\u2713 "}
                  {story.title}
                </h3>
                {!selectedStoryId && (
                  <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                    Start
                  </span>
                )}
                {isSelected && (
                  <span className="text-[10px] text-muted-foreground">
                    {isComplete
                      ? "Done"
                      : `Step ${currentStep + 1}/${totalSteps}`}
                  </span>
                )}
              </div>
              {/* Description — only when no story selected */}
              {!selectedStoryId && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {story.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Next step for active story */}
      {activeStory && (
        <div className="space-y-2">
          {/* Next step */}
          {nextPrompt && (
            <button
              onClick={() =>
                onPromptSelect(
                  activeStory.id,
                  nextPrompt,
                  currentStep + 1,
                )
              }
              disabled={disabled}
              className="w-full rounded-lg border border-border bg-muted/50 hover:bg-muted px-2.5 py-1.5 text-left transition-all hover:border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <h3 className="text-xs font-medium text-foreground">
                {nextPrompt.title}
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                Next
              </span>
            </button>
          )}

          {/* Complete */}
          {isComplete && (
            <p className="text-[11px] text-muted-foreground text-center py-1">
              Story complete. Write a custom prompt or reset.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
