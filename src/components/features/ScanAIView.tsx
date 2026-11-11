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
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
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
import { useAuth } from "@/contexts/AuthContext";
import ScanHistoryModal from "./ScanHistoryModal";

export default function ScanAIView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Camera permissions & settings
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isFullScreenCamera, setIsFullScreenCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const scanRequestRef = useRef(0);
  const [imageAspect, setImageAspect] = useState(1);
  const [detectedDishes, setDetectedDishes] = useState<{ name: string; confidence: string; icon?: string }[]>([]);
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
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
  const photoTargets = detectedDishes.length ? detectedDishes : detectedIngredients;
  const selectedTarget = photoTargets.find(target => target.name === selectedTargetName) || photoTargets[0];
  const selectedIngredients = detectedIngredients.filter(item =>
    item.source !== "inferred" && (!detectedDishes.length || (!!selectedTarget && item.dishNames?.includes(selectedTarget.name))));
  const hasIngredientLinks = detectedIngredients.some(item => item.dishNames?.length);
  const selectedTargetIndex = selectedTarget ? photoTargets.indexOf(selectedTarget) : -1;
  useEffect(() => { setSelectedTargetName(null); }, [activeImage]);
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
    if (!selectedIngredients.length) return;
    setIsSavingToFridge(true);
    try {
      let savedCount = 0;
      for (const ing of selectedIngredients) {
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
      showToast("Không lưu được đầy đủ nguyên liệu. Vui lòng kiểm tra Tủ lạnh và thử lại.");
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
          quality: 0.9,
          skipProcessing: false,
        });

        if (photo?.uri) {
          setIsFullScreenCamera(false);
          processUploadedPhoto(photo.uri, "Ảnh chụp từ camera");
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
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isFullScreenCamera) setIsFullScreenCamera(false);
        processUploadedPhoto(result.assets[0].uri, "Ảnh từ thư viện");
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
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isFullScreenCamera) setIsFullScreenCamera(false);
        processUploadedPhoto(result.assets[0].uri, "Ảnh chụp camera mới");
      }
    } catch (e) {
      console.log("Error taking photo:", e);
    }
  };

  // Analyze the captured or selected image via the shared vision endpoint
  const processUploadedPhoto = async (uri: string, customTitle: string) => {
    const requestId = ++scanRequestRef.current;
    setDetectedIngredients([]);
    setDetectedDishes([]);
    setActivePins([]);
    setAiRecipe(null);
    setActiveAccuracy(0);
    setActiveHistoryId(null);
    setIsScanning(true);
    setScanCompleted(false);
    setScanError(null);
    setActiveImage(uri);
    setActiveTitle(customTitle);

    // Kiểm tra trạng thái đăng nhập: API /ai/* bắt buộc người dùng đã đăng nhập
    if (!isAuthenticated) {
      setIsScanning(false);
      setScanCompleted(false);
      setScanError(
        "Bạn chưa đăng nhập tài khoản. Vui lòng đăng nhập để phân tích ảnh và lưu công thức với Gemini AI!"
      );
      showToast("⚠️ Vui lòng đăng nhập để sử dụng tính năng Scan AI!");
      return;
    }

    try {
      // Always send the same oriented JPEG shown in the preview. Never reuse old bytes.
      const context = ImageManipulator.manipulate(uri);
      const original = await context.renderAsync();
      if (Math.max(original.width, original.height) > 2048) {
        context.resize(original.width >= original.height ? { width: 2048 } : { height: 2048 });
      }
      const rendered = await context.renderAsync();
      const photo = await rendered.saveAsync({
        compress: 0.85, format: SaveFormat.JPEG, base64: true,
      });
      if (requestId !== scanRequestRef.current) return;
      if (!photo.base64) throw new Error("Không đọc được ảnh để phân tích. Vui lòng chọn hoặc chụp lại.");
      setActiveImage(photo.uri);
      setImageAspect(photo.width / photo.height);
      const apiResult = await aiService.scanIngredients(photo.uri, "image/jpeg", photo.base64);
      if (requestId !== scanRequestRef.current) return;

      if (apiResult && apiResult.ingredients && (apiResult.ingredients.length > 0 || !!apiResult.dishes?.length)) {
        const accuracy = apiResult.accuracy ?? 0;
        const title = apiResult.title || customTitle;
        setActiveTitle(title);
        setDetectedDishes(apiResult.dishes || []);
        setActiveAccuracy(accuracy);
        setDetectedIngredients(apiResult.ingredients);
        setActivePins(apiResult.pins || []);

        const suggested: ScanSuggestedRecipe = {
          id:
            apiResult.suggestedRecipe?.id ||
            "",
          title:
            apiResult.suggestedRecipe?.title ||
            "Món ăn sáng tạo từ nguyên liệu vừa quét",
          desc:
            apiResult.suggestedRecipe?.desc ||
            "Gợi ý từ nguyên liệu trong ảnh; cần kiểm tra lại trước khi nấu.",
          calories: apiResult.suggestedRecipe?.calories ?? 0,
          durationMinutes: apiResult.suggestedRecipe?.durationMinutes ?? 0,
          matchPercent: apiResult.suggestedRecipe?.matchPercent ?? 0,
        };
        setAiRecipe(suggested);

        const now = new Date();
        const timeStr = `Hôm nay, ${now
          .getHours()
          .toString()
          .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        const saved = ScanHistoryService.addHistory({
          title,
          dishes: apiResult.dishes || [],
          scannedAt: timeStr,
          image: { uri: photo.uri },
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
      if (requestId !== scanRequestRef.current) return;
      console.warn("Scan AI failed:", e);
      setIsScanning(false);
      setScanCompleted(false);

      const status = e?.response?.status;
      let friendlyError = "";

      if (status === 401) {
        friendlyError =
          "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập để phân tích ảnh với Gemini AI!";
      } else if (status === 422) {
        friendlyError =
          e?.response?.data?.message ||
          "Chưa nhận diện được thực phẩm trong ảnh. Vui lòng chụp rõ món ăn hoặc nguyên liệu, đủ sáng và gần hơn!";
      } else if (status === 504 || e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        friendlyError =
          "Máy chủ AI đang khởi động lại (Cold start) hoặc xử lý quá lâu. Vui lòng đợi 10 giây và thử chụp lại!";
      } else if (status === 503) {
        friendlyError =
          e?.response?.data?.message ||
          "Hệ thống AI đang bận hoặc quá tải. Vui lòng thử lại sau ít phút!";
      } else {
        friendlyError =
          e?.response?.data?.message ||
          e?.message ||
          "Không thể phân tích ảnh lúc này. Vui lòng thử lại với ảnh rõ nét hơn!";
      }

      setScanError(friendlyError);
      showToast("❌ " + friendlyError);
    }
  };

  // Handler: Select a scan from past history
  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    ++scanRequestRef.current;
    setDetectedDishes(item.dishes || []);
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
    ++scanRequestRef.current;
    setDetectedDishes([]);
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
              <Ionicons name="sparkles" size={11} color={BrandColors.textDark} />
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
            <Ionicons name="time" size={16} color={BrandColors.textDark} />
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
          <Ionicons name="checkmark-circle" size={15} color="#262626" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Camera Viewfinder Box (Inline Live Camera or Captured Photo) */}
      <View style={[styles.cameraViewfinder, { width: width - 36 }, activeImage ? { height: (width - 36) / imageAspect } : {}]}>
        {activeImage ? (
          // Captured / Chosen Photo
          <Image
            source={{ uri: activeImage }}
            onLoad={(event) => {
              const { width: imageWidth, height: imageHeight } = event.nativeEvent.source;
              if (imageWidth > 0 && imageHeight > 0) setImageAspect(imageWidth / imageHeight);
            }}
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
              <Ionicons name="camera-outline" size={38} color="#292929" />
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

        {/* Keep the photo readable: numbered dish markers and one detail caption. */}
        {scanCompleted && !isScanning && photoTargets.map((target, index) => {
          const pin = activePins.find(item => item.text === target.name);
          const top = pin?.top ?? (pin?.bottom != null ? 100 - pin.bottom : undefined);
          const left = pin?.left ?? (pin?.right != null ? 100 - pin.right : undefined);
          if (top == null || left == null || !Number.isFinite(top) || !Number.isFinite(left) || top < 0 || top > 100 || left < 0 || left > 100) return null;
          const isSelected = selectedTarget?.name === target.name;
          return (
            <TouchableOpacity key={target.name} accessibilityRole="button" accessibilityLabel={`Xem món ${index + 1}: ${target.name}`} accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedTargetName(target.name)} activeOpacity={0.9}
              style={[styles.photoMarker, { top: `${top}%`, left: `${left}%`, backgroundColor: isSelected ? "#363636" : "#FFFFFF", borderColor: isSelected ? "#FFFFFF" : "#C2C2C2", zIndex: isSelected ? 3 : 2 }]}>
              <MaterialCommunityIcons name={((target.icon || pin?.icon || "silverware-fork-knife") as any)} size={15} color={isSelected ? "#FFFFFF" : "#171717"} />
              <Text style={{ color: isSelected ? "#FFFFFF" : "#353535", fontWeight: "800", fontSize: 12 }}>{index + 1}</Text>
            </TouchableOpacity>
          );
        })}
        {scanCompleted && !isScanning && selectedTarget && (
          <View pointerEvents="none" style={styles.photoCaption}>
            <Text style={styles.photoCaptionNumber}>{selectedTargetIndex + 1}</Text>
            <MaterialCommunityIcons name={((selectedTarget.icon || "silverware-fork-knife") as any)} size={20} color="#C2C2C2" />
            <View style={{ flex: 1 }}><Text style={styles.pinText}>{selectedTarget.name}</Text><Text style={{ fontSize: 10, color: "#C7C7C7", marginTop: 3 }}>AI ước tính · {selectedTarget.confidence}</Text></View>
          </View>
        )}

        {/* Scanning Laser Animation Bar */}
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="large" color="#292929" />
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
              colors={["#171717", "#292929"]}
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
            <Ionicons name="time-outline" size={16} color={BrandColors.textDark} />
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
            <Ionicons name="sparkles-outline" size={18} color={BrandColors.textPlaceholder} />
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
            <Ionicons
              name={
                !isAuthenticated || scanError.includes("đăng nhập")
                  ? "person-circle"
                  : "alert-circle"
              }
              size={24}
              color={BrandColors.textDark}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>
              {!isAuthenticated || scanError.includes("đăng nhập")
                ? "Yêu cầu đăng nhập tài khoản"
                : "Chưa nhận diện được nguyên liệu"}
            </Text>
            <Text style={styles.errorDesc}>{scanError}</Text>
            <View style={styles.errorActionRow}>
              {!isAuthenticated || scanError.includes("đăng nhập") ? (
                <TouchableOpacity
                  style={[styles.errorRetryBtn, { backgroundColor: "#171717" }]}
                  onPress={() => router.push("/(auth)/login")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.errorRetryBtnText}>Đăng nhập ngay</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={handleOpenFullScreenCamera}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                  <Text style={styles.errorRetryBtnText}>Chụp lại ảnh</Text>
                </TouchableOpacity>
              )}
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
      {scanCompleted && !isScanning && (detectedIngredients.length > 0 || detectedDishes.length > 0) && (
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
              <Ionicons name="sparkles" size={16} color={BrandColors.textDark} />
              <Text style={styles.resultsHeading} numberOfLines={1}>
                Kết quả phân tích ({activeAccuracy}%)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.saveToFridgeBtn}
              onPress={handleSaveAllToFridge}
              disabled={isSavingToFridge || !selectedIngredients.length}
              activeOpacity={0.8}
            >
              {isSavingToFridge ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="archive-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.saveToFridgeBtnText}>Lưu nguyên liệu món này</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.aiDishTitle}>{activeTitle}</Text>
          <Text style={styles.resultsHeading}>{detectedDishes.length ? "Món ăn trong ảnh" : "Thực phẩm trong ảnh"} ({photoTargets.length})</Text>
          <Text style={styles.aiDishDesc}>Chọn số trên ảnh hoặc chọn món bên dưới để xem chi tiết.</Text>
          <View style={{ gap: 8 }}>
            {photoTargets.map((target, index) => {
              const isSelected = selectedTarget?.name === target.name;
              return (
                <TouchableOpacity key={target.name} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => setSelectedTargetName(target.name)}
                  style={[styles.dishLegendCard, { backgroundColor: isSelected ? "#F6F6F6" : "#FFFFFF", borderColor: isSelected ? "#363636" : "#E5E5E5" }]} activeOpacity={0.85}>
                  <Text style={[styles.dishLegendNumber, { backgroundColor: isSelected ? "#363636" : "#F2F2F2", color: isSelected ? "#FFFFFF" : "#5E5E5E" }]}>{index + 1}</Text>
                  <MaterialCommunityIcons name={((target.icon || "silverware-fork-knife") as any)} size={20} color={BrandColors.textDark} />
                  <View style={{ flex: 1 }}><Text style={styles.detectedChipText}>{target.name}</Text><Text style={{ fontSize: 10, color: BrandColors.textMuted, marginTop: 4 }}>AI ước tính · {target.confidence}</Text></View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.aiDishDesc}>Kết quả và độ tin cậy do AI ước tính. Hãy kiểm tra lại trước khi sử dụng.</Text>
          <Text style={styles.resultsHeading}>{detectedDishes.length ? "Nguyên liệu của món" : "Nguyên liệu nhận diện"} ({selectedIngredients.length})</Text>
          {detectedDishes.length > 0 && <Text style={styles.aiDishDesc}>{selectedTarget?.name}</Text>}
          {!selectedIngredients.length && <Text style={styles.aiDishDesc}>{detectedDishes.length && !hasIngredientLinks ? "Lần quét này chưa liên kết nguyên liệu theo món. Vui lòng quét lại ảnh để phân tích từng món." : "Chưa xác định rõ nguyên liệu nhìn thấy của món này. Không tự suy đoán thành phần bị che."}</Text>}
          {/* Chips Row */}
          <View style={styles.detectedChipsRow}>
            {selectedIngredients.map((item, index) => (
              <View key={index} style={[styles.detectedChip, { width: "100%" }]}>
                <MaterialCommunityIcons
                  name={(item.icon as any) || "food-apple"}
                  size={15}
                  color={BrandColors.textDark}
                />
                <View style={{ flex: 1 }}><Text style={styles.detectedChipText}>{item.name}</Text><Text style={{ fontSize: 10, color: BrandColors.textMuted, marginTop: 3 }}>{item.evidence || "Quan sát trong ảnh"}</Text></View>
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
                    color="#262626"
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
                  colors={["#171717", "#292929"]}
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
            <Ionicons name="refresh-outline" size={16} color={BrandColors.textMuted} />
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
              <Ionicons name="sparkles" size={13} color="#292929" />
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
                  color={flashMode !== "off" ? "#363636" : "#FFFFFF"}
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
                  colors={["#171717", "#292929"]}
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
    backgroundColor: BrandColors.background,
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
    color: BrandColors.textDark,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginTop: 2,
  },
  headerDescription: {
    fontSize: 12.5,
    color: BrandColors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  historyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  historyHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  historyBadgeCircle: {
    backgroundColor: "#171717",
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
    backgroundColor: BrandColors.surfaceMuted,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: "#262626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toastText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#262626",
  },
  cameraViewfinder: {
    alignSelf: "center",
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#171717",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
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
    backgroundColor: "rgba(27, 27, 27, 0.25)",
  },
  cameraStandbyPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#171717",
  },
  standbyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(54, 54, 54, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(54, 54, 54, 0.3)",
  },
  standbyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  standbyDesc: {
    fontSize: 11,
    color: BrandColors.textPlaceholder,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
  standbyGrantBtn: {
    backgroundColor: "#171717",
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
    backgroundColor: "rgba(27, 27, 27, 0.75)",
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
    backgroundColor: "#363636",
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
    backgroundColor: "rgba(27, 27, 27, 0.75)",
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
    backgroundColor: "rgba(27, 27, 27, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#292929",
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
    backgroundColor: "rgba(27, 27, 27, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#363636",
    maxWidth: "80%",
  },
  photoReadyPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  resetLiveBtn: {
    backgroundColor: "#171717",
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
    borderColor: "#292929",
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
  photoMarker: {
    position: "absolute", minWidth: 44, height: 40, paddingHorizontal: 6, borderRadius: 20, borderWidth: 2,
    transform: [{ translateX: -22 }, { translateY: -20 }], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
  },
  photoCaption: {
    position: "absolute", left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 14, zIndex: 4,
    backgroundColor: "rgba(27, 27, 27, 0.95)", flexDirection: "row", alignItems: "center", gap: 10,
  },
  photoCaptionNumber: {
    width: 28, height: 28, borderRadius: 8, textAlign: "center", lineHeight: 28, backgroundColor: "#363636", color: "white", fontWeight: "800",
  },
  dishLegendCard: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  dishLegendNumber: { width: 28, height: 28, borderRadius: 8, lineHeight: 28, textAlign: "center", fontWeight: "800", fontSize: 12 },
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
    backgroundColor: "rgba(27, 27, 27, 0.8)",
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
    color: BrandColors.textPlaceholder,
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
    backgroundColor: "rgba(27, 27, 27, 0.65)",
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
    shadowColor: "#171717",
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
    color: BrandColors.textDark,
  },
  seeAllRecentText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  recentScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    width: 190,
  },
  recentCardActive: {
    borderColor: "#171717",
    backgroundColor: BrandColors.surfaceMuted,
  },
  recentCardThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E5E5E5",
  },
  recentCardBody: {
    flex: 1,
    marginLeft: 8,
  },
  recentCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginBottom: 2,
  },
  recentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentTimeText: {
    fontSize: 10,
    color: BrandColors.textDark,
    fontWeight: "600",
    maxWidth: 75,
  },
  recentCountText: {
    fontSize: 10,
    color: BrandColors.textMuted,
    marginLeft: 2,
  },
  activeCheckBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#171717",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyHistoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  emptyHistoryText: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: BrandColors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 12,
  },
  errorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#292929",
    marginBottom: 4,
  },
  errorDesc: {
    fontSize: 12,
    color: "#1B1B1B",
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
    backgroundColor: "#171717",
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
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  errorLiveBtnText: {
    color: "#292929",
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
    color: BrandColors.textDark,
  },
  saveToFridgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    shadowColor: "#262626",
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
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  detectedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  detectedChipConf: {
    fontSize: 10.5,
    color: "#262626",
    fontWeight: "800",
  },
  aiGeneratedBox: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#171717",
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
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#262626",
  },
  aiCaloText: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
    fontWeight: "600",
  },
  aiDishTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginBottom: 4,
  },
  aiDishDesc: {
    fontSize: 12,
    color: BrandColors.textMuted,
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
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  scanAnotherBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: BrandColors.textMuted,
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
    backgroundColor: "rgba(54, 54, 54, 0.5)",
    borderColor: "#292929",
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
    borderColor: "#292929",
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
    backgroundColor: "rgba(54, 54, 54, 0.7)",
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
