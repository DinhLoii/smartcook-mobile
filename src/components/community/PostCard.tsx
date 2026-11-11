import { BrandColors } from "@/constants/brandColors";
import { CommunityAuthor, CommunityPost } from "@/types";
import { hapticSelection } from "@/utils/haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ReportModal } from "@/components/common/ReportModal";
import communityService from "@/services/communityService";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onComment: (post: CommunityPost) => void;
  onOpenDirectChat?: (author: CommunityAuthor) => void;
  onSave?: (postId: string) => void;
  onShare?: (post: CommunityPost) => void;
  onTagPress?: (tag: string) => void;
}

const REACTIONS = {
  like: { icon: "thumb-up-outline", label: "Thích" },
  love: { icon: "heart-outline", label: "Yêu thích" },
  haha: { icon: "emoticon-lol-outline", label: "Haha" },
  wow: { icon: "emoticon-excited-outline", label: "Ngạc nhiên" },
  sad: { icon: "emoticon-sad-outline", label: "Buồn" },
  angry: { icon: "emoticon-angry-outline", label: "Phẫn nộ" },
} as const;
type Reaction = keyof typeof REACTIONS;
const reactionTypes = Object.keys(REACTIONS) as Reaction[];

export default function PostCard({
  post,
  onLike,
  onComment,
  onOpenDirectChat,
  onSave,
  onShare,
  onTagPress,
}: PostCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [userReaction, setUserReaction] = useState<Reaction | null>(
    (post as any).userReaction || null
  );
  const reactionIcon = userReaction && userReaction !== "like" && userReaction !== "love"
    ? REACTIONS[userReaction]?.icon
    : undefined;

  const handleToggleLike = () => {
    void hapticSelection();
    onLike(post.id);
  };

  const handleLongPressLike = () => {
    void hapticSelection();
    setShowReactionPicker(!showReactionPicker);
  };

  const handleSelectReaction = (type: Reaction) => {
    setUserReaction(type);
    setShowReactionPicker(false);
    void hapticSelection();
    communityService.reactToPost(post.id, type);
  };

  const handleToggleSave = () => {
    onSave?.(post.id);
  };

  const handleMorePress = () => {
    Alert.alert(
      "Tùy chọn bài viết",
      `Bài viết của ${post.author.name}`,
      [
        {
          text: "🚩 Báo cáo vi phạm",
          style: "destructive",
          onPress: () => setShowReportModal(true),
        },
        {
          text: "Chia sẻ bài viết",
          onPress: () => onShare?.(post),
        },
        { text: "Đóng", style: "cancel" },
      ]
    );
  };


  return (
    <View style={styles.cardContainer}>
      {/* Header: Author info + Messenger Chat Button */}
      <View style={styles.headerRow}>
        <View style={styles.authorGroup}>
          {/* Avatar with click to chat */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onOpenDirectChat?.(post.author)}
            style={styles.avatarWrap}
          >
            <Image source={post.author.avatar} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </TouchableOpacity>

          <View style={styles.authorMeta}>
            <View style={styles.nameRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onOpenDirectChat?.(post.author)}
                style={styles.authorNameWrap}
              >
                <Text style={styles.authorName}>{post.author.name}</Text>
                {post.author.isChef && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={14}
                    color={BrandColors.primary}
                    style={styles.verifiedIcon}
                  />
                )}
              </TouchableOpacity>

              {/* Direct chat button right next to author's name */}
              <TouchableOpacity
                style={styles.directChatBtn}
                activeOpacity={0.75}
                onPress={() => onOpenDirectChat?.(post.author)}
              >
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.directChatBtnText}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.badgeRow}>
              {post.author.badge && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{post.author.badge}</Text>
                </View>
              )}
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.timestampText}>{post.createdAt}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          activeOpacity={0.6}
          onPress={handleMorePress}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={BrandColors.textPlaceholder} />
        </TouchableOpacity>
      </View>

      {/* Dish Name & Content */}
      <View style={styles.contentContainer}>
        {post.dishName ? (
          <Text style={styles.dishTitle}>{post.dishName}</Text>
        ) : null}
        <Text style={styles.bodyText} numberOfLines={4}>
          {post.content}
        </Text>
      </View>

      {/* Tags Row */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => onTagPress?.(tag)}
              style={styles.tagPill}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Post Image */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imageWrapper}>
          <ExpoImage
            source={post.images[0]}
            style={styles.postImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={180}
          />
        </View>
      )}

      {/* Floating Reaction Picker Bar */}
      {showReactionPicker && (
        <View style={styles.reactionPickerBar}>
          {reactionTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.reactionButton}
              accessibilityRole="button"
              accessibilityLabel={REACTIONS[type].label}
              onPress={() => handleSelectReaction(type)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={REACTIONS[type].icon} size={23} color={BrandColors.textDark} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action Footer: Like, Comment, Save, Share */}
      <View style={styles.actionRow}>
        <View style={styles.actionLeft}>
          {/* Like / Reaction Button */}
          <TouchableOpacity
            style={[
              styles.actionPillBtn,
              post.isLiked && styles.actionPillBtnLiked,
            ]}
            activeOpacity={0.7}
            onPress={handleToggleLike}
            onLongPress={handleLongPressLike}
            delayLongPress={300}
          >
            <MaterialCommunityIcons
              name={reactionIcon ?? (post.isLiked || userReaction === "love" ? "heart" : "heart-outline")}
              size={18}
              color={BrandColors.textDark}
            />
            <Text
              style={[
                styles.actionPillText,
                post.isLiked && { color: "#242424", fontWeight: "700" },
              ]}
            >
              {post.likesCount > 0 ? post.likesCount : "Thích"}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionPillBtn}
            activeOpacity={0.7}
            onPress={() => onComment(post)}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={17}
              color={BrandColors.primary}
            />
            <Text style={[styles.actionPillText, { color: BrandColors.primaryDark }]}>
              Bình luận ({post.comments?.length || post.commentsCount || 0})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRight}>
          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.actionIconBtn}
            activeOpacity={0.7}
            onPress={handleToggleSave}
          >
            <Ionicons
              name={post.isSaved ? "bookmark" : "bookmark-outline"}
              size={19}
              color={post.isSaved ? BrandColors.primary : "#5E5E5E"}
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionIconBtn}
            activeOpacity={0.7}
            onPress={() => onShare?.(post)}
          >
            <Ionicons name="share-social-outline" size={19} color={BrandColors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick comments preview if any */}
      {post.comments && post.comments.length > 0 && (
        <TouchableOpacity
          style={styles.commentPreviewBox}
          activeOpacity={0.8}
          onPress={() => onComment(post)}
        >
          <View style={styles.commentPreviewHeader}>
            <Text style={styles.commentAuthor}>
              {post.comments[post.comments.length - 1].author.name}:
            </Text>
            <Text style={styles.commentContent} numberOfLines={1}>
              {" "}
              {post.comments[post.comments.length - 1].content}
            </Text>
          </View>
          <Text style={styles.viewMoreCommentsText}>Xem tất cả bình luận →</Text>
        </TouchableOpacity>
      )}

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        targetType="post"
        targetId={post.id}
        targetTitle={post.dishName}
        onClose={() => setShowReportModal(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: BrandColors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BrandColors.inputBg,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#353535",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  authorMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  authorNameWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  directChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    gap: 3,
  },
  directChatBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: BrandColors.primaryDark,
  },
  dotSeparator: {
    marginHorizontal: 5,
    fontSize: 10,
    color: BrandColors.textPlaceholder,
  },
  timestampText: {
    fontSize: 11,
    color: BrandColors.textPlaceholder,
  },
  moreButton: {
    padding: 6,
  },
  contentContainer: {
    marginBottom: 8,
  },
  dishTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.primaryDark,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: BrandColors.textBody,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagPill: {
    backgroundColor: BrandColors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.primary,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: BrandColors.background,
  },
  postImage: {
    width: "100%",
    height: 220,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F7F7F7",
    paddingTop: 10,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  actionPillBtnLiked: {
    backgroundColor: "#F4F4F4",
    borderColor: "#DADADA",
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: BrandColors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  commentPreviewBox: {
    backgroundColor: BrandColors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  commentPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  commentContent: {
    fontSize: 12,
    color: BrandColors.textMuted,
    flex: 1,
  },
  viewMoreCommentsText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.primary,
    marginTop: 2,
  },
  reactionPickerBar: {
    flexDirection: "row",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    bottom: 50,
    left: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 6,
  },
  reactionButton: {
    padding: 4,
  },
});
