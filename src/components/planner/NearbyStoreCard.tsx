import { BrandColors } from "@/constants/brandColors";
import {
  getTopNearbyStores,
  getUserCoordinates,
  invalidateCoordinatesCache,
  NearestStoreResult,
  openDirectionsInMaps,
} from "@/services/storeService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NearbyStoreCardProps {
  style?: any;
  title?: string;
  limit?: number;
  selectedProduct?: string | null;
  onClearProduct?: () => void;
  searchTrigger?: number;
}

export default function NearbyStoreCard({
  style,
  title = "Siêu thị gần bạn nhất",
  limit = 5,
  selectedProduct,
  onClearProduct,
  searchTrigger,
}: NearbyStoreCardProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "denied" | "empty"
  >("idle");
  const [loadingText, setLoadingText] = useState("Đang định vị vị trí...");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nearbyList, setNearbyList] = useState<NearestStoreResult[]>([]);
  const [activeRadiusFilter, setActiveRadiusFilter] = useState<"all" | "2km" | "5km">("all");
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);

  const handleFindNearbyStores = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
        invalidateCoordinatesCache();
      } else {
        setStatus("loading");
      }

      // Giai đoạn 1: Dò tìm vị trí GPS (mô phỏng tiến trình thực tế ~350ms)
      setLoadingText("Đang định vị vị trí GPS của bạn...");
      await new Promise((r) => setTimeout(r, 350));

      const coords = await getUserCoordinates(forceRefresh);
      setIsFallbackLocation(Boolean(coords.isFallback));

      // Giai đoạn 2: Quét tìm siêu thị gần nhất (mô phỏng quét siêu thị ~450ms)
      if (selectedProduct) {
        setLoadingText(`Đang tìm các siêu thị có bán "${selectedProduct}"...`);
      } else {
        setLoadingText("Đang tìm các siêu thị gần bạn trong bán kính 5km...");
      }
      await new Promise((r) => setTimeout(r, 450));

      const results = await getTopNearbyStores(
        coords.latitude,
        coords.longitude,
        limit
      );

      if (!results || results.length === 0) {
        setStatus("empty");
      } else {
        setNearbyList(results);
        setStatus("success");
      }
    } catch (error: any) {
      if (error?.message === "PERMISSION_DENIED") {
        setStatus("denied");
      } else {
        // Fallback tọa độ mẫu
        try {
          const fallbackResults = await getTopNearbyStores(
            10.7725,
            106.698,
            limit
          );
          if (fallbackResults && fallbackResults.length > 0) {
            setNearbyList(fallbackResults);
            setIsFallbackLocation(true);
            setStatus("success");
          } else {
            setStatus("empty");
          }
        } catch {
          setStatus("denied");
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Kích hoạt tìm kiếm khi người dùng nhấn "Xem địa chỉ" từ sản phẩm/nguyên liệu
  useEffect(() => {
    if (searchTrigger && searchTrigger > 0) {
      const timer = setTimeout(() => {
        void handleFindNearbyStores(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchTrigger]);

  // Lọc theo bán kính (Client-side 0ms instant filter)
  const filteredList = useMemo(() => {
    if (activeRadiusFilter === "2km") {
      return nearbyList.filter((s) => s.distanceKm <= 2);
    }
    if (activeRadiusFilter === "5km") {
      return nearbyList.filter((s) => s.distanceKm <= 5);
    }
    return nearbyList;
  }, [nearbyList, activeRadiusFilter]);

  return (
    <View style={[styles.card, style]}>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.headerIcon}>🏪</Text>
          <View>
            <Text style={styles.headerTitle}>
              {selectedProduct ? `Địa chỉ bán "${selectedProduct}" gần bạn` : title}
            </Text>
            {status === "success" && (
              <Text style={styles.headerSubtext}>
                {isFallbackLocation
                  ? "📍 Gần Quận 1, TP. Hồ Chí Minh"
                  : "📍 Vị trí GPS chính xác của bạn"}
              </Text>
            )}
          </View>
        </View>

        {status === "success" && (
          <TouchableOpacity
            onPress={() => handleFindNearbyStores(true)}
            activeOpacity={0.7}
            disabled={isRefreshing}
            style={styles.refreshBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#EA580C" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={13} color="#EA580C" />
                <Text style={styles.refreshText}>Cập nhật GPS</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 2. State: IDLE (Chưa bấm xem địa chỉ) */}
      {status === "idle" && (
        <View style={styles.idleBody}>
          <Text style={styles.idleDesc}>
            {selectedProduct
              ? `Nhấn nút bên dưới để hệ thống định vị GPS và tìm các siêu thị có bán "${selectedProduct}" gần bạn nhất.`
              : "Nhấn 'Xem địa chỉ' tại từng sản phẩm cần mua hoặc bấm nút bên dưới để định vị và tìm các siêu thị quanh bạn."}
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => handleFindNearbyStores(false)}
          >
            <Ionicons name="location-sharp" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>
              {selectedProduct
                ? `Xem địa chỉ bán "${selectedProduct}"`
                : "Xem địa chỉ siêu thị gần đây"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. State: LOADING (Đang định vị và tìm kiếm siêu thị) */}
      {status === "loading" && (
        <View style={styles.loadingBody}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      )}

      {/* 4. State: SUCCESS (Hiển thị danh sách siêu thị) */}
      {status === "success" && (
        <View style={{ gap: 10 }}>
          {/* Banner sản phẩm đang chọn (nếu có) */}
          {selectedProduct && (
            <View style={styles.selectedProductBanner}>
              <View style={styles.selectedProductLeft}>
                <Ionicons name="cart" size={15} color="#EA580C" />
                <Text style={styles.selectedProductText} numberOfLines={1}>
                  Nơi bán: <Text style={styles.selectedProductBold}>{selectedProduct}</Text>
                </Text>
              </View>
              {onClearProduct && (
                <TouchableOpacity
                  onPress={onClearProduct}
                  style={styles.clearProductBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={15} color="#94A3B8" />
                  <Text style={styles.clearProductBtnText}>Xem tất cả</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Radius Filter Pills Row */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeRadiusFilter === "all" && styles.filterPillActive,
              ]}
              onPress={() => setActiveRadiusFilter("all")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeRadiusFilter === "all" && styles.filterPillTextActive,
                ]}
              >
                Tất cả ({nearbyList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeRadiusFilter === "2km" && styles.filterPillActive,
              ]}
              onPress={() => setActiveRadiusFilter("2km")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeRadiusFilter === "2km" && styles.filterPillTextActive,
                ]}
              >
                Gần &lt; 2 km
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeRadiusFilter === "5km" && styles.filterPillActive,
              ]}
              onPress={() => setActiveRadiusFilter("5km")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeRadiusFilter === "5km" && styles.filterPillTextActive,
                ]}
              >
                Gần &lt; 5 km
              </Text>
            </TouchableOpacity>
          </View>

          {filteredList.length === 0 ? (
            <View style={styles.emptyFilteredBox}>
              <Text style={styles.emptyFilteredText}>
                Không có siêu thị nào trong bán kính đã chọn.
              </Text>
              <TouchableOpacity onPress={() => setActiveRadiusFilter("all")}>
                <Text style={styles.resetFilterText}>Xem tất cả siêu thị</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successList}>
              {filteredList.map((item, idx) => {
                const isClosest = idx === 0 && activeRadiusFilter === "all";
                return (
                  <View
                    key={item.store.id}
                    style={[
                      styles.storeItemCard,
                      isClosest && styles.storeItemCardClosest,
                    ]}
                  >
                    {/* Top Row: Store Name, Rank & Distance Badge */}
                    <View style={styles.storeItemTopRow}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <Text style={styles.storeRankBadge}>#{idx + 1}</Text>
                          <Text style={styles.storeName} numberOfLines={1}>
                            {item.store.name}
                          </Text>
                          {isClosest && (
                            <View style={styles.closestTag}>
                              <Text style={styles.closestTagText}>Gần nhất</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.storeAddress} numberOfLines={2}>
                          {item.store.address}
                        </Text>
                      </View>

                      <View style={styles.distanceBadge}>
                        <Ionicons name="location-sharp" size={12} color="#EA580C" />
                        <Text style={styles.distanceText}>
                          {item.formattedDistance}
                        </Text>
                      </View>
                    </View>

                    {/* Badge thông báo siêu thị có bán món đang chọn */}
                    {selectedProduct && (
                      <View style={styles.productStockTag}>
                        <Ionicons name="checkmark-circle" size={12} color="#059669" />
                        <Text style={styles.productStockTagText}>
                          Có bán {selectedProduct}
                        </Text>
                      </View>
                    )}

                    {/* Middle: Estimated Travel Times */}
                    <View style={styles.travelTimeRow}>
                      <View style={styles.travelTimeChip}>
                        <Text style={styles.travelTimeIcon}>🛵</Text>
                        <Text style={styles.travelTimeLabel}>
                          Xe máy: <Text style={styles.travelTimeValue}>~{item.travelTimeMotoMinutes} phút</Text>
                        </Text>
                      </View>

                      <View style={styles.travelTimeChip}>
                        <Text style={styles.travelTimeIcon}>🚶</Text>
                        <Text style={styles.travelTimeLabel}>
                          Đi bộ: <Text style={styles.travelTimeValue}>~{item.travelTimeWalkMinutes} phút</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Open Hours & Google Maps CTA Button */}
                    <View style={styles.storeItemBottomRow}>
                      {item.store.openHours ? (
                        <Text style={styles.storeHoursText}>
                          🕒 {item.store.openHours}
                        </Text>
                      ) : (
                        <View />
                      )}

                      <TouchableOpacity
                        style={styles.mapBtn}
                        activeOpacity={0.8}
                        onPress={() =>
                          openDirectionsInMaps(
                            item.store.latitude,
                            item.store.longitude,
                            item.store.name
                          )
                        }
                      >
                        <Ionicons name="map" size={13} color="#0284C7" />
                        <Text style={styles.mapBtnText}>Mở Google Maps</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* 5. State: DENIED (User từ chối quyền GPS) */}
      {status === "denied" && (
        <View style={styles.deniedBody}>
          <Ionicons name="location-outline" size={24} color="#DC2626" />
          <Text style={styles.deniedTitle}>Vui lòng cho phép truy cập vị trí</Text>
          <Text style={styles.deniedDesc}>
            SmartCook cần quyền GPS để tự động tính khoảng cách và gợi ý các siêu thị gần bạn nhất.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={() => handleFindNearbyStores(true)}
          >
            <Text style={styles.retryBtnText}>Thử lại với GPS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. State: EMPTY (Không có dữ liệu) */}
      {status === "empty" && (
        <View style={styles.deniedBody}>
          <Ionicons name="alert-circle-outline" size={24} color="#64748B" />
          <Text style={styles.emptyTitle}>Không tìm thấy siêu thị gần bạn</Text>
          <Text style={styles.deniedDesc}>
            Hiện chưa có dữ liệu siêu thị tại khu vực hiện tại của bạn.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={() => handleFindNearbyStores(true)}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtext: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },

  /* Filter Pills */
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyFilteredBox: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  emptyFilteredText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  resetFilterText: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "700",
  },

  /* Idle */
  idleBody: {
    gap: 10,
  },
  idleDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Loading */
  loadingBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Success List */
  successList: {
    gap: 8,
  },
  storeItemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  storeItemCardClosest: {
    backgroundColor: "#FFFDF9",
    borderColor: "#FED7AA",
    borderLeftWidth: 3.5,
    borderLeftColor: "#EA580C",
  },
  storeItemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  storeRankBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
  },
  storeName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  closestTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  closestTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#C2410C",
  },
  storeAddress: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
    marginTop: 3,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
    alignSelf: "flex-start",
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },

  /* Travel Times */
  travelTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  travelTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  travelTimeIcon: {
    fontSize: 11,
  },
  travelTimeLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  travelTimeValue: {
    fontWeight: "700",
    color: "#0F172A",
  },

  storeItemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  storeHoursText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    gap: 4,
  },
  mapBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284C7",
  },

  /* Denied & Empty */
  deniedBody: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },
  deniedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  deniedDesc: {
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  selectedProductBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedProductLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  selectedProductText: {
    fontSize: 12,
    color: "#9A3412",
  },
  selectedProductBold: {
    fontWeight: "800",
    color: "#EA580C",
  },
  clearProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingLeft: 8,
  },
  clearProductBtnText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  productStockTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  productStockTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
});
