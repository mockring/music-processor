# Music Processor — SPEC.md

## 1. Project Overview

**Project Name:** Music Processor
**Type:** Desktop Application (Electron)
**Core Feature Summary:** 從網路 URL 下載音樂、處理本地音訊檔案、調整音高 (升降 key)、消除人聲生成 instrumental 版本、多軌輸出。
**Target Users:** 音樂愛好者、創作者、卡拉OK用途

---

## 2. UI/UX Specification

### 2.1 Window Model

- **Main Window:** 單一主視窗，尺寸 900×780px，最小 700×650px
- **Native Window Frame:** 使用標準視窗框架 (含關閉/最小化/最大化按鈕)
- **Single Window Architecture:** 不需要子視窗或對話框

### 2.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  🎵 YouTube Music Processor  v1.0.0                        │
├─────────────────────────────────────────────────────────────┤
│  📁 Output Folder: C:\Users\...\Music\...     [更改]       │
├─────────────────────────────────────────────────────────────┤
│  [YouTube 網址] [本地檔案]  (Tab 切換)                       │
│  ┌─────────────────────────────────────────────┐ ┌───────┐│
│  │  https://www.youtube.com/watch?v=...       │ │ 貼上  ││
│  └─────────────────────────────────────────────┘ └───────┘│
│  或                                                            │
│  ┌─────────────────────────────────────────────┐ ┌───────┐│
│  │  尚未選擇檔案                               │ │選擇音訊││
│  └─────────────────────────────────────────────┘ └───────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ 🎸 音高調整        │  │ 🎤 人聲移除        │              │
│  │ -12 ═══●═══ +12 │  │ [Toggle] 關閉      │              │
│  │        +0 半音    │  │ 移除人聲，生成純音樂│              │
│  └───────────────────┘  └───────────────────┘              │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ 輸出格式           │  │ 音訊品質           │              │
│  │ WAV MP3 FLAC      │  │ 16-bit 24-bit 32-bit│            │
│  └───────────────────┘  └───────────────────┘              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 多軌輸出: Vocals Bass Drums Other (可多選)              ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│           [ 🎛 下載並處理 / 處理音訊 ]                        │
├─────────────────────────────────────────────────────────────┤
│  Progress Section (處理中):                                  │
│  ████████████░░░░░░░░░░░░░░░░░  45%                       │
│              下載中...                                       │
├─────────────────────────────────────────────────────────────┤
│  Output Section (完成後):                                   │
│  🎵 處理完成！                                               │
│  已儲存至：C:\Users\...\song.wav                           │
│  [開啟資料夾]                                               │
├─────────────────────────────────────────────────────────────┤
│  [12:34:56] Ready                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Visual Design

**Color Palette:**
- Background: `#1a1a2e` → `#16213e` (漸層 gradient)
- Card/Panel Background: `#16213e` (hover: `#1c2a4a`)
- Primary Accent: `#e94560` (紅色/粉紅色 - 用於按鈕和重要元素)
- Secondary Accent: `#0f3460` (藍色 - 用於次要元素)
- Text Primary: `#eaeaea` (白色/淺灰)
- Text Secondary: `#8a8a9a` (灰色)
- Success: `#4ecca3` (綠色)
- Error: `#ff6b6b` (紅色)

**Typography:**
- Font Family: `'Segoe UI', 'Microsoft JhengHei', sans-serif` (跨語言支援)
- Header Title: 22px, font-weight 600
- Section Labels: 14-15px, font-weight 500
- Body Text: 13-14px, font-weight 400
- Log Text: 12px, font-weight 400, 使用等寬字體 `'Consolas', monospace`

**Spacing System:**
- Base Unit: 8px
- Section Gap: 16px
- Card Padding: 12-18px (精簡高度)
- Border Radius: 12px (cards), 8px (inputs/buttons)

