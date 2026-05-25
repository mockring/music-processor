const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

class Downloader {
  constructor(fileManager) {
    this.fileManager = fileManager;
  }

  getResourcesPath() {
    // In packaged app: process.resourcesPath = .../Music Ring/resources
    // Python is stored at: .../Music Ring/resources/python
    return process.resourcesPath || path.join(__dirname, '../../../resources');
  }

  getPythonExePath() {
    return path.join(this.getResourcesPath(), 'python', 'python.exe');
  }

  getFFmpegBinPath() {
    return path.join(this.getResourcesPath(), 'ffmpeg', 'bin');
  }

  async download(url, onProgress) {
    const title = await this.getVideoTitle(url);
    const sanitizedTitle = this.sanitizeFileName(title);
    const outputPath = this.fileManager.generateTempFilePath(sanitizedTitle, 'wav');

    return new Promise((resolve, reject) => {
      const portablePython = this.getPythonExePath();
      const ffmpegBinPath = this.getFFmpegBinPath();
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
      log.info('Using Python at:', portablePython);
      log.info('Using FFmpeg at:', ffmpegBinPath);

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
      const portablePython = this.getPythonExePath();
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
