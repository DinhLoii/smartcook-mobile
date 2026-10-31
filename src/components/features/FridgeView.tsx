import { CookingHistoryModal } from "@/components/recipe";
import { RECIPES_DATA } from "@/data/recipesData";
import { FridgeService } from "@/services/fridgeService";
import { FridgeItem, MatchedRecipeItem } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";

// Enable LayoutAnimation for Android on Old Architecture
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper for Vietnamese text normalization
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Keyword alias dictionary to map general user ingredients to recipe components accurately
const KEYWORD_MAP: Record<string, string[]> = {
  // Thịt
  "thit ga": ["ga", "dui ga", "uc ga", "canh ga", "thit ga"],
  "thit heo": [
    "heo",
    "ba chi heo",
    "suon",
    "thit nac",
    "thit heo",
    "xay",
    "ba chi",
  ],
  "thit bo": ["bo", "than bo", "bo bam", "bap bo", "ba chi bo", "bo uc"],
  "thit vit": ["vit", "thit vit"],
  "suon heo": ["suon", "suon non"],
  "thit xay": ["xay", "bam", "thit bo bam", "thit heo xay"],
  "ba chi heo": ["ba chi", "ba chi heo", "thit ba chi"],
  "bap bo": ["bap bo", "bo"],
  "xuc xich": ["xuc xich"],
  "lap xuong": ["lap xuong"],
  "cha lua": ["cha lua", "gio lua", "cha"],
  "thit xong khoi": ["xong khoi", "bacon"],
  "bo vien": ["bo vien"],
  "gio song": ["gio song"],

  // Hải sản
  tom: ["tom", "tom su", "tom the"],
  ca: ["ca", "ca hoi", "ca thu", "ca loc", "ca basa", "ca ngu"],
  muc: ["muc", "muc ong", "muc la"],
  "cua / ghe": ["cua", "ghe"],
  "bach tuoc": ["bach tuoc"],
  "ngao / ngheu": ["ngao", "ngheu", "ngao / ngheu"],
  so: ["so", "so huyet"],
  hau: ["hau"],
  "cha ca": ["cha ca"],

  // Rau xanh & Lá
  "rau cai": ["cai", "cai thia", "cai ngot", "cai bo xoi", "bina"],
  "xa lach": ["xa lach", "romaine", "salad"],
  "rau muong": ["rau muong"],
  "cai bo xoi": ["bina", "bo xoi", "cai bo xoi"],
  "bap cai": ["bap cai"],
  "cai thia": ["cai thia"],
  "cai thao": ["cai thao"],
  "mong toi": ["mong toi"],
  "rau ngot": ["rau ngot"],
  "sup lo": ["sup lo", "bong cai", "broccoli"],

  // Củ & Quả nấu
  "ca chua": ["ca chua", "ca chua bi"],
  "dua leo": ["dua leo", "dua chuot"],
  "ca rot": ["ca rot"],
  "khoai tay": ["khoai tay"],
  "khoai lang": ["khoai lang"],
  "bi do": ["bi do"],
  bau: ["bau"],
  muop: ["muop"],
  "ca tim": ["ca tim"],
  "ot chuong": ["ot chuong"],
  "bap / ngo": ["bap", "ngo", "bap ngot"],
  "su hao": ["su hao"],

  // Nấm & Rau thơm
  "hanh la": ["hanh la", "hanh hoa", "hanh"],
  "rau mui / ngo": ["ngo", "ngo ri", "rau mui", "ngo gai"],
  "hung que": ["hung", "hung que"],
  "thi la": ["thi la"],
  "tia to": ["tia to"],
  "kinh gioi": ["kinh gioi"],
  "la lot": ["la lot"],
  "nam rom": ["nam rom", "nam"],
  "nam dui ga": ["nam dui ga", "nam"],
  "nam kim cham": ["nam kim cham", "nam"],
  "nam huong": ["nam huong", "nam"],
  "nam bao ngu": ["nam bao ngu", "nam"],

  // Trái cây tươi
  "qua bo": ["bo", "bo sap", "bo chin", "qua bo"],
  "chanh / quat": ["chanh", "quat", "nuoc chanh", "chanh leo"],
  chuoi: ["chuoi"],
  tao: ["tao"],
  cam: ["cam"],
  "dua / thom": ["dua", "thom", "khom"],
  xoai: ["xoai"],
  "dua hau": ["dua hau"],
  "dau tay": ["dau tay", "dau"],
  le: ["le"],

  // Trứng & Đậu hũ
  "trung ga": ["trung ga", "long do trung", "trung"],
  "trung vit": ["trung vit"],
  "trung cut": ["trung cut"],
  "trung vit lon": ["trung vit lon", "vit lon"],
  "dau hu trang": ["dau hu", "dau phu", "dau hu trang"],
  "dau hu non": ["dau hu non"],
  "dau hu chien": ["dau hu chien", "dau hu"],
  "tau hu ky": ["tau hu ky", "vang dau"],
  "dau nanh": ["dau nanh"],

  // Sữa & Phô mai
  "sua tuoi": ["sua tuoi", "sua"],
  "pho mai lat": ["pho mai", "cheddar", "parmesan"],
  "pho mai soi": ["pho mai", "mozzarella"],
  bo: ["bo", "bo lat", "bo anchor"],
  "sua dac": ["sua dac"],
  "sua chua": ["sua chua", "yogurt"],
  "kem tuoi (whipping)": ["kem", "kem tuoi", "whipping", "heavy cream"],

  // Cơm, Mỳ & Bún
  "gao / com": ["gao", "com", "gao thom", "com trang"],
  "my y": ["my y", "spaghetti", "mi y"],
  "bun tuoi": ["bun", "bun tuoi"],
  "banh pho": ["banh pho", "pho"],
  mien: ["mien", "mien dong"],
  "my goi": ["my", "mi tom", "my goi"],
  "banh mi": ["banh mi"],
  "banh trang": ["banh trang"],

  // Bột & Ngũ cốc
  "bot mi": ["bot mi"],
  "bot chien gion": ["bot chien", "bot chien gion"],
  "bot nang": ["bot nang"],
  "bot bap": ["bot bap", "bot ngo"],
  "yen mach": ["yen mach"],
  "hat me": ["me", "me rang", "hat me"],
  "hat dieu": ["hat dieu", "dieu"],
  "dau phong": ["dau phong", "lac"],
  "dau xanh": ["dau xanh"],

  // Gia vị nêm nếm
  "nuoc mam": ["nuoc mam", "mam"],
  "nuoc tuong": ["nuoc tuong", "xi dau", "kikkoman", "soy"],
  muoi: ["muoi", "muoi an", "muoi tinh"],
  duong: ["duong", "duong kinh", "duong phen", "duong cat"],
  "hat nem": ["hat nem", "bot nem", "knorr"],
  "bot ngot": ["bot ngot", "mi chinh"],
  tieu: ["tieu", "tieu den", "tieu xay", "tieu so"],
  "dau hao": ["dau hao", "maggi"],
  "mat ong": ["mat ong", "mat ong nguyen chat"],

  // Hành, Tỏi & Cay
  toi: ["toi", "toi tep", "toi co don", "toi bam"],
  ot: ["ot", "ot cay", "ot hiem", "ot bot"],
  gung: ["gung", "gung tuoi", "gung bam"],
  sa: ["sa", "cay sa", "sa bam"],
  "hanh tim": ["hanh tim", "hanh kho", "hanh"],
  nghe: ["nghe", "bot nghe", "nghe tuoi"],
  rieng: ["rieng"],
  "sa te": ["sa te"],

  // Dầu ăn & Nước sốt
  "dau an": ["dau an", "dau thuc vat"],
  "dau olive": ["dau olive", "olive"],
  "dau me": ["dau me", "dau vung"],
  "tuong ot": ["tuong ot", "chin su"],
  "tuong ca": ["tuong ca", "ketchup"],
  mayonnaise: ["mayonnaise", "mayo"],
  giam: ["giam", "giam gao"],
  "nuoc cot dua": ["cot dua", "nuoc cot dua"],

  // Đồ khô & Đóng hộp
  "tom kho": ["tom kho"],
  "muc kho": ["muc kho"],
  "ca hop": ["ca hop", "ca ngu", "ca trich"],
  "thit hop": ["thit hop", "spam"],
  "moc nhi": ["moc nhi", "nam meo"],
  "rong bien": ["rong bien", "la rong bien"],
  "ngo ngot dong hop": ["ngo ngot", "bap hop", "ngo hop"],
};

