/**
 * Type definitions for the Film Director demo (Helios model)
 */

// ==================== Model Protocol Types ====================

export interface ModelState {
  running: boolean;
  current_frame: number;
  current_chunk: number;
  current_prompt: string | null;
  paused: boolean;
  scheduled_prompts: Record<number, string>;
}

export interface StateMessage {
  type: "state";
  data: ModelState;
}

export interface EventData {
  event: string;
  frame?: number;
  chunk?: number;
  prompt?: string;
  message?: string;
  new_prompt?: string;
  previous_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface EventMessage {
  type: "event";
  data: EventData;
}

export type HeliosMessage = StateMessage | EventMessage;

// ==================== Application Types ====================

export interface PromptMarker {
  chunk: number;
  prompt: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "waiting" | "connected";

export type PlaybackState = "stopped" | "playing" | "paused";
