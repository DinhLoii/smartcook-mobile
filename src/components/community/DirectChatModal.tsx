import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { ChatMessage, CommunityAuthor } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { triggerHaptic } from "@/utils/haptics";

interface DirectChatModalProps {
  visible: boolean;
  targetUser: CommunityAuthor | null;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (text: string, imageUri?: string) => void;
}

export default function DirectChatModal({
  visible,
  targetUser,
  messages,
  onClose,
  onSendMessage,
}: DirectChatModalProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [visible, messages.length]);

  if (!targetUser) return null;

  const handleSend = () => {
    if (!inputText.trim() && !attachedImage) return;
    triggerHaptic("medium");
    onSendMessage(inputText.trim(), attachedImage || undefined);
    setInputText("");
    setAttachedImage(null);
  };

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền truy cập", "Cần quyền ảnh để gửi hình trong tin nhắn.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Error picking image:", e);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    // In a 1-1 direct conversation, there are only two parties:
    // targetUser (the other party) and Current User (Me).
    const targetId = targetUser.id || (targetUser as any)._id;
    const senderId = item.sender?.id || (item.sender as any)?._id;

    const isSenderTarget =
      (targetId && senderId && String(targetId) === String(senderId)) ||
      (targetUser.name && item.sender?.name && targetUser.name === item.sender?.name);

    // If sender is NOT the target user, or item.isMe is true -> it's definitely ME!
    const isMe = isSenderTarget ? false : (item.isMe !== undefined ? item.isMe : true);

    return (
      <View style={[styles.messageWrapper, isMe ? styles.wrapperMe : styles.wrapperOther]}>
        <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
          {/* Only show target user's avatar on the left */}
          {!isMe && (
            <Image
              source={
                typeof item.sender?.avatar === "string"
                  ? { uri: item.sender.avatar }
                  : item.sender?.avatar || require("@/assets/images/salad-salmon.jpg")
              }
              style={styles.senderAvatar}
            />
          )}

          <View style={[styles.bubbleCol, isMe && styles.bubbleColMe]}>
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.attachedImgInBubble}
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

            {/* Time & status check */}
            <View
              style={[
                styles.timeRow,
                isMe ? styles.timeRowRight : styles.timeRowLeft,
              ]}
            >
              <Text style={styles.timeText}>{item.timestamp}</Text>
              {isMe && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={BrandColors.primary}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
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
        <View style={styles.container}>
          {/* Top Header - Merged seamlessly with Status Bar */}
          <View style={[styles.topHeader, { paddingTop: headerTopPadding }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.7}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={26} color="#0F172A" />
              </TouchableOpacity>

              <View style={styles.avatarWrap}>
                <Image
                  source={
                    typeof targetUser.avatar === "string"
                      ? { uri: targetUser.avatar }
                      : targetUser.avatar
                  }
                  style={styles.headerAvatar}
                />
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.userMeta}>
                <Text style={styles.headerUserName} numberOfLines={1}>
                  {targetUser.name}
                </Text>
                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Đang hoạt động</Text>
                </View>
              </View>
            </View>

            {/* Call, Video Call, More buttons */}
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="call" size={20} color={BrandColors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="videocam" size={22} color={BrandColors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Stream */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) =>
                item.id ? `${item.id}-${index}` : `msg-${index}`
              }
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.dateBadgeContainer}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>Hôm nay</Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <ActivityIndicator
                    size="small"
                    color={BrandColors.primary}
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={styles.emptyText}>Đang kết nối đoạn chat...</Text>
                  <Text style={styles.emptySubText}>
                    Gửi lời chào đến {targetUser.name} để bắt đầu cuộc trò chuyện!
                  </Text>
                </View>
              }
            />

            {/* Image Attachment Preview */}
            {attachedImage && (
              <View style={styles.attachedPreviewRow}>
                <Image source={{ uri: attachedImage }} style={styles.attachedThumb} />
                <TouchableOpacity
                  style={styles.removeAttachedBtn}
                  onPress={() => setAttachedImage(null)}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Chat Input Bar */}
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {/* Media Button */}
              <TouchableOpacity
                style={styles.plusBtn}
                activeOpacity={0.7}
                onPress={handlePickPhoto}
              >
                <Ionicons name="image-outline" size={22} color={BrandColors.primary} />
              </TouchableOpacity>

              {/* Input Field with Emoji Icon */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tin nhắn..."
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity style={styles.emojiBtn} activeOpacity={0.7}>
                  <Ionicons name="happy-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  inputText.trim() || attachedImage
                    ? styles.sendBtnActive
                    : styles.sendBtnInactive,
                ]}
                disabled={!inputText.trim() && !attachedImage}
                onPress={handleSend}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="paper-plane"
                  size={17}
                  color="#FFFFFF"
                  style={{ marginLeft: 2 }}
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userMeta: {
    flex: 1,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  dateBadgeContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  dateBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateBadgeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  messageWrapper: {
    marginBottom: 14,
  },
  wrapperMe: {
    alignItems: "flex-end",
  },
  wrapperOther: {
    alignItems: "flex-start",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  messageRowLeft: {
    maxWidth: "84%",
  },
  messageRowRight: {
    maxWidth: "80%",
    justifyContent: "flex-end",
  },
  senderAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20, // Align with bubble bottom
  },
  bubbleCol: {
    flexShrink: 1,
  },
  bubbleColMe: {
    alignItems: "flex-end",
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: BrandColors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textOther: {
    color: "#0F172A",
  },
  textMe: {
    color: "#FFFFFF",
    fontWeight: "400",
  },
  attachedImgInBubble: {
    width: 220,
    height: 150,
    borderRadius: 14,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeRowLeft: {
    marginLeft: 6,
  },
  timeRowRight: {
    marginRight: 4,
    justifyContent: "flex-end",
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "400",
  },
  attachedPreviewRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  attachedThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  removeAttachedBtn: {
    marginLeft: -12,
    marginTop: -32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF1EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: "#0F172A",
    paddingVertical: Platform.OS === "android" ? 6 : 8,
    maxHeight: 100,
  },
  emojiBtn: {
    padding: 4,
    marginLeft: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendBtnInactive: {
    backgroundColor: "#CBD5E1",
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