function matchIngredient(
  recipeIngName: string,
  selectedList: string[],
): boolean {
  const normRecipe = normalizeText(recipeIngName);

  return selectedList.some((sel) => {
    const normSel = normalizeText(sel);

    // Direct match
    if (normRecipe.includes(normSel) || normSel.includes(normRecipe))
      return true;

    // Check alias dictionary
    const aliases = KEYWORD_MAP[normSel];
    if (aliases) {
      if (aliases.some((alias) => normRecipe.includes(alias))) {
        return true;
      }
    }

    // Token match for multi-word
    const selTokens = normSel.split(/[\s,/-]+/).filter((t) => t.length > 1);
    const recipeTokens = normRecipe
      .split(/[\s,/-]+/)
      .filter((t) => t.length > 1);

    return selTokens.some((st) => recipeTokens.includes(st));
  });
}

// Data models for compact groups
export interface SubCategoryGroup {
  id: string;
  subName: string;
  icon: string;
  color: string;
  bgLight: string;
  hint: string;
  options: string[];
}

export interface MainCategory {
  id: string;
  title: string;
  iconName: string;
  groups: SubCategoryGroup[];
}

// Master categorized database with GENERAL ingredient names (14 danh mục phong phú, có thể lướt qua xem)
export const INGREDIENT_CATEGORIES: MainCategory[] = [
  {
    id: "meat",
    title: "Thịt tươi",
    iconName: "food-drumstick",
    groups: [
      {
        id: "meat_fresh",
        subName: "Thịt gia súc & gia cầm",
        icon: "",
        color: "#EA580C",
        bgLight: "#FFF7ED",
        hint: "Thịt gà, thịt heo, thịt bò, sườn heo...",
        options: [
          "Thịt gà",
          "Thịt heo",
          "Thịt bò",
          "Thịt vịt",
          "Sườn heo",
          "Thịt xay",
          "Ba chỉ heo",
          "Bắp bò",
        ],
      },
      {
        id: "meat_processed",
        subName: "Thịt chế biến sẵn",
        icon: "",
        color: "#C2410C",
        bgLight: "#FFEDD5",
        hint: "Xúc xích, lạp xưởng, chả lụa, thịt xông khói...",
        options: [
          "Xúc xích",
          "Lạp xưởng",
          "Chả lụa",
          "Thịt xông khói",
          "Bò viên",
          "Giò sống",
        ],
      },
    ],
  },
  {
    id: "seafood",
    title: "Hải sản",
    iconName: "fish",
    groups: [
      {
        id: "seafood_fresh",
        subName: "Hải sản tươi sống",
        icon: "",
        color: "#0284C7",
        bgLight: "#F0F9FF",
        hint: "Tôm, cá, mực, cua ghẹ, bạch tuộc, ngao...",
        options: [
          "Tôm",
          "Cá",
          "Mực",
          "Cua / Ghẹ",
          "Bạch tuộc",
          "Ngao / Nghêu",
          "Sò",
          "Hàu",
          "Chả cá",
        ],
      },
    ],
  },
  {
    id: "veggie",
    title: "Rau xanh & Lá",
    iconName: "leaf",
    groups: [
      {
        id: "veggie_leaves",
        subName: "Rau ăn lá phổ biến",
        icon: "",
        color: "#16A34A",
        bgLight: "#F0FDF4",
        hint: "Rau muống, rau cải, xà lách, bắp cải...",
        options: [
          "Rau cải",
          "Xà lách",
          "Rau muống",
          "Cải bó xôi",
          "Bắp cải",
          "Cải thìa",
          "Cải thảo",
          "Mồng tơi",
          "Rau ngót",
          "Súp lơ",
        ],
      },
    ],
  },
  {
    id: "roots",
    title: "Củ & Quả nấu",
    iconName: "carrot",
    groups: [
      {
        id: "roots_cooking",
        subName: "Củ quả xào, nấu canh & hầm",
        icon: "",
        color: "#D97706",
        bgLight: "#FEF3C7",
        hint: "Cà chua, dưa leo, cà rốt, khoai tây, bí đỏ...",
        options: [
          "Cà chua",
          "Dưa leo",
          "Cà rốt",
          "Khoai tây",
          "Khoai lang",
          "Bí đỏ",
          "Bầu",
          "Mướp",
          "Cà tím",
          "Ớt chuông",
          "Bắp / Ngô",
          "Su hào",
        ],
      },
    ],
  },
  {
    id: "herbs",
    title: "Nấm & Rau thơm",
    iconName: "mushroom",
    groups: [
      {
        id: "herbs_aromatic",
        subName: "Rau nêm & rau thơm gia vị",
        icon: "",
        color: "#059669",
        bgLight: "#ECFDF5",
        hint: "Hành lá, ngò rí, húng quế, thì là, tía tô...",
        options: [
          "Hành lá",
          "Rau mùi / Ngò",
          "Húng quế",
          "Thì là",
          "Tía tô",
          "Kinh giới",
          "Lá lốt",
        ],
      },
      {
        id: "mushrooms_fresh",
        subName: "Nấm tươi các loại",
        icon: "",
        color: "#047857",
        bgLight: "#D1FAE5",
        hint: "Nấm rơm, nấm kim châm, nấm đùi gà, nấm hương...",
        options: [
          "Nấm rơm",
          "Nấm đùi gà",
          "Nấm kim châm",
          "Nấm hương",
          "Nấm bào ngư",
        ],
      },
    ],
  },
  {
    id: "fruits",
    title: "Trái cây & Quả",
    iconName: "fruit-cherries",
    groups: [
      {
        id: "fruits_fresh",
        subName: "Hoa quả & Trái cây tươi",
        icon: "",
        color: "#EA580C",
        bgLight: "#FFF7ED",
        hint: "Quả bơ, chanh, chuối, táo, dứa...",
        options: [
          "Quả bơ",
          "Chanh / Quất",
          "Chuối",
          "Táo",
          "Cam",
          "Dứa / Thơm",
          "Xoài",
          "Dưa hấu",
          "Dâu tây",
          "Lê",
        ],
      },
    ],
  },
  {
    id: "egg_tofu",
    title: "Trứng & Đậu hũ",
    iconName: "egg",
    groups: [
      {
        id: "eggs_all",
        subName: "Trứng gia cầm",
        icon: "",
        color: "#D97706",
        bgLight: "#FFFBEB",
        hint: "Trứng gà, trứng vịt, trứng cút...",
        options: ["Trứng gà", "Trứng vịt", "Trứng cút", "Trứng vịt lộn"],
      },
      {
        id: "tofu_all",
        subName: "Đậu hũ & Sản phẩm từ đậu",
        icon: "",
        color: "#CA8A04",
        bgLight: "#FEFCE8",
        hint: "Đậu hũ trắng, đậu hũ non, tàu hũ ky...",
        options: [
          "Đậu hũ trắng",
          "Đậu hũ non",
          "Đậu hũ chiên",
          "Tàu hũ ky",
          "Đậu nành",
        ],
      },
    ],
  },
  {
    id: "dairy",
    title: "Sữa & Phô mai",
    iconName: "cheese",
    groups: [
      {
        id: "dairy_items",
        subName: "Sữa, Phô mai & Bơ",
        icon: "",
        color: "#EAB308",
        bgLight: "#FEF9C3",
        hint: "Sữa tươi, bơ, phô mai lát, sữa đặc...",
        options: [
          "Sữa tươi",
          "Phô mai lát",
          "Phô mai sợi",
          "Bơ",
          "Sữa đặc",
          "Sữa chua",
          "Kem tươi (Whipping)",
        ],
      },
    ],
  },
  {
    id: "noodles",
    title: "Cơm, Mỳ & Bún",
    iconName: "noodles",
    groups: [
      {
        id: "staples_noodles",
        subName: "Gạo, Bún & Mỳ các loại",
        icon: "",
        color: "#D97706",
        bgLight: "#FFFBEB",
        hint: "Cơm, mỳ Ý, bún tươi, phở, miến, bánh mì...",
        options: [
          "Gạo / Cơm",
          "Mỳ Ý",
          "Bún tươi",
          "Bánh phở",
          "Miến",
          "Mỳ gói",
          "Bánh mì",
          "Bánh tráng",
        ],
      },
    ],
  },
  {
    id: "flour",
    title: "Bột & Ngũ cốc",
    iconName: "rice",
    groups: [
      {
        id: "flour_grains",
        subName: "Bột nấu nướng & Hạt ngũ cốc",
        icon: "",
        color: "#854D0E",
        bgLight: "#FEF9C3",
        hint: "Bột mì, bột chiên giòn, bột bắp, mè, hạt điều...",
        options: [
          "Bột mì",
          "Bột chiên giòn",
          "Bột năng",
          "Bột bắp",
          "Yến mạch",
          "Hạt mè",
          "Hạt điều",
          "Đậu phộng",
          "Đậu xanh",
        ],
      },
    ],
  },
  {
    id: "spice",
    title: "Gia vị nêm nếm",
    iconName: "shaker-outline",
    groups: [
      {
        id: "spice_seasoning",
        subName: "Gia vị nêm nấu cơ bản",
        icon: "",
        color: "#E11D48",
        bgLight: "#FFF1F2",
        hint: "Nước mắm, nước tương, muối, đường, hạt nêm...",
        options: [
          "Nước mắm",
          "Nước tương",
          "Muối",
          "Đường",
          "Hạt nêm",
          "Bột ngọt",
          "Tiêu",
          "Dầu hào",
          "Mật ong",
        ],
      },
    ],
  },
  {
    id: "aromatic",
    title: "Hành, Tỏi & Cay",
    iconName: "chili-mild",
    groups: [
      {
        id: "aromatic_fresh",
        subName: "Gia vị tươi & vị cay",
        icon: "",
        color: "#DC2626",
        bgLight: "#FEF2F2",
        hint: "Tỏi, ớt, gừng, sả, hành tím, riềng, nghệ...",
        options: [
          "Tỏi",
          "Ớt",
          "Gừng",
          "Sả",
          "Hành tím",
          "Nghệ",
          "Riềng",
          "Sa tế",
        ],
      },
    ],
  },
  {
    id: "oil_sauce",
    title: "Dầu & Nước sốt",
    iconName: "oil",
    groups: [
      {
        id: "sauces_cooking",
        subName: "Dầu ăn & Sốt nấu",
        icon: "",
        color: "#EA580C",
        bgLight: "#FFF7ED",
        hint: "Dầu ăn, dầu olive, dầu mè, tương ớt, sốt mayo...",
        options: [
          "Dầu ăn",
          "Dầu olive",
          "Dầu mè",
          "Tương ớt",
          "Tương cà",
          "Mayonnaise",
          "Giấm",
          "Nước cốt dừa",
        ],
      },
    ],
  },
  {
    id: "dry",
    title: "Đồ khô & Đóng hộp",
    iconName: "package-variant",
    groups: [
      {
        id: "dry_canned",
        subName: "Thực phẩm khô & Đóng lon",
        icon: "",
        color: "#7C3AED",
        bgLight: "#F5F3FF",
        hint: "Tôm khô, mực khô, cá hộp, rong biển, ngô ngọt...",
        options: [
          "Tôm khô",
          "Mực khô",
          "Cá hộp",
          "Thịt hộp",
          "Mộc nhĩ",
          "Rong biển",
          "Ngô ngọt đóng hộp",
        ],
      },
    ],
  },
];

