import React, { useState, useEffect, useCallback } from "react";
import * as OpenCC from "opencc-js";
import WritingBoard from "./components/WritingBoard";
import { CharacterInfo } from "./types";
import { getCharacterInsights } from "./services/geminiService";
import { playCloudTTS } from "./services/ttsService";

const DEFAULT_TEXT = "永和九年";

const App: React.FC = () => {
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [activeText, setActiveText] = useState(DEFAULT_TEXT);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isDemoCompact, setIsDemoCompact] = useState(false);
  const [insights, setInsights] = useState<CharacterInfo | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSimplified, setIsSimplified] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [useCloudVoice, setUseCloudVoice] = useState(false); // 新增：雲端語音開關

  // Converters
  const cn2tw = OpenCC.Converter({ from: "cn", to: "tw" });
  const tw2cn = OpenCC.Converter({ from: "tw", to: "cn" });

  // 新增：動態計算寫字板尺寸
  const [boardSize, setBoardSize] = useState(350);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Auto-select best voice based on language mode
  useEffect(() => {
    if (voices.length === 0) return;

    const targetLang = isSimplified ? "zh-CN" : "zh-TW";

    // Priority list for better sounding voices
    const preferredNames = isSimplified
      ? ["Tingting", "Lili", "Google 普通话", "Microsoft Xiaoxiao"]
      : ["Meijia", "HsiaoYu", "Google 國語", "Microsoft Hanhan"];

    const bestVoice =
      voices.find((v) =>
        preferredNames.some((name) => v.name.includes(name))
      ) ||
      voices.find((v) => v.lang === targetLang) ||
      voices.find((v) => v.lang.startsWith("zh"));

    if (bestVoice) {
      setSelectedVoice(bestVoice);
    }
  }, [voices, isSimplified]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // 手機直向
        setBoardSize(Math.min(width - 40, 350));
      } else if (width < 1024) {
        // 平板或手機橫向
        setBoardSize(400);
      } else {
        // 電腦
        setBoardSize(550);
      }
    };

    // 初始化與監聽
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const characters = activeText.split("").filter((c) => /\S/.test(c));
  const currentChar = characters[currentIndex] || "";

  const fetchInsights = useCallback(
    async (char: string) => {
      if (!char) return;
      setIsLoadingInsights(true);
      const data = await getCharacterInsights(char, isSimplified);
      setInsights(data);
      setIsLoadingInsights(false);
    },
    [isSimplified]
  );

  useEffect(() => {
    fetchInsights(currentChar);
  }, [currentChar, fetchInsights]);

  const handleUpdateText = () => {
    if (inputText.trim()) {
      const convertedText = isSimplified ? tw2cn(inputText) : cn2tw(inputText);
      setActiveText(convertedText);
      // Optional: Update input text to match the converted text
      setInputText(convertedText);
      setCurrentIndex(0);
    }
  };

  const handleToggleSimplified = (targetSimplified: boolean) => {
    setIsSimplified(targetSimplified);
    const converter = targetSimplified ? tw2cn : cn2tw;
    setActiveText((prev) => converter(prev));
    setInputText((prev) => converter(prev));
  };

  const handleNext = () => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const playPronunciation = async () => {
    if (isSpeaking || !currentChar) return;
    setIsSpeaking(true);

    try {
      if (useCloudVoice) {
        // 雲端方案：使用 Google Cloud TTS
        // 使用既有的 GEMINI_API_KEY (需在 Google Cloud Console 啟用 Cloud Text-to-Speech API)
        const apiKey = process.env.API_KEY || "";
        if (!apiKey) {
          alert("請確認 .env 已設定 API_KEY (Gemini/Google Cloud)");
          setIsSpeaking(false);
          return;
        }
        await playCloudTTS(currentChar, apiKey, isSimplified);
        setIsSpeaking(false);
      } else {
        // 本地方案：使用瀏覽器內建語音
        const utterance = new SpeechSynthesisUtterance(currentChar);
        utterance.lang = isSimplified ? "zh-CN" : "zh-TW";
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = 0.6; // 稍微放慢語速

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.error("TTS Error:", e);
          setIsSpeaking(false);
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Pronunciation Error:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white border-b border-slate-200 p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600 mb-1 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19 7-7 3 3-7 7-3-3Z"></path>
                <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"></path>
                <path d="m2 2 5 5"></path>
              </svg>
              ZenScribe
            </h1>
            <p className="text-xs text-slate-400 font-medium hidden lg:block">
              中文字書寫練習系統
            </p>
          </div>

          {/* 繁簡切換按鈕 */}
          <div className="flex items-center gap-2">
            {/* Voice Selector */}
            <div className="relative group flex items-center bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setUseCloudVoice(!useCloudVoice)}
                className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${
                  useCloudVoice
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title={
                  useCloudVoice
                    ? "使用雲端語音 (高品質/一致)"
                    : "使用本地語音 (快速/免費)"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {useCloudVoice ? (
                    <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 .4 0 .8-.1 1.1-.2 1.4-.5 2.5-1.6 3-3 .5 1.4 1.6 2.5 3 3 .4.1.8.2 1.1.2h5.8c.3 0 .7-.1 1.1-.2 1.4-.5 2.5-1.6 3-3 .5 1.4 1.6 2.5 3 3z" />
                  ) : (
                    <path d="M12 6v13M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  )}
                </svg>
                <span className="text-xs font-bold hidden lg:block">
                  {useCloudVoice ? "雲端" : "本地"}
                </span>
              </button>

              {!useCloudVoice && (
                <div className="relative group/list">
                  <button className="p-1.5 rounded-md hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 hidden group-hover/list:block z-50">
                    <p className="text-[10px] font-bold text-slate-400 px-2 mb-1 uppercase">
                      選擇本地發音
                    </p>
                    {voices
                      .filter((v) => v.lang.startsWith("zh"))
                      .map((voice) => (
                        <button
                          key={voice.name}
                          onClick={() => setSelectedVoice(voice)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs truncate ${
                            selectedVoice?.name === voice.name
                              ? "bg-indigo-50 text-indigo-600 font-bold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {voice.name
                            .replace("Microsoft", "")
                            .replace("Google", "")
                            .trim()}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleToggleSimplified(false)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  !isSimplified
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                繁體
              </button>
              <button
                onClick={() => handleToggleSimplified(true)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isSimplified
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                簡体
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 max-w-2xl items-center gap-4 w-full">
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="輸入中文..."
              />
              <button
                onClick={handleUpdateText}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap"
              >
                更新
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsDemoCompact(!isDemoCompact)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            {isDemoCompact ? "並排示範" : "迷你示範"}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col p-4 lg:p-8 bg-slate-50 items-center overflow-y-auto">
        <div className="w-full max-w-6xl flex flex-col gap-6">
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-bold text-slate-800 leading-none">
                      {currentChar}
                    </h2>
                    <button
                      onClick={playPronunciation}
                      disabled={isSpeaking}
                      className={`p-3 rounded-full transition-all flex items-center justify-center ${
                        isSpeaking
                          ? "bg-indigo-100 text-indigo-600 animate-pulse"
                          : "bg-slate-50 text-indigo-600 hover:bg-indigo-50 active:scale-90"
                      }`}
                      title="發音"
                    >
                      {isSpeaking ? (
                        <svg
                          className="animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-500 tracking-widest mt-1 block uppercase">
                    Progress {currentIndex + 1} / {characters.length}
                  </span>
                </div>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === characters.length - 1}
                  className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {characters.map((char, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all flex-shrink-0 ${
                      currentIndex === idx
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            {/* Character Insights - Moved here */}
            <div className="w-full lg:w-80 bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
              <h3 className="text-xs font-bold text-indigo-900 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                當前文字解析
              </h3>
              {isLoadingInsights ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-indigo-100 rounded w-full"></div>
                  <div className="h-3 bg-indigo-100 rounded w-2/3"></div>
                  <div className="h-3 bg-indigo-100 rounded w-1/2"></div>
                </div>
              ) : insights ? (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        拼音
                      </span>
                      <span className="font-bold text-indigo-600">
                        {insights.pinyin || "—"}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        注音
                      </span>
                      <span className="font-bold text-indigo-600">
                        {insights.zhuyin || "—"}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        部首
                      </span>
                      <span className="font-bold text-indigo-600">
                        {insights.radical || "—"}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        筆劃
                      </span>
                      <span className="font-bold text-indigo-600">
                        {insights.strokeCount || "—"}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    {insights.meaning}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-2 italic">
                  {process.env.API_KEY ? "暫無解析資料" : "請設定 API Key"}
                </p>
              )}
            </div>
          </div>

          {/* Practice Layout */}
          <div
            className={`flex flex-col lg:flex-row lg:items-start gap-8 transition-all`}
          >
            {/* Demonstration Panel */}
            <div
              className={`transition-all duration-500 ${
                isDemoCompact ? "lg:w-[200px]" : "lg:w-[350px]"
              } w-full flex justify-center lg:justify-start`}
            >
              <div className="flex flex-col items-center gap-4 w-full">
                <WritingBoard
                  key={`viewer-${currentChar}`}
                  character={currentChar}
                  role="viewer"
                  speed={speed}
                  size={isDemoCompact ? 180 : 350}
                />

                {/* Speed Control - Moved here */}
                <div className="w-full max-w-[350px] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      播放速度 ({speed}x)
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="1.5"
                    step="0.25"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {!isDemoCompact && (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 italic">
                      「觀摩正確筆順」
                    </p>
                    {insights?.zhuyin && (
                      <p className="text-3xl font-bold text-indigo-500 mt-2 tracking-tighter">
                        {insights.zhuyin}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Practice Panel */}
            <div className="flex-1 flex justify-center">
              <div className="flex flex-col items-center gap-4 w-full">
                <WritingBoard
                  key={`quiz-${currentChar}`}
                  character={currentChar}
                  role="quiz"
                  speed={speed}
                  size={boardSize}
                  onComplete={() => {
                    if (currentIndex < characters.length - 1) {
                      setTimeout(handleNext, 1200);
                    }
                  }}
                />
                <div className="flex items-center gap-3">
                  <span className="animate-pulse flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    實戰書寫區域
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
