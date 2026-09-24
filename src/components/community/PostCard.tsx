import { BrandColors } from "@/constants/brandColors";
import { CommunityAuthor, CommunityPost } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onComment: (post: CommunityPost) => void;
  onOpenDirectChat?: (author: CommunityAuthor) => void;
  onSave?: (postId: string) => void;
  onShare?: (post: CommunityPost) => void;
  onTagPress?: (tag: string) => void;
}

export default function PostCard({
  post,
  onLike,
  onComment,
  onOpenDirectChat,
  onSave,
  onShare,
  onTagPress,
}: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [saved, setSaved] = useState(post.isSaved);

  useEffect(() => {
    setLiked(post.isLiked);
    setLikesCount(post.likesCount);
    setSaved(post.isSaved);
  }, [post.isLiked, post.likesCount, post.isSaved]);

  const handleToggleLike = () => {
    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    onLike(post.id);
  };

  const handleToggleSave = () => {
    setSaved(!saved);
    onSave?.(post.id);
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
          onPress={() => onShare?.(post)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#94A3B8" />
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
          <Image
            source={post.images[0]}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Action Footer: Like, Comment (with explicit label & icon), Save, Share */}
      <View style={styles.actionRow}>
        <View style={styles.actionLeft}>
          {/* Like Button */}
          <TouchableOpacity
            style={[styles.actionPillBtn, liked && styles.actionPillBtnLiked]}
            activeOpacity={0.7}
            onPress={handleToggleLike}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={18}
              color={liked ? "#EF4444" : "#475569"}
            />
            <Text
              style={[
                styles.actionPillText,
                liked && { color: "#EF4444", fontWeight: "700" },
              ]}
            >
              {likesCount > 0 ? likesCount : "Thích"}
            </Text>
          </TouchableOpacity>

          {/* Comment Button (Explicit label so user sees it clearly) */}
          <TouchableOpacity
            style={styles.actionPillBtn}
            activeOpacity={0.7}
            onPress={() => onComment(post)}
          >
            <Ionicons
              name="chatbubble-ellipses"
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
              name={saved ? "bookmark" : "bookmark-outline"}
              size={19}
              color={saved ? BrandColors.primary : "#64748B"}
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionIconBtn}
            activeOpacity={0.7}
            onPress={() => onShare?.(post)}
          >
            <Ionicons name="share-social-outline" size={19} color="#64748B" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
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
    backgroundColor: "#F1F5F9",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10B981",
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
    color: "#0F172A",
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  directChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B35",
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
    backgroundColor: "#FFF3E0",
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
    color: "#94A3B8",
  },
  timestampText: {
    fontSize: 11,
    color: "#94A3B8",
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
    color: "#334155",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagPill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F8FAFC",
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
    borderTopColor: "#F8FAFC",
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
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionPillBtnLiked: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  commentPreviewBox: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  commentPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  commentContent: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  viewMoreCommentsText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.primary,
    marginTop: 2,
  },
});
