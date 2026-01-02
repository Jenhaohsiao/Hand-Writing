
import React, { useState, useEffect, useCallback, useRef } from 'react';
import WritingBoard from './components/WritingBoard';
import { CharacterInfo } from './types';
import { getCharacterInsights, generateSpeech, decodeBase64, decodeAudioData } from './services/geminiService';

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
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const characters = activeText.split('').filter(c => /\S/.test(c));
  const currentChar = characters[currentIndex] || '';

  const fetchInsights = useCallback(async (char: string) => {
    if (!char) return;
    setIsLoadingInsights(true);
    const data = await getCharacterInsights(char);
    setInsights(data);
    setIsLoadingInsights(false);
  }, []);

  useEffect(() => {
    fetchInsights(currentChar);
  }, [currentChar, fetchInsights]);

  const handleUpdateText = () => {
    if (inputText.trim()) {
      setActiveText(inputText);
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const playPronunciation = async () => {
    if (isSpeaking || !currentChar) return;
    setIsSpeaking(true);
    
    try {
      const base64Audio = await generateSpeech(currentChar);
      if (base64Audio) {
        // Initialize AudioContext on first interaction
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ctx = audioContextRef.current;
        // Crucial: Resume context in case it was suspended by the browser
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const audioData = decodeBase64(base64Audio);
        const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start(0);
      } else {
        console.warn("No audio data received from API");
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Speech playback error:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar - Settings & Insights */}
      <aside className="w-full lg:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-20">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600 mb-1 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3Z"></path><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"></path><path d="m2 2 5 5"></path></svg>
            ZenScribe
          </h1>
          <p className="text-xs text-slate-400 font-medium">中文字書寫練習系統</p>
        </div>

        <section className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">自訂練習文字</label>
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
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                更新
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">播放速度 ({speed}x)</label>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.5" 
              step="0.5" 
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">示範面板配置</label>
            <button 
              onClick={() => setIsDemoCompact(!isDemoCompact)}
              className="w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              {isDemoCompact ? '切換為並排大型示範' : '切換為迷你頂部示範'}
            </button>
          </div>
        </section>

        {/* Character Insights */}
        <section className="mt-auto">
          <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-900 mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
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
                        <span className="text-[10px] text-slate-400 block">拼音</span>
                        <span className="font-bold text-indigo-600">{insights.pinyin || '—'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                        <span className="text-[10px] text-slate-400 block">注音</span>
                        <span className="font-bold text-indigo-600">{insights.zhuyin || '—'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                        <span className="text-[10px] text-slate-400 block">部首</span>
                        <span className="font-bold text-indigo-600">{insights.radical || '—'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                        <span className="text-[10px] text-slate-400 block">筆劃</span>
                        <span className="font-bold text-indigo-600">{insights.strokeCount || '—'}</span>
                    </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {insights.meaning}
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-2 italic">載入中...</p>
            )}
          </div>
        </section>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col p-4 lg:p-8 bg-slate-50 items-center overflow-y-auto">
        <div className="w-full max-w-6xl flex flex-col gap-6">
          
          {/* Header & Controls */}
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-bold text-slate-800 leading-none">{currentChar}</h2>
                  <button 
                    onClick={playPronunciation} 
                    disabled={isSpeaking}
                    className={`p-3 rounded-full transition-all flex items-center justify-center ${isSpeaking ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-50 text-indigo-600 hover:bg-indigo-50 active:scale-90'}`}
                    title="發音"
                  >
                    {isSpeaking ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    )}
                  </button>
                </div>
                <span className="text-[10px] font-bold text-indigo-500 tracking-widest mt-1 block uppercase">Progress {currentIndex + 1} / {characters.length}</span>
              </div>
              <button onClick={handleNext} disabled={currentIndex === characters.length - 1} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            
            <div className="flex gap-2">
                {characters.map((char, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentIndex === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                    >
                        {char}
                    </button>
                ))}
            </div>
          </div>

          {/* Practice Layout */}
          <div className={`flex flex-col ${isDemoCompact ? 'items-center' : 'lg:flex-row lg:items-start'} gap-8 transition-all`}>
            
            {/* Demonstration Panel */}
            <div className={`transition-all duration-500 ${isDemoCompact ? 'w-full flex justify-center' : 'lg:w-[350px]'}`}>
              <div className="flex flex-col items-center gap-4 w-full">
                <WritingBoard 
                    key={`viewer-${currentChar}`}
                    character={currentChar} 
                    role="viewer" 
                    speed={speed} 
                    size={isDemoCompact ? 180 : 350}
                />
                {!isDemoCompact && (
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-400 italic">「觀摩正確筆順」</p>
                        {insights?.zhuyin && <p className="text-3xl font-bold text-indigo-500 mt-2 tracking-tighter">{insights.zhuyin}</p>}
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
                    size={window.innerWidth < 1024 ? 350 : 550}
                    onComplete={() => {
                        if (currentIndex < characters.length - 1) {
                            setTimeout(handleNext, 1200);
                        }
                    }}
                />
                <div className="flex items-center gap-3">
                    <span className="animate-pulse flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">實戰書寫區域</p>
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
