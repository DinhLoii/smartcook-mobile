import { useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import {
  aiService,
  CookingCopilotStepDTO,
  CookingCopilotTimerDTO,
  CookingVoiceCopilotResponseDTO,
  CookingVoiceCopilotRequestDTO,
} from "../services/aiService";

import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File } from "expo-file-system";
import { apiClient } from "../services/apiClient";
import { prepareCookingSpeech } from "../utils/cookingSpeech";
import { getCookingScopeReply } from "../utils/cookingScope";
import { applyCookingVoiceAction } from "../utils/cookingVoiceActions";
import { parseRecipeVideoCommand, type CookingVoiceTarget, type RecipeVideoCommand } from "../utils/recipeVideoCommands";

export interface UseCookingVoiceProps {
  recipeTitle: string;
  recipeId?: string;
  currentStep: CookingCopilotStepDTO;
  stepTimer: CookingCopilotTimerDTO;
  recipeContext?: CookingVoiceCopilotRequestDTO["recipeContext"];
  selectedVoiceId?: string;
  speechRate?: number;
  onExtendTimer?: (seconds: number) => void;
  onReduceTimer?: (seconds: number) => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onGoToStep?: (stepNumber: number) => void;
  onRepeatStep?: () => void;
  onVideoCommand?: (command: RecipeVideoCommand) => string | Promise<string>;
}

