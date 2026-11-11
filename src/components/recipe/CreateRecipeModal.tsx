import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { RecipeService } from "@/services/recipeService";
import { Recipe, RecipeIngredient, RecipeNutrition, RecipeStep } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated?: (recipe: Recipe) => void;
  initialRecipe?: Recipe | null;
}

const CATEGORIES = [
  { id: "family", label: "Gia đình", color: BrandColors.textDark },
  { id: "quick", label: "Nấu nhanh < 20p", color: "#404040" },
  { id: "healthy", label: "Healthy", color: BrandColors.textBody },
  { id: "budget", label: "Tiết kiệm", color: "#363636" },
  { id: "kids", label: "Trẻ em", color: "#292929" },
  { id: "vegetarian", label: "Ăn chay", color: "#262626" },
  { id: "vietnamese", label: "Món Việt", color: BrandColors.textBody },
  { id: "dessert", label: "Tráng miệng", color: "#292929" },
];

const DIFFICULTIES: Array<"Dễ" | "Trung bình" | "Nâng cao"> = [
  "Dễ",
  "Trung bình",
  "Nâng cao",
];

const SAMPLE_PHOTOS = [
  { id: "teriyaki", label: "Gà Teriyaki", source: require("@/assets/images/hero-teriyaki-bowl.jpg") },
  { id: "steak", label: "Bít Tết", source: require("@/assets/images/steak-asparagus.jpg") },
  { id: "salmon", label: "Cá Hồi", source: require("@/assets/images/salad-salmon.jpg") },
  { id: "pasta", label: "Mỳ Ý", source: require("@/assets/images/pasta-bolognese.jpg") },
  { id: "chicken", label: "Gà Giòn", source: require("@/assets/images/crispy-chicken.jpg") },
];

