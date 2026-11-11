export const MOBILE_VIDEO_ORIGIN = "https://com.smartcook.mobile";

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function recipeVideoHtml(videoId: string, origin: string) {
  if (!isYouTubeVideoId(videoId)) throw new Error("Invalid YouTube video ID");
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol) || base.origin !== origin) throw new Error("Invalid player origin");
  const query = new URLSearchParams({
    enablejsapi: "1", origin, autoplay: "1", playsinline: "1", rel: "0",
  });
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#000;display:block;overflow:hidden}</style>
</head>
<body>
  <iframe id="player" src="https://www.youtube-nocookie.com/embed/${videoId}?${query.toString().replace(/&/g, "&amp;")}"
    title="Video hướng dẫn trên YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
  <script>
    const bridgeOrigin = ${JSON.stringify(origin)};
    let player;
    let ready = false;
    let mutedForRecording = false;
    let restoreSound = false;
    function send(event) {
      const message = JSON.stringify(event);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
      else window.parent.postMessage(message, bridgeOrigin);
    }
    function muteForRecording(muted) {
      if (!ready || muted === mutedForRecording) return;
      mutedForRecording = muted;
      if (muted) {
        restoreSound = !player.isMuted();
        if (restoreSound) player.mute();
      } else if (restoreSound) {
        player.unMute();
        restoreSound = false;
      }
    }
    function run(command) {
      if (command.type === "play") {
        player.playVideo();
        return "Mình phát tiếp video.";
      }
      if (command.type === "pause") {
        player.pauseVideo();
        return "Mình đã tạm dừng video.";
      }
      if (command.type === "seek" && Number.isInteger(command.seconds) && Math.abs(command.seconds) <= 3600) {
        const duration = player.getDuration();
        const current = player.getCurrentTime();
        if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(current)) {
          return "Video đang tải. Hãy thử tua lại sau giây lát.";
        }
        const target = Math.min(duration, Math.max(0, current + command.seconds));
        player.seekTo(target, true);
        const seconds = Math.floor(target);
        const time = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
        return "Mình tua video đến khoảng " + time + ".";
      }
      if (command.type === "rate") {
        const current = player.getPlaybackRate();
        const rates = player.getAvailablePlaybackRates().slice().sort((a, b) => a - b);
        let next;
        if (command.direction === "normal" && rates.includes(1)) next = 1;
        if (command.direction === "faster") next = rates.find(rate => rate > current);
        if (command.direction === "slower") next = rates.reverse().find(rate => rate < current);
        if (next === undefined) return "Video không có mức tốc độ phù hợp.";
        player.setPlaybackRate(next);
        return "Tốc độ phát: " + next.toLocaleString("vi-VN") + " lần.";
      }
      return "Mình chưa nhận ra lệnh video.";
    }
    window.smartCookVideoCommand = function (request) {
      if (!request || !request.command) return;
      if (request.command.type === "recording") {
        muteForRecording(request.command.active === true);
        return;
      }
      if (!Number.isInteger(request.id)) return;
      let message = "Trình phát chưa sẵn sàng. Hãy thử lại sau giây lát.";
      try { if (ready) message = run(request.command); }
      catch { message = "Trình phát chưa thực hiện được lệnh. Hãy thử lại."; }
      send({ type: "reply", id: request.id, message });
    };
    window.addEventListener("message", function (event) {
      if (event.source !== window.parent || event.origin !== bridgeOrigin) return;
      try { window.smartCookVideoCommand(JSON.parse(event.data)); } catch {}
    });
    window.onYouTubeIframeAPIReady = function () {
      new YT.Player("player", { events: {
        onReady: function (event) {
          player = event.target;
          ready = true;
          send({ type: "ready" });
        },
        onStateChange: function (event) {
          if (event.data === 1) {
            player = event.target;
            ready = true;
            send({ type: "playing" });
          }
        },
        onAutoplayBlocked: function () { send({ type: "autoplayBlocked" }); },
        onError: function () { ready = false; send({ type: "error" }); }
      }});
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = function () { send({ type: "error" }); };
    document.head.appendChild(script);
  </script>
</body>
</html>`;
}
