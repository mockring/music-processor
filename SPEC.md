# 音樂鈴 Music Ring — SPEC.md

## 1. Project Overview

**Project Name:** 音樂鈴 Music Ring
**Type:** Desktop Application (Electron)
**Core Feature Summary:** 從網路 URL 下載音樂、處理本地音訊檔案、調整音高 (升降 key)、消除人聲生成 instrumental 版本、多軌輸出。
**Target Users:** 音樂愛好者、創作者、卡拉OK用途

---

## 2. Licensing Model (新)

### 2.1 授權方式

| 類型 | 說明 |
|------|------|
| **免費試用** | 首次使用可享 1 小時試用期，綁定裝置，限一次 |
| **序號啟用** | 購買後獲得序號，輸入後終身使用，綁定單一裝置 |

### 2.2 試用流程

```
首次執行軟體
    ↓
檢測到無序號 → 啟動 1 小時試用期
    ↓
發送 machine_id 到 server → server 記錄試用開始時間
    ↓
試用期內可正常使用所有功能
    ↓
試用期結束 → 提示輸入序號
```

### 2.3 序號啟用流程

```
會員在網站註冊 → 登入 → 購買終身方案 → 匯款
    ↓
在網站填寫匯款資料 → 系統通知後台
    ↓
後台確認收款 → 系統產生序號 → Email 寄送序號
    ↓
會員在軟體輸入序號 → 系統驗證 → 啟用成功 → 終身使用
```

---

## 3. UI/UX Specification

### 3.1 Window Model

- **Main Window:** 單一主視窗，尺寸 900×780px，最小 700×650px
- **Native Window Frame:** 使用標準視窗框架 (含關閉/最小化/最大化按鈕)
- **Auto-hide Menu Bar:** 選單列自動隱藏

### 3.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  🎵 音樂鈴 Music Ring  v1.0.0                             │
├─────────────────────────────────────────────────────────────┤
│  📁 Output Folder: C:\Users\...\Music\...     [更改]       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐ ┌───────┐│
│  │  貼上網址下載或本地檔案路徑                  │ │ 貼上  ││
│  └─────────────────────────────────────────────┘ └───────┘│
│  ┌─────────────────────────────────────────────┐ ┌───────┐│
│  │  尚未選擇檔案                               │ │選擇檔案││
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
│  ████████████░░░░░░░░░░░░░░░░  45%                       │
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

### 3.3 License Activation UI (新)

當軟體未啟用或試用期結束時，顯示序號輸入介面：

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           🔓 序號啟用                                        │
│                                                             │
│     感謝您使用音樂鈴 Music Ring                              │
│     請輸入您的序號以啟用終身使用                               │
│                                                             │
│     ┌─────────────────────────────────────────┐            │
│     │  XXXX-XXXX-XXXX-XXXX                    │            │
│     └─────────────────────────────────────────┘            │
│                                                             │
│     [ 啟用 ]                                                │
│                                                             │
│     沒有序號？ 免費試用 1 小時                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Visual Design

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

### 3.5 Components

| Component | States | Behavior |
|-----------|--------|----------|
| URL Input | default, focused, error | 輸入 URL 後即時驗證格式 |
| Paste Button | default, hover, active | 點擊從剪貼簿貼上 |
| Local File Display | empty, selected | 顯示選擇的檔案名稱 |
| Select File Button | default, hover | 開啟檔案選擇對話框 |
| Output Folder Card | default, hover | 顯示目前輸出路徑 |
| Pitch Slider | default, dragging | 拖曳回傳 -12 到 +12 的整數值 |
| Pitch Value Display | static | 顯示目前選擇的半音數 (如 "+5" 或 "0") |
| Vocal Remover Toggle | off, on | 切換時狀態文字變色 |
| Format Radio Buttons | WAV selected, MP3, FLAC | 單選輸出格式 |
| Bitdepth Radio Buttons | 16-bit, 24-bit, 32-bit | 單選音訊品質 |
| Multi-Stem Checkboxes | Vocals, Bass, Drums, Other | 可多選多軌輸出 |
| Process Button | default, hover, processing, disabled | hover上浮效果，processing顯示"處理中..." |
| Progress Bar | 0-100% | 即時更新，漸層色彩 |
| Status Text | info, success, error | 顯示目前處理階段 |
| Output Card | hidden, visible | 完成後淡入動畫，綠色邊框高亮 |
| Open Folder Button | default, hover | 開啟輸出資料夾 |
| Serial Input | empty, entered, validating, error | 輸入並驗證序號 |
| Trial Banner | visible during trial | 顯示剩餘時間 |

