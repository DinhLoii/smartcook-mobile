import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { ChatMessage, ChatRoom } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatRoomModalProps {
  visible: boolean;
  room: ChatRoom | null;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (text: string, imageUri?: string) => void;
}

export default function ChatRoomModal({
  visible,
  room,
  messages,
  onClose,
  onSendMessage,
}: ChatRoomModalProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages.length]);

  if (!room) return null;

  const handleSend = () => {
    if (!inputText.trim() && !attachedImage) return;
    onSendMessage(inputText.trim(), attachedImage || undefined);
    setInputText("");
    setAttachedImage(null);
  };

  const handlePickChatPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền truy cập", "Cần quyền ảnh để gửi hình món ăn trong chat.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Error selecting chat photo:", e);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.isMe;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        {!isMe && (
          <Image source={item.sender.avatar} style={styles.senderAvatar} />
        )}

        <View style={styles.bubbleWrapper}>
          {!isMe && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>{item.sender.name}</Text>
              {item.sender.isChef && (
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={12}
                  color={BrandColors.primary}
                />
              )}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
            {item.imageUri ? (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : null}

            {item.text ? (
              <Text
                style={[
                  styles.messageText,
                  isMe ? styles.textMe : styles.textOther,
                ]}
              >
                {item.text}
              </Text>
            ) : null}
          </View>

          <Text
            style={[
              styles.messageTime,
              isMe ? styles.timeRight : styles.timeLeft,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  const headerTopPadding =
    Platform.OS === "android"
      ? (StatusBar.currentHeight || insets.top || 24) + 6
      : insets.top + 6;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
      <DismissKeyboard>
      <View
        style={[
          styles.modalContainer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {/* Chat Room Top Bar */}
        <View style={[styles.topHeader, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.roomTitle} numberOfLines={1}>
                {room.title}
              </Text>
              {room.isAiBot && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI BOT</Text>
                </View>
              )}
            </View>
            <Text style={styles.roomSubtitle}>
              {room.activeMembers.toLocaleString()} thành viên • Đang hoạt động
            </Text>
          </View>

          <TouchableOpacity style={styles.infoBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Suggestion banner for Chef AI */}
        {room.isAiBot && (
          <View style={styles.aiHintBanner}>
            <Ionicons name="sparkles" size={14} color={BrandColors.primary} />
            <Text style={styles.aiHintText}>
              Gợi ý: Hãy hỏi mẹo nêm nếm, cách làm thịt mềm hoặc món ngon từ rau củ trong tủ lạnh!
            </Text>
          </View>
        )}

        {/* Messages Stream */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : `msg-${index}`)}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Attached Image Preview in Input Bar */}
          {attachedImage && (
            <View style={styles.attachedPreview}>
              <Image source={{ uri: attachedImage }} style={styles.attachedThumb} />
              <TouchableOpacity
                style={styles.removeAttachedBtn}
                onPress={() => setAttachedImage(null)}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Chat Input Bar */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachBtn}
              activeOpacity={0.7}
              onPress={handlePickChatPhoto}
            >
              <Ionicons name="image-outline" size={22} color={BrandColors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.chatInput}
              placeholder={
                room.isAiBot
                  ? "Hỏi Chef AI về món ăn, thay nguyên liệu..."
                  : "Nhập tin nhắn cùng hội bếp..."
              }
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (inputText.trim() || attachedImage) && styles.sendBtnActive,
              ]}
              disabled={!inputText.trim() && !attachedImage}
              onPress={handleSend}
            >
              <Ionicons
                name="send"
                size={16}
                color={inputText.trim() || attachedImage ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
      </DismissKeyboard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: "80%",
  },
  aiBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: BrandColors.primaryDark,
  },
  roomSubtitle: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
    marginTop: 1,
  },
  infoBtn: {
    padding: 8,
  },
  aiHintBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FFEDD5",
  },
  aiHintText: {
    fontSize: 11.5,
    color: "#C2410C",
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    maxWidth: "84%",
  },
  messageRowLeft: {
    alignSelf: "flex-start",
  },
  messageRowRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
  },
  bubbleWrapper: {
    flexShrink: 1,
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
    marginLeft: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  bubbleMe: {
    backgroundColor: BrandColors.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  textOther: {
    color: "#1E293B",
  },
  textMe: {
    color: "#FFFFFF",
  },
  messageImage: {
    width: 180,
    height: 120,
    borderRadius: 12,
    marginBottom: 6,
  },
  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },
  timeLeft: {
    marginLeft: 6,
  },
  timeRight: {
    alignSelf: "flex-end",
    marginRight: 6,
  },
  attachedPreview: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  attachedThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  removeAttachedBtn: {
    marginLeft: -10,
    marginTop: -30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  attachBtn: {
    padding: 8,
    marginRight: 4,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: BrandColors.primary,
  },
});