export function useCookingVoice({
  recipeTitle,
  recipeId,
  currentStep,
  stepTimer,
  recipeContext,
  selectedVoiceId,
  speechRate = 0.92,
  onExtendTimer,
  onReduceTimer,
  onNextStep,
  onPrevStep,
  onGoToStep,
  onVideoCommand,
}: UseCookingVoiceProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [inputTarget, setInputTarget] = useState<CookingVoiceTarget>("cooking");
  const DEFAULT_QUICK_REPLIES = [
    "Thịt chưa chín",
    "Đã xong rồi",
    "Thêm 2 phút",
    "Món bị mặn",
    ...(onVideoCommand ? ["Mở video hướng dẫn"] : []),
  ];

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [aiReply, setAiReply] = useState<string>("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(false);
  const busyRef = useRef(false);
  const targetRef = useRef<CookingVoiceTarget>("cooking");
  const mountedRef = useRef(true);
  const sessionRef = useRef(0);
  const transcriptionController = useRef<AbortController | null>(null);
  const conversationRef = useRef<{
    recipeTitle: string; stepNumber: number;
    turns: NonNullable<CookingVoiceCopilotRequestDTO["conversationHistory"]>;
  }>({ recipeTitle, stepNumber: currentStep.stepNumber, turns: [] });
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationReplyRef = useRef(false);

  // Clean text before reading out with TTS
  const cleanSpeechText = (text: string): string => {
    return text
      .replace(/[#*`_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  /**
   * Speak reply using Expo Speech
   */
  const speakAiResponse = useCallback(
    async (text: string) => {
      try {
        const session = sessionRef.current;
        await Speech.stop();
        const audioOptions = await prepareCookingSpeech(selectedVoiceId);
        if (!mountedRef.current || session !== sessionRef.current) return;
        const clean = cleanSpeechText(text);
        if (!clean) return;
        await new Promise<void>((resolve) => Speech.speak(clean, {
          ...audioOptions,
          onStart: () => setIsSpeaking(true),
          onStopped: () => { setIsSpeaking(false); resolve(); },
          rate: speechRate || 0.92,
          pitch: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            resolve();
          },
          onError: () => {
            setIsSpeaking(false);
            setErrorMessage("Không phát được giọng đọc. Hãy kiểm tra âm lượng và thử lại.");
            resolve();
          },
        }));
      } catch (err) {
        console.warn("⚠️ [useCookingVoice] Speech error:", err);
        setIsSpeaking(false);
      }
    },
    [selectedVoiceId, speechRate]
  );

  /**
   * Process recognized speech with Backend Cooking Copilot
   */
  const processVoiceInput = useCallback(
    async (queryText: string, target: CookingVoiceTarget = "cooking") => {
      const cleanQuery = queryText.trim();
      if (busyRef.current || recordingRef.current) return;
      if (!cleanQuery) {
        setIsListening(false);
        return;
      }

      setIsListening(false);
      busyRef.current = true;
      targetRef.current = target;
      setInputTarget(target);
      const session = sessionRef.current;
      setIsThinking(true);
      setTranscript(cleanQuery);
      setAiReply("");
      setLastAction(null);
      setErrorMessage(null);

      try {
        if (cleanQuery.length > 600) {
          setErrorMessage("Hãy nói hoặc nhập lệnh ngắn gọn, tối đa 600 ký tự.");
          return;
        }
        const videoCommand = (target === "video" || onVideoCommand) && parseRecipeVideoCommand(cleanQuery, target);
        if (target === "video" || videoCommand) {
          targetRef.current = "video";
          setInputTarget("video");
          const message = videoCommand && onVideoCommand
            ? await onVideoCommand(videoCommand)
            : "Trình điều khiển video chưa sẵn sàng.";
          if (mountedRef.current && session === sessionRef.current) setAiReply(message);
          return;
        }
        if (conversationRef.current.recipeTitle !== recipeTitle
          || conversationRef.current.stepNumber !== currentStep.stepNumber) {
          conversationRef.current = { recipeTitle, stepNumber: currentStep.stepNumber, turns: [] };
        }
        const response: CookingVoiceCopilotResponseDTO = await aiService.callCookingVoiceCopilot({
          recipeTitle,
          currentStep,
          stepTimer,
          recipeContext,
          userVoiceText: cleanQuery,
          conversationHistory: conversationRef.current.turns,
        });

        if (!mountedRef.current || session !== sessionRef.current) return;
        if (!getCookingScopeReply(cleanQuery, { recipeTitle, currentStep, recipeContext, conversationHistory: conversationRef.current.turns })) {
          conversationRef.current.turns = [
            ...conversationRef.current.turns,
            { role: "user", text: cleanQuery.slice(0, 350) },
            { role: "assistant", text: response.speechReply.slice(0, 350) },
          ].slice(-6) as NonNullable<CookingVoiceCopilotRequestDTO["conversationHistory"]>;
        }
        setIsThinking(false);
        setAiReply(response.speechReply);
        setLastAction(response.action);
        if (response.suggestedQuickReplies) {
          setQuickReplies(response.suggestedQuickReplies);
        }

        navigationReplyRef.current = ["GO_TO_STEP", "NEXT_STEP", "PREV_STEP"].includes(response.action);
        applyCookingVoiceAction(response, { onExtendTimer, onReduceTimer, onNextStep, onPrevStep, onGoToStep });

        // Reading a confirmation must never delay the requested UI action.
        await speakAiResponse(response.speechReply);
        navigationReplyRef.current = false;
        if (!mountedRef.current || session !== sessionRef.current) return;

      } catch {
        if (mountedRef.current && session === sessionRef.current) {
          setErrorMessage("Không thể kết nối trợ lý AI. Vui lòng thử lại.");
        }
      } finally {
        busyRef.current = false;
        if (mountedRef.current) setIsThinking(false);
      }
    },
    [recipeTitle, currentStep, stepTimer, recipeContext, speakAiResponse, onExtendTimer, onReduceTimer, onNextStep, onPrevStep, onGoToStep, onVideoCommand]
  );

  const processInputRef = useRef(processVoiceInput);
  useEffect(() => { processInputRef.current = processVoiceInput; }, [processVoiceInput]);

  const stopListening = useCallback(async () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (!recordingRef.current) return;
    recordingRef.current = false;
    busyRef.current = true;
    setIsListening(false);
    setIsThinking(true);
    const session = sessionRef.current;
    const target = targetRef.current;
    const controller = new AbortController();
    transcriptionController.current = controller;
    let file: File | undefined;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("Không tìm thấy bản ghi âm.");
      let audioBase64: string;
      let mimeType = "audio/mp4";
      if (Platform.OS === "web") {
        const blob = await (await fetch(recorder.uri)).blob();
        mimeType = blob.type.split(";")[0] || "audio/webm";
        audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        file = new File(recorder.uri);
        audioBase64 = await file.base64();
      }
      const response = await apiClient.post<{ success: boolean; data?: { text?: string } }>(
        "/ai/cooking-transcription", { audioBase64, mimeType }, { timeout: 30000, signal: controller.signal }
      );
      if (!mountedRef.current || session !== sessionRef.current) return;
      const text = response.data?.data?.text;
      if (response.data?.success !== true || typeof text !== "string" || !text.trim()) {
        setErrorMessage("Chưa nhận được lời nói rõ ràng. Hãy nói lại hoặc nhập lệnh.");
        return;
      }
      busyRef.current = false;
      await processInputRef.current(text, target);
    } catch (error: any) {
      if (mountedRef.current && session === sessionRef.current) {
        setErrorMessage(error?.response?.data?.message || "Không nhận diện được giọng nói. Vui lòng thử lại.");
      }
    } finally {
      try { if (file?.exists) file.delete(); } catch {}
      if (transcriptionController.current === controller) transcriptionController.current = null;
      busyRef.current = false;
      if (mountedRef.current) setIsThinking(false);
    }
  }, [recorder]);

  const startListening = useCallback(async (target: CookingVoiceTarget = "cooking") => {
    if (busyRef.current || recordingRef.current) return;
    busyRef.current = true;
    targetRef.current = target;
    setInputTarget(target);
    const session = sessionRef.current;
    try {
      await Speech.stop();
      setIsSpeaking(false);
      setTranscript("");
      setAiReply("");
      setErrorMessage(null);
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!mountedRef.current || session !== sessionRef.current) return;
      if (!permission.granted) {
        setErrorMessage("Hãy cấp quyền micro cho ứng dụng trong Cài đặt hoặc nhập lệnh.");
        return;
      }
      if (!mountedRef.current || session !== sessionRef.current) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!mountedRef.current || session !== sessionRef.current) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      recorder.record();
      recordingRef.current = true;
      setIsListening(true);
      silenceTimerRef.current = setTimeout(() => void stopListening(), 15000);
    } catch {
      setIsListening(false);
      setErrorMessage("Không thể bật micro. Hãy kiểm tra quyền truy cập và thử lại.");
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    } finally {
      busyRef.current = false;
    }
  }, [recorder, stopListening]);

  const cancelListening = useCallback((preserveSpeech = false) => {
    sessionRef.current += 1;
    transcriptionController.current?.abort();
    transcriptionController.current = null;
    setIsThinking(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recordingRef.current) {
      recordingRef.current = false;
      busyRef.current = true;
      void recorder.stop().then(() => {
        if (Platform.OS !== "web" && recorder.uri) {
          const file = new File(recorder.uri);
          if (file.exists) file.delete();
        }
        return setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      }).catch(() => {}).finally(() => { busyRef.current = false; });
    }
    if (!preserveSpeech) {
      void Speech.stop();
      setIsSpeaking(false);
    }
    setIsListening(false);
  }, [recorder]);

  // A reply for the previous step must never adjust the newly selected step's timer.
  useEffect(() => {
    return () => {
      if (targetRef.current === "video") return;
      const preserve = navigationReplyRef.current;
      navigationReplyRef.current = false;
      cancelListening(preserve);
    };
  }, [currentStep.stepNumber, cancelListening]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelListening();
    };
  }, [recipeId, recipeTitle, cancelListening]);

  /**
   * Proactive check-in trigger when step timer is overdue
   */
  const triggerProactiveCheckIn = useCallback(async () => {
    if (busyRef.current || recordingRef.current) return;
    try {
      const question = `Đã hết thời gian cho bước ${currentStep.stepNumber}: ${currentStep.title}. Bạn đã hoàn thành chưa, hay cần mình hỗ trợ gì không?`;
      setAiReply(question);
      setTranscript("");
      setQuickReplies(["Đã xong rồi", "Thịt chưa chín", "Thêm 2 phút"]);

      await speakAiResponse(question);

    } catch (err) {
      console.warn("⚠️ [triggerProactiveCheckIn] Error:", err);
    }
  }, [currentStep, speakAiResponse]);

  return {
    isListening,
    isThinking,
    inputTarget,
    isSpeaking,
    transcript,
    aiReply,
    lastAction,
    quickReplies,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
    processVoiceInput,
    triggerProactiveCheckIn,
  };
}