export default function CreateRecipeModal({
  visible,
  onClose,
  onRecipeCreated,
  initialRecipe,
}: CreateRecipeModalProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Basic Information & Photo
  const [selectedImage, setSelectedImage] = useState<any>(SAMPLE_PHOTOS[0].source);
  const [selectedHotTag, setSelectedHotTag] = useState<"hot" | "popular" | "new">("hot");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("family");
  const [minutes, setMinutes] = useState("25");
  const [difficulty, setDifficulty] = useState<"Dễ" | "Trung bình" | "Nâng cao">("Dễ");
  const [calories, setCalories] = useState("450");
  const [description, setDescription] = useState("");

  // Sync state if initialRecipe changes
  useEffect(() => {
    if (visible && initialRecipe) {
      setTitle(initialRecipe.title || "");
      setCategory(initialRecipe.category || initialRecipe.categoryCode || "family");
      setMinutes(String(initialRecipe.minutes || 25));
      setDifficulty(initialRecipe.difficulty || "Dễ");
      setCalories(String(initialRecipe.calories || 450));
      setDescription(initialRecipe.description || initialRecipe.sub || "");
      if (initialRecipe.ingredients && initialRecipe.ingredients.length > 0) {
        setIngredients(initialRecipe.ingredients);
      }
      if (initialRecipe.steps && initialRecipe.steps.length > 0) {
        setSteps(initialRecipe.steps);
      }
      if (initialRecipe.nutrition) {
        setProtein(initialRecipe.nutrition.protein || "25g");
        setCarbs(initialRecipe.nutrition.carbs || "45g");
        setFat(initialRecipe.nutrition.fat || "12g");
        setFiber(initialRecipe.nutrition.fiber || "6g");
        setAdvice(initialRecipe.nutrition.advice || "");
      }
      if (initialRecipe.image) {
        setSelectedImage(
          typeof initialRecipe.image === "string"
            ? { uri: initialRecipe.image }
            : initialRecipe.image
        );
      }
    }
  }, [visible, initialRecipe]);

  // Step 2: Ingredients
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { name: "", amount: "", inFridge: true },
    { name: "", amount: "", inFridge: false },
  ]);

  // Step 3: Cooking Steps
  const [steps, setSteps] = useState<RecipeStep[]>([
    {
      stepNumber: 1,
      title: "Sơ chế nguyên liệu",
      description: "",
      timerMinutes: 5,
      tip: "",
    },
    {
      stepNumber: 2,
      title: "Chế biến & Nấu",
      description: "",
      timerMinutes: 15,
      tip: "",
    },
  ]);

  // Step 4: Nutrition & Advice
  const [protein, setProtein] = useState("25g");
  const [carbs, setCarbs] = useState("45g");
  const [fat, setFat] = useState("12g");
  const [fiber, setFiber] = useState("6g");
  const [advice, setAdvice] = useState(
    "Món ăn cân bằng dinh dưỡng, tốt cho sức khỏe cả nhà."
  );

  // Photo pickers
  const handlePickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập",
          "Ứng dụng cần quyền truy cập ảnh để bạn chọn ảnh món ăn từ máy."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.log("Error picking image:", e);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền camera",
          "Ứng dụng cần quyền camera để bạn chụp ảnh món ăn."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.log("Error taking photo:", e);
    }
  };

  // Handlers for Ingredients
  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { name: "", amount: "", inFridge: false },
    ]);
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof RecipeIngredient,
    value: any
  ) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) {
      Alert.alert("Lưu ý", "Món ăn cần có ít nhất 1 nguyên liệu");
      return;
    }
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers for Cooking Steps
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        title: `Bước ${prev.length + 1}`,
        description: "",
        timerMinutes: 5,
        tip: "",
      },
    ]);
  };

  const handleUpdateStep = (index: number, field: keyof RecipeStep, value: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      Alert.alert("Lưu ý", "Món ăn cần có ít nhất 1 bước nấu");
      return;
    }
    setSteps((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    });
  };

  // Validation
  const validateStep1 = () => {
    if (!title.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên món ăn");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập mô tả ngắn về món ăn");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const validIngredients = ingredients.filter((item) => item.name.trim() !== "");
    if (validIngredients.length === 0) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập ít nhất 1 nguyên liệu với tên và định lượng"
      );
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const validSteps = steps.filter((item) => item.description.trim() !== "");
    if (validSteps.length === 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập nội dung hướng dẫn cho các bước nấu");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedImage(SAMPLE_PHOTOS[0].source);
    setSelectedHotTag("hot");
    setTitle("");
    setCategory("family");
    setMinutes("25");
    setDifficulty("Dễ");
    setCalories("450");
    setDescription("");
    setIngredients([
      { name: "", amount: "", inFridge: true },
      { name: "", amount: "", inFridge: false },
    ]);
    setSteps([
      {
        stepNumber: 1,
        title: "Sơ chế nguyên liệu",
        description: "",
        timerMinutes: 5,
        tip: "",
      },
      {
        stepNumber: 2,
        title: "Chế biến & Nấu",
        description: "",
        timerMinutes: 15,
        tip: "",
      },
    ]);
    setProtein("25g");
    setCarbs("45g");
    setFat("12g");
    setFiber("6g");
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleFinish = async () => {
    if (isSubmitting) return;

    const cleanIngredients = ingredients.filter((i) => i.name.trim() !== "");
    const cleanSteps = steps
      .filter((s) => s.description.trim() !== "")
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

    const nutritionData: RecipeNutrition = {
      calories: parseInt(calories) || 450,
      protein: protein || "25g",
      carbs: carbs || "45g",
      fat: fat || "12g",
      fiber: fiber || "6g",
      advice: advice || "Món ăn cân bằng dinh dưỡng, tốt cho sức khỏe.",
    };

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("categoryCode", category);
      formData.append("category", category);
      formData.append("difficulty", difficulty);
      formData.append("minutes", String(parseInt(minutes) || 25));
      formData.append("cookingTimeMinutes", String(parseInt(minutes) || 25));
      formData.append("calories", String(parseInt(calories) || 450));
      formData.append("servings", "2 phần");
      formData.append("servingsCount", "2");
      formData.append("description", description.trim() || `Công thức món ${title.trim()}`);
      formData.append(
        "badge",
        selectedHotTag === "hot"
          ? "🔥 Hot"
          : selectedHotTag === "popular"
          ? "⭐ Popular"
          : "✨ Mới"
      );
      formData.append(
        "sub",
        description.slice(0, 28) + (description.length > 28 ? "..." : "")
      );
      formData.append(
        "tags",
        JSON.stringify([
          selectedHotTag === "hot"
            ? "Hot"
            : selectedHotTag === "popular"
            ? "Popular"
            : "Mới",
          "Tự tạo",
        ])
      );
      formData.append("ingredients", JSON.stringify(cleanIngredients));
      formData.append("steps", JSON.stringify(cleanSteps));
      formData.append("nutrition", JSON.stringify(nutritionData));

      if (selectedImage?.uri) {
        const uri = selectedImage.uri;
        const filename = uri.split("/").pop() || "recipe.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("image", {
          uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
          name: filename,
          type,
        } as any);
      }

      let savedRecipe: Recipe;
      if (initialRecipe) {
        savedRecipe = await RecipeService.updateRecipe(initialRecipe.id, formData);
      } else {
        savedRecipe = await RecipeService.createRecipe(formData);
      }
      if (onRecipeCreated) {
        onRecipeCreated(savedRecipe);
      }

      Alert.alert(
        "Thành công! 🎉",
        initialRecipe
          ? `Món "${savedRecipe.title}" đã được cập nhật thành công.`
          : `Món "${savedRecipe.title}" đã được tạo thành công và đồng bộ lên hệ thống.`,
        [
          {
            text: "Hoàn tất",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.warn("Lỗi upload Backend, lưu công thức cục bộ:", error);

      const localRecipe: Recipe = {
        id: `dish-custom-${Date.now()}`,
        title: title.trim(),
        author: "@alex.cooker",
        calories: parseInt(calories) || 450,
        minutes: parseInt(minutes) || 25,
        stepsCount: cleanSteps.length,
        servings: "2 phần",
        difficulty: difficulty,
        price: "~50.000đ",
        rating: 5.0,
        reviewCount: 1,
        category: category,
        badge:
          selectedHotTag === "hot"
            ? "🔥 Hot"
            : selectedHotTag === "popular"
            ? "⭐ Popular"
            : "✨ Mới",
        sub: description.slice(0, 28) + (description.length > 28 ? "..." : ""),
        tags: [
          selectedHotTag === "hot"
            ? "Hot"
            : selectedHotTag === "popular"
            ? "Popular"
            : "Mới",
          "Tự tạo",
        ],
        fridgeMatchPercent: Math.round(
          (cleanIngredients.filter((i) => i.inFridge).length /
            Math.max(cleanIngredients.length, 1)) *
            100
        ),
        image: selectedImage || require("@/assets/images/hero-teriyaki-bowl.jpg"),
        description: description.trim(),
        ingredients: cleanIngredients,
        steps: cleanSteps,
        nutrition: nutritionData,
      };

      RecipeService.addRecipe(localRecipe);
      if (onRecipeCreated) {
        onRecipeCreated(localRecipe);
      }

      Alert.alert(
        "Thành công!",
        `Món "${localRecipe.title}" đã được lưu vào danh sách món ăn.`,
        [
          {
            text: "Xem ngay",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <DismissKeyboard>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Compact Top Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons
              name={currentStep === 1 ? "close-outline" : "chevron-back-outline"}
              size={22}
              color={BrandColors.textDark}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Tạo món ăn mới</Text>
            <Text style={styles.headerSubtitle}>Bước {currentStep}/4</Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close-outline" size={22} color={BrandColors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Compact Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          {[
            { step: 1, label: "Thông tin" },
            { step: 2, label: "Nguyên liệu" },
            { step: 3, label: "Cách nấu" },
            { step: 4, label: "Dinh dưỡng" },
          ].map((item, idx) => {
            const isCompleted = currentStep > item.step;
            const isActive = currentStep === item.step;

            return (
              <React.Fragment key={item.step}>
                <View style={styles.stepCol}>
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isCompleted && styles.stepCircleCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark-outline" size={13} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepCircleText,
                          isActive && styles.stepCircleTextActive,
                        ]}
                      >
                        {item.step}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabelText,
                      isActive && styles.stepLabelTextActive,
                      isCompleted && styles.stepLabelTextCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                {idx < 3 && (
                  <View
                    style={[
                      styles.stepConnectorLine,
                      currentStep > idx + 1 && styles.stepConnectorLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Main Content Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: insets.bottom + 80 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: THÔNG TIN CƠ BẢN & ẢNH (NHỎ GỌN) */}
            {currentStep === 1 && (
              <View style={styles.stepSection}>
                <Text style={styles.sectionHeading}>Thông tin cơ bản</Text>
                <Text style={styles.sectionDesc}>
                  Chọn ảnh đại diện, đặt tên và các thông số tổng quan cho món ăn.
                </Text>

                {/* KHU VỰC TẢI ẢNH MÓN ĂN GỌN GÀNG (SIDE-BY-SIDE) */}
                <View style={styles.compactPhotoSection}>
                  <View style={styles.photoPreviewBox}>
                    <Image
                      source={selectedImage}
                      style={styles.photoPreviewImg}
                      resizeMode="cover"
                    />
                  </View>

                  <View style={styles.photoActionsCol}>
                    <Text style={styles.photoActionsTitle}>Ảnh đại diện món</Text>
                    <View style={styles.photoBtnsRow}>
                      <TouchableOpacity
                        style={styles.compactPhotoBtn}
                        onPress={handlePickFromLibrary}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={14} color={BrandColors.primaryDark} />
                        <Text style={styles.compactPhotoBtnText}>Thư viện</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.compactPhotoBtn}
                        onPress={handleTakePhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={14} color={BrandColors.primaryDark} />
                        <Text style={styles.compactPhotoBtnText}>Chụp ảnh</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Mẫu nhanh */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.miniThumbsRow}
                    >
                      {SAMPLE_PHOTOS.map((sp) => {
                        const isSelected = selectedImage === sp.source;
                        return (
                          <TouchableOpacity
                            key={sp.id}
                            style={[
                              styles.miniThumbWrap,
                              isSelected && styles.miniThumbWrapActive,
                            ]}
                            onPress={() => setSelectedImage(sp.source)}
                            activeOpacity={0.7}
                          >
                            <Image
                              source={sp.source}
                              style={styles.miniThumbImg}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Tên món */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tên món ăn *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: Salad ức gà sốt mè rang"
                    placeholderTextColor={BrandColors.textPlaceholder}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Danh mục (Đồng bộ hệ thống) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Danh mục món ăn</Text>
                  <View style={styles.chipsWrap}>
                    {CATEGORIES.map((cat) => {
                      const isActive = category === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.chipItem,
                            isActive && {
                              backgroundColor: `${cat.color}15`,
                              borderColor: cat.color,
                            },
                          ]}
                          onPress={() => setCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipItemText,
                              isActive && {
                                color: cat.color,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2 Cột: Thời gian nấu & Calo ước tính (Đã bỏ khẩu phần theo yêu cầu) */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Thời gian (phút)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="25"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      keyboardType="numeric"
                      value={minutes}
                      onChangeText={setMinutes}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Calo ước tính (kcal)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="450"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      keyboardType="numeric"
                      value={calories}
                      onChangeText={setCalories}
                    />
                  </View>
                </View>

                {/* Nhãn món ăn nổi bật (Hot / Popular) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nhãn món ăn nổi bật</Text>
                  <View style={styles.hotTagsRow}>
                    {[
                      { id: "hot", label: "🔥 Hot", color: BrandColors.textDark, bg: "#F6F6F6" },
                      { id: "popular", label: "⭐ Popular", color: BrandColors.textBody, bg: "#DADADA" },
                      { id: "new", label: "✨ Mới nhất", color: BrandColors.textBody, bg: "#F3F3F3" },
                    ].map((tag) => {
                      const isTagActive = selectedHotTag === tag.id;
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            styles.hotTagChip,
                            isTagActive && {
                              backgroundColor: tag.bg,
                              borderColor: tag.color,
                            },
                          ]}
                          onPress={() => setSelectedHotTag(tag.id as any)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.hotTagChipText,
                              isTagActive && {
                                color: tag.color,
                                fontWeight: "800",
                              },
                            ]}
                          >
                            {tag.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Độ khó */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Độ khó</Text>
                  <View style={styles.diffRow}>
                    {DIFFICULTIES.map((d) => {
                      const isDiffActive = difficulty === d;
                      const diffColor =
                        d === "Dễ" ? "#353535" : d === "Trung bình" ? "#404040" : "#242424";
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.diffBtn,
                            isDiffActive && {
                              backgroundColor: diffColor,
                            },
                          ]}
                          onPress={() => setDifficulty(d)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.diffBtnText,
                              isDiffActive && {
                                color: "#FFFFFF",
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Mô tả */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mô tả món ăn *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Mô tả hương vị, điểm đặc trưng của món ăn..."
                    placeholderTextColor={BrandColors.textPlaceholder}
                    multiline
                    numberOfLines={2}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: NGUYÊN LIỆU & ĐỊNH LƯỢNG (GỌN GÀNG) */}
            {currentStep === 2 && (
              <View style={styles.stepSection}>
                <Text style={styles.sectionHeading}>Nguyên liệu cần chuẩn bị</Text>
                <Text style={styles.sectionDesc}>
                  Thêm nguyên liệu và định lượng. Khẩu phần sẽ tự động co giãn theo trọng lượng.
                </Text>

                {ingredients.map((item, index) => (
                  <View key={index} style={styles.ingredientCard}>
                    <View style={styles.ingredientTopRow}>
                      <View style={styles.ingredientBadge}>
                        <Text style={styles.ingredientBadgeText}>
                          #{index + 1}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveIngredient(index)}
                        style={styles.removeBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color={BrandColors.textPlaceholder} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.ingredientInputRow}>
                      <TextInput
                        style={[styles.textInput, { flex: 2 }]}
                        placeholder="Tên nguyên liệu (VD: Ức gà)"
                        placeholderTextColor={BrandColors.textPlaceholder}
                        value={item.name}
                        onChangeText={(val) =>
                          handleUpdateIngredient(index, "name", val)
                        }
                      />
                      <View style={{ width: 8 }} />
                      <TextInput
                        style={[styles.textInput, { flex: 1.2 }]}
                        placeholder="Định lượng (VD: 300g)"
                        placeholderTextColor={BrandColors.textPlaceholder}
                        value={item.amount}
                        onChangeText={(val) =>
                          handleUpdateIngredient(index, "amount", val)
                        }
                      />
                    </View>

                    {/* Toggle có sẵn trong tủ lạnh */}
                    <TouchableOpacity
                      style={styles.fridgeToggleRow}
                      activeOpacity={0.8}
                      onPress={() =>
                        handleUpdateIngredient(index, "inFridge", !item.inFridge)
                      }
                    >
                      <Ionicons
                        name={
                          item.inFridge
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={item.inFridge ? "#353535" : "#686868"}
                      />
                      <Text
                        style={[
                          styles.fridgeToggleText,
                          item.inFridge && styles.fridgeToggleTextActive,
                        ]}
                      >
                        {item.inFridge
                          ? "Có sẵn trong tủ lạnh (SmartCook match)"
                          : "Cần mua thêm (thêm vào giỏ chợ)"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Button Add Ingredient */}
                <TouchableOpacity
                  style={styles.addOutlineBtn}
                  onPress={handleAddIngredient}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={16} color={BrandColors.primaryDark} />
                  <Text style={styles.addOutlineBtnText}>Thêm nguyên liệu</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: CÁC BƯỚC NẤU CHI TIẾT (GỌN GÀNG) */}
            {currentStep === 3 && (
              <View style={styles.stepSection}>
                <Text style={styles.sectionHeading}>Các bước thực hiện</Text>
                <Text style={styles.sectionDesc}>
                  Chia nhỏ quy trình nấu để người nấu dễ dàng thao tác theo từng bước.
                </Text>

                {steps.map((item, index) => (
                  <View key={index} style={styles.stepCard}>
                    <View style={styles.stepCardHeader}>
                      <View style={styles.stepCardBadge}>
                        <Text style={styles.stepCardBadgeText}>
                          Bước {item.stepNumber}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveStep(index)}
                        style={styles.removeBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color={BrandColors.textPlaceholder} />
                      </TouchableOpacity>
                    </View>

                    {/* Tiêu đề bước */}
                    <View style={styles.inputGroupCompact}>
                      <Text style={styles.inputLabelSmall}>Tiêu đề bước</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="VD: Sơ chế và ướp gia vị"
                        placeholderTextColor={BrandColors.textPlaceholder}
                        value={item.title}
                        onChangeText={(val) =>
                          handleUpdateStep(index, "title", val)
                        }
                      />
                    </View>

                    {/* Hướng dẫn chi tiết */}
                    <View style={styles.inputGroupCompact}>
                      <Text style={styles.inputLabelSmall}>Hướng dẫn chi tiết *</Text>
                      <TextInput
                        style={[styles.textInput, styles.textAreaCompact]}
                        placeholder="Mô tả cụ thể cách làm, nhiệt độ lửa, thời gian..."
                        placeholderTextColor={BrandColors.textPlaceholder}
                        multiline
                        numberOfLines={2}
                        value={item.description}
                        onChangeText={(val) =>
                          handleUpdateStep(index, "description", val)
                        }
                      />
                    </View>

                    {/* Hẹn giờ & Mẹo hay */}
                    <View style={styles.rowTwoCols}>
                      <View style={[styles.inputGroupCompact, { flex: 1 }]}>
                        <Text style={styles.inputLabelSmall}>Hẹn giờ (phút)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={BrandColors.textPlaceholder}
                          keyboardType="numeric"
                          value={item.timerMinutes ? String(item.timerMinutes) : ""}
                          onChangeText={(val) =>
                            handleUpdateStep(
                              index,
                              "timerMinutes",
                              parseInt(val) || 0
                            )
                          }
                        />
                      </View>
                      <View style={{ width: 8 }} />
                      <View style={[styles.inputGroupCompact, { flex: 2 }]}>
                        <Text style={styles.inputLabelSmall}>Mẹo nhỏ (tuỳ chọn)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Mẹo làm giòn hoặc dậy mùi..."
                          placeholderTextColor={BrandColors.textPlaceholder}
                          value={item.tip || ""}
                          onChangeText={(val) =>
                            handleUpdateStep(index, "tip", val)
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Button Add Step */}
                <TouchableOpacity
                  style={styles.addOutlineBtn}
                  onPress={handleAddStep}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={16} color={BrandColors.primaryDark} />
                  <Text style={styles.addOutlineBtnText}>Thêm bước tiếp theo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: DINH DƯỠNG & XEM LẠI (GỌN GÀNG) */}
            {currentStep === 4 && (
              <View style={styles.stepSection}>
                <Text style={styles.sectionHeading}>Dinh dưỡng & Hoàn tất</Text>
                <Text style={styles.sectionDesc}>
                  Bổ sung các chỉ số dinh dưỡng và xem trước món ăn hoàn thiện.
                </Text>

                {/* 4 Chỉ số dinh dưỡng gọn gàng */}
                <View style={styles.nutritionGrid}>
                  <View style={[styles.nutritionBox, { borderLeftColor: "#353535" }]}>
                    <Text style={[styles.nutritionBoxLabel, { color: BrandColors.textBody }]}>
                      Đạm (Protein)
                    </Text>
                    <TextInput
                      style={styles.nutritionInput}
                      placeholder="25g"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={protein}
                      onChangeText={setProtein}
                    />
                  </View>

                  <View style={[styles.nutritionBox, { borderLeftColor: "#404040" }]}>
                    <Text style={[styles.nutritionBoxLabel, { color: "#404040" }]}>
                      Bột (Carbs)
                    </Text>
                    <TextInput
                      style={styles.nutritionInput}
                      placeholder="45g"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={carbs}
                      onChangeText={setCarbs}
                    />
                  </View>

                  <View style={[styles.nutritionBox, { borderLeftColor: "#242424" }]}>
                    <Text style={[styles.nutritionBoxLabel, { color: "#242424" }]}>
                      Béo (Fat)
                    </Text>
                    <TextInput
                      style={styles.nutritionInput}
                      placeholder="12g"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={fat}
                      onChangeText={setFat}
                    />
                  </View>

                  <View style={[styles.nutritionBox, { borderLeftColor: "#363636" }]}>
                    <Text style={[styles.nutritionBoxLabel, { color: "#363636" }]}>
                      Xơ (Fiber)
                    </Text>
                    <TextInput
                      style={styles.nutritionInput}
                      placeholder="6g"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={fiber}
                      onChangeText={setFiber}
                    />
                  </View>
                </View>

                {/* Lời khuyên */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Lời khuyên dinh dưỡng</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaCompact]}
                    placeholder="Gợi ý ăn kèm hoặc lợi ích sức khỏe..."
                    placeholderTextColor={BrandColors.textPlaceholder}
                    multiline
                    numberOfLines={2}
                    value={advice}
                    onChangeText={setAdvice}
                  />
                </View>

                {/* PREVIEW CARD GỌN GÀNG */}
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                  Xem trước món ăn
                </Text>
                <View style={styles.previewCard}>
                  <Image
                    source={selectedImage}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.previewContent}>
                    <View style={styles.previewBadgeRow}>
                      <Text style={styles.previewBadgeText}>
                        {selectedHotTag === "hot" ? "🔥 Hot" : selectedHotTag === "popular" ? "⭐ Popular" : "✨ Mới"} • {minutes} phút
                      </Text>
                      <Text style={styles.previewCaloText}>{calories} kcal</Text>
                    </View>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {title || "Tên món ăn của bạn"}
                    </Text>
                    <Text style={styles.previewSub} numberOfLines={2}>
                      {description || "Mô tả ngắn gọn về món ăn này."}
                    </Text>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaText}>
                        {ingredients.filter((i) => i.name).length} nguyên liệu
                      </Text>
                      <Text style={styles.previewMetaDot}>•</Text>
                      <Text style={styles.previewMetaText}>
                        {steps.filter((s) => s.description).length} bước
                      </Text>
                      <Text style={styles.previewMetaDot}>•</Text>
                      <Text style={[styles.previewMetaText, { color: BrandColors.primaryDark, fontWeight: "700" }]}>
                        {difficulty}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Floating Navigation Bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          {currentStep > 1 ? (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back-outline" size={15} color={BrandColors.textDark} />
              <Text style={styles.btnSecondaryText}>Quay lại</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>Hủy</Text>
            </TouchableOpacity>
          )}

          {currentStep < 4 ? (
            <TouchableOpacity
              style={styles.btnPrimaryWrap}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={BrandColors.buttonGradient}
                style={styles.btnGradient}
              >
                <Text style={styles.btnPrimaryText}>Tiếp tục</Text>
                <Ionicons name="arrow-forward-outline" size={15} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btnPrimaryWrap, isSubmitting && { opacity: 0.7 }]}
              onPress={handleFinish}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#171717", "#171717"]}
                style={styles.btnGradient}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Đang tải lên...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Hoàn tất & Đăng món</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </DismissKeyboard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BrandColors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: BrandColors.primaryDark,
    marginTop: 1,
    fontWeight: "700",
  },

  /* Step Indicator */
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: BrandColors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  stepCol: {
    alignItems: "center",
  },
  stepCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: BrandColors.borderLight,
    backgroundColor: BrandColors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepCircleActive: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primary,
    elevation: 2,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  stepCircleCompleted: {
    borderColor: "#353535",
    backgroundColor: "#353535",
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textMuted,
  },
  stepCircleTextActive: {
    color: "#FFFFFF",
  },
  stepLabelText: {
    fontSize: 10,
    color: BrandColors.textPlaceholder,
    fontWeight: "500",
  },
  stepLabelTextActive: {
    color: BrandColors.primaryDark,
    fontWeight: "800",
  },
  stepLabelTextCompleted: {
    color: BrandColors.textBody,
    fontWeight: "700",
  },
  stepConnectorLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 4,
    marginBottom: 12,
  },
  stepConnectorLineActive: {
    backgroundColor: BrandColors.primary,
  },

  /* Scroll Content */
  keyboardAvoid: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  stepSection: {},
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },

  /* Compact Photo Upload Section */
  compactPhotoSection: {
    flexDirection: "row",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 10,
    alignItems: "center",
  },
  photoPreviewBox: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: BrandColors.inputBg,
    borderWidth: 1,
    borderColor: "#C7C7C7",
  },
  photoPreviewImg: {
    width: "100%",
    height: "100%",
  },
  photoActionsCol: {
    flex: 1,
  },
  photoActionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginBottom: 5,
  },
  photoBtnsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  compactPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: BrandColors.surfaceMuted,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  compactPhotoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },
  miniThumbsRow: {
    flexDirection: "row",
    gap: 6,
  },
  miniThumbWrap: {
    borderRadius: 6,
    padding: 1.5,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  miniThumbWrapActive: {
    borderColor: BrandColors.primary,
  },
  miniThumbImg: {
    width: 34,
    height: 34,
    borderRadius: 5,
  },

  /* Inputs */
  inputGroup: {
    marginBottom: 10,
  },
  inputGroupCompact: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginBottom: 4,
  },
  inputLabelSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: "#C7C7C7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: BrandColors.textDark,
  },
  textArea: {
    height: 56,
    textAlignVertical: "top",
  },
  textAreaCompact: {
    height: 52,
    textAlignVertical: "top",
  },
  rowTwoCols: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* Chips */
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  chipItemText: {
    fontSize: 11,
    color: BrandColors.textBody,
    fontWeight: "500",
  },

  /* Difficulty Selector */
  hotTagsRow: {
    flexDirection: "row",
    gap: 8,
  },
  hotTagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: "#C7C7C7",
  },
  hotTagChipText: {
    fontSize: 12,
    color: BrandColors.textMuted,
    fontWeight: "600",
  },
  diffRow: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    backgroundColor: BrandColors.surfaceCard,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  diffBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },

  /* Ingredient Card */
  ingredientCard: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  ingredientTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ingredientBadge: {
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  ingredientBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  removeBtn: {
    padding: 2,
  },
  ingredientInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  fridgeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 2,
  },
  fridgeToggleText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: "500",
  },
  fridgeToggleTextActive: {
    color: "#292929",
    fontWeight: "700",
  },

  /* Step Card */
  stepCard: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  stepCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: BrandColors.surfaceMuted,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  stepCardBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: BrandColors.primaryDark,
  },

  /* Outline Add Button */
  addOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: "#C2C2C2",
    backgroundColor: BrandColors.surfaceMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  addOutlineBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },

  /* Nutrition Grid */
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  nutritionBox: {
    width: "48%",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderLeftWidth: 3.5,
  },
  nutritionBoxLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  nutritionInput: {
    fontSize: 14,
    fontWeight: "800",
    color: BrandColors.textDark,
    padding: 0,
  },

  /* Preview Card */
  previewCard: {
    flexDirection: "row",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1.5 },
  },
  previewImage: {
    width: 90,
    height: 100,
  },
  previewContent: {
    flex: 1,
    padding: 8,
    justifyContent: "center",
  },
  previewBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  previewBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: BrandColors.primaryDark,
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  previewCaloText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginBottom: 1,
  },
  previewSub: {
    fontSize: 10.5,
    color: BrandColors.textMuted,
    marginBottom: 4,
    lineHeight: 14,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewMetaText: {
    fontSize: 9.5,
    color: BrandColors.textMuted,
  },
  previewMetaDot: {
    fontSize: 9.5,
    color: "#C7C7C7",
    marginHorizontal: 3,
  },

  /* Bottom Bar */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BrandColors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 9,
    gap: 10,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: BrandColors.inputBg,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textDark,
  },
  btnPrimaryWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
  },
  btnPrimaryText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