interface FridgeViewProps {
  insetsTop: number;
  onBack?: () => void;
}

export default function FridgeView({ insetsTop, onBack }: FridgeViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Selected ingredients state (defaults to common kitchen items)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([
    "Thịt gà",
    "Nước tương",
    "Mật ong",
    "Tỏi",
    "Gạo / Cơm",
    "Hành lá",
  ]);

  // Backend fridge items & state
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [isLoadingFridge, setIsLoadingFridge] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backendMatchedRecipes, setBackendMatchedRecipes] = useState<MatchedRecipeItem[]>([]);

  // Active Category Tab
  const [activeMainCat, setActiveMainCat] = useState<string>("meat");

  // Accordion expanded state map (stores groupId -> boolean)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Custom User Input text state
  const [customInput, setCustomInput] = useState<string>("");

  // Cooking history modal state
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const currentCategoryData =
    INGREDIENT_CATEGORIES.find((c) => c.id === activeMainCat) ??
    INGREDIENT_CATEGORIES[0];

  // Load fridge and matched recipes from backend
  const loadFridgeData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingFridge(true);
    }

    try {
      const [fridgeRes, matchedRes] = await Promise.all([
        FridgeService.getMyFridge(),
        FridgeService.getFridgeMatchedRecipes(15),
      ]);

      if (fridgeRes?.items && fridgeRes.items.length > 0) {
        setFridgeItems(fridgeRes.items);
        setSelectedIngredients(fridgeRes.items.map((i) => i.name));
      } else {
        // Đồng bộ các nguyên liệu ban đầu lên backend nếu tủ lạnh backend đang trống
        if (selectedIngredients.length > 0) {
          Promise.all(
            selectedIngredients.map((name) =>
              FridgeService.addItem({ name }).catch(() => null)
            )
          ).then(() => {
            FridgeService.getMyFridge().then((res) => {
              if (res?.items && res.items.length > 0) setFridgeItems(res.items);
            });
          });
        }
      }

      if (matchedRes && matchedRes.length > 0) {
        setBackendMatchedRecipes(matchedRes);
      }
    } catch (e) {
      console.warn("Lỗi khi tải dữ liệu tủ lạnh:", e);
    } finally {
      setIsLoadingFridge(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFridgeData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFridgeData]);

  // Toggle Accordion Group with smooth animation
  const toggleAccordion = (groupId: string) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {}
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Toggle ingredient selection with real Backend synchronization
  const toggleIngredient = async (name: string) => {
    const isCurrentlySelected = selectedIngredients.includes(name);

    if (isCurrentlySelected) {
      // Optimistic remove
      setSelectedIngredients((prev) => prev.filter((item) => item !== name));
      const existingItem = fridgeItems.find(
        (it) => it.name.toLowerCase() === name.toLowerCase()
      );
      if (existingItem?._id) {
        setFridgeItems((prev) => prev.filter((it) => it._id !== existingItem._id));
        try {
          await FridgeService.removeItem(existingItem._id);
          FridgeService.getFridgeMatchedRecipes(15).then((res) => {
            if (res && res.length > 0) setBackendMatchedRecipes(res);
          });
        } catch (e) {
          console.error("Lỗi khi xóa khỏi tủ lạnh:", e);
        }
      }
      return;
    }

    // Optimistic add
    setSelectedIngredients((prev) => [...prev, name]);
    try {
      const catCodeMap: Record<string, string> = {
        meat: "meat",
        seafood: "seafood",
        veggie: "greens",
        tuber: "veggies",
        aromatic_herb: "herbs",
        fruit: "fruits",
        egg_tofu: "egg_tofu",
        dairy: "dairy",
        carb: "carbs",
        grain: "grain",
        spice: "seasoning",
        aromatic: "spice",
        oil_sauce: "sauces",
        dry: "dry",
      };
      const backendCategory = catCodeMap[activeMainCat] || undefined;

      const addedItem = await FridgeService.addItem({
        name,
        category: backendCategory,
      });
      if (addedItem) {
        setFridgeItems((prev) => [addedItem, ...prev]);
      }
      FridgeService.getFridgeMatchedRecipes(15).then((res) => {
        if (res && res.length > 0) setBackendMatchedRecipes(res);
      });
    } catch (e) {
      console.error("Lỗi khi thêm vào tủ lạnh:", e);
    }
  };

  // Add custom ingredient from input
  const handleAddCustom = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      Alert.alert("Lưu ý", "Vui lòng nhập tên nguyên liệu");
      return;
    }
    if (!selectedIngredients.includes(trimmed)) {
      setSelectedIngredients([trimmed, ...selectedIngredients]);
      try {
        const added = await FridgeService.addItem({ name: trimmed });
        if (added) {
          setFridgeItems((prev) => [added, ...prev]);
        }
        FridgeService.getFridgeMatchedRecipes(15).then((res) => {
          if (res && res.length > 0) setBackendMatchedRecipes(res);
        });
      } catch (e) {
        console.error("Lỗi thêm nguyên liệu tùy chỉnh:", e);
      }
    }
    setCustomInput("");
  };

  // Clear all selections
  const handleClearAll = () => {
    Alert.alert(
      "Dọn sạch tủ lạnh",
      "Bạn có chắc muốn xóa toàn bộ nguyên liệu khỏi tủ lạnh không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: async () => {
            setSelectedIngredients([]);
            setFridgeItems([]);
            setBackendMatchedRecipes([]);
            try {
              await FridgeService.clearFridge();
            } catch (e) {
              console.error("Lỗi khi làm sạch tủ lạnh:", e);
            }
          },
        },
      ]
    );
  };

  // Switch Main Category (groups stay closed by default)
  const handleSelectCategory = (catId: string) => {
    setActiveMainCat(catId);
  };

  // Count how many items in a specific group are selected
  const getSelectedCountInGroup = (options: string[]) => {
    return options.filter((opt) => selectedIngredients.includes(opt)).length;
  };

  // Count how many items in a whole main category are selected
  const getSelectedCountInCategory = (cat: MainCategory) => {
    let count = 0;
    cat.groups.forEach((g) => {
      g.options.forEach((opt) => {
        if (selectedIngredients.includes(opt)) count++;
      });
    });
    return count;
  };

  // Compute matched recipes with dynamic ranking based on currently selected ingredients
  const rankedRecipes = useMemo(() => {
    if (selectedIngredients.length === 0) return [];

    // Base recipes pool: standard RECIPES_DATA
    const pool = [...RECIPES_DATA];

    // Augment with any backend recipes that aren't already in pool
    if (backendMatchedRecipes.length > 0) {
      backendMatchedRecipes.forEach((bm) => {
        const r = bm.recipe;
        const rId = (r as any)._id?.toString() || r.id;
        if (!pool.some((p) => p.id === rId)) {
          pool.push({
            id: rId,
            title: r.title,
            image: typeof r.image === "string" ? { uri: r.image } : r.image,
            minutes: (r as any).cookTimeMinutes || (r as any).minutes || 25,
            calories: r.calories || 450,
            fridgeMatchPercent: bm.fridgeMatchPercent || 0,
            ingredients: (r.ingredients || []).map((ing: any) => ({
              name: typeof ing === "string" ? ing : ing.name,
              amount: typeof ing === "object" ? ing.amount : "",
            })),
            steps: (r as any).instructions || (r as any).steps || [],
            difficulty: ((r as any).difficulty as any) || "Trung bình",
            category: r.category || "Món chính",
          } as any);
        }
      });
    }

    return pool
      .map((recipe) => {
        let matchedCount = 0;
        const matchedIngredients: string[] = [];
        const missingIngredients: string[] = [];

        (recipe.ingredients || []).forEach((ing) => {
          const ingName = typeof ing === "string" ? ing : ing.name;
          if (matchIngredient(ingName, selectedIngredients)) {
            matchedCount++;
            matchedIngredients.push(ingName);
          } else {
            missingIngredients.push(ingName);
          }
        });

        const totalRequired = recipe.ingredients?.length || 1;
        const matchPercent = Math.min(
          100,
          Math.round((matchedCount / totalRequired) * 100),
        );

        return {
          recipe,
          matchPercent,
          matchedCount,
          totalRequired,
          matchedIngredients,
          missingIngredients,
        };
      })
      .filter((item) => item.matchPercent >= 25) // Show recipes with at least 25% match
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [backendMatchedRecipes, selectedIngredients]);

  // Split into 100% ready vs partially ready vs suggestions
  const perfectMatches = rankedRecipes.filter((r) => r.matchPercent === 100);
  const partialMatches = rankedRecipes.filter(
    (r) => r.matchPercent >= 50 && r.matchPercent < 100,
  );
  const otherMatches = rankedRecipes.filter(
    (r) => r.matchPercent >= 25 && r.matchPercent < 50,
  );

  return (
    <View style={styles.container}>
      {/* 1. Header Section */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLeftCol}>
            {onBack && (
              <TouchableOpacity
                style={styles.exitBtn}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Nguyên Liệu Của Tôi</Text>
          </View>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="time-outline" size={14} color="#EA580C" />
            <Text style={styles.historyBtnText}>Lịch sử</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadFridgeData(true)}
            colors={["#EA580C"]}
            tintColor="#EA580C"
          />
        }
      >
        {/* 2. Custom Text Input Row (User tìm kiếm hoặc thêm nguyên liệu) */}
        <View style={styles.customInputRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={17} color="#94A3B8" />
          <TextInput
            style={styles.textInput}
            placeholder="Tìm hoặc thêm nguyên liệu..."
            placeholderTextColor="#94A3B8"
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={handleAddCustom}
            returnKeyType="search"
          />
          {customInput.length > 0 && (
            <TouchableOpacity onPress={() => setCustomInput("")}>
              <Ionicons name="close-circle" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          activeOpacity={0.8}
          onPress={handleAddCustom}
        >
          <LinearGradient
            colors={["#FF5722", "#FF7043"]}
            style={styles.searchBtnGradient}
          >
            <Ionicons name="search" size={14} color="#FFFFFF" />
            <Text style={styles.searchBtnText}>Tìm kiếm</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 3. Selected Ingredients Tray (Khay nguyên liệu đã chọn) */}
      <View style={styles.selectedTrayCard}>
        <View style={styles.selectedTrayHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {selectedIngredients.length}
              </Text>
            </View>
            <Text style={styles.selectedTrayTitle}>
              Nguyên liệu bạn đã chọn
            </Text>
          </View>

          {selectedIngredients.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedIngredients.length === 0 ? (
          <Text style={styles.emptySelectedText}>
            Chưa có nguyên liệu nào được chọn. Nhấn chọn bên dưới hoặc gõ để
            thêm!
          </Text>
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.selectedChipsScroll}
          >
            {selectedIngredients.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.selectedChip}
                onPress={() => toggleIngredient(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedChipText}>{item}</Text>
                <Ionicons name="close" size={14} color="#EA580C" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 4. Main Category Tabs (Nằm thành 1 hàng ngang, lướt tự do xem toàn bộ mượt mà) */}
      <View style={styles.catScrollWrapper}>
        <ScrollView
          horizontal
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          canCancelContentTouches={true}
          scrollEventThrottle={16}
          decelerationRate="normal"
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          contentContainerStyle={styles.mainCatScroll}
        >
          {INGREDIENT_CATEGORIES.map((cat) => {
            const isActive = activeMainCat === cat.id;
            const catSelectedCount = getSelectedCountInCategory(cat);

            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.mainCatTab,
                  isActive && styles.mainCatTabActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleSelectCategory(cat.id)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.mainCatTabText,
                    isActive && styles.mainCatTabTextActive,
                  ]}
                >
                  {cat.title}
                </Text>
                {catSelectedCount > 0 && (
                  <View
                    style={[
                      styles.catBadgeCircle,
                      isActive ? styles.catBadgeCircleActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catBadgeText,
                        isActive ? styles.catBadgeTextActive : null,
                      ]}
                    >
                      {catSelectedCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Compact Accordion Groups with Chevron Arrows (Nhỏ gọn, bấm mũi tên mở list option chung chung) */}
      <View style={styles.accordionsContainer}>
        {currentCategoryData.groups.map((group) => {
          const isExpanded = !!expandedGroups[group.id];
          const selectedInGroupCount = getSelectedCountInGroup(group.options);
          const selectedInThisGroup = group.options.filter((opt) =>
            selectedIngredients.includes(opt),
          );

          return (
            <View key={group.id} style={styles.accordionCard}>
              {/* Clickable Header with Arrow Icon - Nhỏ gọn, không có icon */}
              <TouchableOpacity
                style={[
                  styles.accordionHeader,
                  isExpanded && styles.accordionHeaderExpanded,
                ]}
                onPress={() => toggleAccordion(group.id)}
                activeOpacity={0.7}
              >
                {/* Left: Title + Subtitle/Selected summary */}
                <View style={styles.accordionHeaderLeft}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitleText}>
                      {group.subName}
                    </Text>
                    {selectedInGroupCount > 0 && (
                      <View style={styles.groupSelectedPill}>
                        <Text style={styles.groupSelectedPillText}>
                          {selectedInGroupCount} đã chọn
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.accordionHintText} numberOfLines={1}>
                    {selectedInGroupCount > 0
                      ? selectedInThisGroup.join(", ")
                      : group.hint}
                  </Text>
                </View>

                {/* Right: Chevron Arrow Indicator */}
                <View style={styles.accordionHeaderRight}>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={isExpanded ? "#EA580C" : "#64748B"}
                  />
                </View>
              </TouchableOpacity>

              {/* Collapsible Options Body - Nhỏ gọn, không cần icon */}
              {isExpanded && (
                <View style={styles.accordionBody}>
                  <View style={styles.accordionDivider} />
                  <View style={styles.optionsWrap}>
                    {group.options.map((option, oIdx) => {
                      const isSelected = selectedIngredients.includes(option);
                      return (
                        <TouchableOpacity
                          key={oIdx}
                          style={[
                            styles.optionChip,
                            isSelected && styles.optionChipSelected,
                          ]}
                          onPress={() => toggleIngredient(option)}
                          activeOpacity={0.75}
                        >
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#EA580C"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 6. SMART RECIPE RECOMMENDATIONS BASED ON INGREDIENTS (Gợi ý món ăn để nấu) */}
      <View style={styles.recommendSection}>
        <View style={styles.recommendHeaderRow}>
          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="restaurant" size={18} color="#EA580C" />
              <Text style={styles.recommendMainHeading}>
                Gợi Ý Món Ăn Phù Hợp ({rankedRecipes.length})
              </Text>
            </View>
            <Text style={styles.recommendSubHeading}>
              Dựa trên {selectedIngredients.length} nguyên liệu bạn đã chọn
            </Text>
          </View>
        </View>

        {/* Zero results notice */}
        {rankedRecipes.length === 0 && (
          <View style={styles.noResultBox}>
            <MaterialCommunityIcons name="chef-hat" size={40} color="#CBD5E1" />
            <Text style={styles.noResultTitle}>Chưa tìm thấy món phù hợp</Text>
            <Text style={styles.noResultSub}>
              Hãy chọn thêm một số nguyên liệu cơ bản như thịt gà, thịt bò,
              trứng hoặc rau củ bên trên nhé!
            </Text>
          </View>
        )}

        {/* TIER 1: 100% SẴN SÀNG NẤU ĐƯỢC NGAY (PERFECT MATCHES) */}
        {perfectMatches.length > 0 && (
          <View style={styles.matchTierBlock}>
            <View style={styles.tierHeader}>
              <View style={styles.tierHeaderRow}>
                <View style={styles.tierDotGreen} />
                <Text style={styles.tierSectionTitle}>
                  Nấu được ngay ({perfectMatches.length})
                </Text>
              </View>
              <Text style={styles.tierSectionSub}>
                Đủ 100% nguyên liệu có sẵn
              </Text>
            </View>

            <View style={styles.recipesVerticalList}>
              {perfectMatches.map(
                ({ recipe, matchPercent, matchedIngredients }) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCardFull}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: "/recipe-detail",
                        params: { id: recipe.id },
                      })
                    }
                  >
                    <Image
                      source={
                        typeof recipe.image === "string"
                          ? { uri: recipe.image }
                          : recipe.image
                      }
                      style={styles.recipeCardImg}
                    />
                    <View style={styles.recipeCardRight}>
                      <View style={styles.recipeMatchBadgeGreen}>
                        <Text style={styles.recipeMatchTextGreen}>
                          Đủ 100% nguyên liệu
                        </Text>
                      </View>

                      <Text style={styles.recipeFullTitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>

                      <View style={styles.recipeMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.minutes} phút</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Ionicons name="flame-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.calories} kcal</Text>
                      </View>

                      <Text style={styles.matchedPreviewText} numberOfLines={1}>
                        Đã có: {matchedIngredients.slice(0, 3).join(", ")}
                      </Text>

                      <View style={styles.viewDetailsBtn}>
                        <LinearGradient
                          colors={["#FF5722", "#FF7043"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.viewDetailsGradient}
                        >
                          <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                          <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                        </LinearGradient>
                      </View>
                    </View>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        )}

        {/* TIER 2: CHỈ THIẾU 1-2 NGUYÊN LIỆU (PARTIAL MATCHES) */}
        {partialMatches.length > 0 && (
          <View style={[styles.matchTierBlock, { marginTop: 18 }]}>
            <View style={styles.tierHeader}>
              <View style={styles.tierHeaderRow}>
                <View style={styles.tierDotAmber} />
                <Text style={styles.tierSectionTitle}>
                  Có thể biến tấu ({partialMatches.length})
                </Text>
              </View>
              <Text style={styles.tierSectionSub}>
                Chỉ thiếu 1 nguyên liệu
              </Text>
            </View>

            <View style={styles.recipesVerticalList}>
              {partialMatches.map(
                ({
                  recipe,
                  matchPercent,
                  missingIngredients,
                  matchedIngredients,
                }) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCardFull}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: "/recipe-detail",
                        params: { id: recipe.id },
                      })
                    }
                  >
                    <Image
                      source={
                        typeof recipe.image === "string"
                          ? { uri: recipe.image }
                          : recipe.image
                      }
                      style={styles.recipeCardImg}
                    />
                    <View style={styles.recipeCardRight}>
                      <View style={styles.recipeMatchBadgeOrange}>
                        <Text style={styles.recipeMatchTextOrange}>
                          Khớp {matchPercent}%
                        </Text>
                      </View>

                      <Text style={styles.recipeFullTitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>

                      <View style={styles.recipeMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.minutes} phút</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Ionicons name="flame-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.calories} kcal</Text>
                      </View>

                      {missingIngredients.length > 0 && (
                        <Text
                          style={styles.missingWarningText}
                          numberOfLines={1}
                        >
                          Cần thêm: {missingIngredients[0]}
                        </Text>
                      )}

                      <View style={styles.viewDetailsBtn}>
                        <LinearGradient
                          colors={["#FF5722", "#FF7043"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.viewDetailsGradient}
                        >
                          <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                          <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                        </LinearGradient>
                      </View>
                    </View>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        )}

        {/* TIER 3: GỢI Ý MÓN CẦN MUA THÊM (NẾU CHƯA CÓ MÓN 100% HOẶC 50%) */}
        {perfectMatches.length === 0 && partialMatches.length === 0 && otherMatches.length > 0 && (
          <View style={[styles.matchTierBlock, { marginTop: 18 }]}>
            <View style={styles.tierHeader}>
              <View style={styles.tierHeaderRow}>
                <View style={styles.tierDotSlate} />
                <Text style={styles.tierSectionTitle}>
                  Cần mua thêm ({otherMatches.length})
                </Text>
              </View>
              <Text style={styles.tierSectionSub}>
                Gợi ý món ăn tham khảo
              </Text>
            </View>

            <View style={styles.recipesVerticalList}>
              {otherMatches.map(
                ({ recipe, matchPercent, missingIngredients }) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCardFull}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: "/recipe-detail",
                        params: { id: recipe.id },
                      })
                    }
                  >
                    <Image
                      source={typeof recipe.image === "string" ? { uri: recipe.image } : recipe.image}
                      style={styles.recipeCardImg}
                    />
                    <View style={styles.recipeCardRight}>
                      <View style={styles.recipeMatchBadgeOrange}>
                        <Text style={styles.recipeMatchTextOrange}>
                          Khớp {matchPercent}%
                        </Text>
                      </View>

                      <Text style={styles.recipeFullTitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>

                      <View style={styles.recipeMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.minutes} phút</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Ionicons name="flame-outline" size={12} color="#94A3B8" />
                        <Text style={styles.recipeFullMeta}>{recipe.calories} kcal</Text>
                      </View>

                      {missingIngredients.length > 0 && (
                        <Text style={styles.missingWarningText} numberOfLines={1}>
                          Cần thêm: {missingIngredients.slice(0, 2).join(", ")}
                        </Text>
                      )}

                      <View style={styles.viewDetailsBtn}>
                        <LinearGradient
                          colors={["#FF5722", "#FF7043"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.viewDetailsGradient}
                        >
                          <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                          <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                        </LinearGradient>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        )}
      </View>
      </ScrollView>

      {/* Cooking History Modal */}
      <CookingHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
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
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  exitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  badgeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  badgeTopText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E65100",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
  },

  /* Custom text input */
  customInputRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
  },
  searchBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    gap: 4,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Selected Tray */
  selectedTrayCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 16,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedTrayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EA580C",
    justifyContent: "center",
    alignItems: "center",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  selectedTrayTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  clearAllText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#EF4444",
  },
  emptySelectedText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  selectedChipsScroll: {
    gap: 8,
    paddingTop: 2,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },

  /* Category tabs (1 hàng ngang, lướt tự do qua lại mượt mà) */
  catScrollWrapper: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  mainCatScroll: {
    paddingHorizontal: 20,
    paddingVertical: 2,
    gap: 8,
    alignItems: "center",
  },
  mainCatTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 9.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  mainCatTabActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mainCatTabText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  mainCatTabTextActive: {
    color: "#EA580C",
    fontWeight: "800",
  },
  catBadgeCircle: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  catBadgeCircleActive: {
    backgroundColor: "#FFEDD5",
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  catBadgeTextActive: {
    color: "#C2410C",
  },

  /* Accordions Section - Nhỏ gọn, không có icon */
  accordionsContainer: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
  },
  accordionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accordionHeaderExpanded: {
    backgroundColor: "#FFFDF9",
  },
  accordionHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accordionTitleText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  groupSelectedPill: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  groupSelectedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EA580C",
  },
  accordionHintText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  accordionHeaderRight: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  accordionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 10,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionChipSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  optionChipTextSelected: {
    color: "#EA580C",
    fontWeight: "700",
  },

  /* Recommendations Section */
  recommendSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  recommendHeaderRow: {
    marginBottom: 14,
  },
  recommendMainHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recommendSubHeading: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  noResultBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 6,
  },
  noResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  noResultSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },

  /* Match Tiers */
  matchTierBlock: {},
  tierHeader: {
    marginBottom: 10,
  },
  tierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  tierDotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },
  tierDotSlate: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },
  tierSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tierSectionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginLeft: 12,
  },
  recipesVerticalList: {
    gap: 12,
  },
  recipeCardFull: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  recipeCardImg: {
    width: 95,
    height: 105,
    borderRadius: 12,
  },
  recipeCardRight: {
    flex: 1,
    justifyContent: "space-between",
  },
  recipeMatchBadgeGreen: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  recipeMatchTextGreen: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  recipeMatchBadgeOrange: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  recipeMatchTextOrange: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  recipeFullTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeFullMeta: {
    fontSize: 11,
    color: "#64748B",
  },
  metaDivider: {
    fontSize: 10,
    color: "#CBD5E1",
    marginHorizontal: 2,
  },
  matchedPreviewText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  missingWarningText: {
    fontSize: 11,
    color: "#9A3412",
    fontWeight: "500",
  },
  viewDetailsBtn: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  viewDetailsGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6.5,
    borderRadius: 10,
  },
  viewDetailsText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
