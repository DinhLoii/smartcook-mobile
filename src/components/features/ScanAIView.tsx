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
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import ScanHistoryModal from "./ScanHistoryModal";

export default function ScanAIView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // History states
  const [historyList, setHistoryList] = useState<ScanHistoryItem[]>(() =>
    ScanHistoryService.getHistory()
  );
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [activeImage, setActiveImage] = useState<{ uri: string } | string | number | null>(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeAccuracy, setActiveAccuracy] = useState(0);
  const [detectedIngredients, setDetectedIngredients] = useState<ScanDetectedIngredient[]>([]);
  const [dishes, setDishes] = useState<{ name: string; confidence: string }[]>([]);
  const [activePins, setActivePins] = useState<ScanPin[]>([]);
  const [aiRecipe, setAiRecipe] = useState<ScanSuggestedRecipe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState<ImagePicker.CameraType>(ImagePicker.CameraType.back);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingToFridge, setIsSavingToFridge] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const lastPhotoRef = useRef<ImagePicker.ImagePickerAsset | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    mountedRef.current = true;
    const unsub = ScanHistoryService.subscribe(setHistoryList);
    void ScanHistoryService.fetchBackendHistory();
    return () => {
      mountedRef.current = false;
      unsub();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const processUploadedPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    lastPhotoRef.current = asset;
    setIsScanning(true);
    setScanCompleted(false);
    setErrorMessage(null);
    setActiveHistoryId(null);
    setActiveImage({ uri: asset.uri });
    setDetectedIngredients([]);
    setDishes([]);
    setActivePins([]);
    setAiRecipe(null);
    try {
      // iPhone HEIC/large photos become a real JPEG before multipart upload.
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > 1600) {
        context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
      }
      const rendered = await context.renderAsync();
      const photo = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      if (!mountedRef.current) return;
      const fileSize = Platform.OS === "web" ? (await (await fetch(photo.uri)).blob()).size : new File(photo.uri).size;
      if (fileSize > 5 * 1024 * 1024) throw new Error("Ảnh lớn hơn 5 MB. Bạn hãy chọn ảnh nhỏ hơn.");
      setActiveImage({ uri: photo.uri });
      const result = await aiService.scanIngredients(photo.uri, "image/jpeg");
      if (!mountedRef.current) return;
      if (!result?.ingredients?.length) throw new Error("Chưa nhận diện được món ăn. Hãy thử ảnh rõ hơn.");
      const suggested: ScanSuggestedRecipe = { ...result.suggestedRecipe, id: result.suggestedRecipe.id || "" };
      const saved = ScanHistoryService.addHistory({
        id: result.id, title: result.title || "Kết quả quét thực phẩm", scannedAt: result.scannedAt || "Vừa xong",
        image: result.imageUrl ? { uri: result.imageUrl } : { uri: photo.uri },
        accuracy: result.accuracy, ingredients: result.ingredients, dishes: result.dishes || [],
        pins: result.pins || [], suggestedRecipe: suggested,
      });
      setActiveTitle(saved.title);
      setActiveAccuracy(saved.accuracy);
      setDetectedIngredients(saved.ingredients);
      setDishes(saved.dishes || []);
      setActivePins(saved.pins);
      setAiRecipe(saved.suggestedRecipe);
      setActiveHistoryId(saved.id);
      setScanCompleted(true);
      void hapticSuccess();
      showToast("Đã phân tích ảnh và lưu lịch sử!");
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      const requestError = error as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(requestError.response?.data?.message || requestError.message || "Không thể quét ảnh. Vui lòng thử lại.");
    } finally {
      if (mountedRef.current) setIsScanning(false);
    }
  };

  const choosePhoto = async (source: "camera" | "library") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSelecting(true);
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Cần quyền camera", "Hãy cho phép Expo Go truy cập camera để chụp món ăn.", [
            { text: "Đóng", style: "cancel" }, { text: "Mở cài đặt", onPress: () => void Linking.openSettings() },
          ]);
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, quality: 0.8, allowsMultipleSelection: false };
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ ...options, cameraType })
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!mountedRef.current || result.canceled || !result.assets?.length) return;
      setIsSelecting(false);
      await processUploadedPhoto(result.assets[0]);
    } catch {
      if (mountedRef.current) Alert.alert("Chưa mở được ảnh", "Bạn hãy thử lại hoặc chọn ảnh khác từ thư viện.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsSelecting(false);
    }
  };

  const handleRetry = async () => {
    if (busyRef.current || !lastPhotoRef.current) return;
    busyRef.current = true;
    try { await processUploadedPhoto(lastPhotoRef.current); } finally { busyRef.current = false; }
  };

  const handleSaveAllToFridge = async () => {
    if (!detectedIngredients.length || isSavingToFridge) return;
    setIsSavingToFridge(true);
    let savedCount = 0;
    try {
      for (const ingredient of detectedIngredients) {
        const item = await FridgeService.addItem({ name: ingredient.name, amount: "1 phần", category: "veggies", storageLocation: "chilled" });
        if (!item) throw new Error("Lưu nguyên liệu chưa thành công");
        savedCount++;
      }
      showToast(`Đã lưu ${savedCount} nguyên liệu vào tủ lạnh.`);
    } catch {
      showToast(`Đã lưu ${savedCount}/${detectedIngredients.length} nguyên liệu. Vui lòng thử lại với phần còn lại.`);
    } finally { if (mountedRef.current) setIsSavingToFridge(false); }
  };

  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    if (busyRef.current) return;
    setActiveHistoryId(item.id);
    setActiveImage(item.image);
    setActiveTitle(item.title);
    setActiveAccuracy(item.accuracy);
    setDetectedIngredients(item.ingredients);
    setDishes(item.dishes || []);
    setActivePins(item.pins);
    setAiRecipe(item.suggestedRecipe);
    setScanCompleted(true);
    setErrorMessage(null);
  };

  const handleResetToLiveScan = () => {
    if (busyRef.current) return;
    setActiveHistoryId(null);
    setActiveImage(null);
    setScanCompleted(false);
    setErrorMessage(null);
    lastPhotoRef.current = null;
  };

  return (
    <View style={styles.container}>
      {/* Top Header with History Button */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubtitle}>SMART VISION AI</Text>
            <Text style={styles.headerTitle}>Scan Món Ăn</Text>
          </View>

          {/* History Shortcut Button */}
          <TouchableOpacity
            style={styles.historyHeaderBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="time" size={16} color="#EA580C" />
            <Text style={styles.historyHeaderBtnText}>Lịch sử</Text>
            <View style={styles.historyBadgeCircle}>
              <Text style={styles.historyBadgeCircleText}>
                {historyList.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerDescription}>
          Chụp món ăn, nguyên liệu hoặc chọn ảnh từ thư viện để AI nhận diện tên món và thành phần.
        </Text>
      </View>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="sparkles" size={15} color="#059669" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Camera Viewfinder Simulator */}
      <View style={[styles.cameraViewfinder, { width: width - 40 }]}>
        {activeImage ? <Image
          source={
            typeof activeImage === "string"
              ? { uri: activeImage }
              : activeImage
          }
          style={styles.cameraPreviewImage}
          resizeMode="contain"
        /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#334155" }}>
          <Ionicons name="scan-outline" size={54} color="#FFFFFF" />
          <Text style={{ color: "white", textAlign: "center", marginTop: 12 }}>Chụp món ăn hoặc chọn ảnh từ thư viện</Text>
        </View>}

        {/* Scanner Dark Overlay */}
        <View style={styles.scannerOverlay} />

        {/* Top Floating Badge if viewing historical scan */}
        {activeHistoryId && (
          <View style={styles.historyActivePill}>
            <Ionicons name="bookmark" size={12} color="#FFFFFF" />
            <Text style={styles.historyActivePillText} numberOfLines={1}>
              {activeTitle}
            </Text>
            <TouchableOpacity
              onPress={handleResetToLiveScan}
              style={styles.resetLiveBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.resetLiveBtnText}>Quét mới ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Viewfinder Target Frame Corners */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Real-time Detected Ingredient Chips Overlaid on Image */}
        {scanCompleted &&
          !isScanning &&
          activePins.map((pin, idx) => (
            <View
              key={idx}
              style={[
                styles.detectedPin,
                {
                  top: pin.top != null ? (typeof pin.top === "number" && pin.top <= 100 ? `${pin.top}%` : pin.top) : undefined,
                  bottom: pin.bottom != null ? (typeof pin.bottom === "number" && pin.bottom <= 100 ? `${pin.bottom}%` : pin.bottom) : undefined,
                  left: pin.left != null ? (typeof pin.left === "number" && pin.left <= 100 ? `${pin.left}%` : pin.left) : undefined,
                  right: pin.right != null ? (typeof pin.right === "number" && pin.right <= 100 ? `${pin.right}%` : pin.right) : undefined,
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
          </View>
        )}

        {/* Bottom Shutter & Upload Actions Row */}
        <View style={styles.shutterRow}>
          {/* Pick from Library Button */}
          <TouchableOpacity
            style={styles.auxBtn}
            onPress={() => void choosePhoto("library")}
            accessibilityLabel="Chọn ảnh món ăn từ thư viện"
            disabled={isScanning || isSelecting}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center Main Shutter Action Button */}
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={() => void choosePhoto("camera")}
            accessibilityLabel="Chụp ảnh món ăn"
            disabled={isScanning || isSelecting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              style={styles.shutterGradient}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Take photo from device camera */}
          <TouchableOpacity
            style={styles.auxBtn}
            onPress={() => setCameraType((current) => current === ImagePicker.CameraType.back ? ImagePicker.CameraType.front : ImagePicker.CameraType.back)}
            accessibilityLabel="Đổi camera trước hoặc sau"
            disabled={isScanning || isSelecting}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage && <View style={{ margin: 20, padding: 14, backgroundColor: "#FEF2F2", borderRadius: 12 }}>
        <Text style={{ color: "#B91C1C" }}>{errorMessage}</Text>
        <TouchableOpacity onPress={() => void handleRetry()} disabled={isScanning || isSelecting} style={{ marginTop: 10 }}>
          <Text style={{ color: "#EA580C", fontWeight: "700" }}>Thử quét lại ảnh này</Text>
        </TouchableOpacity>
      </View>}

      {/* Horizontal Recent Scans Slider (Lịch sử phân tích gần đây) */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="time-outline" size={16} color="#0F172A" />
            <Text style={styles.recentHeading}>Lịch sử phân tích gần đây</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowHistoryModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllRecentText}>
              Xem tất cả ({historyList.length}) →
            </Text>
          </TouchableOpacity>
        </View>

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
      </View>

      {/* Results Section */}
      {scanCompleted && !isScanning && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultHeaderRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}
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

          <Text style={{ fontSize: 19, fontWeight: "700", color: "#0F172A", marginBottom: 8 }}>{activeTitle}</Text>
          {dishes.map((dish, index) => <Text key={index} style={{ color: "#059669", fontWeight: "600", marginBottom: 6 }}>{dish.name} · {dish.confidence}</Text>)}
          <Text style={{ color: "#64748B", marginBottom: 12 }}>Độ tin cậy là ước tính. Thành phần ẩn hoặc gia vị có thể chỉ là suy đoán từ hình ảnh.</Text>
          {/* Chips Row */}
          <View style={styles.detectedChipsRow}>
            {detectedIngredients.map((item, index) => (
              <View key={index} style={styles.detectedChip}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={15}
                  color="#E65100"
                />
                <Text style={styles.detectedChipText}>{item.name}{item.source === "inferred" ? " (suy đoán)" : ""}</Text>
                <Text style={styles.detectedChipConf}>{item.confidence}</Text>
              </View>
            ))}
          </View>

          {/* AI Recipe Generator Suggestion Box (SRS Module 25) */}
          {aiRecipe && <View style={styles.aiGeneratedBox}>
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
                {aiRecipe.calories > 0 ? `Ước tính ${aiRecipe.calories} kcal` : ""}{aiRecipe.durationMinutes > 0 ? ` · ${aiRecipe.durationMinutes} phút` : ""}
              </Text>
            </View>

            <Text style={styles.aiDishTitle}>{aiRecipe.title}</Text>
            <Text style={styles.aiDishDesc}>{aiRecipe.desc}</Text>

            {aiRecipe.id ? <TouchableOpacity
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
            </TouchableOpacity> : <Text style={{ color: "#64748B", marginTop: 10 }}>Chưa có công thức chi tiết phù hợp trong thư viện.</Text>}
          </View>}
        </View>
      )}

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
  headerSubtitle: {
    fontSize: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
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
    height: 230,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A",
    marginBottom: 14,
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
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  historyActivePill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: "#FF7043",
    maxWidth: "88%",
  },
  historyActivePillText: {
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
  detectedPinsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detectedPin: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  scanningText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  shutterRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  auxBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  shutterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
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
  confidenceSummary: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
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
});
