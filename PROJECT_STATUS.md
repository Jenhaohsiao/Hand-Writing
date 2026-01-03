# Project Status & Development Log

This file tracks the development progress, technical decisions, and future plans for the Hand-Writing project. It serves as a context anchor for AI sessions.

## Project Overview
**Name**: Hand-Writing
**Description**: A React-based application for practicing Chinese handwriting, featuring stroke order animations, AI-powered insights, and pronunciation.
**Goal**: Create a commercially viable, cross-platform (mobile/tablet friendly) educational tool.

## Technical Stack
- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Hanzi Writer (SVG-based stroke order)
- **AI Integration**: Google Gemini API (`gemini-3-flash-preview`) for character insights
- **TTS**: Browser Native `SpeechSynthesis` API
- **Fonts**: Noto Sans TC (UI), Kalam (Decorative), Arphic PL KaitiM (Stroke Data)

## Current Features
- [x] **Writing Board**: Interactive stroke order animation with speed control (0.25x - 2x).
- [x] **AI Insights**: Explanations of character meaning, usage, and history using Gemini.
- [x] **Pronunciation**: Native browser text-to-speech support.
- [x] **Localization**: Toggle between Traditional (繁體) and Simplified (简体) Chinese.
- [x] **Responsive Design**: Dynamic board resizing for mobile and tablet devices.
- [x] **Layout**: Top navigation bar with optimized control placement.

## Development History

### Phase 1: Initialization & Setup
- Set up React + Vite + TypeScript environment.
- Configured Tailwind CSS.
- Integrated Hanzi Writer.
- Fixed initial blank screen issues (missing script tag).

### Phase 2: Core Features & UI
- Implemented playback speed control.
- Moved navigation to the top for better mobile experience.
- Fixed animation loop bugs (`cancelAnimation` error).
- Switched from Gemini TTS to Native Web Speech API for better performance and cost.

### Phase 3: Refinement & Commercial Prep
- Added dynamic resizing logic for the writing board.
- Implemented Traditional/Simplified Chinese toggle.
- Verified licensing:
    - Code: MIT
    - Hanzi Writer Data: Arphic Public License (Commercial use allowed with attribution)
    - Fonts: OFL (Google Fonts)

## Pending Tasks / Roadmap
- [ ] **User Feedback**: Monitor the accuracy of Simplified Chinese AI responses.
- [ ] **Font Customization**: Explore options for changing the display font if requested.
- [ ] **Offline Mode**: Consider caching stroke data for offline use.

## Licensing Notes
- **Hanzi Writer Data**: Derived from Make Me a Hanzi (Arphic Public License). Requires attribution if data is modified or redistributed.
- **Fonts**: Noto Sans TC and Kalam are under Open Font License (OFL), safe for commercial use.