---

## 4. Functional Specification

### 4.1 Core Features

#### 4.1.1 YouTube URL 下載
- **Input:** YouTube 影片/音樂 URL (支援 youtube.com, youtu.be)
- **Process:**
  1. 使用 `yt-dlp` 從 URL 提取音訊
  2. 下載為 WAV 格式 (保持最高品質)
  3. 使用 FFmpeg 進行音訊處理
- **Output Path:** 使用者選擇的輸出資料夾，預設 `%USERPROFILE%\Music\MusicRing\`
- **File Naming:** YouTube 影片標題作為檔案名稱

#### 4.1.2 本地檔案處理
- **Input:** 支援 WAV, MP3, FLAC, OGG, M4A, AAC, WMA 格式
- **Process:** 直接進行音訊處理（跳過下載步驟）
- **Cleanup:** 處理後自動清理 Demucs 暫存目錄

#### 4.1.3 音高調整 (Pitch Shifting)
- **Range:** -12 到 +12 半音 (semitones)
- **Implementation:** 使用 FFmpeg 的 `rubberband` 濾鏡
  - 公式: `ratio = 2^(semitones/12)`
  - 使用 `rubberband=pitch=${ratio}` 參數
- **Time-Preserving:** rubberband 會保持時間不變，只改變音高
- **Default Value:** 0 (不改變)

#### 4.1.4 人聲消除 (Vocal Removal)
- **Model:** Demucs (`htdemucs_ft`) — Facebook/Meta 開源
- **GPU Support:** 使用 CUDA (RTX 系列顯示卡優化)
- **Environment:** Python 3.8-3.12 + PyTorch 2.9.0 + torchaudio 2.9.0 + CUDA 12.8
- **Process:**
  1. 將 WAV 檔案傳入 Demucs 模型 (`--two-stems=vocals`)
  2. 模型輸出 `vocals.wav` 和 `no_vocals.wav`
  3. `no_vocals.wav` 即為 instrumental 版本
- **Toggle:** 用戶可選擇是否啟用人聲消除
- **Output:** 如果關閉 → 輸出升降 key 後的音樂；如果開啟 → 輸出 instrumental 版本

#### 4.1.5 多軌輸出 (Multi-Stem Output)
- **Model:** Demucs (`htdemucs_ft`) 全分離模式
- **Available Tracks:** Vocals, Bass, Drums, Other
- **Selection:** 可任意選擇要輸出的音軌（可多選）
- **Combined Mode:** 若同時啟用人聲移除，會輸出 instrumental + 選擇的音軌
- **Output Naming:**
  - `標題_instrumental.wav` (去除人聲版本)
  - `標題_vocals.wav`, `標題_bass.wav`, `標題_drums.wav`, `標題_other.wav`

#### 4.1.6 輸出格式與品質
- **Format Options:** WAV (無損), MP3, FLAC，預設 WAV
- **Bitdepth Options:** 16-bit, 24-bit, 32-bit，預設 32-bit
- **Conversion:** 使用 FFmpeg 進行格式和位元深度轉換

### 4.2 User Interaction Flow

```
軟體啟動
    ↓
檢查本地有序號？ → 是 → 驗證序號有效性
    ↓
否 → 檢查試用狀態
    ↓
已有試用記錄？
  ├─ 是 → 檢查是否過期
  │     ├─ 未過期 → 顯示試用剩餘時間，正常使用
  │     └─ 已過期 → 顯示序號輸入介面
  │
  └─ 否 → 啟動 1 小時試用期
           ↓
      使用者操作音訊
           ↓
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
6. User 選擇音訊品質 (16/24/32-bit，預設 32-bit)
        ↓
7. User 選擇多軌輸出 (可多選 Vocals/Bass/Drums/Other)
        ↓
8. User 點擊 "下載並處理" 或 "處理音訊"
        ↓
9. Progress: 處理進度顯示
        ↓
