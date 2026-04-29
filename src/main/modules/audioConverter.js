const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

class AudioConverter {
  constructor(fileManager) {
    this.fileManager = fileManager;
  }

  getResourcesPath() {
    return app.isPackaged
      ? path.dirname(app.getAppPath())
      : path.join(__dirname, '../../../../');
  }

  getFFmpegPath() {
    const ffmpegBinPath = path.join(this.getResourcesPath(), 'ffmpeg', 'bin');
    return path.join(ffmpegBinPath, 'ffmpeg.exe');
  }

  async convert(inputPath, outputPath, format, bitrate, onProgress) {
    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath];

      // Set output format and codec
      switch (format) {
        case 'mp3':
          args.push('-codec:a', 'libmp3lame');
          // Quality: 0 (best) to 9 (worst), using 2 for high quality
          args.push('-qscale:a', '2');
          break;
        case 'flac':
          args.push('-codec:a', 'flac');
          // FLAC compression level 0-12, 8 is default high quality
          args.push('-compression_level', '8');
          break;
        case 'wav':
        default:
          // WAV format - specify PCM encoding
          args.push('-codec:a', 'pcm_s' + bitrate + 'le');
          break;
      }

      args.push('-y', outputPath);

      log.info(`Converting to ${format} (${bitrate}-bit):`, inputPath, '->', outputPath);

      const ffmpegBinPath = path.join(this.getResourcesPath(), 'ffmpeg', 'bin');
      const env = { ...process.env, PATH: `${ffmpegBinPath};${process.env.PATH}` };

      const ffmpeg = spawn(this.getFFmpegPath(), args, { env });

      let stderrData = '';

      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('error', (error) => {
        log.error('FFmpeg convert spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 FFmpeg，請確認已安裝'));
        } else {
          reject(error);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          if (fs.existsSync(outputPath)) {
            log.info('Conversion completed:', outputPath);
            if (onProgress) onProgress(100);
            resolve(outputPath);
          } else {
            reject(new Error('轉換後檔案未生成'));
          }
        } else {
          log.error('FFmpeg exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`格式轉換失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }
}

module.exports = { AudioConverter };