**Visual Effects:**
- Cards: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`, hover: `0 6px 16px rgba(0, 0, 0, 0.5)`
- Primary Button: 漸層 `linear-gradient(135deg, #e94560 0%, #d63854 100%)` + 陰影
- Primary Button Hover: `translateY(-2px)` + 加深陰影
- Pitch Slider: 漸層漸變色彩
- Progress Bar: 漸層 `linear-gradient(90deg, #e94560, #ff7b8a)`
- Output Card: 綠色邊框高亮 `border: 1px solid var(--success)`

### 2.4 Components

| Component | States | Behavior |
|-----------|--------|----------|
| Input Mode Tabs | URL active, Local active | 切換輸入模式 |
| URL Input | default, focused, error | 輸入 URL 後即時驗證格式 |
| Paste Button | default, hover, active | 點擊從剪貼簿貼上 |
| Local File Display | empty, selected | 顯示選擇的檔案名稱 |
| Select File Button | default, hover | 開啟檔案選擇對話框 |
| Output Folder Card | default, hover | 顯示目前輸出路徑 |
| Pitch Slider | default, dragging | 拖曳回傳 -12 到 +12 的整數值 |
| Pitch Value Display | static | 顯示目前選擇的半音數 (如 "+5" 或 "0") |
| Vocal Remover Toggle | off, on | 切換時狀態文字變色 |
| Format Radio Buttons | WAV selected, MP3, FLAC | 單選輸出格式 |
| Bitdepth Radio Buttons | 16-bit selected, 24-bit, 32-bit | 單選音訊品質 |
| Multi-Stem Checkboxes | Vocals, Bass, Drums, Other | 可多選多軌輸出 |
| Process Button | default, hover, processing, disabled | hover上浮效果，processing顯示"處理中..." |
| Progress Bar | 0-100% | 即時更新，漸層色彩 |
| Status Text | info, success, error | 顯示目前處理階段 |
| Output Card | hidden, visible | 完成後淡入動畫，綠色邊框高亮 |
| Open Folder Button | default, hover | 開啟輸出資料夾 |
| About/License Section | collapsed, expanded | 展開顯示授權資訊 |
| Log Footer | static | 顯示時間戳記日誌 |

---

## 3. Functional Specification

### 3.1 Core Features

#### 3.1.1 YouTube URL 下載
- **Input:** YouTube 影片/音樂 URL (支援 youtube.com, youtu.be)
- **Process:**
  1. 使用 `yt-dlp` 從 URL 提取音訊
  2. 下載為 WAV 格式 (保持最高品質)
  3. 使用 FFmpeg 進行音訊處理
- **Output Path:** 使用者選擇的輸出資料夾，預設 `%USERPROFILE%\Music\YouTubeMusicProcessor\`
- **File Naming:** YouTube 影片標題作為檔案名稱

#### 3.1.2 本地檔案處理
- **Input:** 支援 WAV, MP3, FLAC, OGG, M4A, AAC, WMA 格式
- **Process:** 直接進行音訊處理（跳過下載步驟）
- **Cleanup:** 處理後自動清理 Demucs 暫存目錄

#### 3.1.3 音高調整 (Pitch Shifting)
- **Range:** -12 到 +12 半音 (semitones)
- **Implementation:** 使用 FFmpeg 的 `rubberband` 濾鏡
  - 公式: `ratio = 2^(semitones/12)`
  - 使用 `rubberband=pitch=${ratio}` 參數
- **Time-Preserving:** rubberband 會保持時間不變，只改變音高
- **Default Value:** 0 (不改變)

#### 3.1.4 人聲消除 (Vocal Removal)
- **Model:** Demucs (`htdemucs_ft`) — Facebook/Meta 開源
- **GPU Support:** 使用 CUDA (RTX 系列顯示卡優化)
- **Environment:** Python 3.8-3.12 + PyTorch 2.9.0 + torchaudio 2.9.0 + CUDA 12.8
- **Process:**
  1. 將 WAV 檔案傳入 Demucs 模型 (`--two-stems=vocals`)
  2. 模型輸出 `vocals.wav` 和 `no_vocals.wav`
  3. `no_vocals.wav` 即為 instrumental 版本
- **Toggle:** 用戶可選擇是否啟用人聲消除
- **Output:** 如果關閉 → 輸出升降 key 後的音樂；如果開啟 → 輸出 instrumental 版本

#### 3.1.5 多軌輸出 (Multi-Stem Output)
- **Model:** Demucs (`htdemucs_ft`) 全分離模式
- **Available Tracks:** Vocals, Bass, Drums, Other
- **Selection:** 可任意選擇要輸出的音軌（可多選）
- **Combined Mode:** 若同時啟用人聲移除，會輸出 instrumental + 選擇的音軌
- **Output Naming:**
  - `標題_instrumental.wav` (去除人聲版本)
  - `標題_vocals.wav`, `標題_bass.wav`, `標題_drums.wav`, `標題_other.wav`

#### 3.1.6 輸出格式與品質
- **Format Options:** WAV (無損), MP3, FLAC
- **Bitdepth Options:** 16-bit, 24-bit, 32-bit
- **Conversion:** 使用 FFmpeg 進行格式和位元深度轉換

### 3.2 User Interaction Flow

```
1. User 選擇輸入模式 (URL 或 本地檔案)
        ↓
2a. URL 模式: 貼上 YouTube URL，即時驗證
2b. 本地模式: 選擇音訊檔案
        ↓
3. User 調整 Pitch (可選，預設 0)
        ↓
4. User 開啟/關閉 人聲移除 (預設關閉)
        ↓
5. User 選擇輸出格式 (WAV/MP3/FLAC，預設 WAV)
        ↓
6. User 選擇音訊品質 (16/24/32-bit，預設 16-bit)
        ↓
7. User 選擇多軌輸出 (可多選 Vocals/Bass/Drums/Other)
        ↓
8. User 點擊 "下載並處理" 或 "處理音訊"
        ↓
9. Progress: 處理中 (10%) / 下載中 (5-25%)
        ↓
10. Progress: 處理音高 (30-45%)
        ↓
11. (如果多軌輸出已選擇)
    Progress: 分離音軌 (50-85%)
    → 若同時有人聲移除，分離人聲 (70-85%)
        ↓
12. (如果只有人聲移除，無多軌)
    Progress: 分離人聲 (50-85%)
        ↓
13. Progress: 轉換格式 (85-95%)
        ↓
14. Progress: 完成 (100%)
        ↓
15. 複製檔案到輸出資料夾
        ↓
16. 清理暫存檔案
        ↓
17. Output 卡片顯示檔案位置
        ↓
18. User 可點擊 "開啟資料夾" 開啟輸出目錄
```

### 3.3 Data Flow & Key Modules

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process (Electron)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ URLValidator│  │ Downloader  │  │ AudioProcessor      │  │
│  │ - validate()│  │ - download() │  │ - changePitch()     │  │
│  │             │  │ - getTitle() │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ FileManager │  │ DemucsRunner │  │ AudioConverter     │  │
│  │ - tempDir() │  │ - separate()  │  │ - convert()        │  │
│  │ - cleanup() │  │ - separateAll()│ │                   │  │
│  │             │  │ - mixAudio()  │  │                    │  │
│  │             │  │ - cleanup()   │  │                    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓ IPC
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (UI)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ URLInput    │  │ Controls     │  │ ProgressDisplay      │  │
│  │ Component   │  │ Component    │  │ Component            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Module Responsibilities:**

| Module | Responsibility | Public API |
|--------|---------------|------------|
| `URLValidator` | 驗證 YouTube URL 格式 | `validate(url: string): boolean` |
| `Downloader` | 使用 yt-dlp 下載音訊 | `download(url: string): Promise<{filePath, title}>` |
| `AudioProcessor` | FFmpeg 音高調整 | `changePitch(input: string, semitones: number): Promise<string>` |
| `DemucsRunner` | 人聲分離與多軌分離 | `separate(audioPath: string): Promise<string>` <br> `separateAll(audioPath: string): Promise<string[]>` |
| `AudioConverter` | 格式與位元深度轉換 | `convert(input, output, format, bitrate): Promise<string>` |
| `FileManager` | 臨時/輸出目錄管理 | `getTempDir()`, `getOutputPath()`, `cleanup()` |

### 3.4 Path Resolution (Packaged App)

當 Electron 應用程式打包後，Python 和 FFmpeg 位於 `resources/` 目錄：

```
app.asar/
├── resources/
│   ├── python/          # Python 環境 (含 yt-dlp, demucs, PyTorch)
│   └── ffmpeg/         # FFmpeg (含 rubberband)
```

路徑取得方式：
```javascript
const resourcesPath = app.isPackaged
  ? path.dirname(app.getAppPath())  // → resources/
  : path.join(__dirname, '../../../../');  // 開發模式
const portablePython = path.join(resourcesPath, 'python', 'python.exe');
const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
```

### 3.5 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| 空白 URL / 未選擇檔案 | 禁用 Process 按鈕 |
| 非 YouTube URL | 顯示錯誤「僅支援 YouTube 連結」 |
| 下載超時 | 顯示錯誤「下載失敗」 |
| Pitch 值為邊界 (-12, +12) | 正常處理 |
| 人聲消除處理失敗 | 顯示錯誤並提供原始檔案 |
| 多軌輸出 + 人聲消除同時啟用 | 輸出 instrumental + 選擇的音軌 |
| 輸出目錄無寫入權限 | 顯示錯誤「無法寫入輸出目錄」 |
| 磁碟空間不足 | 顯示錯誤「磁碟空間不足」 |
| 本地檔案處理後殘留 htdemucs_ft 目錄 | 自動清理 Demucs 暫存目錄 |

---

## 4. Acceptance Criteria

### 4.1 Success Conditions

| ID | Feature | Acceptance Criteria |
|----|---------|-------------------|
| AC1 | URL 下載 | 輸入有效的 YouTube URL，按下按鈕後能成功下載音訊為 WAV 檔 |
| AC2 | 本地檔案處理 | 選擇本地音訊檔案，能正確處理並輸出 |
| AC3 | 進度顯示 | 處理進度即時更新，百分比與實際進度相符 |
| AC4 | 音高調整 | 設定 +5 半音，輸出檔案的音高確實提升，且無變速 |
| AC5 | 音高調整 | 設定 -3 半音，輸出檔案的音高確實降低 |
| AC6 | 人聲消除 | 開啟人聲移除，輸出檔案的人聲被有效移除 |
| AC7 | 人聲消除 | 關閉人聲移除，輸出檔案保留完整人聲 |
| AC8 | 組合處理 | 同時調整音高 + 消除人聲，兩者皆正確生效 |
| AC9 | 多軌輸出 | 選擇 Vocals + Bass，輸出兩個獨立的音軌檔案 |
| AC10 | 多軌 + 人聲消除 | 兩者同時啟用時，輸出 instrumental + 選擇的音軌 |
| AC11 | 輸出格式 | 選擇 MP3 或 FLAC，輸出正確格式的檔案 |
| AC12 | 音訊品質 | 選擇 24-bit，輸出檔案為 24-bit 格式 |
| AC13 | 檔案清理 | 處理完成後，暫存檔案自動刪除，只保留輸出檔 |
| AC14 | Demucs 清理 | 本地檔案處理後，htdemucs_ft 目錄被正確刪除 |
| AC15 | 錯誤處理 | 無效 URL 會顯示明確的錯誤訊息 |
| AC16 | Open Folder | 按下按鈕能正確開啟輸出資料夾 |
| AC17 | 輸出檔案命名 | 檔案名稱符合預期格式（標題、標題_instrumental、標題_音軌） |
| AC18 | 攜帶式部署 | win-unpacked 資料夾可獨立複製到其他電腦執行 |
| AC19 | 訂閱系統 | 試用期 1 天正確計算 |
| AC20 | 訂閱系統 | 登入/註冊功能正常運作 |
| AC21 | 訂閱系統 | 選擇月付/年付方案，產生綠界定期定額 |
| AC22 | 訂閱系統 | 選擇永久授權，產生綠界一次性付款 |
| AC23 | 訂閱系統 | 取消訂閱後於本週期結束前仍可使用 |
| AC24 | 訂閱系統 | 過期後顯示「訂閱已過期」，阻止使用 |
| AC25 | 線上驗證 | 軟體啟動時線上驗證訂閱狀態 |
| AC26 | 裝置管理 | 同一帳號最多註冊 3 台裝置 |

### 4.2 Visual Checkpoints

1. **初始狀態:** 輸入框為空，Pitch 為 0，人聲移除為關閉，Process 按鈕禁用
2. **未登入:** 顯示登入/註冊提示，Process 按鈕禁用
3. **URL 輸入後:** Process 按鈕啟用，漸層紅色按鈕，顯示「下載並處理」
4. **本地檔案選擇後:** Process 按鈕啟用，顯示「處理音訊」
5. **Processing 狀態:** Progress Bar 顯示進度漸層動畫，Status 顯示當前階段
6. **完成狀態:** Progress Bar 100%，Output 卡片綠色邊框淡入顯示
7. **錯誤狀態:** Status 顯示錯誤訊息 (紅色)

---

## 5. Technical Stack

### Frontend (Electron App)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Electron | 25.9.8 |
| Frontend | HTML5 + CSS3 + Vanilla JavaScript | - |
| YouTube Download | yt-dlp (via Python) | latest |
| Pitch Shifting | FFmpeg rubberband filter | 8.1 |
| Vocal Separation | Demucs (htdemucs_ft) via Python | - |
| ML Framework | PyTorch | 2.9.0 |
| Audio | torchaudio | 2.9.0 |
| CUDA | NVIDIA CUDA | 12.8 |
| Audio Converter | FFmpeg | - |
| Build Tool | electron-builder | 26.8.1 |
| Logging | electron-log | 5.0.0 |
| Output Format | WAV, MP3, FLAC | - |

### Backend (Server)
| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express | 4.18 |
| Database | PostgreSQL | 15+ |
| Authentication | JWT | - |
| Password Hash | bcryptjs | 2.4 |
| HTTP Client | axios | 1.6 |
| Payment | 綠界科技 ECPay | - |

---

## 6. Distribution

### 6.1 Portable Build

```
dist/
├── win-unpacked/                          (攜帶式資料夾)
│   ├── Music Processor.exe
│   └── resources/
│       ├── app.asar
│       ├── python/                        # Python 環境
│       └── ffmpeg/                        # FFmpeg
└── Music-Processor-Portable.zip           (ZIP 分發包)
```

使用 ZIP 攜帶式分發，無需安裝程式。

---

## 7. Output Location & File Naming

- **Default Output Path:** `%USERPROFILE%\Music\MusicProcessor\`
- **Temp Path:** `%TEMP%\music_processor\`
- **Cleanup:** 處理完成後自動刪除暫存檔，Demucs 暫存目錄也會清理

### 7.1 File Naming Convention

| Mode | Output File(s) |
|------|----------------|
| 基本處理 | `{標題}.{格式}` |
| 人聲移除 | `{標題}_instrumental.{格式}` |
| 多軌輸出 (多選) | `{標題}_vocals.{格式}`, `{標題}_bass.{格式}`, etc. |
| 多軌 + 人聲移除 | `{標題}_instrumental.{格式}`, `{標題}_vocals.{格式}`, etc. |

---

## 8. Open Source Licenses

| Component | License | Description |
|-----------|---------|-------------|
| yt-dlp | Unlicense (公眾領域) | YouTube 下載工具 |
| Demucs | MIT License (Facebook Research) | 人聲分離模型 |
| FFmpeg | LGPL v2.1 / GPL | 音訊處理 |
| PyTorch | BSD-style License | 深度學習框架 |
| Electron | MIT License | 桌面應用框架 |

---

## 9. Subscription System (線上驗證 - 綠界)

### 9.1 Overview

本軟體採用線上訂閱驗證系統，結合綠界科技金流服務。

- **訂閱方案：** 月付 / 年付 / 永久授權
- **金流：** 綠界科技（信用卡定期定額、ATM、超商）
- **驗證：** 每次啟動時線上驗證訂閱狀態

### 9.2 Subscription Plans

| 方案 | 特價 | 原價 | 說明 |
|------|------|------|------|
| 月付方案 | NT$200/月 | NT$250/月 | 完整功能，自動月扣 |
| 年付方案 | NT$2,100/年 | NT$2,700/年 | 完整功能，省 22% |
| 永久授權 | NT$6,000 | NT$9,000 | 一次購買，終身使用 |

> 優惠價限時供應中

### 9.3 Payment Methods

| 方式 | 適用方案 | 說明 |
|------|----------|------|
| 信用卡定期定額 | 月付/年付 | 自動每月/每年扣款 |
| 信用卡一次性 | 永久授權 | 一次付清 |
| ATM 轉帳 | 永久授權 | 一次性轉帳 |
| 超商代碼 | 永久授權 | 便利商店代碼繳費 |

### 9.4 Authentication Flow

```
使用者啟動軟體
       ↓
檢查本地 JWT Token
       ↓
Token 有效 → 線上驗證訂閱狀態 → 驗證通過 → 正常使用
       ↓
Token 過期/無效 → 顯示登入介面
       ↓
使用者登入/註冊
       ↓
選擇訂閱方案 → 跳轉綠界付款 → 付款成功 → 開始使用
```

### 9.5 Device Registration

- 每個帳號最多註冊 3 台裝置
- 驗證時需提供 machineId 識別
- 可在帳號管理介面移除裝置

### 9.6 License States

| 狀態 | 說明 | UI 顯示 |
|------|------|---------|
| Trial | 試用期內 | 鎖頭圖示 +「試用中 (剩餘 1 天)」|
| Active | 訂閱有效 | 開鎖圖示 +「已訂閱」+ 到期日 |
| Cancelled | 取消待過期 | 鎖頭圖示 +「已取消，到期日: X」|
| Expired | 已過期 | 鎖頭圖示 +「訂閱已過期」|

### 9.7 Server API (Backend)

詳見 [server/API_SPEC.md](server/API_SPEC.md)

| Endpoint Group | Description |
|-----------------|-------------|
| `/auth/*` | 會員註冊/登入/登出 |
| `/subscription/*` | 訂閱方案/建立/取消 |
| `/license/*` | 驗證/裝置管理 |
| `/payment/*` | 付款/發票 |
| `/webhook/*` | 綠界回調處理 |

### 9.8 Database Schema

```
users
├── id (UUID)
├── email
├── password_hash
└── created_at

subscriptions
├── id (UUID)
├── user_id (FK)
├── ecpay_customer_id
├── plan (monthly/yearly/lifetime)
├── status (active/cancelled/expired)
├── current_period_start
├── current_period_end
└── cancel_at_period_end

payments
├── id (UUID)
├── user_id (FK)
├── subscription_id (FK)
├── ecpay_order_id
├── amount
├── status (pending/paid/failed)
└── paid_at

devices
├── id (UUID)
├── user_id (FK)
├── machine_id
├── name
└── last_active_at
```

### 9.9 Security

- JWT Token 24小時過期
- 密碼 bcrypt hash
- 綠界 CheckMacValue 驗證
- HTTPS 全程加密
- 信用卡 token（不存卡號）

---

## 10. Project Structure

```
youtube-music-processor/
├── src/
│   ├── main/                    # Electron 主程序
│   │   ├── main.js
│   │   └── modules/
│   │       ├── licenseManager.js  # 本地授權（已停用）
│   │       ├── authManager.js     # 線上驗證（新）
│   │       └── ...
│   └── renderer/                # 前端介面
│       ├── index.html
│       ├── renderer.js
│       └── styles.css
│
├── server/                     # 後端伺服器
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   ├── API_SPEC.md             # API 規格文件
│   └── package.json
│
├── SPEC.md                     # 本規格文件
└── dist/                       # 打包輸出
```

---

## 11. Future Feature Ideas

| Feature | Description |
|---------|-------------|
| **批次處理** | 一次處理多個 URL |
| **雲端同步** | 跨裝置同步設定 |
| **EQ 調整** | 額外的音場調整功能 |
| **混音功能** | 結合多個音頻 |
| **自動更新** | 應用程式自動更新機制 |
| **優惠券系統** | 折扣碼/優惠券兌換 |