10. 完成後顯示輸出位置
```

### 4.3 Data Flow & Key Modules

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process (Electron)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ URLValidator│  │ Downloader  │  │ AudioProcessor      │   │
│  │ - validate()│  │ - download() │  │ - changePitch()    │   │
│  │            │  │ - getTitle()│  │                    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ FileManager │  │ DemucsRunner │  │ AudioConverter      │   │
│  │ - tempDir() │  │ - separate() │  │ - convert()        │   │
│  │ - cleanup() │  │ - separateAll()│ │                    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ LicenseMgr  │  │ TrialManager│  │ SerialKeyManager    │   │
│  │ - verify()  │  │ - check()    │  │ - activate()        │   │
│  │ - save()    │  │ - start()    │  │ - validate()        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓ IPC
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (UI)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ URLInput    │  │ Controls    │  │ ProgressDisplay     │   │
│  │ Component   │  │ Component   │  │ Component           │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ LicenseUI   │  │ TrialUI     │  │ SerialInputUI       │   │
│  │ Component   │  │ Component   │  │ Component           │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
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
| `TrialManager` | 試用期管理 | `checkTrialStatus(machineId): Promise<TrialStatus>` <br> `startTrial(machineId): Promise<void>` |
| `SerialKeyManager` | 序號管理 | `activate(serial, machineId): Promise<boolean>` <br> `validate(machineId): Promise<boolean>` |
| `LicenseManager` | 本地授權檔案管理 | `saveLicense(serial)`, `loadLicense(): LicenseInfo` |

### 4.4 Path Resolution (Packaged App)

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

### 4.5 Edge Cases

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
| 試用期已過 | 顯示序號輸入介面，禁用處理功能 |
| 序號無效 | 顯示錯誤「序號無效」，可重新輸入 |
| 序號已被其他裝置使用 | 顯示錯誤「序號已被使用」 |
| 網路連線失敗 | 顯示錯誤「無法連線到伺服器」，可離線使用（有試用期） |

---

## 5. Acceptance Criteria

### 5.1 Success Conditions

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
| AC17 | 輸出檔案命名 | 檔案名稱符合預期格式 |
| AC18 | 攜帶式部署 | win-unpacked 資料夾可獨立複製到其他電腦執行 |
| AC19 | 免費試用 | 首次啟動可使用 1 小時試用期 |
| AC20 | 試用計時 | 試用剩餘時間正確顯示 |
| AC21 | 試用限制 | 試用期結束後需輸入序號才能繼續使用 |
| AC22 | 序號啟用 | 輸入正確序號後可終身使用 |
| AC23 | 序號綁定 | 序號只能綁定一台裝置 |
| AC24 | 序號無效 | 輸入無效序號顯示錯誤訊息 |
| AC25 | 序號重用拒絕 | 已使用的序號無法再次啟用 |

### 5.2 Visual Checkpoints

1. **啟動無序號:** 顯示序號輸入介面，背景為深色漸層
2. **試用中:** 顯示試用剩餘時間，功能正常
3. **試用結束:** 提示試用期結束，禁用處理功能
4. **URL 輸入後:** Process 按鈕啟用，漸層紅色按鈕，顯示「下載並處理」
5. **本地檔案選擇後:** Process 按鈕啟用，顯示「處理音訊」
6. **Processing 狀態:** Progress Bar 顯示進度漸層動畫，Status 顯示當前階段
7. **完成狀態:** Progress Bar 100%，Output 卡片綠色邊框淡入顯示
8. **錯誤狀態:** Status 顯示錯誤訊息 (紅色)

---

## 6. Technical Stack

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
| Email | Nodemailer + Gmail SMTP | - |

---

## 7. Distribution

### 7.1 Portable Build

```
dist/
├── win-unpacked/                          (攜帶式資料夾)
│   ├── 音樂鈴 Music Ring.exe
│   └── resources/
│       ├── app.asar
│       ├── python/                        # Python 環境
│       └── ffmpeg/                        # FFmpeg
└── Music-Ring-Portable.zip                (ZIP 分發包)
```

使用 ZIP 攜帶式分發，無需安裝程式。

---

## 8. Output Location & File Naming

- **Default Output Path:** `%USERPROFILE%\Music\MusicRing\`
- **Temp Path:** `%TEMP%\music_ring\`
- **Cleanup:** 處理完成後自動刪除暫存檔，Demucs 暫存目錄也會清理

### 8.1 File Naming Convention

| Mode | Output File(s) |
|------|----------------|
| 基本處理 | `{標題}.{格式}` |
| 人聲移除 | `{標題}_instrumental.{格式}` |
| 多軌輸出 (多選) | `{標題}_vocals.{格式}`, `{標題}_bass.{格式}`, etc. |
| 多軌 + 人聲移除 | `{標題}_instrumental.{格式}`, `{標題}_vocals.{格式}`, etc. |

---

## 9. Open Source Licenses

| Component | License | Description |
|-----------|---------|-------------|
| yt-dlp | Unlicense (公眾領域) | YouTube 下載工具 |
| Demucs | MIT License (Facebook Research) | 人聲分離模型 |
| FFmpeg | LGPL v2.1 / GPL | 音訊處理 |
| PyTorch | BSD-style License | 深度學習框架 |
| Electron | MIT License | 桌面應用框架 |

---

## 10. Website (music-processor-web)

### 10.1 Overview

行銷網站，提供會員註冊、登入、購買、匯款資料填寫等功能。

**URL:** https://mockring.github.io/music-processor-web/ (GitHub Pages)

### 10.2 Pages

| Page | File | Description |
|------|------|-------------|
| 首頁 | docs/index.html | 產品介紹、價格、行銷內容 |
| 隱私權政策 | docs/privacy.html | 隱私權政策說明 |
| 服務條款 | docs/terms.html | 服務條款說明 |
| 會員登入/註冊 | (future) | 會員系統 |
| 購買頁面 | (future) | 選擇方案、匯款資訊 |
| 匯款回報 | (future) | 填寫匯款資料 |

### 10.3 網站功能

| Feature | Status | Description |
|---------|--------|-------------|
| 會員註冊 | Implemented | Email + 密碼註冊 |
| 會員登入 | Implemented | Email + 密碼登入 |
| 終身方案展示 | Implemented | NT$300 (原價 NT$1000) |
| 匯款資訊展示 | Future | 顯示匯款帳號 |
| 匯款資料填寫 | Future | 會員填寫匯款帳號、金額、時間 |
| Email 通知 | Future | 匯款確認後寄送序號 |

### 10.4 產品名稱

- **軟體名稱:** 音樂鈴 Music Ring
- **網站標題:** 音樂鈴 Music Ring - 音樂處理工具

---

## 11. Backend Server API

### 11.1 Overview

後端 API 服務，位於 `server/` 目錄，已部署於 Render。

**Base URL:** https://music-processor-server.onrender.com/v1

### 11.2 API Endpoints

#### 認證相關 (現有)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | 會員註冊 |
| `/auth/login` | POST | 會員登入 |
| `/auth/logout` | POST | 會員登出 |
| `/auth/me` | GET | 取得會員資料 |

#### 試用相關 (新)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trial/start` | POST | 開始試用期（記錄 machine_id） |
| `/trial/status` | GET | 檢查試用狀態（需 machine_id） |

