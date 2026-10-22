import * as Speech from "expo-speech";
import { setAudioModeAsync } from "expo-audio";

/** Use the app's playback session on iOS, including when the silent switch is on. */
export async function prepareCookingSpeech(voiceId?: string): Promise<Speech.SpeechOptions> {
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const voices = await Speech.getAvailableVoicesAsync();
  const voice = voices.find((item) => item.identifier === voiceId)
    ?? voices.find((item) => item.language.toLowerCase().startsWith("vi"));
  return { language: "vi-VN", voice: voice?.identifier, useApplicationAudioSession: true };
}
