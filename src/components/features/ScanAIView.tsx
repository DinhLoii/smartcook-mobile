import { BrandColors } from "@/constants/brandColors";
import { RECIPES_DATA } from "@/data/recipesData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function ScanAIView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(true);

  // Detected ingredients from AI Vision scanner
  const detectedIngredients = [
    { name: "Thịt ức gà", confidence: "98%", icon: "food-drumstick" },
    { name: "Cà chua bi", confidence: "96%", icon: "fruit-cherries" },
    { name: "Quả bơ sáp", confidence: "94%", icon: "food-apple" },
    { name: "Hành tây & Tỏi", confidence: "91%", icon: "seed" },
  ];

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanCompleted(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanCompleted(true);
    }, 1600);
  };

  const aiRecipe = RECIPES_DATA[2]; // Salad Cá Hồi / Gà Áp Chảo

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <Text style={styles.headerSubtitle}>SMART VISION AI</Text>
        <Text style={styles.headerTitle}>Scan Nguyên Liệu Thông Minh</Text>
        <Text style={styles.headerDescription}>
          Chụp ảnh bàn bếp hoặc tủ lạnh để AI tự động nhận diện nguyên liệu và sáng tạo công thức riêng cho bạn.
        </Text>
      </View>

      {/* Camera Viewfinder Simulator */}
      <View style={[styles.cameraViewfinder, { width: width - 40 }]}>
        <Image
          source={require("@/assets/images/smartcook-auth-bg.jpg")}
          style={styles.cameraPreviewImage}
          resizeMode="cover"
        />

        {/* Scanner Dark Overlay */}
        <View style={styles.scannerOverlay} />

        {/* Viewfinder Target Frame Corners */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Real-time Detected Ingredient Chips Overlaid on Image */}
        {scanCompleted && (
          <View style={styles.detectedPinsContainer}>
            <View style={[styles.detectedPin, { top: 30, left: 30 }]}>
              <Text style={styles.pinText}>🍗 Ức gà (98%)</Text>
            </View>
            <View style={[styles.detectedPin, { top: 75, right: 35 }]}>
              <Text style={styles.pinText}>🍅 Cà chua (96%)</Text>
            </View>
            <View style={[styles.detectedPin, { bottom: 40, left: 50 }]}>
              <Text style={styles.pinText}>🥑 Quả bơ (94%)</Text>
            </View>
          </View>
        )}

        {/* Scanning Laser Animation Bar */}
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="large" color="#FF7043" />
            <Text style={styles.scanningText}>AI đang phân tích hình ảnh...</Text>
          </View>
        )}

        {/* Bottom Shutter Action Button */}
        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={handleSimulateScan}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              style={styles.shutterGradient}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Section */}
      {scanCompleted && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="sparkles" size={16} color="#E65100" />
              <Text style={styles.resultsHeading}>
                Đã phát hiện 4 nguyên liệu
              </Text>
            </View>
            <Text style={styles.confidenceSummary}>Độ chính xác 95%</Text>
          </View>

          {/* Chips Row */}
          <View style={styles.detectedChipsRow}>
            {detectedIngredients.map((item, index) => (
              <View key={index} style={styles.detectedChip}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={15}
                  color="#E65100"
                />
                <Text style={styles.detectedChipText}>{item.name}</Text>
                <Text style={styles.detectedChipConf}>{item.confidence}</Text>
              </View>
            ))}
          </View>

          {/* AI Recipe Generator Suggestion Box (SRS Module 25) */}
          <View style={styles.aiGeneratedBox}>
            <View style={styles.aiGenTop}>
              <View style={styles.aiBadge}>
                <Ionicons name="hardware-chip-outline" size={12} color="#059669" />
                <Text style={styles.aiBadgeText}>Gợi ý công thức từ AI</Text>
              </View>
              <Text style={styles.aiCaloText}>380 kcal • 20 phút</Text>
            </View>

            <Text style={styles.aiDishTitle}>
              Salad Ức Gà Bơ Sáp Sốt Chanh Leo
            </Text>
            <Text style={styles.aiDishDesc}>
              Công thức sáng tạo tối ưu từ 100% nguyên liệu vừa quét được. Không cần đi chợ thêm!
            </Text>

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
                <Text style={styles.cookAiBtnText}>Xem chi tiết →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 14,
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
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
  },
  cameraViewfinder: {
    alignSelf: "center",
    height: 230,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A",
    marginBottom: 16,
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
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
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
  resultsContainer: {
    paddingHorizontal: 20,
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
  detectedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
