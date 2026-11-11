import { BrandColors } from "@/constants/brandColors";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCookingVoice } from "@/hooks/useCookingVoice";
import type { Recipe } from "@/types";
import type { RecipeVideoCommand } from "@/utils/recipeVideoCommands";
import { isYouTubeVideoId } from "@/utils/recipeVideoPlayer";
import { RecipeVideoFrame, type RecipeVideoFrameHandle } from "./RecipeVideoFrame";

export interface RecipeVideoHandle {
  run(command: RecipeVideoCommand): string | Promise<string>;
}

interface RecipeVideoGuideProps {
  title: string;
  youtubeVideoId?: string | null;
  voice: ReturnType<typeof useCookingVoice>;
  ref?: Ref<RecipeVideoHandle>;
  onOpen?: () => void;
}

const loadMessage = "Trình phát đang tải. Hãy thử lại sau giây lát.";
const playerError = "YouTube chưa phát được clip trong ứng dụng. Bạn có thể mở trực tiếp trên YouTube.";

export function RecipeVideoGuide({ title, youtubeVideoId, voice, ref, onOpen }: RecipeVideoGuideProps) {
  const [opened, setOpened] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const frame = useRef<RecipeVideoFrameHandle>(null);
  const requestId = useRef(0);
  const pending = useRef<{ id: number; finish: (message: string) => void } | null>(null);
  const { width } = useWindowDimensions();
  const videoId = isYouTubeVideoId(youtubeVideoId) ? youtubeVideoId : null;
  const videoInput = voice.inputTarget === "video";
  const listening = videoInput && voice.isListening;
  const busy = voice.isThinking || voice.isListening;

  const receive = useCallback((message: string) => {
    try {
      const event = JSON.parse(message);
      if (event?.type === "ready") setPlayerStatus("ready");
      if (event?.type === "playing") {
        setPlayerStatus("ready");
        setNotice("");
      }
      if (event?.type === "error") setPlayerStatus("error");
      if (event?.type === "autoplayBlocked") setNotice("Hãy chạm Phát trong khung video để bắt đầu.");
      const request = pending.current;
      if (request && event?.type === "reply" && event.id === request.id && typeof event.message === "string") {
        request.finish(event.message);
      }
    } catch {
      // Ignore messages that do not belong to the player.
    }
  }, []);

  useEffect(() => {
    if (!opened || playerStatus !== "loading") return;
    const timeout = setTimeout(() => setPlayerStatus("error"), 12000);
    return () => clearTimeout(timeout);
  }, [opened, playerStatus]);

  useEffect(() => {
    if (opened && playerStatus === "ready") {
      frame.current?.send(JSON.stringify({ command: { type: "recording", active: listening } }));
    }
  }, [opened, playerStatus, listening]);

  useEffect(() => () => {
    pending.current?.finish("Video đã đóng.");
  }, []);

  function openVideo() {
    if (opened) return;
    setPlayerStatus("loading");
    setNotice("");
    setOpened(true);
    onOpen?.();
  }

  function closeVideo() {
    setOpened(false);
    pending.current?.finish("Video đã đóng.");
    if (videoInput) voice.cancelListening();
  }

  useImperativeHandle(ref, () => ({
    run(command) {
      if (command.type === "ignore") return "Mình giữ nguyên video.";
      if (command.type === "invalid-time") return "Bạn muốn tua bao lâu? Thử nói “tua nhanh 30 giây” hoặc “lùi 15 giây”.";
      if (command.type === "unrecognized") return "Thử nói “tua nhanh 30 giây”, “lùi 15 giây”, “dừng video” hoặc “phát tiếp”.";
      if (!videoId) return "Món này chưa có clip đính kèm. Bạn có thể tìm video theo tên món trên YouTube.";
      if (command.type === "close") {
        if (!opened) return "Video đang đóng.";
        closeVideo();
        return "Mình đã đóng video.";
      }
      if (!opened) {
        if (command.type !== "open" && command.type !== "play") return "Hãy mở video hướng dẫn trước.";
        openVideo();
        return "Mình đã mở video hướng dẫn.";
      }
      if (playerStatus === "error") return playerError;
      if (playerStatus !== "ready" || !frame.current) return loadMessage;
      if (pending.current) return "Trình phát đang xử lý lệnh trước.";

      const playerFrame = frame.current;
      const id = ++requestId.current;
      const playerCommand = command.type === "open" ? { type: "play" } : command;
      return new Promise<string>((resolve) => {
        const timeout = setTimeout(() => finish("Chưa nhận được phản hồi từ trình phát. Hãy thử lại."), 4000);
        function finish(message: string) {
          clearTimeout(timeout);
          pending.current = null;
          resolve(message);
        }
        pending.current = { id, finish };
        playerFrame.send(JSON.stringify({ id, command: playerCommand }));
      });
    },
  }));

  function openYouTube() {
    const url = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`cách làm ${title}`)}`;
    void Linking.openURL(url).catch(() => Alert.alert("YouTube", "Không mở được YouTube trên thiết bị này."));
  }

  function sendDraft() {
    const text = draft.trim();
    if (busy || !text) return;
    setDraft("");
    void voice.processVoiceInput(text, "video");
  }

  return (
    <>
      <Pressable style={styles.entry} accessibilityRole="button" onPress={videoId ? openVideo : openYouTube}>
        <View style={styles.entryIcon}><Ionicons name="play-circle-outline" size={24} color="#282828" /></View>
        <View style={styles.entryText}>
          <Text style={styles.title}>Video hướng dẫn</Text>
          <Text style={styles.muted}>{videoId ? "Xem và điều khiển bằng giọng nói" : "Tìm video của món này trên YouTube"}</Text>
        </View>
        <Ionicons name={videoId ? "chevron-forward" : "open-outline"} size={18} color="#282828" />
      </Pressable>
      {opened && videoId && (
        <Modal visible animationType="slide" onRequestClose={closeVideo}>
          <SafeAreaView style={styles.screen}>
            <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <View style={styles.entryText}>
                  <Text style={styles.title}>Video hướng dẫn</Text>
                  <Text style={styles.muted} numberOfLines={2}>{title}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Đóng video" onPress={closeVideo} style={styles.close}>
                  <Ionicons name="close" size={24} color={BrandColors.textBody} />
                </Pressable>
              </View>
              <View style={[styles.player, { height: Math.max(200, Math.min(width - 32, 660) * 9 / 16) }]}>
                <RecipeVideoFrame videoId={videoId} ref={frame} onMessage={receive} />
              </View>
              <View style={styles.linkRow}>
                <Text style={styles.muted}>Video tham khảo</Text>
                <Pressable accessibilityRole="link" onPress={openYouTube} style={styles.link}>
                  <Text style={styles.linkText}>Mở trên YouTube</Text>
                  <Ionicons name="open-outline" size={15} color="#282828" />
                </Pressable>
              </View>
              {(notice || playerStatus !== "ready") && (
                <Text accessibilityLiveRegion="polite" style={styles.muted}>
                  {playerStatus === "error" ? playerError : playerStatus === "loading" ? "Đang tải video…" : notice}
                </Text>
              )}
              <View style={styles.controls}>
                <Text style={styles.title}>Điều khiển video</Text>
                <Text style={styles.muted}>Thử “Tua nhanh 30 giây”, “Lùi 15 giây”, “Phát chậm hơn”, “Dừng video” hoặc “Phát tiếp”.</Text>
                <Pressable accessibilityRole="button" disabled={busy && !listening}
                  onPress={() => void (listening ? voice.stopListening() : voice.startListening("video"))}
                  style={[styles.mic, listening && styles.recording, busy && !listening && styles.disabled]}>
                  <Ionicons name={listening ? "stop" : "mic"} size={19} color="#fff" />
                  <Text style={styles.buttonText}>{listening ? "Dừng ghi và gửi" : "Nói lệnh video"}</Text>
                </Pressable>
                <View style={styles.inputRow}>
                  <TextInput accessibilityLabel="Nhập lệnh video" style={styles.input} placeholder="Nhập lệnh video"
                    placeholderTextColor={BrandColors.textMuted} value={draft} onChangeText={setDraft} maxLength={600}
                    editable={!busy} returnKeyType="send" onSubmitEditing={sendDraft} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Gửi lệnh video" onPress={sendDraft}
                    disabled={busy || !draft.trim()} style={[styles.send, (busy || !draft.trim()) && styles.disabled]}>
                    <Ionicons name="send" size={18} color="#fff" />
                  </Pressable>
                </View>
                {videoInput && (
                  <View accessibilityLiveRegion="polite" style={styles.feedback}>
                    {listening && <Text style={styles.muted}>Đang nghe… tối đa 15 giây.</Text>}
                    {voice.isThinking && <Text style={styles.muted}>Đang xử lý lệnh…</Text>}
                    {!!voice.transcript && <Text style={styles.muted}>“{voice.transcript}”</Text>}
                    {!!voice.aiReply && <Text style={styles.reply}>{voice.aiReply}</Text>}
                    {!!voice.errorMessage && <Text style={styles.error}>{voice.errorMessage}</Text>}
                    {!!voice.transcript && !busy && (
                      <Pressable accessibilityRole="button" onPress={() => setDraft(voice.transcript)}>
                        <Text style={styles.linkText}>Sửa câu đã nghe</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

export function RecipeDetailVideo({ recipe }: { recipe: Recipe }) {
  const guide = useRef<RecipeVideoHandle>(null);
  const voice = useCookingVoice({
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    currentStep: recipe.steps[0] ?? { stepNumber: 1, title: "Bước 1", description: "" },
    stepTimer: {},
    onVideoCommand: (command) => guide.current?.run(command) ?? loadMessage,
  });
  return <RecipeVideoGuide title={recipe.title} youtubeVideoId={recipe.youtubeVideoId} voice={voice} ref={guide} />;
}

const styles = StyleSheet.create({
  entry: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: BrandColors.borderLight, backgroundColor: BrandColors.surfaceMuted },
  entryIcon: { padding: 7, borderRadius: 10, backgroundColor: "#EAEAEA" },
  entryText: { flex: 1, gap: 3 },
  title: { color: BrandColors.textDark, fontSize: 16, fontWeight: "800" },
  muted: { color: BrandColors.textBody, fontSize: 13, lineHeight: 19 },
  screen: { flex: 1, backgroundColor: BrandColors.background },
  content: { width: "100%", maxWidth: 692, alignSelf: "center", padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  close: { padding: 8 },
  player: { overflow: "hidden", borderRadius: 14, backgroundColor: "#000" },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  link: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  linkText: { color: "#282828", fontSize: 13, fontWeight: "700" },
  controls: { borderRadius: 14, borderWidth: 1, borderColor: BrandColors.borderLight, padding: 14, gap: 10, backgroundColor: BrandColors.surfaceCard },
  mic: { alignSelf: "flex-start", flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 10, padding: 12, backgroundColor: "#292929" },
  recording: { backgroundColor: "#1B1B1B" },
  buttonText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  inputRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  input: { flex: 1, minHeight: 44, color: BrandColors.textDark, borderColor: "#C7C7C7", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 14 },
  send: { justifyContent: "center", alignItems: "center", paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#292929" },
  feedback: { gap: 4 },
  reply: { color: "#292929", fontSize: 14, lineHeight: 21 },
  error: { color: "#292929", fontSize: 14, lineHeight: 21 },
});
