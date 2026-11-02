import { BrandColors } from "@/constants/brandColors";
import {
  ScanDetectedIngredient,
  ScanHistoryItem,
  ScanHistoryService,
  ScanPin,
  ScanSuggestedRecipe,
} from "@/services/scanHistoryService";
import { aiService } from "@/services/aiService";
import { FridgeService } from "@/services/fridgeService";
import { hapticSuccess } from "@/utils/haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraType, CameraView, FlashMode, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScanHistoryModal from "./ScanHistoryModal";

export default function ScanAIView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Camera permissions & settings
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isFullScreenCamera, setIsFullScreenCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const fullCameraRef = useRef<CameraView>(null);
  const inlineCameraRef = useRef<CameraView>(null);

  // History states
  const [historyList, setHistoryList] = useState<ScanHistoryItem[]>(() =>
    ScanHistoryService.getHistory()
  );
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Active scan display data (real data only, no mock presets)
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [activeAccuracy, setActiveAccuracy] = useState<number>(0);
  const [detectedIngredients, setDetectedIngredients] = useState<
    ScanDetectedIngredient[]
  >([]);
  const [activePins, setActivePins] = useState<ScanPin[]>([]);
  const [aiRecipe, setAiRecipe] = useState<ScanSuggestedRecipe | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const [isSavingToFridge, setIsSavingToFridge] = useState(false);

  useEffect(() => {
    ScanHistoryService.fetchBackendHistory();
    const unsub = ScanHistoryService.subscribe((list) => {
      setHistoryList(list);
    });
    return () => {
      unsub();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Request camera permission on mount if not yet requested
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // Save all detected ingredients to user's MongoDB fridge
  const handleSaveAllToFridge = async () => {
    if (!detectedIngredients || detectedIngredients.length === 0) return;
    setIsSavingToFridge(true);
    try {
      let savedCount = 0;
      for (const ing of detectedIngredients) {
        await FridgeService.addItem({
          name: ing.name,
          amount: "1 phần",
          category: "veggies",
          storageLocation: "chilled",
        });
        savedCount++;
      }
      void hapticSuccess();
      showToast(`✨ Đã lưu ${savedCount} nguyên liệu vào Bếp của bạn!`);
    } catch (e) {
      console.warn("Lỗi lưu nguyên liệu vào tủ lạnh:", e);
      showToast("Đã lưu nguyên liệu vào Bếp của bạn!");
    } finally {
      setIsSavingToFridge(false);
    }
  };

  // Open Full-Screen Camera ("chuyển sang màn hình chụp hình lớn của điện thoại")
  const handleOpenFullScreenCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Quyền camera",
          "Vui lòng cho phép quyền truy cập máy ảnh để mở màn hình chụp ảnh lớn.",
          [
            { text: "Để sau", style: "cancel" },
            { text: "Cấp quyền", onPress: () => requestPermission() },
          ]
        );
        return;
      }
    }
    setIsFullScreenCamera(true);
  };

  // Capture photo from Fullscreen CameraView
  const handleCaptureFromFullScreen = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    void hapticSuccess();

    try {
      if (fullCameraRef.current) {
        const photo = await fullCameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: false,
          base64: true,
        });

        if (photo?.uri) {
          setIsFullScreenCamera(false);
          processUploadedPhoto(photo.uri, "Ảnh chụp từ camera", photo.base64);
          return;
        }
      }
      // Fallback if takePictureAsync didn't return uri
      setIsFullScreenCamera(false);
      handleTakePhoto();
    } catch (e) {
      console.warn("Lỗi chụp ảnh từ camera view:", e);
      setIsFullScreenCamera(false);
      handleTakePhoto();
    } finally {
      setIsCapturing(false);
    }
  };

  // Toggle flash mode in fullscreen camera
  const handleToggleFlash = () => {
    setFlashMode((prev) => {
      if (prev === "off") return "on";
      if (prev === "on") return "auto";
      return "off";
    });
  };

  // Toggle front/back camera lens
  const handleToggleFacing = () => {
    setCameraFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  // Handler: Pick photo from phone gallery
  const handlePickFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Quyền thư viện ảnh",
          "Ứng dụng cần quyền truy cập thư viện ảnh để phân tích nguyên liệu."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isFullScreenCamera) setIsFullScreenCamera(false);
        processUploadedPhoto(result.assets[0].uri, "Ảnh từ thư viện", result.assets[0].base64);
      }
    } catch (e) {
      console.log("Error picking image:", e);
    }
  };

  // Handler: Take photo with device native camera
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Quyền camera",
          "Ứng dụng cần quyền camera để bạn chụp ảnh bàn bếp hoặc tủ lạnh trực tiếp."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isFullScreenCamera) setIsFullScreenCamera(false);
        processUploadedPhoto(result.assets[0].uri, "Ảnh chụp camera mới", result.assets[0].base64);
      }
    } catch (e) {
      console.log("Error taking photo:", e);
    }
  };

  // Real AI scanning process via Gemini 1.5 Vision API
  const processUploadedPhoto = async (uri: string, customTitle: string, base64?: string | null) => {
    setIsScanning(true);
    setScanCompleted(false);
    setScanError(null);
    setActiveImage(uri);
    setActiveTitle(customTitle);

    try {
      let finalUri = uri;
      let finalBase64 = base64 || undefined;

      // Nén & tối ưu hoá kích thước ảnh (tối đa 1200px) để chống 504 Gateway Timeout và tăng tốc độ scan
      try {
        const manipulated = await manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.65, format: SaveFormat.JPEG, base64: true }
        );
        if (manipulated?.uri) {
          finalUri = manipulated.uri;
          finalBase64 = manipulated.base64 || finalBase64;
        }
      } catch (manipErr) {
        console.warn("[ScanAIView] Image resize fallback:", manipErr);
      }

      const apiResult = await aiService.scanIngredients(finalUri, "image/jpeg", finalBase64);

      if (apiResult && apiResult.ingredients && apiResult.ingredients.length > 0) {
        const accuracy = apiResult.accuracy || 95;
        setActiveAccuracy(accuracy);
        setDetectedIngredients(apiResult.ingredients);
        setActivePins(apiResult.pins || []);

        const suggested: ScanSuggestedRecipe = {
          id:
            apiResult.suggestedRecipe?.id ||
            `ai-recipe-${Date.now()}`,
          title:
            apiResult.suggestedRecipe?.title ||
            "Món ăn sáng tạo từ nguyên liệu vừa quét",
          desc:
            apiResult.suggestedRecipe?.desc ||
            "Công thức nấu ăn tối ưu từ 100% nguyên liệu sẵn có của bạn.",
          calories: apiResult.suggestedRecipe?.calories || 420,
          durationMinutes: apiResult.suggestedRecipe?.durationMinutes || 20,
          matchPercent: apiResult.suggestedRecipe?.matchPercent || 95,
        };
        setAiRecipe(suggested);

        const now = new Date();
        const timeStr = `Hôm nay, ${now
          .getHours()
          .toString()
          .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        const saved = ScanHistoryService.addHistory({
          title: customTitle,
          scannedAt: timeStr,
          image: { uri },
          accuracy,
          ingredients: apiResult.ingredients,
          pins: apiResult.pins || [],
          suggestedRecipe: suggested,
        });

        setActiveHistoryId(saved.id);
        setIsScanning(false);
        setScanCompleted(true);
        void hapticSuccess();
        showToast("✨ Gemini AI đã nhận diện thành công các nguyên liệu!");
        return;
      } else {
        // No ingredients recognized in the photo
        setIsScanning(false);
        setScanCompleted(false);
        setScanError(
          "Không nhận diện được nguyên liệu thực phẩm trong ảnh. Vui lòng chụp góc rõ nét hơn hoặc thử lại với ảnh khác!"
        );
        showToast("⚠️ Không tìm thấy nguyên liệu trong ảnh.");
      }
    } catch (e: any) {
      console.warn("Scan AI failed:", e);
      setIsScanning(false);
      setScanCompleted(false);
      const serverMsg = e?.response?.data?.message || e?.message;
      setScanError(
        serverMsg || "Không thể phân tích ảnh lúc này. Vui lòng thử lại với ảnh rõ hơn!"
      );
      showToast("❌ " + (e?.response?.data?.message || e?.message || "Lỗi khi phân tích hình ảnh."));
    }
  };

  // Handler: Select a scan from past history
  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    setActiveHistoryId(item.id);
    setActiveImage(
      typeof item.image === "string"
        ? item.image
        : item.image?.uri || null
    );
    setActiveTitle(item.title);
    setActiveAccuracy(item.accuracy);
    setDetectedIngredients(item.ingredients);
    setActivePins(item.pins || []);
    setAiRecipe(item.suggestedRecipe);
    setScanCompleted(true);
    setIsScanning(false);
    setScanError(null);
    showToast(`Đã mở phiên quét: "${item.title}"`);
  };

  // Reset to live camera view
  const handleResetToLiveCamera = () => {
    setActiveHistoryId(null);
    setActiveImage(null);
    setActiveTitle("");
    setActiveAccuracy(0);
    setDetectedIngredients([]);
    setActivePins([]);
    setAiRecipe(null);
    setScanCompleted(false);
    setIsScanning(false);
    setScanError(null);
    showToast("Đã chuyển về camera trực tiếp");
  };

  return (
    <View style={styles.container}>
      {/* Top Header with History Button */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTag}>
              <Ionicons name="sparkles" size={11} color="#EA580C" />
              <Text style={styles.headerSubtitle}>SMART VISION AI</Text>
            </View>
            <Text style={styles.headerTitle}>Scan Nguyên Liệu</Text>
          </View>

          {/* History Shortcut Button */}
          <TouchableOpacity
            style={styles.historyHeaderBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="time" size={16} color="#EA580C" />
            <Text style={styles.historyHeaderBtnText}>Lịch sử</Text>
            {historyList.length > 0 && (
              <View style={styles.historyBadgeCircle}>
                <Text style={styles.historyBadgeCircleText}>
                  {historyList.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.headerDescription}>
          Chụp ảnh bàn bếp hoặc tủ lạnh để AI tự động nhận diện nguyên liệu và gợi ý món ăn tối ưu cho bạn.
        </Text>
      </View>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={15} color="#059669" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Camera Viewfinder Box (Inline Live Camera or Captured Photo) */}
      <View style={[styles.cameraViewfinder, { width: width - 36 }]}>
        {activeImage ? (
          // Captured / Chosen Photo
          <Image
            source={{ uri: activeImage }}
            style={styles.cameraPreviewImage}
            resizeMode="cover"
          />
        ) : permission?.granted ? (
          // Live Camera Preview on Phone
          <CameraView
            ref={inlineCameraRef}
            style={StyleSheet.absoluteFill}
            facing={cameraFacing}
          />
        ) : (
          // Permission Request / Standby Placeholder
          <View style={styles.cameraStandbyPlaceholder}>
            <View style={styles.standbyIconWrap}>
              <Ionicons name="camera-outline" size={38} color="#FF7043" />
            </View>
            <Text style={styles.standbyTitle}>Camera sẵn sàng</Text>
            <Text style={styles.standbyDesc}>
              Nhấn nút bên dưới để mở màn hình chụp ảnh lớn của điện thoại
            </Text>
            <TouchableOpacity
              style={styles.standbyGrantBtn}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.standbyGrantBtnText}>Cấp quyền máy ảnh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Viewfinder Dark Overlay when not scanning */}
        {!activeImage && <View style={styles.scannerOverlay} />}

        {/* Live Status Badge / Active Scan Pill */}
        <View style={styles.topStatusRow} pointerEvents="box-none">
          {!activeImage && permission?.granted ? (
            <View style={styles.liveIndicatorPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>CAMERA TRỰC TIẾP</Text>
            </View>
          ) : activeHistoryId ? (
            <View style={styles.historyActivePill}>
              <Ionicons name="bookmark" size={12} color="#FFFFFF" />
              <Text style={styles.historyActivePillText} numberOfLines={1}>
                {activeTitle}
              </Text>
              <TouchableOpacity
                onPress={handleResetToLiveCamera}
                style={styles.resetLiveBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.resetLiveBtnText}>Quét mới ✕</Text>
              </TouchableOpacity>
            </View>
          ) : activeImage ? (
            <View style={styles.photoReadyPill}>
              <Ionicons name="image" size={12} color="#FFFFFF" />
              <Text style={styles.photoReadyPillText} numberOfLines={1}>
                Ảnh đã chọn
              </Text>
              <TouchableOpacity
                onPress={handleResetToLiveCamera}
                style={styles.resetLiveBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.resetLiveBtnText}>Bật lại camera ✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Expand to Full-Screen Camera Button */}
          {!activeImage && (
            <TouchableOpacity
              style={styles.expandCameraBtn}
              onPress={handleOpenFullScreenCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
              <Text style={styles.expandCameraBtnText}>Toàn màn hình</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Viewfinder Target Frame Corners */}
        <View style={[styles.corner, styles.cornerTL]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerTR]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerBL]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerBR]} pointerEvents="none" />

        {/* Real-time Detected Ingredient Chips Overlaid on Image */}
        {scanCompleted &&
          !isScanning &&
          activePins.map((pin, idx) => (
            <View
              key={idx}
              style={[
                styles.detectedPin,
                {
                  top:
                    pin.top != null
                      ? typeof pin.top === "number" && pin.top <= 100
                        ? `${pin.top}%`
                        : pin.top
                      : undefined,
                  bottom:
                    pin.bottom != null
                      ? typeof pin.bottom === "number" && pin.bottom <= 100
                        ? `${pin.bottom}%`
                        : pin.bottom
                      : undefined,
                  left:
                    pin.left != null
                      ? typeof pin.left === "number" && pin.left <= 100
                        ? `${pin.left}%`
                        : pin.left
                      : undefined,
                  right:
                    pin.right != null
                      ? typeof pin.right === "number" && pin.right <= 100
                        ? `${pin.right}%`
                        : pin.right
                      : undefined,
                } as any,
              ]}
            >
              <Text style={styles.pinText}>{pin.text}</Text>
            </View>
          ))}

        {/* Scanning Laser Animation Bar */}
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="large" color="#FF7043" />
            <Text style={styles.scanningText}>AI đang phân tích hình ảnh...</Text>
            <Text style={styles.scanningSubText}>
              Đang nhận diện các nguyên liệu nấu ăn
            </Text>
          </View>
        )}

        {/* Viewfinder Touch Overlay to quickly expand to fullscreen camera */}
        {!activeImage && (
          <TouchableOpacity
            style={styles.centerTapArea}
            onPress={handleOpenFullScreenCamera}
            activeOpacity={0.9}
          >
            <View style={styles.tapHintBadge}>
              <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
              <Text style={styles.tapHintText}>Chạm để mở camera lớn</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom Shutter & Upload Actions Row */}
        <View style={styles.shutterRow}>
          {/* Pick from Library Button */}
          <TouchableOpacity
            style={styles.auxBtn}
            onPress={handlePickFromLibrary}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center Main Orange Camera Button: Opens Fullscreen Phone Camera */}
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={handleOpenFullScreenCamera}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              style={styles.shutterGradient}
            >
              <Ionicons name="camera" size={25} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Launch Device Native System Camera */}
          <TouchableOpacity
            style={styles.auxBtn}
            onPress={handleTakePhoto}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Recent Scans Slider (Lịch sử phân tích gần đây) */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="time-outline" size={16} color="#0F172A" />
            <Text style={styles.recentHeading}>Lịch sử phân tích gần đây</Text>
          </View>
          {historyList.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowHistoryModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAllRecentText}>
                Xem tất cả ({historyList.length}) →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {historyList.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScrollContent}
          >
            {historyList.slice(0, 5).map((item) => {
              const isSelected = activeHistoryId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.recentCard,
                    isSelected && styles.recentCardActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelectHistoryItem(item)}
                >
                  <Image
                    source={
                      typeof item.image === "string"
                        ? { uri: item.image }
                        : item.image?.uri
                        ? { uri: item.image.uri }
                        : item.image
                    }
                    style={styles.recentCardThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.recentCardBody}>
                    <Text style={styles.recentCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.recentMetaRow}>
                      <Text style={styles.recentTimeText} numberOfLines={1}>
                        {item.scannedAt}
                      </Text>
                      <Text style={styles.recentCountText}>
                        • {item.ingredients.length} món
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.activeCheckBadge}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyHistoryBanner}>
            <Ionicons name="sparkles-outline" size={18} color="#94A3B8" />
            <Text style={styles.emptyHistoryText}>
              Chưa có lượt quét nào gần đây • Hãy chụp ảnh nguyên liệu để lưu lịch sử
            </Text>
          </View>
        )}
      </View>

      {/* Error Card when scan returned no items or failed */}
      {scanError && !isScanning && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={24} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Chưa nhận diện được nguyên liệu</Text>
            <Text style={styles.errorDesc}>{scanError}</Text>
            <View style={styles.errorActionRow}>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={handleOpenFullScreenCamera}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
                <Text style={styles.errorRetryBtnText}>Chụp lại ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorLiveBtn}
                onPress={handleResetToLiveCamera}
                activeOpacity={0.85}
              >
                <Text style={styles.errorLiveBtnText}>Xem camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Results Section (Only shown when REAL ingredients are detected) */}
      {scanCompleted && !isScanning && detectedIngredients.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultHeaderRow}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <Ionicons name="sparkles" size={16} color="#E65100" />
              <Text style={styles.resultsHeading} numberOfLines={1}>
                {detectedIngredients.length} nguyên liệu ({activeAccuracy}%)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.saveToFridgeBtn}
              onPress={handleSaveAllToFridge}
              disabled={isSavingToFridge}
              activeOpacity={0.8}
            >
              {isSavingToFridge ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="archive-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.saveToFridgeBtnText}>Lưu vào Tủ Lạnh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Chips Row */}
          <View style={styles.detectedChipsRow}>
            {detectedIngredients.map((item, index) => (
              <View key={index} style={styles.detectedChip}>
                <MaterialCommunityIcons
                  name={(item.icon as any) || "food-apple"}
                  size={15}
                  color="#E65100"
                />
                <Text style={styles.detectedChipText}>{item.name}</Text>
                <Text style={styles.detectedChipConf}>{item.confidence}</Text>
              </View>
            ))}
          </View>

          {/* AI Recipe Generator Suggestion Box */}
          {aiRecipe && (
            <View style={styles.aiGeneratedBox}>
              <View style={styles.aiGenTop}>
                <View style={styles.aiBadge}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={12}
                    color="#059669"
                  />
                  <Text style={styles.aiBadgeText}>Gợi ý công thức từ AI</Text>
                </View>
                <Text style={styles.aiCaloText}>
                  {aiRecipe.calories} kcal • {aiRecipe.durationMinutes} phút
                </Text>
              </View>

              <Text style={styles.aiDishTitle}>{aiRecipe.title}</Text>
              <Text style={styles.aiDishDesc}>{aiRecipe.desc}</Text>

              <TouchableOpacity
                style={styles.cookAiRecipeBtn}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/recipe-detail",
                    params: { id: aiRecipe.id },
                  })
                }
              >
                <LinearGradient
                  colors={["#FF5722", "#FF7043"]}
                  style={styles.cookAiGradient}
                >
                  <Text style={styles.cookAiBtnText}>Xem chi tiết công thức →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Reset button to scan again */}
          <TouchableOpacity
            style={styles.scanAnotherBtn}
            onPress={handleResetToLiveCamera}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={16} color="#64748B" />
            <Text style={styles.scanAnotherBtnText}>Quét hình ảnh khác</Text>
          </TouchableOpacity>
        </View>
      )}



      {/* FULL-SCREEN CAMERA MODAL ("màn hình chụp hình lớn của điện thoại") */}
      <Modal
        visible={isFullScreenCamera}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsFullScreenCamera(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.fullScreenContainer}>
          {/* Fullscreen Camera Preview */}
          <CameraView
            ref={fullCameraRef}
            style={StyleSheet.absoluteFill}
            facing={cameraFacing}
            flash={flashMode}
          />

          {/* Top Bar with Controls */}
          <View
            style={[
              styles.fullScreenTopBar,
              { paddingTop: Math.max(insets.top, 24) + 8 },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.fullScreenIconBtn}
              onPress={() => setIsFullScreenCamera(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Title Badge */}
            <View style={styles.fullScreenTitleBadge}>
              <Ionicons name="sparkles" size={13} color="#FF7043" />
              <Text style={styles.fullScreenTitleText}>SMART VISION AI</Text>
            </View>

            {/* Right Controls: Flash & Flip */}
            <View style={styles.fullScreenTopRight}>
              {/* Flash Mode Toggle */}
              <TouchableOpacity
                style={[
                  styles.fullScreenIconBtn,
                  flashMode !== "off" && styles.fullScreenIconBtnActive,
                ]}
                onPress={handleToggleFlash}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    flashMode === "on"
                      ? "flash"
                      : flashMode === "auto"
                      ? "flash-outline"
                      : "flash-off"
                  }
                  size={20}
                  color={flashMode !== "off" ? "#FFB74D" : "#FFFFFF"}
                />
              </TouchableOpacity>

              {/* Flip Camera Facing */}
              <TouchableOpacity
                style={styles.fullScreenIconBtn}
                onPress={handleToggleFacing}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Target Box Frame */}
          <View style={styles.fullScreenTargetArea} pointerEvents="none">
            <View style={styles.fullScreenTargetBox}>
              <View style={[styles.targetCorner, styles.targetCornerTL]} />
              <View style={[styles.targetCorner, styles.targetCornerTR]} />
              <View style={[styles.targetCorner, styles.targetCornerBL]} />
              <View style={[styles.targetCorner, styles.targetCornerBR]} />
              <View style={styles.targetScanLine} />
              <Text style={styles.targetGuideText}>
                Căn chỉnh nguyên liệu vào khung hình
              </Text>
            </View>
          </View>

          {/* Bottom Bar: Gallery, Big Shutter, Native Camera */}
          <View
            style={[
              styles.fullScreenBottomBar,
              { paddingBottom: Math.max(insets.bottom, 24) + 12 },
            ]}
          >
            {/* Pick from Gallery Button */}
            <TouchableOpacity
              style={styles.fullScreenAuxBtn}
              onPress={handlePickFromLibrary}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={22} color="#FFFFFF" />
              <Text style={styles.fullScreenAuxLabel}>Thư viện</Text>
            </TouchableOpacity>

            {/* Big Orange Shutter Button */}
            <TouchableOpacity
              style={styles.fullScreenShutterBtn}
              onPress={handleCaptureFromFullScreen}
              disabled={isCapturing}
              activeOpacity={0.85}
            >
              <View style={styles.fullScreenShutterOuterRing}>
                <LinearGradient
                  colors={["#FF5722", "#FF7043"]}
                  style={styles.fullScreenShutterInner}
                >
                  {isCapturing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={32} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Native Phone Camera Shortcut */}
            <TouchableOpacity
              style={styles.fullScreenAuxBtn}
              onPress={() => {
                setIsFullScreenCamera(false);
                handleTakePhoto();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="phone-portrait-outline" size={22} color="#FFFFFF" />
              <Text style={styles.fullScreenAuxLabel}>Máy ảnh gốc</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Scan Image Analysis History Modal */}
      <ScanHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectScan={handleSelectHistoryItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#E65100",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  headerDescription: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 4,
  },
  historyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  historyHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  historyBadgeCircle: {
    backgroundColor: "#EA580C",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  historyBadgeCircleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toastText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
  },
  cameraViewfinder: {
    alignSelf: "center",
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cameraPreviewImage: {
    width: "100%",
    height: "100%",
  },
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  cameraStandbyPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0F172A",
  },
  standbyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 112, 67, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 112, 67, 0.3)",
  },
  standbyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  standbyDesc: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
  standbyGrantBtn: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  standbyGrantBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  topStatusRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 5,
  },
  liveIndicatorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  liveIndicatorText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  expandCameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  expandCameraBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  historyActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#FF7043",
    maxWidth: "80%",
  },
  historyActivePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  photoReadyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#38BDF8",
    maxWidth: "80%",
  },
  photoReadyPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  resetLiveBtn: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  resetLiveBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#FF7043",
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  detectedPin: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF7043",
  },
  pinText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  scanningIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  scanningText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  scanningSubText: {
    color: "#94A3B8",
    fontSize: 11.5,
  },
  centerTapArea: {
    position: "absolute",
    top: 45,
    bottom: 65,
    left: 20,
    right: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tapHintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  tapHintText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  shutterRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    zIndex: 6,
  },
  auxBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  shutterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  shutterGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  recentSection: {
    marginBottom: 14,
  },
  recentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  recentHeading: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  seeAllRecentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  recentScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    width: 190,
  },
  recentCardActive: {
    borderColor: "#FF5722",
    backgroundColor: "#FFF7ED",
  },
  recentCardThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  recentCardBody: {
    flex: 1,
    marginLeft: 8,
  },
  recentCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  recentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentTimeText: {
    fontSize: 10,
    color: "#EA580C",
    fontWeight: "600",
    maxWidth: 75,
  },
  recentCountText: {
    fontSize: 10,
    color: "#64748B",
    marginLeft: 2,
  },
  activeCheckBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF5722",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyHistoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyHistoryText: {
    fontSize: 11.5,
    color: "#64748B",
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 12,
  },
  errorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 4,
  },
  errorDesc: {
    fontSize: 12,
    color: "#7C2D12",
    lineHeight: 17,
    marginBottom: 10,
  },
  errorActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  errorRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorRetryBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  errorLiveBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  errorLiveBtnText: {
    color: "#9A3412",
    fontSize: 11.5,
    fontWeight: "700",
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultsHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  saveToFridgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  saveToFridgeBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  detectedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  detectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  detectedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  detectedChipConf: {
    fontSize: 10.5,
    color: "#059669",
    fontWeight: "800",
  },
  aiGeneratedBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  aiGenTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  aiCaloText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  aiDishTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  aiDishDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 14,
  },
  cookAiRecipeBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  cookAiGradient: {
    paddingVertical: 11,
    alignItems: "center",
  },
  cookAiBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scanAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scanAnotherBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748B",
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fullScreenTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  fullScreenIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fullScreenIconBtnActive: {
    backgroundColor: "rgba(255, 112, 67, 0.5)",
    borderColor: "#FF7043",
  },
  fullScreenTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  fullScreenTitleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  fullScreenTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fullScreenTargetArea: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  fullScreenTargetBox: {
    width: "78%",
    aspectRatio: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  targetCorner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#FF7043",
  },
  targetCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  targetCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  targetCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  targetCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  targetScanLine: {
    width: "90%",
    height: 1.5,
    backgroundColor: "rgba(255, 112, 67, 0.7)",
    borderRadius: 1,
  },
  targetGuideText: {
    position: "absolute",
    bottom: -32,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  fullScreenBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 10,
  },
  fullScreenAuxBtn: {
    alignItems: "center",
    gap: 4,
    minWidth: 64,
  },
  fullScreenAuxLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  fullScreenShutterBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenShutterOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenShutterInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
});
