import React, { useEffect, useRef, useCallback } from "react";
import { PracticeMode } from "../types";

interface WritingBoardProps {
  character: string;
  role: PracticeMode;
  speed: number;
  size?: number;
  onComplete?: () => void;
}

const WritingBoard: React.FC<WritingBoardProps> = ({
  character,
  role,
  speed,
  size = 400,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);

  const initWriter = useCallback(() => {
    if (!containerRef.current || !window.HanziWriter) return;

    containerRef.current.innerHTML = "";

    const options = {
      width: size,
      height: size,
      padding: size * 0.05,
      strokeAnimationSpeed: speed * 0.5, // 降低基礎速度倍率 (原 1.5 -> 0.5)
      delayBetweenStrokes: 300,
      strokeColor: "#000000", // 已完成筆劃顏色 (黑)
      outlineColor: "#e2e8f0", // 外框顏色 (灰)
      drawingColor: "#334155", // 使用者書寫顏色 (深灰黑)
      drawingWidth: size * 0.06,
      showOutline: true,
      showCharacter: false,
    };

    const writer = window.HanziWriter.create(
      containerRef.current,
      character,
      options
    );
    writerRef.current = writer;

    if (role === "viewer") {
      // 示範模式：循環播放
      const loop = () => {
        // 確保只對當前有效的 writer 進行操作
        if (writerRef.current === writer) {
          writer.animateCharacter({
            onComplete: () => {
              if (writerRef.current === writer) {
                setTimeout(loop, 1500);
              }
            },
          });
        }
      };
      loop();
    } else {
      // 練習模式：啟動測驗
      writer.quiz({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });
    }
  }, [character, role, speed, size, onComplete]);

  useEffect(() => {
    initWriter();
    return () => {
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
        // writerRef.current.cancelAnimation(); // HanziWriter 沒有這個方法，移除以避免錯誤
        if (writerRef.current.hideCharacter) {
          writerRef.current.hideCharacter(); // 嘗試隱藏以停止動畫視覺效果
        }
      }
    };
  }, [initWriter]);

  return (
    <div className="relative flex flex-col items-center bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div
        ref={containerRef}
        style={{ width: size, height: size }}
        className="select-none touch-none"
      />

      {/* 輔助米字格背景 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="black"
            strokeWidth="1"
          />
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="100"
            stroke="black"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke="black"
            strokeWidth="0.5"
            strokeDasharray="2"
          />
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="black"
            strokeWidth="0.5"
            strokeDasharray="2"
          />
        </svg>
      </div>

      <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {role === "viewer" ? "示範區" : "練習區"}
      </div>
    </div>
  );
};

export default WritingBoard;
