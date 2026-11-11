import { useImperativeHandle, useMemo, useRef, type Ref } from "react";
import WebView from "react-native-webview";
import { MOBILE_VIDEO_ORIGIN, recipeVideoHtml } from "@/utils/recipeVideoPlayer";

export interface RecipeVideoFrameHandle {
  send(message: string): void;
}

export interface RecipeVideoFrameProps {
  videoId: string;
  onMessage(message: string): void;
  ref?: Ref<RecipeVideoFrameHandle>;
}

export function RecipeVideoFrame({ videoId, onMessage, ref }: RecipeVideoFrameProps) {
  const webView = useRef<WebView>(null);
  const source = useMemo(() => ({
    html: recipeVideoHtml(videoId, MOBILE_VIDEO_ORIGIN),
    baseUrl: MOBILE_VIDEO_ORIGIN,
  }), [videoId]);

  useImperativeHandle(ref, () => ({
    send(message) {
      webView.current?.injectJavaScript(
        `window.smartCookVideoCommand?.(JSON.parse(${JSON.stringify(message)})); true;`,
      );
    },
  }), []);

  return (
    <WebView
      ref={webView}
      source={source}
      originWhitelist={["*"]}
      onShouldStartLoadWithRequest={(request) => request.isTopFrame === false
        || request.url === "about:blank" || request.url === MOBILE_VIDEO_ORIGIN || request.url === `${MOBILE_VIDEO_ORIGIN}/`
        || request.url.startsWith(`https://www.youtube-nocookie.com/embed/${videoId}?`)}
      onMessage={(event) => onMessage(event.nativeEvent.data)}
      onError={() => onMessage('{"type":"error"}')}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      style={{ backgroundColor: "#000" }}
    />
  );
}
