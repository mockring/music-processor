const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

class DemucsRunner {
  constructor(fileManager) {
    this.fileManager = fileManager;
  }

  async separate(audioPath, onProgress) {
    const inputDir = path.dirname(audioPath);
    const model = 'htdemucs_ft';

    return new Promise((resolve, reject) => {
      // Use --two-stems=vocals which outputs vocals.wav and no_vocals.wav
      // Pass full absolute path to Demucs since cwd may be different
      const args = [
        '-n', model,
        '--two-stems=vocals',
        '-o', inputDir,
        audioPath
      ];

      log.info('Running Demucs separation with GPU');

      // Use portable Python environment from extraResources
      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const portablePython = path.join(resourcesPath, 'python', 'python.exe');
      const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      const demucs = spawn(portablePython, ['-m', 'demucs', ...args], { env });

      let stderrData = '';

      demucs.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      demucs.on('error', (error) => {
        log.error('Demucs spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 Demucs，請確認已安裝 (pip install demucs)'));
        } else {
          reject(error);
        }
      });

      demucs.on('close', (code) => {
        if (code === 0) {
          const baseName = path.basename(audioPath, path.extname(audioPath));
          const separatedDir = path.join(inputDir, model, baseName);

          // With --two-stems=vocals, we get vocals.wav and no_vocals.wav
          const noVocalsPath = path.join(separatedDir, 'no_vocals.wav');
          const vocalsPath = path.join(separatedDir, 'vocals.wav');

          log.info('Demucs output dir:', separatedDir);
          log.info('Looking for no_vocals at:', noVocalsPath);

          if (fs.existsSync(noVocalsPath)) {
            log.info('Found no_vocals.wav - using as instrumental');
            // no_vocals.wav is already the instrumental, just rename it
            const outputPath = this.fileManager.generateTempFilePath('instrumental', 'wav');
            fs.copyFileSync(noVocalsPath, outputPath);
            onProgress(100);
            resolve(outputPath);
          } else if (fs.existsSync(vocalsPath)) {
            // If no_vocals doesn't exist but vocals does, fall back to mixing bass+drums+other
            log.info('no_vocals not found, looking for full stems...');
            const otherPath = path.join(separatedDir, 'other.wav');
            const bassPath = path.join(separatedDir, 'bass.wav');
            const drumsPath = path.join(separatedDir, 'drums.wav');

            if (fs.existsSync(otherPath)) {
              const outputPath = this.fileManager.generateTempFilePath('instrumental', 'wav');
              this.mixAudio([otherPath, bassPath, drumsPath], outputPath)
                .then(() => {
                  onProgress(100);
                  resolve(outputPath);
                })
                .catch(reject);
            } else {
              reject(new Error('分離結果找不到 no_vocals 或其他 stem 檔案'));
            }
          } else {
            // List what files exist in the directory
            let filesInDir = [];
            if (fs.existsSync(separatedDir)) {
              filesInDir = fs.readdirSync(separatedDir);
            }
            log.error('Files in separatedDir:', filesInDir);
            reject(new Error(`分離結果找不到 no_vocals.wav 或 vocals.wav，當前目錄內容: ${filesInDir.join(', ')}`));
          }
        } else {
          log.error('Demucs exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`人聲分離失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  async separateAll(audioPath, onProgress) {
    const inputDir = path.dirname(audioPath);
    const model = 'htdemucs_ft';

    return new Promise((resolve, reject) => {
      // Run Demucs without --two-stems to get all stems (bass, drums, other, vocals)
      const args = [
        '-n', model,
        '-o', inputDir,
        audioPath
      ];

      log.info('Running Demucs separation (all stems) with GPU');

      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const portablePython = path.join(resourcesPath, 'python', 'python.exe');
      const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      const demucs = spawn(portablePython, ['-m', 'demucs', ...args], { env });

      let stderrData = '';

      demucs.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      demucs.on('error', (error) => {
        log.error('Demucs spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 Demucs，請確認已安裝 (pip install demucs)'));
        } else {
          reject(error);
        }
      });

      demucs.on('close', (code) => {
        if (code === 0) {
          const baseName = path.basename(audioPath, path.extname(audioPath));
          const separatedDir = path.join(inputDir, model, baseName);

          // With full separation, we get bass.wav, drums.wav, other.wav, vocals.wav
          const bassPath = path.join(separatedDir, 'bass.wav');
          const drumsPath = path.join(separatedDir, 'drums.wav');
          const otherPath = path.join(separatedDir, 'other.wav');
          const vocalsPath = path.join(separatedDir, 'vocals.wav');

          log.info('Demucs all-stems output dir:', separatedDir);

          const outputPaths = [];
          const tempDir = this.fileManager.getTempDir();

          // Copy each stem to temp directory
          if (fs.existsSync(bassPath)) {
            const outPath = path.join(tempDir, 'bass.wav');
            fs.copyFileSync(bassPath, outPath);
            outputPaths.push(outPath);
          }

          if (fs.existsSync(drumsPath)) {
            const outPath = path.join(tempDir, 'drums.wav');
            fs.copyFileSync(drumsPath, outPath);
            outputPaths.push(outPath);
          }

          if (fs.existsSync(otherPath)) {
            const outPath = path.join(tempDir, 'other.wav');
            fs.copyFileSync(otherPath, outPath);
            outputPaths.push(outPath);
          }

          if (fs.existsSync(vocalsPath)) {
            const outPath = path.join(tempDir, 'vocals.wav');
            fs.copyFileSync(vocalsPath, outPath);
            outputPaths.push(outPath);
          }

          if (outputPaths.length > 0) {
            log.info('All stems extracted:', outputPaths);
            onProgress(100);
            resolve(outputPaths);
          } else {
            reject(new Error('分離結果找不到任何音軌檔案'));
          }
        } else {
          log.error('Demucs all-stems exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`多軌分離失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  async mixAudio(inputPaths, outputPath) {
    return new Promise((resolve, reject) => {
      const inputArgs = [];
      for (const p of inputPaths) {
        inputArgs.push('-i', p);
      }

      const args = [
        ...inputArgs,
        '-filter_complex', `amix=inputs=${inputPaths.length}:duration=longest`,
        '-y',
        outputPath
      ];

      log.info('Mixing audio stems with ffmpeg');

      // Add FFmpeg shared DLLs to PATH from extraResources
      const resourcesPath = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '../../../../');
      const ffmpegBinPath = path.join(resourcesPath, 'ffmpeg', 'bin');
      const ffmpegPath = path.join(ffmpegBinPath, 'ffmpeg.exe');
      const env = { ...process.env, PATH: `${ffmpegBinPath};${process.env.PATH}` };

      const ffmpeg = spawn(ffmpegPath, args, { env });

      let stderrData = '';

      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('error', (error) => {
        log.error('ffmpeg mix error:', error);
        reject(error);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`音軌混合失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  cleanupDemacsTemp(audioPath) {
    const inputDir = path.dirname(audioPath);
    const model = 'htdemucs_ft';
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const demucsDir = path.join(inputDir, model, baseName);

    if (fs.existsSync(demucsDir)) {
      try {
        const files = fs.readdirSync(demucsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(demucsDir, file));
        }
        fs.rmdirSync(demucsDir);
        log.info('Cleaned up Demucs temp directory:', demucsDir);
      } catch (e) {
        log.warn('Failed to cleanup Demucs temp directory:', e.message);
      }
    }
  }
}

module.exports = { DemucsRunner };
