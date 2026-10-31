import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { RECIPES_DATA } from "@/data/recipesData";
import { aiService } from "@/services/aiService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AI_CHEF_AVATAR = require("@/assets/images/ai-chef-avatar.jpg");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AIMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestedDishes?: string[];
}

const INITIAL_AI_MESSAGES: AIMessage[] = [
  {
    id: "m-1",
    sender: "ai",
    text: "Xin chào bạn! Mình là Trợ lý Ảo SmartCook 👩‍🍳. Hôm nay bạn muốn nấu món gì, cần gợi ý thực đơn, hay đang băn khoăn nguyên liệu nào?",
    time: "Vừa xong",
    suggestedDishes: ["Món nhanh dưới 20p", "Món ăn Eat Clean", "Món từ ức gà"],
  },
];

const QUICK_PROMPTS = [
  "Hôm nay ăn gì?",
  "Món thanh đạm ít dầu",
  "Cách ướp thịt bò mềm",
  "Gợi ý bữa tối cho 2 người",
];

export default function DraggableAIAssistant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>(INITIAL_AI_MESSAGES);
  const [quickPrompts, setQuickPrompts] = useState<string[]>(QUICK_PROMPTS);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Position animated value for dragging
  // Default position: bottom right above tab bar (safe coordinates)
  const defaultX = SCREEN_WIDTH - 68;
  const defaultY = Math.max(300, SCREEN_HEIGHT - 220);

  const [pan] = useState(
    () => new Animated.ValueXY({ x: defaultX, y: defaultY })
  );

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        // @ts-ignore
        const currentX = pan.x._value;
        // @ts-ignore
        const currentY = pan.y._value;

        // If it was just a tap (movement < 8px), open chat!
        if (
          Math.abs(gestureState.dx) < 8 &&
          Math.abs(gestureState.dy) < 8
        ) {
          setModalVisible(true);
        }

        // Snap to left or right margin nicely
        const snapPadding = 12;
        const targetX =
          currentX < SCREEN_WIDTH / 2 ? snapPadding : SCREEN_WIDTH - 50 - snapPadding;
        const minY = insets.top + 50;
        const maxY = SCREEN_HEIGHT - (insets.bottom + 120);
        const clampedY = Math.max(minY, Math.min(maxY, currentY));

        Animated.spring(pan, {
          toValue: { x: targetX, y: clampedY },
          friction: 6,
          tension: 45,
          useNativeDriver: false,
        }).start();
      },
    })
  );

  const handleOpenAssistant = () => {
    setModalVisible(true);
  };

  const handleDishClick = (dish: string) => {
    const foundRecipe = RECIPES_DATA.find(
      (r) =>
        r.title.toLowerCase().includes(dish.toLowerCase()) ||
        dish.toLowerCase().includes(r.title.toLowerCase())
    );

    if (foundRecipe) {
      setModalVisible(false);
      router.push({
        pathname: "/recipe-detail",
        params: { id: foundRecipe.id },
      });
    } else {
      handleSendMessage(`Hãy hướng dẫn cách nấu món ${dish} chi tiết nhé!`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      time: "Vừa xong",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      // Prepare history format for Gemini API
      const history = messages.slice(-6).map((m) => ({
        role: (m.sender === "ai" ? "model" : "user") as "model" | "user",
        parts: [{ text: m.text }] as [{ text: string }],
      }));

      const apiReply = await aiService.askChefAssistant(query, history);

      if (apiReply && apiReply.replyText) {
        if (apiReply.quickPrompts && apiReply.quickPrompts.length > 0) {
          setQuickPrompts(apiReply.quickPrompts);
        }

        const aiReply: AIMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: apiReply.replyText,
          time: "Vừa xong",
          suggestedDishes: apiReply.suggestedDishes?.length ? apiReply.suggestedDishes : undefined,
        };

        setMessages((prev) => [...prev, aiReply]);
        setIsTyping(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return;
      }
    } catch (e) {
      console.warn("AI Assistant chat API failed, using fallback:", e);
    }

    // AI intelligent answer generation fallback
    setTimeout(() => {
      let replyText = "";
      let suggested: string[] = [];

      const lower = query.toLowerCase();
      if (lower.includes("ức gà") || lower.includes("thịt gà") || lower.includes("ga")) {
        replyText =
          "Với thịt gà, bạn có thể làm **Cơm Gà Teriyaki áp chảo sốt mè** giòn ngon hoặc **Salad Gà áp chảo Eat Clean** thanh đạm. Bạn có muốn xem công thức chi tiết không?";
        suggested = ["Cơm gà sốt Teriyaki", "Gà chiên giòn mật ong"];
      } else if (lower.includes("eat clean") || lower.includes("thanh đạm") || lower.includes("ít dầu")) {
        replyText =
          "Thực đơn Eat Clean lý tưởng hôm nay: **Salad Cá Hồi Áp Chảo sốt chanh leo** và **Bò áp chảo măng tây**. Giàu đạm, ít carb và không ngấy mỡ!";
        suggested = ["Salad Cá Hồi", "Bò áp chảo măng tây"];
      } else if (lower.includes("hôm nay ăn gì") || lower.includes("gợi ý")) {
        replyText =
          "Hôm nay thời tiết rất thích hợp cho một bữa tối ấm cúng! SmartCook gợi ý bạn món **Mì Ý Sốt Bò Bằm Bolognese** thơm ngậy hoặc **Canh Rong Biển Thịt Bò** thanh mát!";
        suggested = ["Mì Ý Sốt Bò Bằm", "Bò nướng thảo mộc"];
      } else if (lower.includes("bò") || lower.includes("thịt bò")) {
        replyText =
          "Bí quyết ướp thịt bò mềm: Ướp với 1 thìa dầu olive + tỏi băm + chút nước tương và xíu bột bắp trong 15 phút. Khi xào trên lửa lớn đảo nhanh tay là thịt ngọt mọng nước nhé!";
      } else {
        replyText =
          `SmartCook đã ghi nhận câu hỏi: "${query}". Bạn có thể kết hợp các nguyên liệu trong tủ lạnh hoặc dùng tính năng Scan AI để mình gợi ý công thức chuẩn xác nhất nhé!`;
        suggested = ["Xem công thức hot tuần này", "Món dưới 500 kcal"];
      }

      const aiReply: AIMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyText,
        time: "Vừa xong",
        suggestedDishes: suggested.length > 0 ? suggested : undefined,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 800);
  };

  return (
    <>
      {/* Draggable Floating AI Assistant Icon */}
      <Animated.View
        style={[
          styles.bubbleWrapper,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenAssistant}
          style={styles.bubbleTouchable}
        >
          {/* Outer glowing border */}
          <View style={styles.glowRing}>
            <Image
              source={AI_CHEF_AVATAR}
              style={styles.bubbleAvatarImage}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Interactive AI Chat Assistant Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <DismissKeyboard>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.chatContainer}>
            {/* Header */}
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.chatHeader, { paddingTop: Math.max(insets.top, 14) }]}
            >
              <View style={styles.chatHeaderLeft}>
                <View style={styles.aiAvatarWrapper}>
                  <Image
                    source={AI_CHEF_AVATAR}
                    style={styles.headerAvatarImage}
                    resizeMode="cover"
                  />
                  <View style={styles.onlineStatusDot} />
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={styles.chatHeaderTitle}>Đầu Bếp Trợ Lý AI</Text>
                    <Ionicons name="sparkles" size={13} color="#FEF08A" />
                  </View>
                  <Text style={styles.chatHeaderSubtitle}>SmartCook • Tư vấn thực đơn &amp; nấu nướng</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Message List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isAI = item.sender === "ai";
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isAI ? styles.messageRowAI : styles.messageRowUser,
                    ]}
                  >
                    {isAI && (
                      <View style={styles.miniAIAvatar}>
                        <Image
                          source={AI_CHEF_AVATAR}
                          style={styles.miniAvatarImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    <View style={{ maxWidth: "78%" }}>
                      <View
                        style={[
                          styles.messageBubble,
                          isAI ? styles.messageBubbleAI : styles.messageBubbleUser,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isAI ? styles.messageTextAI : styles.messageTextUser,
                          ]}
                        >
                          {item.text}
                        </Text>
                      </View>

                      {/* Suggested dishes buttons if any */}
                      {isAI && item.suggestedDishes && (
                        <View style={styles.suggestedDishesRow}>
                          {item.suggestedDishes.map((dish: string) => (
                            <TouchableOpacity
                              key={dish}
                              style={styles.suggestedPill}
                              onPress={() => handleDishClick(dish)}
                              activeOpacity={0.75}
                            >
                              <Ionicons name="restaurant-outline" size={12} color={BrandColors.primary} />
                              <Text style={styles.suggestedPillText}>{dish}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <Text
                        style={[
                          styles.messageTime,
                          !isAI && { textAlign: "right" },
                        ]}
                      >
                        {item.time}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                isTyping ? (
                  <View style={[styles.messageRow, styles.messageRowAI]}>
                    <View style={styles.miniAIAvatar}>
                      <MaterialCommunityIcons name="robot-happy" size={16} color="#FFFFFF" />
                    </View>
                    <View style={[styles.messageBubble, styles.messageBubbleAI]}>
                      <Text style={[styles.messageText, styles.messageTextAI]}>
                        AI đang soạn câu trả lời... ✨
                      </Text>
                    </View>
                  </View>
                ) : null
              }
            />

            {/* Quick Prompts Bar */}
            <View style={styles.quickPromptsSection}>
              <FlatList
                horizontal
                data={quickPrompts}
                keyExtractor={(item, index) => `${item}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPromptsScroll}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.quickPromptChip}
                    onPress={() => handleSendMessage(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickPromptChipText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Input Bar */}
            <View
              style={[
                styles.inputBar,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Hỏi trợ lý về món ăn, bí quyết nấu..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim().length > 0 && styles.sendButtonActive,
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color={inputText.trim() ? "#FFFFFF" : "#94A3B8"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        </DismissKeyboard>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
    backgroundColor: "transparent",
  },
  bubbleTouchable: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  glowRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  bubbleAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  miniAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sparkleBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aiTagBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 1,
  },
  bubbleLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  chatContainer: {
    height: "82%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  onlineStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: "#FED7AA",
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowAI: {
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  miniAIAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleAI: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  messageBubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  messageTextAI: {
    color: "#1E293B",
  },
  messageTextUser: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    marginHorizontal: 4,
  },
  suggestedDishesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  suggestedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  suggestedPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },
  quickPromptsSection: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 8,
  },
  quickPromptsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPromptChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
});
