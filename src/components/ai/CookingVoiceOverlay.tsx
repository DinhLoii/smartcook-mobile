import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface CookingVoiceOverlayProps {
  isVisible: boolean;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  transcript?: string;
  aiReply?: string;
  lastAction?: string | null;
  quickReplies?: string[];
  errorMessage?: string | null;
  onMicPress: () => void;
  onClose: () => void;
  onQuickReplySelect?: (reply: string) => void;
}

export const CookingVoiceOverlay: React.FC<CookingVoiceOverlayProps> = ({
  isVisible,
  isListening,
  isThinking,
  isSpeaking,
  transcript,
  aiReply,
  lastAction,
  quickReplies = [],
  errorMessage,
  onMicPress,
  onClose,
  onQuickReplySelect,
}) => {
  const [draft, setDraft] = useState("");
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [waveAnim1] = useState(() => new Animated.Value(0.3));
  const [waveAnim2] = useState(() => new Animated.Value(0.6));
  const [waveAnim3] = useState(() => new Animated.Value(0.9));

  // Pulse animation when listening or speaking
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isListening || isSpeaking) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.22,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isListening, isSpeaking, pulseAnim]);

  // Wave bar animations
  useEffect(() => {
    if (isListening) {
      const createWave = (anim: Animated.Value, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const w1 = createWave(waveAnim1, 450);
      const w2 = createWave(waveAnim2, 350);
      const w3 = createWave(waveAnim3, 500);

      w1.start();
      w2.start();
      w3.start();

      return () => {
        w1.stop();
        w2.stop();
        w3.stop();
      };
    } else {
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.6);
      waveAnim3.setValue(0.9);
    }
  }, [isListening, waveAnim1, waveAnim2, waveAnim3]);

  if (!isVisible) return null;

  const getStatusText = () => {
    if (isListening) return "Đang lắng nghe... Hãy nói điều bạn cần!";
    if (isThinking) return "Đầu bếp AI đang suy nghĩ xử lý...";
    if (isSpeaking) return "Đầu bếp AI đang trả lời...";
    return "Sẵn sàng tương tác giọng nói";
  };

  const getActionBadge = () => {
    if (!lastAction) return null;
    if (lastAction === "GO_TO_STEP") {
      return { text: "👉 Đã chuyển tới bước bạn chọn", color: "#3b82f6" };
    }
    if (lastAction === "REDUCE_TIMER") {
      return { text: "⏱️ Đã giảm thời gian", color: "#10b981" };
    }
    if (lastAction === "EXTEND_TIMER") {
      return { text: "⏱️ Đã gia hạn thêm thời gian", color: "#10b981" };
    }
    if (lastAction === "NEXT_STEP") {
      return { text: "👉 Đã chuyển bước tiếp theo", color: "#3b82f6" };
    }
    if (lastAction === "PREV_STEP") {
      return { text: "👈 Đã quay lại bước trước", color: "#6366f1" };
    }
    if (lastAction === "REPEAT_STEP") {
      return { text: "🔁 Đã đọc lại bước", color: "#f59e0b" };
    }
    if (lastAction === "TROUBLESHOOT") {
      return { text: "💡 Hướng dẫn xử lý sự cố", color: "#ec4899" };
    }
    return null;
  };

  const actionBadge = getActionBadge();

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.statusDot, isListening && styles.statusDotActive]} />
          <Text style={styles.headerTitle}>Trợ Lý Giọng Nói Nấu Ăn</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Action Badge if executed */}
      {actionBadge && (
        <View style={[styles.actionBadge, { backgroundColor: actionBadge.color + "20" }]}>
          <Text style={[styles.actionBadgeText, { color: actionBadge.color }]}>
            {actionBadge.text}
          </Text>
        </View>
      )}

      {/* Main Conversation Box */}
      <View style={styles.conversationCard}>
        {/* User transcript */}
        {transcript ? (
          <View style={styles.userBubble}>
            <Text style={styles.bubbleLabel}>Bạn vừa nói:</Text>
            <Text style={styles.userText}>{transcript}</Text>
          </View>
        ) : null}

        {/* AI Reply */}
        {aiReply ? (
          <View style={styles.aiBubble}>
            <Text style={styles.bubbleLabel}>Bếp trưởng AI:</Text>
            <Text style={styles.aiText}>{aiReply}</Text>
          </View>
        ) : (
          <Text style={styles.hintText}>{getStatusText()}</Text>
        )}

        {errorMessage && <Text style={styles.errorText}>⚠️ {errorMessage}</Text>}
      </View>

      {/* Quick Reply Chips */}
      {quickReplies.length > 0 && (
        <View style={styles.chipsRow}>
          {quickReplies.map((reply, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chip}
              disabled={isThinking || isListening || isSpeaking}
              onPress={() => onQuickReplySelect?.(reply)}
            >
              <Text style={styles.chipText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10 }}
          placeholder="Hoặc nhập câu hỏi cho AI..."
          value={draft}
          onChangeText={setDraft}
          maxLength={600}
          editable={!isThinking && !isListening && !isSpeaking}
          accessibilityLabel="Câu hỏi cho trợ lý AI"
        />
        <TouchableOpacity
          style={styles.chip}
          disabled={!draft.trim() || isThinking || isListening || isSpeaking}
          onPress={() => { onQuickReplySelect?.(draft.trim()); setDraft(""); }}
        >
          <Text style={styles.chipText}>Gửi</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Mic Controls */}
      <View style={styles.micControlRow}>
        <Animated.View style={[styles.pulseWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonListening,
              isSpeaking && styles.micButtonSpeaking,
            ]}
            disabled={isThinking || isSpeaking}
            onPress={onMicPress}
            activeOpacity={0.8}
          >
            {isListening ? (
              <Ionicons name="mic" size={32} color="#ffffff" />
            ) : isSpeaking ? (
              <Ionicons name="volume-high" size={30} color="#ffffff" />
            ) : isThinking ? (
              <Ionicons name="hourglass" size={28} color="#ffffff" />
            ) : (
              <Ionicons name="mic-outline" size={30} color="#ffffff" />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.micStatusLabel}>
          {isListening
            ? "Đang thu âm, tối đa 15 giây (bấm để gửi)"
            : isSpeaking
            ? "Đang phát giọng đọc..."
            : isThinking
            ? "Đang xử lý..."
            : "Chạm để nói chuyện với AI"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    zIndex: 9999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9ca3af",
  },
  statusDotActive: {
    backgroundColor: "#ef4444",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeBtn: {
    padding: 4,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  conversationCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  userText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    fontStyle: "italic",
  },
  aiBubble: {},
  aiText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    lineHeight: 20,
  },
  hintText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  micControlRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonListening: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  micButtonSpeaking: {
    backgroundColor: "#f59e0b",
    shadowColor: "#f59e0b",
  },
  micStatusLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
});

export default CookingVoiceOverlay;
