/**
 * Text-to-Speech Service
 * 
 * 為了確保跨裝置（手機、平板、電腦）擁有一致且高品質的發音，
 * 我們必須使用「雲端 TTS (Cloud Text-to-Speech)」。
 * 
 * 本地語音 (Web Speech API) 雖然免費且快速，但品質取決於使用者的裝置：
 * - macOS/iOS: 品質很好 (Meijia, Tingting)
 * - Windows: 品質尚可 (Hanhan, Xiaoxiao)
 * - Android: 品質不一 (Google TTS)
 * 
 * 若要「統一品質」，建議使用 OpenAI TTS 或 Google Cloud TTS。
 * 此範例實作 Google Cloud TTS (透過 REST API)。
 */

const GOOGLE_TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

export const playCloudTTS = async (
  text: string, 
  apiKey: string,
  isSimplified: boolean = false
): Promise<HTMLAudioElement> => {
  if (!apiKey) {
    throw new Error("請設定 API Key 以使用雲端語音");
  }

  try {
    // Google Cloud TTS 設定
    // 繁體中文: cmn-TW-Wavenet-A (女聲), cmn-TW-Wavenet-B (男聲), cmn-TW-Wavenet-C (女聲)
    // 簡體中文: cmn-CN-Wavenet-A (女聲), cmn-CN-Wavenet-C (男聲)
    // "Wavenet" 系列是 Google 最自然的神經網絡語音
    const voiceName = isSimplified ? "cmn-CN-Wavenet-A" : "cmn-TW-Wavenet-A";
    const languageCode = isSimplified ? "cmn-CN" : "cmn-TW";

    const response = await fetch(`${GOOGLE_TTS_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text: text },
        voice: { languageCode: languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.85 } // 稍微放慢
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Google TTS 請求失敗");
    }

    const data = await response.json();
    const audioContent = data.audioContent; // Base64 string

    const audioUrl = `data:audio/mp3;base64,${audioContent}`;
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        // Data URL 不需要像 Blob URL 那樣 revoke，但為了保險起見可以設為 null
        audio.src = ""; 
      };
      audio.onerror = (e) => reject(e);
      
      audio.play().then(() => resolve(audio)).catch(reject);
    });

  } catch (error) {
    console.error("Cloud TTS Error:", error);
    throw error;
  }
};
