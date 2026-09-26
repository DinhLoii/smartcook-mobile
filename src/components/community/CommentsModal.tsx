import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { CommunityAuthor, CommunityComment, CommunityPost } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
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

interface CommentsModalProps {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
  onOpenDirectChat?: (user: CommunityAuthor) => void;
}

export default function CommentsModal({
  visible,
  post,
  onClose,
  onAddComment,
  onOpenDirectChat,
}: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState("");

  if (!post) return null;

  const handleSend = () => {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
  };

  const renderCommentItem = ({ item }: { item: CommunityComment }) => (
    <View style={styles.commentItem}>
      {/* Clickable Avatar to open direct chat */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onOpenDirectChat?.(item.author)}
        style={styles.avatarTouch}
      >
        <Image source={item.author.avatar} style={styles.avatar} />
      </TouchableOpacity>

      <View style={styles.commentBubble}>
        <View style={styles.authorHeader}>
          <TouchableOpacity
            style={styles.authorNameWrap}
            activeOpacity={0.8}
            onPress={() => onOpenDirectChat?.(item.author)}
          >
            <Text style={styles.authorName}>{item.author.name}</Text>
            {item.author.badge && (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{item.author.badge}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Direct chat button next to comment / commenter name */}
          <TouchableOpacity
            style={styles.commentChatBtn}
            activeOpacity={0.75}
            onPress={() => onOpenDirectChat?.(item.author)}
          >
            <MaterialCommunityIcons
              name="message-text-outline"
              size={12}
              color={BrandColors.primaryDark}
            />
            <Text style={styles.commentChatBtnText}>Nhắn tin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.commentBody}>{item.content}</Text>
        <Text style={styles.timestamp}>{item.createdAt}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <DismissKeyboard>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </View>

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.indicatorBar} />
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleGroup}>
                <Ionicons name="chatbubbles" size={18} color={BrandColors.primary} />
                <Text style={styles.sheetTitle}>
                  Bình Luận ({post.comments?.length || 0})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                activeOpacity={0.7}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          <FlatList
            data={post.comments}
            keyExtractor={(item) => item.id}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={42}
                  color="#CBD5E1"
                />
                <Text style={styles.emptyText}>
                  Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi hoặc
                  khen món ăn này nhé!
                </Text>
              </View>
            }
          />

          {/* Input Bar */}
          <View style={styles.inputBarContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Viết bình luận hoặc trao đổi bí quyết..."
              placeholderTextColor="#94A3B8"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={250}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                commentText.trim().length > 0 && styles.sendButtonActive,
              ]}
              disabled={!commentText.trim()}
              onPress={handleSend}
            >
              <Ionicons
                name="send"
                size={16}
                color={commentText.trim().length > 0 ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      </DismissKeyboard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  indicatorBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  avatarTouch: {
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  authorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  authorNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgePill: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: BrandColors.primaryDark,
  },
  commentChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    marginLeft: 6,
  },
  commentChatBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  timestamp: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  inputBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  textInput: {
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendButtonActive: {
    backgroundColor: BrandColors.primary,
  },
});
