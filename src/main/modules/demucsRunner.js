const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

class DemucsRunner {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.currentProcess = null;
    this.isCancelled = false;

    // Detect architecture
    this.isARM64 = process.arch === 'arm64';
    this.onnxSession = null;

    if (this.isARM64) {
      log.info('ARM64 architecture detected - will use ONNX runtime');
    }
  }

  cancel() {
    this.isCancelled = true;
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill('SIGTERM');
      log.info('Demucs process cancelled');
    }
  }

  reset() {
    this.isCancelled = false;
    this.currentProcess = null;
  }

  getResourcesPath() {
    // In packaged app: process.resourcesPath = .../Music Ring/resources
    // Python is stored at: .../Music Ring/resources/python
    // In development: __dirname = .../musictool/src/main/modules
    // We want: .../musictool/resources/ (for development)
    return process.resourcesPath || path.join(__dirname, '../../../resources');
  }

  getPythonExePath() {
    const pythonDir = this.isARM64 ? 'python-arm64' : 'python';
    return path.join(this.getResourcesPath(), pythonDir, 'python.exe');
  }

  getFFmpegBinPath() {
    const ffmpegDir = this.isARM64 ? 'ffmpeg-arm64' : 'ffmpeg';
    return path.join(this.getResourcesPath(), ffmpegDir, 'bin');
  }

  async separate(audioPath, onProgress) {
    // Use ONNX for ARM64
    if (this.isARM64) {
      return this.separateONNX(audioPath, onProgress);
    }

    const inputDir = path.dirname(audioPath);
    const model = 'htdemucs_ft';
    this.reset();

    return new Promise((resolve, reject) => {
      const args = [
        '-n', model,
        '--two-stems=vocals',
        '-o', inputDir,
        audioPath
      ];

      log.info('Running Demucs separation with GPU');

      const portablePython = this.getPythonExePath();
      const ffmpegBinPath = this.getFFmpegBinPath();
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      const demucs = spawn(portablePython, ['-m', 'demucs', ...args], { env });
      this.currentProcess = demucs;

      let stderrData = '';

      demucs.stderr.on('data', (data) => {
        if (this.isCancelled) return;
        stderrData += data.toString();
      });

      demucs.on('error', (error) => {
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        log.error('Demucs spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 Demucs，請確認已安裝 (pip install demucs)'));
        } else {
          reject(error);
        }
      });

      demucs.on('close', (code) => {
        this.currentProcess = null;
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        if (code === 0) {
          const baseName = path.basename(audioPath, path.extname(audioPath));
          const separatedDir = path.join(inputDir, model, baseName);

          const noVocalsPath = path.join(separatedDir, 'no_vocals.wav');
          const vocalsPath = path.join(separatedDir, 'vocals.wav');

          log.info('Demucs output dir:', separatedDir);
          log.info('Looking for no_vocals at:', noVocalsPath);

          if (fs.existsSync(noVocalsPath)) {
            log.info('Found no_vocals.wav - using as instrumental');
            const outputPath = this.fileManager.generateTempFilePath('instrumental', 'wav');
            fs.copyFileSync(noVocalsPath, outputPath);
            onProgress(100);
            resolve(outputPath);
          } else if (fs.existsSync(vocalsPath)) {
            log.info('no_vocals not found, looking for full stems...');
            const otherPath = path.join(separatedDir, 'other.wav');
            const bassPath = path.join(separatedDir, 'bass.wav');
            const drumsPath = path.join(separatedDir, 'drums.wav');

            if (fs.existsSync(otherPath)) {
              const outputPath = this.fileManager.generateTempFilePath('instrumental', 'wav');
              this.mixAudio([otherPath, bassPath, drumsPath], outputPath)
                .then(() => {
                  if (this.isCancelled) {
                    reject(new Error('處理已取消'));
                    return;
                  }
                  onProgress(100);
                  resolve(outputPath);
                })
                .catch(reject);
            } else {
              reject(new Error('分離結果找不到 no_vocals 或其他 stem 檔案'));
            }
          } else {
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
    // Use ONNX for ARM64
    if (this.isARM64) {
      return this.separateAllONNX(audioPath, onProgress);
    }

    const inputDir = path.dirname(audioPath);
    const model = 'htdemucs_ft';
    this.reset();

    return new Promise((resolve, reject) => {
      const args = [
        '-n', model,
        '-o', inputDir,
        audioPath
      ];

      log.info('Running Demucs separation (all stems) with GPU');

      const portablePython = this.getPythonExePath();
      const ffmpegBinPath = this.getFFmpegBinPath();
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      const demucs = spawn(portablePython, ['-m', 'demucs', ...args], { env });
      this.currentProcess = demucs;

      let stderrData = '';

      demucs.stderr.on('data', (data) => {
        if (this.isCancelled) return;
        stderrData += data.toString();
      });

      demucs.on('error', (error) => {
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        log.error('Demucs spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 Demucs，請確認已安裝 (pip install demucs)'));
        } else {
          reject(error);
        }
      });

      demucs.on('close', (code) => {
        this.currentProcess = null;
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        if (code === 0) {
          const baseName = path.basename(audioPath, path.extname(audioPath));
          const separatedDir = path.join(inputDir, model, baseName);

          const bassPath = path.join(separatedDir, 'bass.wav');
          const drumsPath = path.join(separatedDir, 'drums.wav');
          const otherPath = path.join(separatedDir, 'other.wav');
          const vocalsPath = path.join(separatedDir, 'vocals.wav');

          log.info('Demucs all-stems output dir:', separatedDir);

          const outputPaths = [];
          const tempDir = this.fileManager.getTempDir();

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

      const ffmpegBinPath = this.getFFmpegBinPath();
      const ffmpegPath = path.join(ffmpegBinPath, 'ffmpeg.exe');
      const env = { ...process.env, PATH: `${ffmpegBinPath};${process.env.PATH}` };

      const ffmpeg = spawn(ffmpegPath, args, { env });
      this.currentProcess = ffmpeg;

      let stderrData = '';

      ffmpeg.stderr.on('data', (data) => {
        if (this.isCancelled) return;
        stderrData += data.toString();
      });

      ffmpeg.on('error', (error) => {
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        log.error('ffmpeg mix error:', error);
        reject(error);
      });

      ffmpeg.on('close', (code) => {
        this.currentProcess = null;
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`音軌混合失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  // ARM64: Get Python executable path for ONNX inference
  getONNXPythonExe() {
    return this.getPythonExePath();
  }

  // ARM64: Separate audio using Python ONNX runtime (via subprocess)
  async separateONNX(audioPath, onProgress) {
    const inputDir = path.dirname(audioPath);
    const modelPath = path.join(this.getResourcesPath(), 'models', 'htdemucs_ft.onnx');
    const tempDir = this.fileManager.getTempDir();
    this.reset();

    // Create a Python script for ONNX inference
    const pythonScript = `
import sys
import numpy as np
import onnxruntime as ort

# Get input audio path from command line
audio_path = sys.argv[1]
model_path = sys.argv[2]
output_dir = sys.argv[3]

# Create session with DirectML (GPU) or CPU
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

try:
    session = ort.InferenceSession(model_path, sess_options, providers=['DirectML', 'CPU'])
except Exception as e:
    print(f"DirectML failed: {e}, falling back to CPU")
    session = ort.InferenceSession(model_path, sess_options, providers=['CPU'])

# Load and preprocess audio using ffmpeg
import subprocess
import tempfile
import os

# Convert audio to 16kHz mono float32
temp_wav = os.path.join(tempfile.gettempdir(), 'temp_input.wav')
subprocess.run([
    'ffmpeg', '-y', '-i', audio_path,
    '-ar', '16000', '-ac', '1', '-f', 'f32le', temp_wav
], check=True, capture_output=True)

# Read audio samples
audio_data = np.frombuffer(open(temp_wav, 'rb').read(), dtype=np.float32)
os.unlink(temp_wav)

# Create input tensor (batch=1, channels=1, time)
audio_tensor = audio_data.reshape(1, 1, -1).astype(np.float32)

# Run inference
feeds = {'audio': audio_tensor}
results = session.run(None, feeds)

# stems = ['vocals', 'drums', 'bass', 'other']
stems = ['vocals', 'drums', 'bass', 'other']
output_paths = []

for i, stem_name in enumerate(stems):
    stem_data = results[i].squeeze()  # Remove batch and channel dims

    # Convert float32 to int16
    stem_int16 = np.clip(stem_data * 32767, -32768, 32767).astype(np.int16)

    # Write to WAV file
    stem_path = os.path.join(output_dir, f'{stem_name}.wav')

    # Write raw PCM
    raw_path = stem_path.replace('.wav', '.raw')
    with open(raw_path, 'wb') as f:
        f.write(stem_int16.tobytes())

    # Convert raw PCM to WAV
    subprocess.run([
        'ffmpeg', '-y', '-f', 's16le', '-ar', '16000', '-ac', '1',
        '-i', raw_path, stem_path
    ], check=True, capture_output=True)

    os.unlink(raw_path)
    output_paths.append(stem_path)
    print(f"Processed {stem_name}")

# Mix non-vocal stems for instrumental
print("Mixing instrumental...")
`;

    return new Promise((resolve, reject) => {
      const pythonExe = this.getONNXPythonExe();
      const ffmpegBinPath = this.getFFmpegBinPath();
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      // Write Python script to temp file
      const scriptPath = path.join(tempDir, 'onnx_inference.py');
      fs.writeFileSync(scriptPath, pythonScript);

      const args = [scriptPath, audioPath, modelPath, tempDir];

      log.info('Running Demucs separation with ONNX + DirectML');

      const python = spawn(pythonExe, args, { env });
      this.currentProcess = python;

      let stderrData = '';

      python.stderr.on('data', (data) => {
        if (this.isCancelled) return;
        stderrData += data.toString();
      });

      python.on('error', (error) => {
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        log.error('ONNX Python spawn error:', error);
        reject(error);
      });

      python.on('close', (code) => {
        this.currentProcess = null;
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }

        // Cleanup script
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

        if (code === 0) {
          const noVocalsPath = path.join(tempDir, 'no_vocals.wav');
          const vocalsPath = path.join(tempDir, 'vocals.wav');
          const bassPath = path.join(tempDir, 'bass.wav');
          const drumsPath = path.join(tempDir, 'drums.wav');
          const otherPath = path.join(tempDir, 'other.wav');

          if (fs.existsSync(otherPath)) {
            // Mix bass, drums, other for instrumental
            this.mixAudio([otherPath, bassPath, drumsPath], noVocalsPath)
              .then(() => {
                if (this.isCancelled) {
                  reject(new Error('處理已取消'));
                  return;
                }
                onProgress(100);
                resolve(noVocalsPath);
              })
              .catch(reject);
          } else {
            reject(new Error('ONNX 分離結果找不到 stem 檔案'));
          }
        } else {
          log.error('ONNX Python exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`ONNX 分離失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  // ARM64: Separate all stems using Python ONNX runtime
  async separateAllONNX(audioPath, onProgress) {
    const inputDir = path.dirname(audioPath);
    const modelPath = path.join(this.getResourcesPath(), 'models', 'htdemucs_ft.onnx');
    const tempDir = this.fileManager.getTempDir();
    this.reset();

    const pythonScript = `
import sys
import numpy as np
import onnxruntime as ort

audio_path = sys.argv[1]
model_path = sys.argv[2]
output_dir = sys.argv[3]

sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

try:
    session = ort.InferenceSession(model_path, sess_options, providers=['DirectML', 'CPU'])
except Exception as e:
    session = ort.InferenceSession(model_path, sess_options, providers=['CPU'])

import subprocess
import tempfile
import os

temp_wav = os.path.join(tempfile.gettempdir(), 'temp_input.wav')
subprocess.run([
    'ffmpeg', '-y', '-i', audio_path,
    '-ar', '16000', '-ac', '1', '-f', 'f32le', temp_wav
], check=True, capture_output=True)

audio_data = np.frombuffer(open(temp_wav, 'rb').read(), dtype=np.float32)
os.unlink(temp_wav)

audio_tensor = audio_data.reshape(1, 1, -1).astype(np.float32)
feeds = {'audio': audio_tensor}
results = session.run(None, feeds)

stems = ['vocals', 'drums', 'bass', 'other']
output_paths = []

for i, stem_name in enumerate(stems):
    stem_data = results[i].squeeze()
    stem_int16 = np.clip(stem_data * 32767, -32768, 32767).astype(np.int16)
    stem_path = os.path.join(output_dir, f'{stem_name}.wav')
    raw_path = stem_path.replace('.wav', '.raw')
    with open(raw_path, 'wb') as f:
        f.write(stem_int16.tobytes())
    subprocess.run([
        'ffmpeg', '-y', '-f', 's16le', '-ar', '16000', '-ac', '1',
        '-i', raw_path, stem_path
    ], check=True, capture_output=True)
    os.unlink(raw_path)
    output_paths.append(stem_path)
    print(f"Processed {stem_name}")

print("ALL_STEMS_COMPLETE")
`;

    return new Promise((resolve, reject) => {
      const pythonExe = this.getONNXPythonExe();
      const ffmpegBinPath = this.getFFmpegBinPath();
      const env = {
        ...process.env,
        PATH: `${ffmpegBinPath};${process.env.PATH}`,
        PYTHONIOENCODING: 'utf8'
      };

      const scriptPath = path.join(tempDir, 'onnx_inference_all.py');
      fs.writeFileSync(scriptPath, pythonScript);

      const args = [scriptPath, audioPath, modelPath, tempDir];

      log.info('Running Demucs all-stems separation with ONNX + DirectML');

      const python = spawn(pythonExe, args, { env });
      this.currentProcess = python;

      let stderrData = '';
      let stdoutData = '';

      python.stdout.on('data', (data) => {
        if (this.isCancelled) return;
        stdoutData += data.toString();
        if (stdoutData.includes('ALL_STEMS_COMPLETE')) {
          onProgress(100);
        }
      });

      python.stderr.on('data', (data) => {
        if (this.isCancelled) return;
        stderrData += data.toString();
      });

      python.on('error', (error) => {
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }
        log.error('ONNX Python all-stems spawn error:', error);
        reject(error);
      });

      python.on('close', (code) => {
        this.currentProcess = null;
        if (this.isCancelled) {
          reject(new Error('處理已取消'));
          return;
        }

        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

        if (code === 0) {
          const bassPath = path.join(tempDir, 'bass.wav');
          const drumsPath = path.join(tempDir, 'drums.wav');
          const otherPath = path.join(tempDir, 'other.wav');
          const vocalsPath = path.join(tempDir, 'vocals.wav');

          const outputPaths = [];
          if (fs.existsSync(bassPath)) outputPaths.push(bassPath);
          if (fs.existsSync(drumsPath)) outputPaths.push(drumsPath);
          if (fs.existsSync(otherPath)) outputPaths.push(otherPath);
          if (fs.existsSync(vocalsPath)) outputPaths.push(vocalsPath);

          if (outputPaths.length > 0) {
            onProgress(100);
            resolve(outputPaths);
          } else {
            reject(new Error('ONNX 分離結果找不到任何音軌檔案'));
          }
        } else {
          log.error('ONNX Python all-stems exited with code:', code);
          log.error('stderr:', stderrData);
          reject(new Error(`ONNX 多軌分離失敗: ${stderrData || '未知錯誤'}`));
        }
      });
    });
  }

  cleanupDemucsTemp(audioPath) {
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
