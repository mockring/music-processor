const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

class Downloader {
  constructor(fileManager) {
    this.fileManager = fileManager;
  }

  async download(url, onProgress) {
    // First get the video title
    const title = await this.getVideoTitle(url);
    const sanitizedTitle = this.sanitizeFileName(title);
    const outputPath = this.fileManager.generateTempFilePath(sanitizedTitle, 'wav');

    return new Promise((resolve, reject) => {
      // Use portable Python environment from extraResources
      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const portablePython = path.join(resourcesPath, 'python', 'python.exe');
      const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
      const args = [
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', 'wav',
        '--audio-quality', '0',
        '--ffmpeg-location', ffmpegBinPath,
        '-o', outputPath,
        '--no-playlist',
        url
      ];

      log.info('Starting download with yt-dlp:', url);

      const ytdlp = spawn(portablePython, ['-m', 'yt_dlp', ...args]);

      let stderrData = '';

      ytdlp.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ytdlp.on('error', (error) => {
        log.error('yt-dlp spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('yt-dlp 安裝有問題，請確認已安裝 (pip install yt-dlp)'));
        } else {
          reject(error);
        }
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          if (fs.existsSync(outputPath)) {
            log.info('Download completed:', outputPath);
            onProgress(100);
            resolve({ filePath: outputPath, title: sanitizedTitle });
          } else {
            reject(new Error('下載檔案未生成'));
          }
        } else {
          log.error('yt-dlp exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`下載失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  async getVideoTitle(url) {
    return new Promise((resolve, reject) => {
      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const portablePython = path.join(resourcesPath, 'python', 'python.exe');
      const env = { ...process.env, PYTHONIOENCODING: 'utf8' };
      const ytdlp = spawn(portablePython, ['-m', 'yt_dlp', '--get-title', url], { env });

      let titleData = '';

      ytdlp.on('error', (error) => {
        reject(error);
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          resolve(titleData.trim());
        } else {
          resolve('audio');
        }
      });

      ytdlp.stdout.on('data', (data) => {
        titleData += data.toString('utf8');
      });
    });
  }

  sanitizeFileName(name) {
    // Remove invalid filename characters and truncate
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 100);
  }
}

module.exports = { Downloader };
