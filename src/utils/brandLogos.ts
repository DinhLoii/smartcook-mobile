import { ImageSourcePropType } from "react-native";

export const BRAND_LOGOS: Record<string, ImageSourcePropType> = {
  winmart: require("../../assets/images/brands/winmart.png"),
  coopmart: require("../../assets/images/brands/coopmart.png"),
  bachhoaxanh: require("../../assets/images/brands/bachhoaxanh.png"),
  lottemart: require("../../assets/images/brands/lottemart.png"),
  topsmarket: require("../../assets/images/brands/topsmarket.png"),
  smartcook: require("../../assets/images/brands/smartcook.png"),
};

/**
 * Trả về ảnh icon thương hiệu chính hãng, chân thực và sắc nét
 */
export function getBrandLogoSource(
  brand?: string,
  title?: string,
  icon?: string,
  imageUrl?: string
): ImageSourcePropType | null {
  if (imageUrl && imageUrl.trim().length > 0) {
    return { uri: imageUrl };
  }

  const text = `${brand || ""} ${title || ""}`.toLowerCase();

  if (text.includes("winmart") || text.includes("vinmart")) {
    return BRAND_LOGOS.winmart;
  }
  if (text.includes("co.op") || text.includes("coop") || text.includes("co-op")) {
    return BRAND_LOGOS.coopmart;
  }
  if (
    text.includes("bách hóa xanh") ||
    text.includes("bach hoa xanh") ||
    text.includes("bhx")
  ) {
    return BRAND_LOGOS.bachhoaxanh;
  }
  if (text.includes("lotte")) {
    return BRAND_LOGOS.lottemart;
  }
  if (
    text.includes("tops") ||
    text.includes("central") ||
    text.includes("big c") ||
    text.includes("go!")
  ) {
    return BRAND_LOGOS.topsmarket;
  }
  if (
    text.includes("smartcook") ||
    text.includes("vip") ||
    text.includes("chef") ||
    text.includes("nấu ăn") ||
    text.includes("công thức")
  ) {
    return BRAND_LOGOS.smartcook;
  }

  // Fallback map theo biểu tượng phân loại
  if (icon === "cart") return BRAND_LOGOS.winmart;
  if (icon === "basket") return BRAND_LOGOS.coopmart;
  if (icon === "star") return BRAND_LOGOS.smartcook;
  if (icon === "gift") return BRAND_LOGOS.bachhoaxanh;

  return null;
}
