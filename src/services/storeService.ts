import { MOCK_STORES, Store } from "@/data/mockStores";
import { apiClient } from "./apiClient";
import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

export interface NearestStoreResult {
  store: Store;
  distanceKm: number;
  formattedDistance: string;
  travelTimeMotoMinutes: number;
  travelTimeWalkMinutes: number;
}

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  isFallback?: boolean;
}

// In-memory cache để truy xuất tức thì 0ms, tránh gọi GPS phần cứng nhiều lần
let cachedCoordinates: {
  coords: UserCoordinates;
  timestamp: number;
} | null = null;

// Thời gian hiệu lực cache: 5 phút
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Xóa cache vị trí nếu người dùng muốn làm mới (GPS Refresh)
 */
export function invalidateCoordinatesCache() {
  cachedCoordinates = null;
}

/**
 * Service lấy danh sách siêu thị mẫu dựa trên tọa độ người dùng.
 * Tính toán trực tiếp trong bộ nhớ (0ms latency).
 */
export async function getNearbyStores(
  latitude: number,
  longitude: number
): Promise<Store[]> {
  return MOCK_STORES;
}

/**
 * Lấy tọa độ GPS người dùng tối ưu hóa tốc độ cao:
 * 1. Kiểm tra in-memory cache trước (0ms)
 * 2. Thử `Location.getLastKnownPositionAsync` của OS (siêu nhanh < 15ms, không phải bật chip GPS)
 * 3. Nếu chưa có, gọi `Location.getCurrentPositionAsync` với timeout ngắn 1.2s và độ chính xác Balanced
 * 4. Fallback tự động về tọa độ mẫu (Quận 1, TP.HCM) nếu thiết bị không bật GPS/máy ảo
 */
export async function getUserCoordinates(
  forceRefresh: boolean = false
): Promise<UserCoordinates> {
  const fallbackCoords: UserCoordinates = {
    latitude: 10.7725,
    longitude: 106.698,
    isFallback: true,
  };

  // 1. Kiểm tra cache trong phiên làm việc
  if (
    !forceRefresh &&
    cachedCoordinates &&
    Date.now() - cachedCoordinates.timestamp < CACHE_TTL_MS
  ) {
    return cachedCoordinates.coords;
  }

  const fetchWithSpeedOptimization = async (): Promise<UserCoordinates> => {
    try {
      // Kiểm tra quyền nhanh
      if (Location && Location.getForegroundPermissionsAsync) {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }

        if (status === "granted") {
          // Bước 2: Thử lấy vị trí cuối cùng được lưu bởi hệ điều hành (Gần như tức thì < 15ms)
          try {
            const lastKnown = await Location.getLastKnownPositionAsync({
              maxAge: 600000, // Chấp nhận vị trí trong vòng 10 phút gần nhất của OS
            });
            if (lastKnown?.coords?.latitude && lastKnown?.coords?.longitude) {
              const coords: UserCoordinates = {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
                isFallback: false,
              };
              cachedCoordinates = { coords, timestamp: Date.now() };
              return coords;
            }
          } catch {
            // Tiếp tục lấy vị trí mới nếu chưa có lastKnown
          }

          // Bước 3: Lấy vị trí trực tiếp nhưng dùng độ chính xác Balanced & timeout 1.2s
          try {
            const locPromise = Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 1200)
            );

            const loc = await Promise.race([locPromise, timeoutPromise]);
            if (loc?.coords?.latitude && loc?.coords?.longitude) {
              const coords: UserCoordinates = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                isFallback: false,
              };
              cachedCoordinates = { coords, timestamp: Date.now() };
              return coords;
            }
          } catch {
            // Bỏ qua lỗi timeout
          }
        }
      }
    } catch {
      // Bỏ qua lỗi Location
    }

    // Bước 4: Fallback cho Web nếu có
    if (typeof navigator !== "undefined" && navigator.geolocation?.getCurrentPosition) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 1000,
            maximumAge: 60000,
          });
        });
        if (pos?.coords?.latitude && pos?.coords?.longitude) {
          const coords: UserCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            isFallback: false,
          };
          cachedCoordinates = { coords, timestamp: Date.now() };
          return coords;
        }
      } catch {
        // Bỏ qua lỗi navigator
      }
    }

    // Nếu không lấy được (hoặc máy ảo chưa set vị trí), dùng fallback chuẩn
    cachedCoordinates = { coords: fallbackCoords, timestamp: Date.now() };
    return fallbackCoords;
  };

  try {
    const result = await Promise.race([
      fetchWithSpeedOptimization(),
      new Promise<UserCoordinates>((resolve) =>
        setTimeout(() => resolve(fallbackCoords), 1500)
      ),
    ]);
    return result;
  } catch {
    return fallbackCoords;
  }
}

/**
 * Tính khoảng cách giữa 2 tọa độ GPS bằng công thức Haversine (chuẩn độ chính xác Trái Đất)
 * @returns Khoảng cách theo km
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Tìm siêu thị có khoảng cách nhỏ nhất từ vị trí người dùng
 */
