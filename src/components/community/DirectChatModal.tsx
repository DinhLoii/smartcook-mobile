import { BrandColors } from "@/constants/brandColors";
import { ChatMessage, CommunityAuthor } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    const isMe = item.isMe;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        {/* Other user avatar */}
        {!isMe && (
          <Image source={item.sender.avatar} style={styles.senderAvatar} />
        )}

        <View style={styles.bubbleCol}>
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
                size={13}
                color="#FFFFFF"
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {/* Top Header - Exact match to image 2 */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.avatarWrap}>
              <Image source={targetUser.avatar} style={styles.headerAvatar} />
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
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="call" size={20} color={BrandColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="videocam" size={22} color={BrandColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={18} color="#0F172A" />
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
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              /* Date badge "Hôm nay" - exact match to image 2 */
              <View style={styles.dateBadgeContainer}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>Hôm nay</Text>
                </View>
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
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Chat Input Bar - Exact match to image 2 */}
          <View style={styles.bottomBar}>
            {/* Plus Button */}
            <TouchableOpacity
              style={styles.plusBtn}
              activeOpacity={0.7}
              onPress={handlePickPhoto}
            >
              <Ionicons name="add" size={22} color={BrandColors.primary} />
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
                maxLength={400}
              />
              <TouchableOpacity style={styles.emojiBtn} activeOpacity={0.7}>
                <Ionicons name="happy-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Blue / Orange Send Button with Send Plane */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (inputText.trim() || attachedImage)
                  ? styles.sendBtnActive
                  : styles.sendBtnInactive,
              ]}
              disabled={!inputText.trim() && !attachedImage}
              onPress={handleSend}
            >
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userMeta: {
    flex: 1,
  },
  headerUserName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    color: "#64748B",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },
  messageRowLeft: {
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  messageRowRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    maxWidth: "80%",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
  },
  bubbleCol: {
    flexShrink: 1,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textOther: {
    color: "#0F172A",
  },
  textMe: {
    color: "#FFFFFF",
  },
  attachedImgInBubble: {
    width: 180,
    height: 120,
    borderRadius: 12,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeRowLeft: {
    marginLeft: 4,
  },
  timeRowRight: {
    alignSelf: "flex-end",
    marginRight: 4,
  },
  timeText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  attachedPreviewRow: {
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
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    paddingVertical: Platform.OS === "android" ? 4 : 0,
    maxHeight: 90,
  },
  emojiBtn: {
    padding: 4,
    marginLeft: 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  sendBtnInactive: {
    backgroundColor: "#CBD5E1",
  },
});