#### 序號相關 (新)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/serial/activate` | POST | 啟用序號（序號 + machine_id） |
| `/serial/status` | GET | 查詢序號狀態（需 machine_id） |

#### 付款相關 (新)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payment/submit` | POST | 會員提交匯款資料 |
| `/payment/status` | GET | 查看付款狀態 |

#### 管理後台 (新)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/payments` | GET | 查看待確認匯款 |
| `/admin/confirm-payment` | POST | 確認匯款並發放序號 |
| `/admin/create-serial` | POST | 手動產生序號 |
| `/admin/serials` | GET | 查看所有序號 |

### 11.3 Database Schema

```sql
-- 會員資料 (現有)
users
├── id (UUID) PRIMARY KEY
├── email (VARCHAR) UNIQUE NOT NULL
├── password_hash (VARCHAR) NOT NULL
└── created_at (TIMESTAMP) DEFAULT NOW()

-- 序號資料 (新)
serial_keys
├── id (UUID) PRIMARY KEY
├── serial_key (VARCHAR) UNIQUE NOT NULL
├── user_id (UUID) REFERENCES users(id)
├── machine_id (VARCHAR) -- 預設 NULL，啟用後綁定
├── is_used (BOOLEAN) DEFAULT false
├── created_at (TIMESTAMP) DEFAULT NOW()
└── activated_at (TIMESTAMP)

-- 試用記錄 (新)
trial_records
├── id (UUID) PRIMARY KEY
├── machine_id (VARCHAR) UNIQUE NOT NULL
├── trial_started_at (TIMESTAMP) DEFAULT NOW()
├── trial_expires_at (TIMESTAMP) -- trial_started_at + 1 hour
└── is_active (BOOLEAN) DEFAULT true

-- 匯款資料 (新)
payment_submissions
├── id (UUID) PRIMARY KEY
├── user_id (UUID) REFERENCES users(id)
├── bank_account (VARCHAR)
├── amount (INTEGER)
├── transfer_time (TIMESTAMP)
├── status (VARCHAR) DEFAULT 'pending' -- pending/confirmed/cancelled
├── notes (TEXT)
├── created_at (TIMESTAMP) DEFAULT NOW()
└── confirmed_at (TIMESTAMP)
```

### 11.4 將移除的資料表

- `subscriptions` — 訂閱制移除
- `payments` — 綠界付款移除
- `devices` — 裝置註冊移除

---

## 12. Project Structure

