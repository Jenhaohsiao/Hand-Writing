
export type PracticeMode = 'viewer' | 'quiz';

export interface CharacterInfo {
  char: string;
  meaning?: string;
  pinyin?: string;
  zhuyin?: string;
  radical?: string;
  strokeCount?: number;
  examples?: string[];
}

// Global window extension for HanziWriter which is loaded via CDN
declare global {
  interface Window {
    HanziWriter: any;
  }
}
