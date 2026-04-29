# Music Processor

從網路下載音樂、調整音高、消除人聲的桌面應用程式。

## 前置需求

在執行本應用程式之前，請先安裝以下工具：

### 1. Node.js
- 下載並安裝 Node.js (建議 v18+): https://nodejs.org/

### 2. yt-dlp
```bash
# 使用 pip 安裝
pip install yt-dlp

# 或使用 npm 安裝
npm install -g yt-dlp
```

### 3. ffmpeg
```bash
# Windows (使用 winget)
winget install ffmpeg

# 或下載並加入 PATH: https://ffmpeg.org/download.html
```

### 4. Demucs (用於人聲分離)
```bash
pip install demucs
```

## 安裝與執行

```bash
# 進入專案目錄
cd musictool

# 安裝依賴
npm install

# 執行開發模式
npm start
```

## 建構 exe 檔案

```bash
npm run build
```

建構完成後，exe 檔案會在 `dist/` 目錄中。

## 功能說明

### 下載網路音樂
- 複製網路影片連結（支援 YouTube 等）
- 貼上至 URL 輸入框
- 點擊 "下載並處理"

### 調整音高
- 拖曳滑桿可調整 -12 到 +12 半音
- 正值 = 升 key，負值 = 降 key

### 消除人聲
- 開啟人聲移除開關
- 應用會使用 Demucs AI 模型分離人聲
- 輸出將只包含樂器部分

### 多軌輸出
- 可選擇輸出 bass、drums、other、vocals 音軌
- 支援單獨輸出任一音軌

## 輸出位置

- 預設輸出資料夾: `C:\Users\[使用者名稱]\Music\MusicProcessor\`
- 輸出格式: WAV、MP3、FLAC

## 技術架構

- **框架**: Electron
- **下載**: yt-dlp
- **音訊處理**: ffmpeg (rubberband)
- **人聲分離**: Demucs (htdemucs_ft model)
- **輸出格式**: WAV、MP3、FLAC
