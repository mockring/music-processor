const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

class AudioProcessor {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.currentProcess = null;
  }

  cancel() {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill('SIGTERM');
      log.info('Audio processing cancelled');
    }
  }

  // Copy file to temp directory to prevent source directory pollution
  async copyToTemp(inputPath) {
    const fs = require('fs');
    const outputPath = this.fileManager.generateTempFilePath('copy', 'wav');
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  async changePitch(inputPath, semitones, onProgress) {
    if (semitones === 0) {
      // Skip pitch processing, caller handles progress
      return inputPath;
    }

    const outputPath = this.fileManager.generateTempFilePath('pitched', 'wav');
    // rubberband pitch parameter is a ratio: ratio = 2^(semitones/12)
    const pitchRatio = Math.pow(2, semitones / 12);

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-af', `rubberband=pitch=${pitchRatio}`,
        '-y',
        outputPath
      ];

      log.info(`Changing pitch by ${semitones} semitones (ratio: ${pitchRatio})`);

      // Add FFmpeg shared DLLs to PATH from extraResources
      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
      const ffmpegPath = path.join(ffmpegBinPath, 'ffmpeg.exe');
      const env = { ...process.env, PATH: `${ffmpegBinPath};${process.env.PATH}` };

      const ffmpeg = spawn(ffmpegPath, args, { env });

      // Store reference for cancellation
      this.currentProcess = ffmpeg;

      let stderrData = '';

      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('error', (error) => {
        log.error('ffmpeg spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 ffmpeg，請先安裝依賴項目'));
        } else {
          reject(error);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          if (fs.existsSync(outputPath)) {
            log.info('Pitch change completed:', outputPath);
            onProgress(100);
            resolve(outputPath);
          } else {
            reject(new Error('音高調整後檔案未生成'));
          }
        } else {
          log.error('ffmpeg exited with code:', code);
          reject(new Error(`音高調整失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }
}

module.exports = { AudioProcessor };