```
musictool/
├── src/
│   ├── main/                    # Electron 主程序
│   │   ├── main.js              # 主程式入口
│   │   ├── preload.js          # IPC 橋樑
│   │   └── modules/
│   │       ├── urlValidator.js
│   │       ├── downloader.js
│   │       ├── audioProcessor.js
│   │       ├── demucsRunner.js
│   │       ├── audioConverter.js
│   │       ├── fileManager.js
│   │       ├── licenseManager.js  # 序號/試用管理 (新)
│   │       └── trialManager.js    # 試用期管理 (新)
│   └── renderer/                # 前端介面
│       ├── index.html          # 主頁面
│       ├── renderer.js         # 前端邏輯
│       ├── styles.css          # 樣式
│       └── license.html        # 序號啟用頁面 (新)
│
├── server/                      # 後端伺服器
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── trialController.js   # 試用 API (新)
│   │   │   ├── serialController.js  # 序號 API (新)
│   │   │   ├── paymentController.js # 付款 API (新)
│   │   │   └── adminController.js   # 後台 API (新)
│   │   ├── models/
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── services/
│   │   │   ├── emailService.js     # Gmail SMTP (新)
│   │   │   └── serialService.js    # 序號產生 (新)
│   │   └── middleware/
│   ├── API_SPEC.md
│   └── package.json
│
├── docs/                        # 行銷網站 (GitHub Pages)
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   └── preview.png
│
├── LICENSE.md
├── package.json
├── SPEC.md                      # 本規格文件
└── dist/                        # 打包輸出
```

---

## 13. Implementation Progress

### 已完成

- [x] 軟體基本功能（URL下載、本地檔案處理、音高調整、人聲消除、多軌輸出）
- [x] 打包攜帶式版本
- [x] 網站上線 (Vercel + Next.js)
- [x] 終身方案定價 NT$300 (原價 NT$1000)
- [x] 登入驗證 bug 修復
- [x] 移除網站「AI」文字，改為「音樂鈴 Music Ring」
- [x] Server: 試用期 API (`/trial/*`)
- [x] Server: 序號 API (`/serial/*`)
- [x] Server: 匯款資料 API (`/payment/*`)
- [x] Server: 管理後台 (`/admin/*`)
- [x] Server: Email 寄送服務 (Resend)
- [x] Server: 資安修補 (RBAC, Rate Limiting, Email枚舉防護)
- [x] 網站: 會員登入/註冊頁面
- [x] 網站: 匯款資訊頁面
- [x] 網站: 匯款回報頁面
- [x] 資料庫: 建立新資料表 (serial_keys, trial_records, payment_submissions)
- [x] 前端 API proxy 完整

### 已實作

- [x] 軟體基本功能（URL下載、本地檔案處理、音高調整、人聲消除、多軌輸出）
- [x] 打包攜帶式版本
- [x] 網站上線 (Vercel + Next.js)
- [x] 終身方案定價 NT$300 (原價 NT$1000)
- [x] 登入驗證 bug 修復
- [x] 移除網站「AI」文字，改為「音樂鈴 Music Ring」
- [x] Server: 試用期 API (`/trial/*`)
- [x] Server: 序號 API (`/serial/*`)
- [x] Server: 匯款資料 API (`/payment/*`)
- [x] Server: 管理後台 (`/admin/*`)
- [x] Server: Email 寄送服務 (Resend)
- [x] Server: 資安修補 (RBAC, Rate Limiting, Email枚舉防護)
- [x] 網站: 會員登入/註冊頁面
- [x] 網站: 匯款資訊頁面
- [x] 網站: 匯款回報頁面
- [x] 資料庫: 建立新資料表 (serial_keys, trial_records, payment_submissions)
- [x] 前端 API proxy 完整
- [x] 軟體: 移除登入/註冊 UI
- [x] 軟體: 新增序號啟用 UI
- [x] 軟體: 新增試用期功能
- [x] 軟體: 本地序號儲存
- [x] 軟體: 試用期安全性 (刪除 trial_record.json 無法重置試用期)

### 待實作

- [ ] 資料庫: 移除舊資料表 (subscriptions, payments, devices)（可保留但不使用）
- [ ] 管理後台 UI（目前需透過 API 直接操作資料庫）

---

## 14. Future Feature Ideas

| Feature | Description |
|---------|-------------|
| 批次處理 | 一次處理多個 URL |
| 雲端同步 | 跨裝置同步設定 |
| EQ 調整 | 額外的音場調整功能 |
| 混音功能 | 結合多個音頻 |
| 自動更新 | 應用程式自動更新機制 |
| 優惠券系統 | 折扣碼/優惠券兌換 |