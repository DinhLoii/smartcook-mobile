import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { StoredUser, UpdateProfilePayload } from "@/types";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: StoredUser | null;
  onSave: (payload: UpdateProfilePayload) => Promise<void>;
}

// Preset avatars for quick selection
const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80", // Master Chef
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80", // Gourmet Cook
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80", // Home Chef Female
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80", // Home Chef Male
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  onSave,
}) => {
  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [avatar, setAvatar] = useState(currentUser?.avatar || "");
  const [isSaving, setIsSaving] = useState(false);

  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevUser, setPrevUser] = useState(currentUser);

  if (visible !== prevVisible || currentUser !== prevUser) {
    setPrevVisible(visible);
    setPrevUser(currentUser);
    if (visible && currentUser) {
      setFirstName(currentUser.firstName || "");
      setLastName(currentUser.lastName || "");
      setAvatar(currentUser.avatar || "");
    }
  }

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập",
          "Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh đại diện."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn ảnh từ thư viện.");
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập tên của bạn.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatar: avatar.trim(),
      });
      Alert.alert("Thành công", "Đã cập nhật thông tin hồ sơ của bạn!");
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Cập nhật hồ sơ thất bại. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <DismissKeyboard>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={BrandColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar Picker Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={
                    avatar
                      ? { uri: avatar }
                      : require("@/assets/images/smartcook-auth-bg.jpg")
                  }
                  style={styles.avatarPreview}
                />
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarHint}>
                Chạm vào biểu tượng máy ảnh hoặc chọn avatar mẫu dưới đây:
              </Text>

              {/* Preset Avatars Row */}
              <View style={styles.presetRow}>
                {PRESET_AVATARS.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setAvatar(url)}
                    style={[
                      styles.presetItem,
                      avatar === url && styles.presetItemActive,
                    ]}
                  >
                    <Image source={{ uri: url }} style={styles.presetImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input Fields */}
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên đệm</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Nguyễn Văn"
                  placeholderTextColor={BrandColors.textPlaceholder}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: An"
                  placeholderTextColor={BrandColors.textPlaceholder}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Không thể thay đổi)</Text>
                <View style={[styles.textInput, styles.disabledInput]}>
                  <Text style={styles.disabledText}>
                    {currentUser?.email || "smartcook.user@gmail.com"}
                  </Text>
                  <Ionicons name="lock-closed" size={14} color={BrandColors.textPlaceholder} />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtnWrapper}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      </DismissKeyboard>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(27, 27, 27, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  closeBtn: {
    padding: 4,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: BrandColors.borderLight,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: BrandColors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarHint: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  presetRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  presetItem: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetItemActive: {
    borderColor: BrandColors.primary,
  },
  presetImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  formSection: {
    gap: 14,
    marginTop: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  textInput: {
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.textDark,
  },
  disabledInput: {
    backgroundColor: BrandColors.inputBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disabledText: {
    fontSize: 14,
    color: BrandColors.textMuted,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: BrandColors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  saveBtnWrapper: {
    flex: 1.5,
  },
  saveBtnGradient: {
    flexDirection: "row",
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