export async function findNearestStore(
  userLat: number,
  userLng: number
): Promise<NearestStoreResult | null> {
  const list = await getTopNearbyStores(userLat, userLng, 1);
  return list.length > 0 ? list[0] : null;
}

/**
 * Lấy danh sách Top N (mặc định 5) siêu thị gần nhất, sắp xếp theo khoảng cách tăng dần
 * Kèm thời gian ước tính di chuyển bằng xe máy và đi bộ.
 */
export async function getTopNearbyStores(
  userLat: number,
  userLng: number,
  limit: number = 5
): Promise<NearestStoreResult[]> {
  try {
    const response = await apiClient.get<{ data: any[] }>(
      `/stores/nearby?lat=${userLat}&lng=${userLng}&limit=${limit}`,
      { timeout: 8000 }
    );

    const backendStores = response.data?.data || (response.data as any);
    if (Array.isArray(backendStores) && backendStores.length > 0) {
      return backendStores.map((item: any) => ({
        store: {
          id: item.id || item._id,
          name: item.name,
          brand: item.brand,
          address: item.address,
          openHours: item.openHours,
          phone: item.phone,
          latitude: item.latitude,
          longitude: item.longitude,
        },
        distanceKm: item.distanceKm,
        formattedDistance: item.formattedDistance,
        travelTimeMotoMinutes: item.travelTimeMotoMinutes,
        travelTimeWalkMinutes: item.travelTimeWalkMinutes,
      }));
    }
  } catch (e) {
    console.warn("Backend GPS store API unavailable, using local calculation fallback:", e);
  }

  // Graceful Fallback: Local Haversine Calculation from MOCK_STORES
  const stores = await getNearbyStores(userLat, userLng);

  if (!stores || stores.length === 0) {
    return [];
  }

  const list: NearestStoreResult[] = stores.map((s) => {
    const dist = calculateHaversineDistance(
      userLat,
      userLng,
      s.latitude,
      s.longitude
    );
    let formattedDistance = `${dist.toFixed(1)} km`;
    if (dist < 1) {
      formattedDistance = `${Math.round(dist * 1000)} m`;
    }

    // Tính thời gian di chuyển ước tính
    // Xe máy: ~25 km/h trong đô thị
    const travelTimeMotoMinutes = Math.max(1, Math.round((dist / 25) * 60));
    // Đi bộ: ~4.5 km/h
    const travelTimeWalkMinutes = Math.max(1, Math.round((dist / 4.5) * 60));

    return {
      store: s,
      distanceKm: dist,
      formattedDistance,
      travelTimeMotoMinutes,
      travelTimeWalkMinutes,
    };
  });

  // Sắp xếp tăng dần theo khoảng cách (gần nhất lên đầu)
  list.sort((a, b) => a.distanceKm - b.distanceKm);

  return list.slice(0, limit);
}

/**
 * Mở trực tiếp ứng dụng bản đồ (Google Maps / Apple Maps) trên thiết bị:
 * - Android: Mở thẳng chế độ chỉ đường của App Google Maps qua Intent native `google.navigation:` hoặc `geo:`,
 *   giúp chuyển hướng tức thì không phải qua trình duyệt Chrome.
 * - iOS: Mở thẳng Apple Maps hoặc Google Maps App.
 * - Web/Fallback: Mở URL Google Maps chuẩn.
 */
export async function openDirectionsInMaps(
  latitude: number,
  longitude: number,
  storeName?: string
) {
  const label = encodeURIComponent(storeName || "Siêu thị");

  if (Platform.OS === "android") {
    // 1. App Google Maps Navigation Intent (Mở thẳng giao diện dẫn đường)
    const googleNavUrl = `google.navigation:q=${latitude},${longitude}&mode=d`;
    // 2. Android Geo Intent (Xem vị trí và ghim tên siêu thị)
    const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

    try {
      const canOpenNav = await Linking.canOpenURL(googleNavUrl);
      if (canOpenNav) {
        await Linking.openURL(googleNavUrl);
        return;
      }
      const canOpenGeo = await Linking.canOpenURL(geoUrl);
      if (canOpenGeo) {
        await Linking.openURL(geoUrl);
        return;
      }
    } catch {
      // Fallback xuống web
    }
  } else if (Platform.OS === "ios") {
    // iOS: Thử Apple Maps trước
    const appleMapsUrl = `maps://app?daddr=${latitude},${longitude}&dirflg=d`;
    const googleMapsUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;

    try {
      if (await Linking.canOpenURL(appleMapsUrl)) {
        await Linking.openURL(appleMapsUrl);
        return;
      }
      if (await Linking.canOpenURL(googleMapsUrl)) {
        await Linking.openURL(googleMapsUrl);
        return;
      }
    } catch {
      // Fallback xuống web
    }
  }

  // Trình duyệt Web fallback
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  Linking.openURL(webUrl).catch((err) => {
    console.warn("Không thể mở ứng dụng bản đồ:", err);
  });
}

