import { useAuth } from "@/contexts/AuthContext";
import { getRecipeById, RECIPES_DATA } from "@/data/recipesData";
import { CookingHistoryService } from "@/services/cookingHistoryService";
import recipeService from "@/services/recipeService";
import { Recipe } from "@/types";
import { hapticLightImpact, hapticSuccess } from "@/utils/haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { prepareCookingSpeech } from "@/utils/cookingSpeech";
import { getCookingStepIndex } from "@/utils/cookingVoiceActions";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import { useCookingTimer } from "@/hooks/useCookingTimer";
import { normalizeCookingNutrition } from "@/utils/cookingScope";
import { cookingStepSeconds } from "@/utils/cookingTimer";
import { useCookingVoice } from "@/hooks/useCookingVoice";
import { CookingVoiceOverlay } from "@/components/ai/CookingVoiceOverlay";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Unified Default Voice ID - WaveNet Studio HD Female
const UNIFIED_VOICE_ID = "default";
let gUnifiedVoiceId = UNIFIED_VOICE_ID;

export default function CookingModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fallbackRecipe: Recipe = getRecipeById(id as string) ?? RECIPES_DATA[0];
  const [recipe, setRecipe] = useState<Recipe>(fallbackRecipe);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState<boolean>(!getRecipeById(id as string));

  useEffect(() => {
    let isMounted = true;
    async function loadRecipe() {
      if (!id) return;
      try {
        const remote = await recipeService.getRecipeById(id);
        if (isMounted && remote) {
          setRecipe(remote);
        }
      } catch (err) {
        console.warn("Lỗi tải món ăn trong CookingMode:", err);
      } finally {
        if (isMounted) setIsLoadingRecipe(false);
      }
    }
    loadRecipe();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const steps = recipe.steps;


  const { updateChefXP } = useAuth();
  const { state: timer, dispatch: dispatchTimer } = useCookingTimer(
    steps.map((step) => cookingStepSeconds(step.timerMinutes)), String(recipe.id || id),
  );
  const currentStepIndex = timer.stepIndex;
  const initialSeconds = timer.initialSeconds;
  const timeLeft = timer.remainingSeconds;
  const isTimerRunning = timer.status === "running";
  const isAutoAdvance = timer.autoEnabled;
  const autoAdvanceDelaySec = timer.delaySeconds;
  const countdownLeftSec = timer.graceSeconds;
  const isCountdownActive = timer.graceDeadlineMs !== null;
  const completedSteps = timer.completedSteps;
  const completionRecordedRef = useRef(false);
  const expiryNotifiedRef = useRef(false);
  useEffect(() => {
    completionRecordedRef.current = false;
  }, [id]);
  const [isVoiceActive, setIsVoiceActive] = useState(false); // Opt-in: do not speak automatically
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState("");

  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const currentStep = steps[currentStepIndex] ?? steps[0];

  // Split detailed step description into distinct clear action items
  const getStepActionBullets = (desc: string): string[] => {
    if (!desc) return [];
    const parts = desc
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);
    return parts.length > 0 ? parts : [desc];
  };

  // Voice settings state - Strictly unified to ONE single voice
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef<boolean>(true);
  const isVoiceActiveRef = useRef<boolean>(false);
  const currentStepIndexRef = useRef<number>(0);

  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(gUnifiedVoiceId);
  const selectedVoiceIdRef = useRef<string>(gUnifiedVoiceId);
  const [speechRate, setSpeechRate] = useState<number>(0.92);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // AI Voice Cooking Companion
  const [showVoiceOverlay, setShowVoiceOverlay] = useState<boolean>(false);

  const cookingVoice = useCookingVoice({
    recipeTitle: recipe.title,
    recipeContext: {
      servings: String(recipe.servings || ""),
      nutrition: recipe.cookingNutrition === undefined ? normalizeCookingNutrition(recipe.nutrition) : recipe.cookingNutrition ?? undefined,
      ingredients: recipe.ingredients.slice(0, 40).map((item) => ({ name: item.name.slice(0, 120), amount: item.amount.slice(0, 100) })),
      steps: steps.slice(0, 30).map((step) => ({
        stepNumber: step.stepNumber, title: step.title.slice(0, 160), description: step.description.slice(0, 1600), timerMinutes: step.timerMinutes,
      })),
    },
    currentStep: {
      stepNumber: steps[currentStepIndex]?.stepNumber || currentStepIndex + 1,
      title: steps[currentStepIndex]?.title || `Bước ${currentStepIndex + 1}`,
      description: steps[currentStepIndex]?.description || "",
    },
    stepTimer: {
      targetMinutes: initialSeconds / 60,
      elapsedSeconds: initialSeconds > 0 ? initialSeconds - timeLeft : 0,
      remainingSeconds: timeLeft,
      isRunning: isTimerRunning,
      isOverdue: timer.status === "expired",
      overdueSeconds: 0,
    },
    selectedVoiceId,
    speechRate,
    onExtendTimer: (seconds: number) => {
      dispatchTimer({ type: "adjust", seconds, resume: true });
      void hapticSuccess();
    },
    onReduceTimer: (seconds: number) => {
      dispatchTimer({ type: "adjust", seconds: -seconds });
      void hapticSuccess();
    },
    onNextStep: () => {
      handleNextStep();
    },
    onPrevStep: () => {
      handlePrevStep();
    },
    onGoToStep: (stepNumber: number) => {
      const index = getCookingStepIndex(steps, stepNumber);
      if (index >= 0 && index !== currentStepIndexRef.current) handleSelectStep(index);
    },
    onRepeatStep: () => {
      speakText(steps[currentStepIndex]?.description || steps[currentStepIndex]?.title || "");
    },
  });

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
    isVoiceActiveRef.current = isVoiceActive;
    selectedVoiceIdRef.current = selectedVoiceId;
  }, [
    autoAdvanceDelaySec,
    currentStepIndex,
    isAutoAdvance,
    isVoiceActive,
    selectedVoiceId,
  ]);

  // Curated Voice Presets with descriptions
  const VOICE_OPTIONS = [
    ...availableVoices.map((voice) => ({
      id: voice.identifier, name: voice.name, desc: "Giọng tiếng Việt trên thiết bị",
      tag: voice.quality === Speech.VoiceQuality.Enhanced ? "Chất lượng cao" : "Thiết bị",
      isHD: voice.quality === Speech.VoiceQuality.Enhanced, gender: "female",
    })),
    { id: "default", name: "Mặc định thiết bị", desc: "Tự chọn giọng tiếng Việt", tag: "Gốc", isHD: false, gender: "female" },
  ];

  const getVoiceDisplayName = (id: string): string => {
    const found = VOICE_OPTIONS.find((v) => v.id === id);
    if (found) return found.name;
    if (id.includes("network")) return "Nữ HD Google";
    if (id === "default") return "Giọng mặc định";
    return "Giọng Tiếng Việt";
  };

  // Discover best Vietnamese HD voice available on device without overriding selected voice
  useEffect(() => {
    async function loadVoices() {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const viVoices = voices.filter(
          (v) =>
            v.language?.toLowerCase().startsWith("vi") ||
            v.name?.toLowerCase().includes("vietnam") ||
            v.identifier?.toLowerCase().includes("vi")
        );
        setAvailableVoices(viVoices);

        // If the current selected voice exists, preserve it completely
        const currentSelected = selectedVoiceIdRef.current;
        const hasCurrent = viVoices.some((v) => v.identifier === currentSelected);
        if (hasCurrent) {
          gUnifiedVoiceId = currentSelected;
          return;
        }

        // High-definition priority list (strictly excluding legacy low-res vi-VN-language)
        const hdPriority = [
          "vi-vn-x-gft-network", // WaveNet Studio
          "vi-vn-x-vie-network", // Female North HD
          "vi-vn-x-vif-network", // Female South HD
          "vi-vn-x-vid-network", // Male HD
          "vi-vn-x-vic-network", // Google Standard HD
        ];

        let chosen: Speech.Voice | undefined;
        for (const pid of hdPriority) {
          chosen = viVoices.find((v) => v.identifier === pid);
          if (chosen) break;
        }

        if (!chosen) {
          chosen = viVoices.find(
            (v) =>
              v.identifier.toLowerCase().includes("network") &&
              v.identifier !== "vi-VN-language"
          );
        }

        if (!chosen) {
          chosen = viVoices.find((v) => v.identifier !== "vi-VN-language");
        }

        const finalVoiceId = chosen ? chosen.identifier : "default";
        setSelectedVoiceId(finalVoiceId);
        selectedVoiceIdRef.current = finalVoiceId;
        gUnifiedVoiceId = finalVoiceId;
      } catch (err) {
        console.log("=== LOAD VOICES ERROR ===", err);
      }
    }
    loadVoices();
  }, []);

  const NUMBER_WORDS: Record<number, string> = {
    1: "một",
    2: "hai",
    3: "ba",
    4: "bốn",
    5: "năm",
    6: "sáu",
    7: "bảy",
    8: "tám",
    9: "chín",
    10: "mười",
  };

  // Advanced phonetic text cleaner - eliminates audio clicks, crackles, and unnatural pauses
  const cleanTextForSpeech = (text: string): string => {
    return text
      // Convert number ranges to words (e.g. 10-15 -> 10 đến 15)
      .replace(/(\d+)\s*[-–—]\s*(\d+)/g, "$1 đến $2")
      // Expand common cooking units into natural Vietnamese words
      .replace(/(\d+)\s*kg\b/gi, "$1 ki lô gam")
      .replace(/(\d+)\s*g\b/gi, "$1 gam")
      .replace(/(\d+)\s*ml\b/gi, "$1 mi li lít")
      .replace(/(\d+)\s*l\b/gi, "$1 lít")
      .replace(/(\d+)\s*tbsp\b/gi, "$1 muỗng canh")
      .replace(/(\d+)\s*tsp\b/gi, "$1 muỗng cà phê")
      .replace(/(\d+)\s*°C\b/gi, "$1 độ C")
      .replace(/(\d+)\s*p\b/gi, "$1 phút")
      .replace(/(\d+)\s*s\b/gi, "$1 giây")
      .replace(/1\/2\b/g, "nửa")
      .replace(/1\/4\b/g, "một phần tư")
      .replace(/~/g, "khoảng ")
      // Replace symbols that make TTS glitch or pop with natural commas
      .replace(/[•★⏱🔥💡🍗🧂🍳✓🎉📸›•"“”«»]/g, " ")
      .replace(/[:;]/g, ", ")
      .replace(/\(([^)]+)\)/g, ", $1, ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Speech Helper - Guaranteed SINGLE synchronized voice, zero overlaps
  const speakText = async (text: string, onFinish?: () => void) => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    try {
      await Speech.stop();
    } catch {}

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      setIsSpeaking(false);
      return;
    }

    let audioOptions: Speech.SpeechOptions;
    try {
      audioOptions = await prepareCookingSpeech(selectedVoiceIdRef.current);
    } catch {
      setIsSpeaking(false);
      Alert.alert("Không phát được giọng đọc", "Hãy kiểm tra âm lượng và thử lại.");
      return;
    }

    // Strictly ONE unified voice across all steps

    const options: Speech.SpeechOptions = {
      ...audioOptions,
      rate: speechRate || 0.92,
      pitch: 1.0,
      onStart: () => setIsSpeaking(true),
      onDone: () => {
        setIsSpeaking(false);
        if (onFinish) {
          onFinish();
        }
      },
      onStopped: () => setIsSpeaking(false),
      onError: (e) => {
        console.log("Speech Error:", e);
        setIsSpeaking(false);
      },
    };

    Speech.speak(clean, options);
  };

  const handleTestVoice = async (voiceId: string, rate: number = speechRate) => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    try {
      await Speech.stop();
    } catch {}
    let audioOptions: Speech.SpeechOptions;
    try {
      audioOptions = await prepareCookingSpeech(voiceId);
    } catch {
      setIsTestingVoice(false);
      Alert.alert("Không phát được giọng đọc", "Hãy kiểm tra âm lượng và thử lại.");
      return;
    }
    setIsTestingVoice(true);

    const testText =
      "Xin chào! Tôi là trợ lý SmartCook. Giọng nói này rất trong trẻo, tự nhiên và đồng bộ một giọng duy nhất!";
    const clean = cleanTextForSpeech(testText);

    const options: Speech.SpeechOptions = {
      ...audioOptions,
      rate: rate || 0.92,
      pitch: 1.0,
      onStart: () => setIsTestingVoice(true),
      onDone: () => setIsTestingVoice(false),
      onStopped: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    };

    Speech.speak(clean, options);
  };

  const stopSpeaking = async () => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    try {
      await Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setIsTestingVoice(false);
  };

  const speakCurrentStep = (stepIdx: number = currentStepIndex) => {
    const s = steps[stepIdx];
    if (!s) return;
    const stepWord = NUMBER_WORDS[s.stepNumber] || String(s.stepNumber);
    const textToSpeak = `Bước ${stepWord}: ${s.title}. ${s.description}`;
    speakText(textToSpeak);
  };

  const readNavigatedStep = useEffectEvent((index: number) => {
    if (cookingVoice.isSpeaking) return;
    if (isVoiceActiveRef.current) {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        void speakCurrentStep(index);
      }, 300);
    } else {
      void stopSpeaking();
    }
  });

  // Reading preferences are sampled on navigation; changing a setting does not restart speech.
  useEffect(() => {
    // Skip speech on initial mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    readNavigatedStep(currentStepIndex);

    return () => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }
    };
  }, [currentStepIndex]);

  // Clean up speech when leaving screen
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const { triggerProactiveCheckIn } = cookingVoice;
  useEffect(() => {
    if (showVoiceOverlay || showIngredientsModal || showVoiceSettingsModal) {
      dispatchTimer({ type: "pauseGrace" });
    }
  }, [showVoiceOverlay, showIngredientsModal, showVoiceSettingsModal, isCountdownActive, dispatchTimer]);

  useEffect(() => {
    if (timer.status !== "expired") {
      expiryNotifiedRef.current = false;
      return;
    }
    if (expiryNotifiedRef.current) return;
    expiryNotifiedRef.current = true;
    void hapticSuccess();
    setShowVoiceOverlay(true);
    void triggerProactiveCheckIn();
  }, [timer.status, currentStepIndex, triggerProactiveCheckIn]);

  const toggleTimer = () => {
    if (timeLeft === 0 || timer.status === "confirmed") {
      dispatchTimer({ type: "pauseGrace" });
      Alert.alert("Chọn thời gian nấu", "Bấm +30s, +1p hoặc +5p để đặt thêm thời gian, hoặc xác nhận đã xong bước.");
      return;
    }
    dispatchTimer({ type: "toggle" });
  };

  const resetTimer = () => dispatchTimer({ type: "reset" });
  const adjustTime = (seconds: number) => dispatchTimer({ type: "adjust", seconds });

  const navigateToStep = (index: number, completeCurrent = false) => {
    if (index < 0 || index >= steps.length || index === currentStepIndex) return;
    if (!cookingVoice.isSpeaking) {
      void stopSpeaking();
    }
    dispatchTimer({ type: "navigate", index, fromIndex: currentStepIndex, completeCurrent });
    void hapticLightImpact();
  };

  const handleConfirmStep = () => {
    if (isAutoAdvance && currentStepIndex < steps.length - 1 && timer.status !== "confirmed") {
      void stopSpeaking();
      dispatchTimer({ type: "confirm" });
      void hapticSuccess();
    } else {
      handleNextStep();
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      navigateToStep(currentStepIndex + 1, true);
    } else {
      if (completionRecordedRef.current) return;
      completionRecordedRef.current = true;
      void stopSpeaking();
      dispatchTimer({ type: "confirm" });
      void hapticSuccess();
      if (isVoiceActive) {
        speakText("Chúc mừng bạn đã hoàn thành xuất sắc món ăn! Bữa cơm đã sẵn sàng!");
      }
      setShowCelebration(true);

      // Ghi nhận lịch sử nấu ăn và nhận +50 XP
      const recipeImageUri =
        typeof recipe.image === "string"
          ? recipe.image
          : (recipe.image as any)?.uri || undefined;

      CookingHistoryService.recordCooking({
        recipeId: recipe.id || (recipe as any)._id || "1",
        recipeName: recipe.title,
        image: recipeImageUri,
        durationMinutes: recipe.minutes || 25,
        servings: typeof recipe.servings === "number" ? recipe.servings : 2,
        calories: recipe.calories || 450,
        usedIngredients: recipe.ingredients.map((ing) => ing.name),
      })
        .then((result) => {
          if (result) {
            setLeveledUp(result.leveledUp);
            setNewLevel(result.level);
            updateChefXP(result.chefExp, result.level);
          }
        })
        .catch((err) => {
          console.warn("Lỗi ghi nhận hoàn thành món:", err);
        });
    }
  };

  const handlePrevStep = () => navigateToStep(currentStepIndex - 1);
  const handleSelectStep = (idx: number) => navigateToStep(idx);

  const toggleIngredientCheck = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const timerElapsedPercent =
    initialSeconds > 0
      ? Math.min(100, Math.max(0, ((initialSeconds - timeLeft) / initialSeconds) * 100))
      : 0;

  const totalProgressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  // Tailored culinary chef tips for each step
  const getChefTip = () => {
    if (currentStep.tip) return currentStep.tip;
    if (currentStepIndex === 0) {
      return "Thấm thật khô da thực phẩm trước khi chế biến để giòn ngon, không bắn dầu.";
    }
    if (currentStepIndex === 1) {
      return "Hạ lửa vừa và đảo đều tay để gia vị thấm sâu vào từng thớ thịt.";
    }
    if (currentStepIndex === 2) {
      return "Đậy nắp chảo khoảng 30s ở lửa nhỏ để chín đều mà vẫn giữ độ ẩm.";
    }
    return "Trình bày món ăn khi còn nóng sốt, rắc thêm chút tiêu hoặc hành lá.";
  };

  // Match ingredients for step
  const currentStepIngredients = recipe.ingredients.filter((ing, idx) => {
    const normStep = (currentStep.title + " " + currentStep.description).toLowerCase();
    const normIng = ing.name.toLowerCase();
    const words = normIng.split(" ");
    return (
      normStep.includes(normIng) ||
      words.some((w) => w.length > 2 && normStep.includes(w)) ||
      (currentStepIndex === 0 && idx === 0)
    );
  });

  const displayStepIngredients =
    currentStepIngredients.length > 0 ? currentStepIngredients : recipe.ingredients.slice(0, 1);

  if (isLoadingRecipe) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#64748B" }}>
          Đang nạp công thức nấu ăn...
        </Text>
      </View>
    );
  }

  const dishImageSource =
    typeof recipe.image === "string"
      ? { uri: recipe.image }
      : recipe.image || require("@/assets/images/hero-teriyaki-bowl.jpg");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* 1. COMPACT TOP HEADER */}
      <View style={styles.topHeaderBar}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            stopSpeaking();
            router.back();
          }}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={17} color="#334155" />
        </TouchableOpacity>

        {/* Center Dish Card */}
        <View style={styles.dishPillCard}>
          <Image source={dishImageSource} style={styles.dishThumbnail} resizeMode="cover" />
          <View style={styles.dishPillInfo}>
            <Text style={styles.dishPillTitle} numberOfLines={1}>
              {recipe.title}
            </Text>
            <View style={styles.dishStepMetaRow}>
              <Text style={styles.dishStepProgressText}>
                Bước {currentStepIndex + 1}/{steps.length}
              </Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>
                  {Math.round(totalProgressPercent)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Voice Assistant Toggle */}
        <TouchableOpacity
          style={[
            styles.voiceToggleBtn,
            isVoiceActive && styles.voiceToggleBtnActive,
            isSpeaking && styles.voiceToggleBtnSpeaking,
          ]}
          onPress={() => {
            if (isSpeaking) {
              stopSpeaking();
            } else if (isVoiceActive) {
              setIsVoiceActive(false);
              isVoiceActiveRef.current = false;
              stopSpeaking();
              dispatchTimer({ type: "pauseGrace" });
            } else {
              setIsVoiceActive(true);
              isVoiceActiveRef.current = true;
              speakCurrentStep(currentStepIndex);
            }
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isSpeaking ? "volume-high" : isVoiceActive ? "volume-medium" : "volume-mute"}
            size={16}
            color={isSpeaking ? "#10B981" : isVoiceActive ? "#EA580C" : "#94A3B8"}
          />
          {isSpeaking && <View style={styles.voiceSpeakingDot} />}
        </TouchableOpacity>
      </View>

      {/* 2. SLIM STEP PROGRESS BAR */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={["#FF5722", "#FF7043"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressGradientFill, { width: `${totalProgressPercent}%` }]}
        />
      </View>

      {/* 3. SLIM STEPPER STRIP */}
      <View style={styles.stepStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepStripContent}
        >
          {steps.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = completedSteps[idx];

            return (
              <TouchableOpacity
                key={s.stepNumber}
                style={[
                  styles.stepperChip,
                  isActive && styles.stepperChipActive,
                  isDone && !isActive && styles.stepperChipDone,
                ]}
                onPress={() => handleSelectStep(idx)}
                activeOpacity={0.8}
              >
                {isDone && !isActive ? (
                  <Ionicons name="checkmark" size={12} color="#16A34A" />
                ) : (
                  <View
                    style={[
                      styles.stepperDot,
                      isActive && styles.stepperDotActive,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.stepperText,
                    isActive && styles.stepperTextActive,
                    isDone && !isActive && styles.stepperTextDone,
                  ]}
                >
                  Bước {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. COMPACT MAIN CONTENT AREA */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[
          styles.mainScrollContent,
          { paddingBottom: insets.bottom + 76 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO STEP INSTRUCTION CARD */}
        <View style={styles.heroStepCard}>
          {/* Top Meta Tags */}
          <View style={styles.stepCardMetaRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberBadgeText}>BƯỚC {currentStep.stepNumber}</Text>
            </View>

            <View style={styles.stepMetaRight}>
              <View style={styles.timeTag}>
                <Ionicons name="time-outline" size={12} color="#64748B" />
                <Text style={styles.timeTagText}>
                  {currentStep.timerMinutes ? `${currentStep.timerMinutes} phút` : "3 phút"}
                </Text>
              </View>

              <View style={styles.heatTag}>
                <Ionicons name="flame" size={11} color="#EA580C" />
                <Text style={styles.heatTagText}>Lửa vừa</Text>
              </View>
            </View>
          </View>

          {/* Step Title */}
          <Text style={styles.stepTitleText}>{currentStep.title}</Text>

          {/* Detailed Step Action List */}
          <View style={styles.stepDetailedActionsWrap}>
            {getStepActionBullets(currentStep.description).map((actionText, idx) => (
              <View key={idx} style={styles.stepActionItemRow}>
                <View style={styles.stepActionNumberCircle}>
                  <Text style={styles.stepActionNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepActionItemText}>{actionText}</Text>
              </View>
            ))}
          </View>

          {/* Step Ingredients List (Wrap enabled, no overlapping!) */}
          {displayStepIngredients.length > 0 && (
            <View style={styles.stepIngredientsSection}>
              <View style={styles.stepIngSectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="basket-outline" size={12} color="#059669" />
                  <Text style={styles.stepIngSectionTitle}>Nguyên liệu cho bước này:</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowIngredientsModal(true)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.allIngredientsLinkText}>
                    Tất cả ({recipe.ingredients.length}) ›
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ingredientChipsWrap}>
                {displayStepIngredients.map((ing, idx) => (
                  <View key={idx} style={styles.compactIngChip}>
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text style={styles.compactIngName}>
                      {ing.name}{" "}
                      {ing.amount ? (
                        <Text style={styles.compactIngAmount}>({ing.amount})</Text>
                      ) : null}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Compact Chef Pro Tip */}
          <View style={styles.compactChefTipRow}>
            <Ionicons name="bulb" size={13} color="#D97706" style={{ marginTop: 1 }} />
            <Text style={styles.compactChefTipText}>
              <Text style={{ fontWeight: "700", color: "#92400E" }}>Mẹo bếp: </Text>
              {getChefTip()}
            </Text>
          </View>
        </View>

        {/* ==================================================== */}
        {/* 5. ULTRA-COMPACT SMART TIMER WIDGET (DEFAULT 00:00)  */}
        {/* ==================================================== */}
        <View style={styles.compactTimerBox}>
          {/* Top Info: Clock & Status */}
          <View style={styles.timerHeaderInline}>
            <View style={styles.timerTitleInline}>
              <View
                style={[
                  styles.timerMiniIconCircle,
                  isTimerRunning && styles.timerMiniIconCircleActive,
                ]}
              >
                <Ionicons
                  name={isTimerRunning ? "hourglass" : "timer-outline"}
                  size={13}
                  color={isTimerRunning ? "#FFFFFF" : "#EA580C"}
                />
              </View>
              <Text style={styles.timerInlineTitle}>Hẹn giờ nấu</Text>
            </View>

            {/* Digital Clock (defaults to 00:00) */}
            <Text
              style={[
                styles.compactClockDigits,
                isTimerRunning && styles.compactClockDigitsRunning,
                timeLeft === 0 && styles.compactClockDigitsDone,
              ]}
            >
              {formatTime(timeLeft)}
            </Text>

            {/* Status Pill */}
            <View
              style={[
                styles.timerMiniStatusBadge,
                isTimerRunning && styles.timerMiniStatusBadgeRunning,
                timeLeft === 0 && styles.timerMiniStatusBadgeDone,
              ]}
            >
              <Text
                style={[
                  styles.timerMiniStatusText,
                  isTimerRunning && styles.timerMiniStatusTextRunning,
                  timeLeft === 0 && styles.timerMiniStatusTextDone,
                ]}
              >
                {timer.status === "expired" ? "Hết giờ"
                  : timer.status === "confirmed" ? "Đã xong"
                  : isTimerRunning ? "Đang đếm"
                  : timer.status === "paused" ? "Tạm dừng" : "Chờ bấm"}
              </Text>
            </View>
          </View>

          {/* Micro Progress Bar */}
          <View style={styles.timerMicroTrack}>
            <View
              style={[
                styles.timerMicroFill,
                { width: `${timerElapsedPercent}%` },
                timeLeft === 0 && { backgroundColor: "#CBD5E1" },
              ]}
            />
          </View>

          {/* Action Controls Row */}
          <View style={styles.timerControlsInlineRow}>
            {/* Play/Pause Button */}
            <TouchableOpacity
              style={styles.mainActionBtnCompact}
              onPress={toggleTimer}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isTimerRunning
                    ? ["#059669", "#10B981"]
                    : ["#FF5722", "#FF7043"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainActionBtnGradient}
              >
                <Ionicons
                  name={isTimerRunning ? "pause" : "play"}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.mainActionBtnText}>
                  {isTimerRunning ? "Tạm dừng" : timer.status === "paused" ? "Tiếp tục" : "Bắt đầu"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* +30s */}
            <TouchableOpacity
              style={styles.quickChipBtn}
              onPress={() => adjustTime(30)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+30s</Text>
            </TouchableOpacity>

            {/* +1p */}
            <TouchableOpacity
              style={styles.quickChipBtn}
              onPress={() => adjustTime(60)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+1p</Text>
            </TouchableOpacity>

            {/* +5p */}
            <TouchableOpacity
              style={styles.quickChipBtn}
              onPress={() => adjustTime(300)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+5p</Text>
            </TouchableOpacity>

            {/* Reset to this step's recipe duration */}
            <TouchableOpacity
              style={styles.quickChipBtn}
              onPress={resetTimer}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={13} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.timerHelpText} accessibilityLiveRegion="polite">
            {timer.status === "expired"
              ? "Hết giờ dự kiến. Kiểm tra món ăn, thêm thời gian nếu cần hoặc xác nhận đã xong bước."
              : timer.status === "confirmed"
              ? "Bạn đã xác nhận xong bước. Thêm thời gian sẽ hủy chuyển bước."
              : initialSeconds === 0
              ? "Bước này chưa có thời lượng. Chọn thêm thời gian hoặc xác nhận khi làm xong."
              : "Thời gian dự kiến theo công thức. Chỉ chuyển tự động sau khi bạn xác nhận đã xong."}
          </Text>
        </View>

        {/* ==================================================== */}
        {/* 6. MINIMALIST VOICE ASSISTANT (OPT-IN, ZERO CLUTTER) */}
        {/* ==================================================== */}
        <View style={[styles.autoVoiceCard, isSpeaking && styles.autoVoiceCardSpeaking]}>
          {/* Header Row */}
          <View style={styles.autoVoiceHeaderRow}>
            <View style={styles.autoVoiceLeftTitle}>
              <View
                style={[
                  styles.autoVoiceMicBadge,
                  (isSpeaking || isAutoAdvance) && styles.autoVoiceMicBadgeActive,
                ]}
              >
                <Ionicons
                  name={isSpeaking ? "volume-high" : isAutoAdvance ? "time" : "mic-outline"}
                  size={13}
                  color={isSpeaking || isAutoAdvance ? "#FFFFFF" : "#059669"}
                />
              </View>
              <View>
                <Text style={styles.autoVoiceMainTitle}>Trợ lý giọng nói</Text>
                <Text style={styles.autoVoiceSubStatus}>
                  {isSpeaking
                    ? "Đang đọc hướng dẫn..."
                    : isAutoAdvance
                    ? "Tự chuyển sau khi xác nhận xong"
                    : "Chế độ: Đang tắt"}
                </Text>
              </View>
            </View>

            {/* Voice Settings Pill */}
            <TouchableOpacity
              style={styles.voiceConfigPillCompact}
              onPress={() => setShowVoiceSettingsModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="sparkles" size={10} color="#059669" />
              <Text style={styles.voiceConfigNameCompact} numberOfLines={1}>
                {getVoiceDisplayName(selectedVoiceId)}
              </Text>
              <Ionicons name="settings-outline" size={11} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* State 1: When Auto-Advance is OFF - Compact Action Row */}
          {!isAutoAdvance ? (
            <View style={styles.voiceOffActionsRow}>
              <TouchableOpacity
                style={styles.primaryAutoStartBtn}
                onPress={() => {
                  setIsVoiceActive(true);
                  dispatchTimer({ type: "auto", enabled: true });
                  isVoiceActiveRef.current = true;
                  speakCurrentStep(currentStepIndex);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#059669", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryAutoStartGradient}
                >
                  <Ionicons name="flash" size={13} color="#FFFFFF" />
                  <Text style={styles.primaryAutoStartText}>Bật tự động đọc các bước</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.singleStepReadBtn}
                onPress={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    speakCurrentStep(currentStepIndex);
                  }
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSpeaking ? "stop-circle" : "volume-medium"}
                  size={14}
                  color="#EA580C"
                />
                <Text style={styles.singleStepReadText}>
                  {isSpeaking ? "Dừng" : "Đọc bước này"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* State 2: When Auto-Advance is ON - Live Countdown Controls */
            <View style={styles.autoAdvanceActiveContainer}>
              <View style={styles.autoCountdownRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                  <Text style={styles.autoCountdownLabel}>
                    {isSpeaking
                      ? "🔊 Đang đọc..."
                      : isCountdownActive
                      ? `⏳ Qua Bước ${currentStepIndex + 2} sau:`
                      : timer.status === "confirmed"
                      ? "⏸ Đã dừng chuyển:"
                      : timer.status === "expired" ? "Chờ xác nhận xong bước"
                      : "Chờ bạn làm xong bước"}
                  </Text>
                  {!isSpeaking && timer.status === "confirmed" && (
                    <Text style={styles.autoCountdownTime}>
                      {formatTime(countdownLeftSec)}
                    </Text>
                  )}
                </View>

                {/* Pause / Resume / Skip / Turn Off */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {!isSpeaking && timer.status === "confirmed" && currentStepIndex < steps.length - 1 && (
                    <TouchableOpacity
                      style={styles.pauseCountdownBtn}
                      onPress={() => dispatchTimer({ type: "toggleGrace" })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isCountdownActive ? "pause" : "play"}
                        size={11}
                        color="#059669"
                      />
                      <Text style={styles.pauseCountdownBtnText}>
                        {isCountdownActive ? "Dừng" : "Tiếp tục"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.skipNowBtn}
                    onPress={handleNextStep}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipNowBtnText}>Qua ngay ›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.turnOffAutoPill}
                    onPress={() => {
                      dispatchTimer({ type: "auto", enabled: false });
                      setIsVoiceActive(false);
                      isVoiceActiveRef.current = false;
                      dispatchTimer({ type: "pauseGrace" });
                      stopSpeaking();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={12} color="#EF4444" />
                    <Text style={styles.turnOffAutoText}>Tắt</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Countdown Micro Progress */}
              {isCountdownActive && autoAdvanceDelaySec > 0 && (
                <View style={styles.autoProgressTrack}>
                  <View
                    style={[
                      styles.autoProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((autoAdvanceDelaySec - countdownLeftSec) /
                              autoAdvanceDelaySec) *
                              100
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Delay Interval Setup Chips */}
              <View style={styles.delayIntervalRow}>
                <Text style={styles.delayIntervalLabel}>Sau xác nhận:</Text>
                {[
                  { label: "15s", sec: 15 },
                  { label: "30s", sec: 30 },
                  { label: "1 phút", sec: 60 },
                  { label: "2 phút", sec: 120 },
                ].map((item, idx) => {
                  const isSelected = autoAdvanceDelaySec === item.sec;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.intervalChip,
                        isSelected && styles.intervalChipSelected,
                      ]}
                      onPress={() => {
                        dispatchTimer({ type: "delay", seconds: item.sec });
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.intervalChipText,
                          isSelected && styles.intervalChipTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* 7. COMPACT BOTTOM NAVIGATION BAR                     */}
      {/* ==================================================== */}
      <View
        style={[
          styles.compactBottomBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.compactPrevBtn,
            currentStepIndex === 0 && styles.compactPrevBtnDisabled,
          ]}
          onPress={handlePrevStep}
          disabled={currentStepIndex === 0}
          activeOpacity={0.75}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={currentStepIndex === 0 ? "#CBD5E1" : "#475569"}
          />
          <Text
            style={[
              styles.compactPrevBtnText,
              currentStepIndex === 0 && { color: "#CBD5E1" },
            ]}
          >
            Bước trước
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.compactNextBtn}
          onPress={handleConfirmStep}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={
              currentStepIndex === steps.length - 1
                ? ["#059669", "#10B981"]
                : ["#FF5722", "#FF7043"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.compactNextGradient}
          >
            <Text style={styles.compactNextText}>
              {currentStepIndex === steps.length - 1
                ? "Hoàn thành 🎉"
                : timer.status === "confirmed" ? "Qua ngay"
                : "Đã xong bước này"}
            </Text>
            <Ionicons
              name={
                currentStepIndex === steps.length - 1
                  ? "checkmark-circle"
                  : "chevron-forward"
              }
              size={16}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ==================================================== */}
      {/* 8. INGREDIENTS CHECKLIST DRAWER MODAL                */}
      {/* ==================================================== */}
      <Modal
        visible={showIngredientsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIngredientsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetCard, { maxHeight: "80%" }]}>
            <View style={styles.sheetHandleBar} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>Nguyên liệu cần dùng</Text>
                <Text style={styles.modalHeaderSub}>
                  {recipe.title} • {recipe.servings}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowIngredientsModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients[idx] ?? ing.inFridge;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.checklistRow,
                      isChecked && styles.checklistRowChecked,
                    ]}
                    onPress={() => toggleIngredientCheck(idx)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.checklistCheckbox,
                        isChecked && styles.checklistCheckboxChecked,
                      ]}
                    >
                      {isChecked && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                    </View>

                    <Text
                      style={[
                        styles.checklistIngredientName,
                        isChecked && styles.checklistIngredientNameChecked,
                      ]}
                    >
                      {ing.name}
                    </Text>

                    <Text style={styles.checklistIngredientAmount}>{ing.amount}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setShowIngredientsModal(false)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#FF5722", "#FF7043"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalDismissGradient}
              >
                <Text style={styles.modalDismissBtnText}>Đã rõ, tiếp tục nấu</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* 9. CELEBRATION MODAL                                 */}
      {/* ==================================================== */}
      <Modal
        visible={showCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCelebration(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationTrophyBox}>
              <MaterialCommunityIcons name="trophy" size={38} color="#D97706" />
            </View>

            <Text style={styles.celebrationTitle}>Nấu ăn hoàn tất! 🎉</Text>
            <Text style={styles.celebrationSubtitle}>
              Chúc mừng bạn đã hoàn thành món ăn:
            </Text>

            <View style={styles.celebrationDishPreview}>
              <Image
                source={recipe.image}
                style={styles.celebrationDishImage}
                resizeMode="cover"
              />
              <Text style={styles.celebrationDishName} numberOfLines={1}>
                {recipe.title}
              </Text>
            </View>

            <View style={styles.celebrationStatsGrid}>
              <View style={styles.celebStatCol}>
                <Text style={styles.celebStatVal}>{recipe.minutes}p</Text>
                <Text style={styles.celebStatLbl}>Thời gian</Text>
              </View>
              <View style={styles.celebStatDivider} />
              <View style={styles.celebStatCol}>
                <Text style={styles.celebStatVal}>{recipe.calories}</Text>
                <Text style={styles.celebStatLbl}>Calories</Text>
              </View>
              <View style={styles.celebStatDivider} />
              <View style={styles.celebStatCol}>
                <Text style={styles.celebStatVal}>+50 XP</Text>
                <Text style={styles.celebStatLbl}>Đầu bếp</Text>
              </View>
            </View>

            {leveledUp && (
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  borderWidth: 1,
                  borderColor: "#FCD34D",
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  marginBottom: 14,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    color: "#B45309",
                    fontWeight: "700",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  🎖️ THĂNG HẠNG: Chúc mừng bạn đã lên cấp “{newLevel}”!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.celebShareBtn}
              onPress={() =>
                Alert.alert(
                  "Chia sẻ thành phẩm 📸",
                  `Bạn đã lưu hình ảnh món "${recipe.title}" vào bộ sưu tập nấu ăn!`
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={16} color="#EA580C" />
              <Text style={styles.celebShareBtnText}>Chụp ảnh thành phẩm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.celebHomeBtn}
              onPress={() => {
                setShowCelebration(false);
                router.replace("/home");
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#FF5722", "#FF7043"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.celebHomeBtnGradient}
              >
                <Text style={styles.celebHomeBtnText}>Trở về Trang chủ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* 10. VOICE QUALITY & SETTINGS MODAL                   */}
      {/* ==================================================== */}
      <Modal
        visible={showVoiceSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopSpeaking();
          setShowVoiceSettingsModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetCard, { maxHeight: "88%" }]}>
            <View style={styles.sheetHandleBar} />

            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.modalHeaderTitle}>Cải thiện giọng nói</Text>
                  <View style={styles.voiceHdBadge}>
                    <Text style={styles.voiceHdBadgeText}>HD CHỐNG RÈ</Text>
                  </View>
                </View>
                <Text style={styles.modalHeaderSub}>
                  Lựa chọn giọng đọc AI chuẩn WaveNet & tốc độ mượt mà
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  stopSpeaking();
                  setShowVoiceSettingsModal(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quality Note Callout */}
            <View style={styles.voiceCalloutBox}>
              <Ionicons name="sparkles" size={14} color="#059669" style={{ marginTop: 2 }} />
              <Text style={styles.voiceCalloutText}>
                SmartCook đã tối ưu bộ lọc âm PCM và chọn lọc giọng đọc trực tuyến Google HD Network để loại bỏ hoàn toàn hiện tượng rè, méo hoặc giật cục.
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 370 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {/* Section 1: Voice Options */}
              <Text style={styles.voiceSectionTitle}>CHỌN GIỌNG ĐỌC TIẾNG VIỆT (HD)</Text>
              <View style={styles.voiceListWrap}>
                {VOICE_OPTIONS.map((opt) => {
                  const isSelected = selectedVoiceId === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.voiceOptionCard,
                        isSelected && styles.voiceOptionCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedVoiceId(opt.id);
                        selectedVoiceIdRef.current = opt.id;
                        gUnifiedVoiceId = opt.id;
                        handleTestVoice(opt.id, speechRate);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.voiceOptionRadio}>
                        {isSelected ? (
                          <View style={styles.voiceRadioDotActive} />
                        ) : (
                          <View style={styles.voiceRadioDotInactive} />
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 9 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            style={[
                              styles.voiceOptionName,
                              isSelected && styles.voiceOptionNameSelected,
                            ]}
                          >
                            {opt.name}
                          </Text>
                          <View
                            style={[
                              styles.voiceTagBadge,
                              opt.isHD ? styles.voiceTagBadgeHD : styles.voiceTagBadgeDefault,
                            ]}
                          >
                            <Text
                              style={[
                                styles.voiceTagBadgeText,
                                opt.isHD
                                  ? styles.voiceTagBadgeTextHD
                                  : styles.voiceTagBadgeTextDefault,
                              ]}
                            >
                              {opt.tag}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.voiceOptionDesc}>{opt.desc}</Text>
                      </View>

                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#059669" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 2: Speech Rate */}
              <Text style={[styles.voiceSectionTitle, { marginTop: 14 }]}>
                TỐC ĐỘ ĐỌC HƯỚNG DẪN
              </Text>
              <View style={styles.speedRow}>
                {[
                  { label: "0.85x Chậm rãi", val: 0.85 },
                  { label: "0.92x Tự nhiên ⭐", val: 0.92 },
                  { label: "1.0x Tiêu chuẩn", val: 1.0 },
                ].map((item, idx) => {
                  const isSpeedSelected = speechRate === item.val;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.speedPill,
                        isSpeedSelected && styles.speedPillSelected,
                      ]}
                      onPress={() => {
                        setSpeechRate(item.val);
                        handleTestVoice(selectedVoiceId, item.val);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.speedPillText,
                          isSpeedSelected && styles.speedPillTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 3: Listen Sample Preview */}
              <TouchableOpacity
                style={[
                  styles.previewTestBtn,
                  isTestingVoice && styles.previewTestBtnActive,
                ]}
                onPress={() => {
                  if (isTestingVoice) {
                    stopSpeaking();
                  } else {
                    handleTestVoice(selectedVoiceId, speechRate);
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isTestingVoice ? "stop-circle" : "volume-medium"}
                  size={16}
                  color={isTestingVoice ? "#FFFFFF" : "#059669"}
                />
                <Text
                  style={[
                    styles.previewTestBtnText,
                    isTestingVoice && styles.previewTestBtnTextActive,
                  ]}
                >
                  {isTestingVoice ? "Dừng nghe thử" : "Nghe thử mẫu giọng này"}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Bottom Done Button */}
            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => {
                stopSpeaking();
                setShowVoiceSettingsModal(false);
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#059669", "#10B981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalDismissGradient}
              >
                <Text style={styles.modalDismissBtnText}>✓ Lưu & Áp dụng ngay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating AI Cooking Companion Button */}
      {!showVoiceOverlay && (
        <TouchableOpacity
          style={styles.floatingAiVoiceBtn}
          onPress={() => {
            setShowVoiceOverlay(true);
            cookingVoice.startListening();
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.floatingAiVoiceGradient}
          >
            <Ionicons name="mic" size={18} color="#FFFFFF" />
            <Text style={styles.floatingAiVoiceText}>Trợ lý AI</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Real-time Cooking Voice Assistant Overlay */}
      <CookingVoiceOverlay
        isVisible={showVoiceOverlay}
        isListening={cookingVoice.isListening}
        isThinking={cookingVoice.isThinking}
        isSpeaking={cookingVoice.isSpeaking}
        transcript={cookingVoice.transcript}
        aiReply={cookingVoice.aiReply}
        lastAction={cookingVoice.lastAction}
        quickReplies={cookingVoice.quickReplies}
        errorMessage={cookingVoice.errorMessage}
        onMicPress={() => {
          if (cookingVoice.isListening) {
            cookingVoice.stopListening();
          } else {
            cookingVoice.startListening();
          }
        }}
        onClose={() => {
          cookingVoice.cancelListening();
          setShowVoiceOverlay(false);
        }}
        onQuickReplySelect={(reply) => {
          cookingVoice.processVoiceInput(reply);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  timerHelpText: { fontSize: 12, color: "#64748B", lineHeight: 18, marginTop: 10 },
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* 1. Header Bar (Compact) */
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dishPillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dishThumbnail: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  dishPillInfo: {
    flex: 1,
  },
  dishPillTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  dishStepMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dishStepProgressText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  percentBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  percentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EA580C",
  },
  voiceToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  voiceToggleBtnActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  voiceToggleBtnSpeaking: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  voiceSpeakingDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },

  /* 2. Progress Track */
  progressTrack: {
    height: 2.5,
    backgroundColor: "#E2E8F0",
    width: "100%",
  },
  progressGradientFill: {
    height: "100%",
  },

  /* 3. Stepper Strip */
  stepStripContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepStripContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  stepperChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepperChipActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  stepperChipDone: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  stepperDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#94A3B8",
  },
  stepperDotActive: {
    backgroundColor: "#EA580C",
  },
  stepperText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  stepperTextActive: {
    color: "#EA580C",
    fontWeight: "800",
  },
  stepperTextDone: {
    color: "#15803D",
    fontWeight: "700",
  },

  /* 4. Main Scroll Content */
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },

  /* Hero Step Card (Compact) */
  heroStepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stepCardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stepNumberBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  stepNumberBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 0.5,
  },
  stepMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  timeTagText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  heatTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  heatTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  stepTitleText: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 8,
  },
  stepDetailedActionsWrap: {
    gap: 7,
    marginBottom: 10,
  },
  stepActionItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepActionNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepActionNumberText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  stepActionItemText: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
    lineHeight: 18,
  },

  /* Step Ingredients Box (Wrap Enabled) */
  stepIngredientsSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  stepIngSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  stepIngSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  allIngredientsLinkText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  ingredientChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  compactIngChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactIngName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  compactIngAmount: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },

  /* Compact Chef Tip Row */
  compactChefTipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  compactChefTipText: {
    fontSize: 11.5,
    color: "#78350F",
    lineHeight: 16,
    flex: 1,
  },

  /* 5. Ultra-Compact Smart Timer Box */
  compactTimerBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  timerHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  timerTitleInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerMiniIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },
  timerMiniIconCircleActive: {
    backgroundColor: "#EA580C",
  },
  timerInlineTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
  },
  compactClockDigits: {
    fontSize: 22,
    fontWeight: "900",
    color: "#EA580C",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  compactClockDigitsRunning: {
    color: "#EA580C",
  },
  compactClockDigitsDone: {
    color: "#10B981",
  },
  timerMiniStatusBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  timerMiniStatusBadgeRunning: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  timerMiniStatusBadgeDone: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  timerMiniStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  timerMiniStatusTextRunning: {
    color: "#EA580C",
  },
  timerMiniStatusTextDone: {
    color: "#059669",
  },
  timerMicroTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#FFEDD5",
    overflow: "hidden",
    marginBottom: 8,
  },
  timerMicroFill: {
    height: "100%",
    backgroundColor: "#EA580C",
    borderRadius: 2,
  },
  timerControlsInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mainActionBtnCompact: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    overflow: "hidden",
  },
  mainActionBtnGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  mainActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  quickChipBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#FED7AA",
    justifyContent: "center",
    alignItems: "center",
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C2410C",
  },

  /* 6. SmartCook Hands-free Auto-Advance Voice Bar */
  autoVoiceCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 7,
  },
  autoVoiceCardSpeaking: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  autoVoiceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  autoVoiceLeftTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  autoVoiceMicBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  autoVoiceMicBadgeActive: {
    backgroundColor: "#10B981",
  },
  autoVoiceMainTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#065F46",
  },
  autoVoiceSubStatus: {
    fontSize: 10,
    color: "#047857",
    fontWeight: "600",
    marginTop: 1,
  },
  voiceConfigPillCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  voiceConfigNameCompact: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#047857",
    maxWidth: 110,
  },

  /* State 1: When Auto-advance is OFF */
  voiceOffActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 2,
  },
  primaryAutoStartBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
  },
  primaryAutoStartGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  primaryAutoStartText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  singleStepReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  singleStepReadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },

  /* State 2: When Auto-advance is Active */
  autoAdvanceActiveContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    gap: 6,
  },
  autoCountdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  autoCountdownLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  autoCountdownTime: {
    fontSize: 13,
    fontWeight: "900",
    color: "#EA580C",
    fontVariant: ["tabular-nums"],
  },
  pauseCountdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pauseCountdownBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  skipNowBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  skipNowBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  turnOffAutoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  turnOffAutoText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  autoProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  autoProgressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 1.5,
  },
  delayIntervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  delayIntervalLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginRight: 2,
  },
  intervalChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  intervalChipSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  intervalChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  intervalChipTextSelected: {
    color: "#059669",
    fontWeight: "800",
  },

  /* 7. Bottom Navigation Bar */
  compactBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  compactPrevBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactPrevBtnDisabled: {
    opacity: 0.45,
  },
  compactPrevBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  compactNextBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  compactNextGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  compactNextText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },

  /* 8. Ingredients Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetHandleBar: {
    width: 36,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalHeaderSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  checklistRowChecked: {
    opacity: 0.65,
  },
  checklistCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checklistCheckboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checklistIngredientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  checklistIngredientNameChecked: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  checklistIngredientAmount: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  modalDismissBtn: {
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 12,
  },
  modalDismissGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDismissBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* 9. Celebration Modal */
  celebrationCard: {
    marginHorizontal: 16,
    marginBottom: "auto",
    marginTop: "auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  celebrationTrophyBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 3,
  },
  celebrationSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 12,
  },
  celebrationDishPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    width: "100%",
    marginBottom: 12,
  },
  celebrationDishImage: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  celebrationDishName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A3412",
    flex: 1,
  },
  celebrationStatsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  celebStatCol: {
    alignItems: "center",
    flex: 1,
  },
  celebStatVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  celebStatLbl: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "600",
  },
  celebStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  celebShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 38,
    width: "100%",
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 8,
  },
  celebShareBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EA580C",
  },
  celebHomeBtn: {
    height: 40,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  celebHomeBtnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  celebHomeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Voice Quality Bar inside autoVoiceCard */
  voiceConfigBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  voiceConfigPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  voiceConfigDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  voiceConfigName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
    flex: 1,
  },
  voiceQuickTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  voiceQuickTestBtnActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  voiceQuickTestText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  voiceQuickTestTextActive: {
    color: "#FFFFFF",
  },

  /* Voice Settings Modal Styles */
  voiceHdBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  voiceHdBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  voiceCalloutBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: 10,
  },
  voiceCalloutText: {
    fontSize: 11,
    color: "#065F46",
    lineHeight: 15,
    flex: 1,
  },
  voiceSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  voiceListWrap: {
    gap: 6,
  },
  voiceOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    padding: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  voiceOptionCardSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  voiceOptionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceRadioDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  voiceRadioDotInactive: {
    width: 0,
    height: 0,
  },
  voiceOptionName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  voiceOptionNameSelected: {
    color: "#065F46",
    fontWeight: "800",
  },
  voiceTagBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  voiceTagBadgeHD: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  voiceTagBadgeDefault: {
    backgroundColor: "#F1F5F9",
  },
  voiceTagBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  voiceTagBadgeTextHD: {
    color: "#059669",
  },
  voiceTagBadgeTextDefault: {
    color: "#64748B",
  },
  voiceOptionDesc: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },
  speedRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  speedPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  speedPillSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  speedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  speedPillTextSelected: {
    color: "#059669",
    fontWeight: "800",
  },
  previewTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 6,
  },
  previewTestBtnActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  previewTestBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  previewTestBtnTextActive: {
    color: "#FFFFFF",
  },
  floatingAiVoiceBtn: {
    position: "absolute",
    bottom: 84,
    right: 16,
    borderRadius: 24,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  floatingAiVoiceGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  floatingAiVoiceText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
