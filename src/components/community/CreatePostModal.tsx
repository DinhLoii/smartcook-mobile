import { BrandColors } from "@/constants/brandColors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    dishName: string;
    content: string;
    images: any[];
    tags: string[];
  }) => void;
}

const AVAILABLE_TAGS = [
  "#KhoeMonNgon",
  "#HoiDapBep",
  "#HealthyEatClean",
  "#MonNhanh",
  "#BiQuyet",
  "#MonChay",
  "#BanhNgot",
];

const PRESET_SAMPLE_PHOTOS = [
  { id: "p1", name: "Cơm Gà", source: require("@/assets/images/hero-teriyaki-bowl.jpg") },
  { id: "p2", name: "Cá Hồi", source: require("@/assets/images/salad-salmon.jpg") },
  { id: "p3", name: "Bít Tết", source: require("@/assets/images/steak-asparagus.jpg") },
  { id: "p4", name: "Mỳ Ý", source: require("@/assets/images/pasta-bolognese.jpg") },
  { id: "p5", name: "Gà Giòn", source: require("@/assets/images/crispy-chicken.jpg") },
];

export default function CreatePostModal({
  visible,
  onClose,
  onSubmit,
}: CreatePostModalProps) {
  const insets = useSafeAreaInsets();
  const [dishName, setDishName] = useState("");
  const [content, setContent] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<any>(
    PRESET_SAMPLE_PHOTOS[0].source
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "#KhoeMonNgon",
  ]);

  const handlePickLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập",
          "Vui lòng cho phép SmartCook truy cập thư viện ảnh để tải ảnh món ăn."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.log("Error selecting image:", e);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền Camera",
          "Vui lòng cho phép SmartCook sử dụng camera để chụp ảnh món ăn."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.log("Error taking camera photo:", e);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter((t) => t !== tag));
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handlePublish = () => {
    if (!content.trim() && !selectedPhoto) {
      Alert.alert(
        "Thiếu nội dung",
        "Vui lòng nhập mô tả hoặc chọn ảnh món ăn để chia sẻ."
      );
      return;
    }

    onSubmit({
      dishName: "",
      content: content.trim(),
      images: selectedPhoto ? [selectedPhoto] : [],
      tags: selectedTags,
    });

    // Reset fields
    setDishName("");
    setContent("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            styles.container,
            { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Tạo Bài Viết Mới</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePublish}
            >
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.publishBtn}
              >
                <Text style={styles.publishBtnText}>Đăng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Content / Description Input */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Bạn Đang Nghĩ Gì? (Mô Tả Bài Viết)</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="Chia sẻ về món ăn của bạn hôm nay, cảm nhận hoặc đặt câu hỏi cùng mọi người..."
                placeholderTextColor="#94A3B8"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Photo Selection Preview */}
            <View style={styles.photoSection}>
              <Text style={styles.inputLabel}>Ảnh Món Ăn</Text>
              {selectedPhoto && (
                <View style={styles.previewImageWrapper}>
                  <Image
                    source={selectedPhoto}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setSelectedPhoto(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Photo Source Buttons */}
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  activeOpacity={0.7}
                  onPress={handlePickLibrary}
                >
                  <Ionicons name="images" size={18} color={BrandColors.primary} />
                  <Text style={styles.photoActionText}>Chọn từ thư viện</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionBtn}
                  activeOpacity={0.7}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={18} color={BrandColors.primary} />
                  <Text style={styles.photoActionText}>Chụp ảnh mới</Text>
                </TouchableOpacity>
              </View>

              {/* Preset Sample Photos Bar for Easy Testing */}
              <Text style={styles.samplePhotoLabel}>Hoặc chọn ảnh món ăn gợi ý:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sampleScroll}
              >
                {PRESET_SAMPLE_PHOTOS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.sampleThumbnailWrapper,
                      selectedPhoto === item.source && styles.sampleThumbnailActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedPhoto(item.source)}
                  >
                    <Image source={item.source} style={styles.sampleThumbnail} />
                    <Text style={styles.sampleThumbnailText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tags Selection */}
            <View style={styles.tagsSection}>
              <Text style={styles.inputLabel}>Chủ Đề (Hashtag)</Text>
              <View style={styles.tagsContainer}>
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPill,
                        isSelected && styles.tagPillSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cancelBtn: {
    padding: 6,
  },
  cancelText: {
    fontSize: 14.5,
    color: "#64748B",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  publishBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
  },
  publishBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  contentInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 90,
  },
  photoSection: {
    marginBottom: 16,
  },
  previewImageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  photoActionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.primaryDark,
  },
  samplePhotoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  sampleScroll: {
    gap: 8,
  },
  sampleThumbnailWrapper: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
  },
  sampleThumbnailActive: {
    borderColor: BrandColors.primary,
  },
  sampleThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  sampleThumbnailText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagPillSelected: {
    backgroundColor: "#FFF3E0",
    borderColor: BrandColors.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tagTextSelected: {
    color: BrandColors.primaryDark,
    fontWeight: "700",
  },
});
