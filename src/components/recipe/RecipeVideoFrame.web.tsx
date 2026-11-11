import { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { RecipeVideoFrameProps } from "./RecipeVideoFrame";
import { MOBILE_VIDEO_ORIGIN, recipeVideoHtml } from "@/utils/recipeVideoPlayer";

export function RecipeVideoFrame({ videoId, onMessage, ref }: RecipeVideoFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => recipeVideoHtml(videoId, typeof window === "undefined" ? MOBILE_VIDEO_ORIGIN : window.location.origin), [videoId]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === window.location.origin
        && typeof event.data === "string") onMessage(event.data);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onMessage]);

  useImperativeHandle(ref, () => ({
    send(message) {
      frame.current?.contentWindow?.postMessage(message, window.location.origin);
    },
  }), []);

  return <iframe ref={frame} srcDoc={html} title="Video hướng dẫn" allow="autoplay; fullscreen"
    allowFullScreen style={{ display: "block", width: "100%", height: "100%", border: 0 }} />;
}
