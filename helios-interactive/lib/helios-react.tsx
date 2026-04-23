"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HeliosModel, type HeliosMessage } from "@reactor-models/helios";

export type HeliosStatus =
  | "disconnected"
  | "connecting"
  | "waiting"
  | "ready";

interface HeliosContextValue {
  helios: HeliosModel;
  status: HeliosStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const HeliosContext = createContext<HeliosContextValue | null>(null);

export function HeliosProvider({
  jwtToken,
  children,
}: {
  jwtToken?: string;
  children: ReactNode;
}) {
  const heliosRef = useRef<HeliosModel | null>(null);
  if (!heliosRef.current) {
    heliosRef.current = new HeliosModel();
  }
  const helios = heliosRef.current;

  const [status, setStatus] = useState<HeliosStatus>("disconnected");

  useEffect(() => {
    const handler = (next: HeliosStatus) => setStatus(next);
    helios.reactor.on("statusChanged", handler);
    return () => {
      helios.reactor.off("statusChanged", handler);
    };
  }, [helios]);

  const jwtRef = useRef(jwtToken);
  useEffect(() => {
    jwtRef.current = jwtToken;
  }, [jwtToken]);

  const connect = useCallback(async () => {
    await helios.connect(jwtRef.current);
  }, [helios]);

  const disconnect = useCallback(async () => {
    await helios.disconnect();
  }, [helios]);

  return (
    <HeliosContext.Provider value={{ helios, status, connect, disconnect }}>
      {children}
    </HeliosContext.Provider>
  );
}

export function useHelios(): HeliosContextValue {
  const ctx = useContext(HeliosContext);
  if (!ctx) {
    throw new Error("useHelios must be used within a HeliosProvider");
  }
  return ctx;
}

export function useHeliosMessage(handler: (message: HeliosMessage) => void) {
  const { helios } = useHelios();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => {
    return helios.onMessage((raw) => {
      // Workaround for @reactor-models/helios@0.8.4: the typed `HeliosMessage`
      // union promises a flat shape (e.g. `{ type: "state", current_frame }`),
      // but `onMessage` just passes the raw Reactor message through unchanged,
      // which is still `{ type, data: { current_frame, ... } }`. Flatten here
      // so consumer code can trust the documented typed shape.
      const nested = raw as unknown as { type?: string; data?: unknown };
      const flat =
        nested &&
        typeof nested === "object" &&
        nested.data !== null &&
        typeof nested.data === "object"
          ? ({ type: nested.type, ...nested.data } as HeliosMessage)
          : (raw as HeliosMessage);
      handlerRef.current(flat);
    });
  }, [helios]);
}

export function HeliosVideoView({
  className,
  videoObjectFit = "cover",
}: {
  className?: string;
  videoObjectFit?: "cover" | "contain";
}) {
  const { helios } = useHelios();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    const onTrack = (name: string, mediaTrack: MediaStreamTrack) => {
      if (name === "main_video") setTrack(mediaTrack);
    };
    helios.reactor.on("trackReceived", onTrack);
    return () => {
      helios.reactor.off("trackReceived", onTrack);
    };
  }, [helios]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track) return;
    video.srcObject = new MediaStream([track]);
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ objectFit: videoObjectFit }}
      playsInline
      autoPlay
      muted
    />
  );
}
