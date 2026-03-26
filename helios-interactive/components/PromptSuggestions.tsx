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
  const getAvailablePrompts = (): {
    story: Story;
    prompt: StoryPrompt;
    step: number;
  }[] => {
    if (!selectedStoryId) {
      return stories.map((story) => ({
        story,
        prompt: story.startPrompt,
        step: 0,
      }));
    }

    const story = stories.find((s) => s.id === selectedStoryId);
    if (!story) return [];

    if (currentStep >= story.followUps.length) return [];

    return [
      {
        story,
        prompt: story.followUps[currentStep],
        step: currentStep + 1,
      },
    ];
  };

  const availablePrompts = getAvailablePrompts();

  if (availablePrompts.length === 0) {
    return null;
  }

  const isStartingPrompts = !selectedStoryId;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground uppercase">
          {isStartingPrompts ? "Choose Your Story" : "Continue Your Story"}
        </span>
        {!isStartingPrompts && (
          <span className="text-[11px] text-muted-foreground">
            Step {currentStep + 1} /{" "}
            {stories.find((s) => s.id === selectedStoryId)?.followUps.length ||
              0}
          </span>
        )}
      </div>

      <div
        className={cn(
          "grid gap-1.5",
          isStartingPrompts ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {availablePrompts.map(({ story, prompt, step }) => (
          <button
            key={prompt.id}
            onClick={() => onPromptSelect(story.id, prompt, step)}
            disabled={disabled}
            className="group rounded-lg border border-border bg-muted/50 hover:bg-muted px-2.5 py-2 text-left transition-all duration-200 hover:border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <h3 className="text-xs font-medium text-foreground">
                {prompt.title}
              </h3>
              {isStartingPrompts && (
                <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                  Start
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {prompt.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
