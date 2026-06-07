const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

class AudioConverter {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.currentProcess = null;
  }

  cancel() {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill('SIGTERM');
      log.info('Audio conversion cancelled');
    }
  }

  getResourcesPath() {
    // In packaged app: process.resourcesPath = .../Music Ring/resources
    // FFmpeg is stored at: .../Music Ring/resources/ffmpeg
    return process.resourcesPath || path.join(__dirname, '../../../resources');
  }

  getFFmpegExePath() {
    return path.join(this.getResourcesPath(), 'ffmpeg', 'bin', 'ffmpeg.exe');
  }

  getFFmpegBinPath() {
    return path.join(this.getResourcesPath(), 'ffmpeg', 'bin');
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
          // Validate bitrate - only allow 16, 24, or 32
          const validBitrates = [16, 24, 32];
          const safeBitrate = validBitrates.includes(bitrate) ? bitrate : 16;
          // 32-bit needs pcm_f32le (float), 16/24-bit use pcm_sXXle (signed integer)
          if (safeBitrate === 32) {
            args.push('-codec:a', 'pcm_f32le');
          } else {
            args.push('-codec:a', 'pcm_s' + safeBitrate + 'le');
          }
          break;
      }

      args.push('-y', outputPath);

      log.info(`Converting to ${format} (${bitrate}-bit):`, inputPath, '->', outputPath);

      const ffmpegBinPath = this.getFFmpegBinPath();
      const env = { ...process.env, PATH: `${ffmpegBinPath};${process.env.PATH}` };

      const ffmpeg = spawn(this.getFFmpegExePath(), args, { env });

      // Store reference for cancellation
      this.currentProcess = ffmpeg;

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