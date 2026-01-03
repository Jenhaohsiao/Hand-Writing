
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CharacterInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// 簡單的本地快取，避免重複呼叫 API 浪費額度
const insightsCache: Record<string, CharacterInfo> = {};
const speechCache: Record<string, string> = {};

/**
 * 具備重試機制的 API 呼叫包裝器
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error.message?.includes('429')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const getCharacterInsights = async (char: string): Promise<CharacterInfo | null> => {
  if (!process.env.API_KEY || !char) return null;
  if (insightsCache[char]) return insightsCache[char];

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide linguistic information for the Traditional Chinese character: "${char}". 
        Provide Pinyin, Zhuyin (Bopomofo), Radical, Stroke Count, and Meaning in Traditional Chinese.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              char: { type: Type.STRING },
              meaning: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              zhuyin: { type: Type.STRING },
              radical: { type: Type.STRING },
              strokeCount: { type: Type.NUMBER },
              examples: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
            },
            required: ["char", "meaning", "pinyin", "zhuyin"]
          }
        }
      });
    });

    const result = JSON.parse(response.text.trim()) as CharacterInfo;
    insightsCache[char] = result; // 存入快取
    return result;
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!process.env.API_KEY || !text) return null;
  if (speechCache[text]) return speechCache[text];
  
  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.0-flash-exp", // 更新為支援 TTS 的正確模型名稱
        contents: [{ parts: [{ text: `請用標準國語讀出這個字：${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          speechCache[text] = part.inlineData.data; // 存入快取
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Gemini Speech Error:", error);
    // 輸出更具體的錯誤資訊到 console，幫助開發者除錯
    if (error.message?.includes('429')) {
      console.warn("API 呼叫頻率過高（免費版限制），請稍候再試。");
    }
    return null;
  }
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
