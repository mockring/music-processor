const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn, execSync, exec } = require('child_process');
const { app } = require('electron');
const log = require('electron-log');

class DependencyManager {
  constructor() {
    // Use AppData temp folder for downloads to avoid permission issues
    this.tempPath = path.join(app.getPath('temp'), 'MusicRing');

    // Resources path: in packaged app, process.resourcesPath = .../Music Ring/resources
    // Python should go to: .../Music Ring/resources/python
    this.resourcesPath = process.resourcesPath || path.join(__dirname, '../../../resources');

    this.pythonPath = path.join(this.resourcesPath, 'python');
    this.ffmpegPath = path.join(this.resourcesPath, 'ffmpeg');

    // Ensure directories exist
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
    if (!fs.existsSync(this.resourcesPath)) {
      fs.mkdirSync(this.resourcesPath, { recursive: true });
    }
  }

  getResourcesPath() {
    return this.resourcesPath;
  }

  getPythonExePath() {
    const pythonExe = path.join(this.pythonPath, 'python.exe');
    if (fs.existsSync(pythonExe)) {
      return pythonExe;
    }
    return 'python';
  }

  getFFmpegPath() {
    return path.join(this.ffmpegPath, 'bin', 'ffmpeg.exe');
  }

  getFFmpegBinPath() {
    return path.join(this.ffmpegPath, 'bin');
  }

  checkPython() {
    log.info('=== Checking Python ===');
    log.info('Expected Python path:', this.pythonPath);
    log.info('process.resourcesPath:', process.resourcesPath);

    if (fs.existsSync(this.pythonPath)) {
      const pythonExe = path.join(this.pythonPath, 'python.exe');
      if (fs.existsSync(pythonExe)) {
        log.info('Python found at:', this.pythonPath);
        // List contents for debugging
        try {
          const files = fs.readdirSync(this.pythonPath);
          log.info('Python folder contents:', files);
        } catch (e) {
          log.error('Cannot read Python folder:', e.message);
        }
        return true;
      }
    }
    log.info('Python not found at:', this.pythonPath);
    return false;
  }

  // Check if a specific Python package is installed
  checkPythonPackage(packageName) {
    const sitePackagesPath = path.join(this.pythonPath, 'Lib', 'site-packages');
    if (!fs.existsSync(sitePackagesPath)) {
      return false;
    }

    // Check for package directory or .dist-info
    const patterns = [
      path.join(sitePackagesPath, packageName),
      path.join(sitePackagesPath, `${packageName}.dist-info`),
      path.join(sitePackagesPath, `${packageName}-*.dist-info`)
    ];

    for (const pattern of patterns) {
      const matches = fs.readdirSync(sitePackagesPath).filter(f => {
        if (packageName.includes('*')) {
          const regex = new RegExp('^' + packageName.replace(/\*/g, '.*') + '(\\.dist-info)?$');
          return regex.test(f);
        }
        return f === packageName || f.startsWith(packageName + '-');
      });
      if (matches.length > 0) {
        log.info(`Package ${packageName} found:`, matches[0]);
        return true;
      }
    }

    log.info(`Package ${packageName} not found`);
    return false;
  }

  // Check if all required Python packages are installed
  checkAllPythonPackages() {
    const requiredPackages = [
      'pip', 'yt-dlp', 'demucs', 'numpy', 'scipy', 'librosa', 'soundfile',
      'torch', 'torchaudio', 'torchvision', 'torchcodec'
    ];

    const missing = [];
    for (const pkg of requiredPackages) {
      if (!this.checkPythonPackage(pkg)) {
        missing.push(pkg);
      }
    }

    log.info('Required packages status:', { total: requiredPackages.length, missing });
    return missing;
  }

  checkFFmpeg() {
    log.info('=== Checking FFmpeg ===');
    log.info('Expected FFmpeg path:', this.ffmpegPath);

    if (fs.existsSync(this.ffmpegPath)) {
      const ffmpegExe = path.join(this.ffmpegPath, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(ffmpegExe)) {
        log.info('FFmpeg found at:', this.ffmpegPath);
        return true;
      }
    }
    log.info('FFmpeg not found at:', this.ffmpegPath);
    return false;
  }

  // Helper to run commands without blocking UI
  async asyncExec(cmd, onProgress, progressMapper) {
    return new Promise((resolve, reject) => {
      // Use shell: true to properly handle paths with spaces
      const child = exec(cmd, { shell: true });

      let stderrData = '';
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        child.removeAllListeners();
      };

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
        const output = data.toString();
        // Match PyTorch download progress like "Downloading https://... 45%"
        const match = output.match(/Downloading.*?(\d+)%/);
        if (match && progressMapper) {
          const percent = parseInt(match[1], 10);
          onProgress(progressMapper(percent));
        }
      });

      child.on('error', (err) => {
        if (!closed) {
          cleanup();
          reject(new Error(`exec error: ${err.message}`));
        }
      });

      child.on('close', (code) => {
        if (!closed) {
          cleanup();
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Command failed (${code}): ${stderrData || cmd}`));
          }
        }
      });
    });
  }

  async downloadFile(url, destPath, onProgress) {
    log.info('Downloading:', url);
    log.info('Destination:', destPath);

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const chunks = [];

      log.info('Starting HTTP request to:', url);

      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Music Ring/1.0'
        },
        timeout: 30000
      }, (response) => {
        log.info('Response status:', response.statusCode);
        log.info('Response headers:', JSON.stringify(response.headers));

        if (response.statusCode === 301 || response.statusCode === 302) {
          log.info('Redirect to:', response.headers.location);
          request.destroy();
          this.downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10) || 0;
        log.info('Content-Length:', totalSize);
        let downloaded = 0;

        response.on('data', (chunk) => {
          chunks.push(chunk);
          downloaded += chunk.length;
          if (onProgress && totalSize > 0) {
            const percent = (downloaded / totalSize) * 100;
            onProgress(percent);
          }
        });

        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
              fs.writeFileSync(destPath, buffer);
              log.info('Download complete, file size:', buffer.length);
              resolve();
            } else {
              reject(new Error('Download failed: empty response'));
            }
          } catch (err) {
            reject(err);
          }
        });

        response.on('error', (err) => {
          log.error('Response error:', err);
          reject(new Error(`Response error: ${err.message}`));
        });
      });

      request.on('error', (err) => {
        log.error('Request error:', err);
        reject(new Error(`Request error: ${err.message}`));
      });

      request.on('timeout', () => {
        log.error('Request timeout');
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async downloadPython(onProgress) {
    log.info('=== Starting Python download ===');
    log.info('Temp path:', this.tempPath);
    log.info('Python path:', this.pythonPath);
    log.info('Resources path:', this.resourcesPath);

    const zipPath = path.join(this.tempPath, 'python.zip');

    // Python 3.12.3 embeddable (matching old version's Python 3.12)
    const pythonUrl = 'https://www.python.org/ftp/python/3.12.3/python-3.12.3-embed-amd64.zip';

    try {
      // Download
      onProgress(5);
      await this.downloadFile(pythonUrl, zipPath, (p) => onProgress(5 + p * 0.3));
      log.info('Downloaded Python zip');

      // Extract
      onProgress(40);
      if (!fs.existsSync(this.pythonPath)) {
        fs.mkdirSync(this.pythonPath, { recursive: true });
      }

      const extractCmd = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.pythonPath}' -Force"`;
      log.info('Extracting with:', extractCmd);
      execSync(extractCmd, { stdio: 'pipe' });
      log.info('Extracted Python');
      onProgress(50);

      // Fix the embeddable Python restriction
      const pythonExe = path.join(this.pythonPath, 'python.exe');
      const pthFile = path.join(this.pythonPath, 'python312._pth');
      if (fs.existsSync(pthFile)) {
        let content = fs.readFileSync(pthFile, 'utf8');
        log.info('python312._pth content:', content);
        // Uncomment import site to enable site-packages
        content = content.replace('#import site', 'import site');
        fs.writeFileSync(pthFile, content);
        log.info('Fixed python312._pth');
      }

      // Download get-pip.py
      onProgress(55);
      const pipUrl = 'https://bootstrap.pypa.io/get-pip.py';
      const pipPath = path.join(this.tempPath, 'get-pip.py');
      await this.downloadFile(pipUrl, pipPath, () => {});
      log.info('Downloaded get-pip.py');

      // Install pip
      onProgress(60);
      await this.asyncExec(`"${pythonExe}" "${pipPath}"`, onProgress, (p) => onProgress(60 + p * 0.05));
      log.info('Pip installed');

      // Install setuptools and wheel (required for pip to work properly)
      onProgress(63);
      await this.asyncExec(`"${pythonExe}" -m pip install setuptools wheel --no-input`, onProgress, (p) => onProgress(63 + p * 0.02));
      log.info('setuptools and wheel installed');

      // Install all required packages for GPU support
      // First: basic audio processing packages
      onProgress(65);
      await this.asyncExec(`"${pythonExe}" -m pip install yt-dlp demucs numpy scipy librosa soundfile --no-input`, onProgress, (p) => onProgress(65 + p * 0.05));
      log.info('Basic packages installed');

      // Second: PyTorch with CUDA 12.8 (torch 2.9.0 works with soundfile instead of torchcodec)
      onProgress(70);
      await this.asyncExec(`"${pythonExe}" -m pip install torch==2.9.0+cu128 torchaudio==2.9.0+cu128 torchvision==0.24.0+cu128 --index-url https://download.pytorch.org/whl/cu128 --no-input`, onProgress, (p) => onProgress(70 + p * 0.2));
      log.info('PyTorch installed');

      // Third: Install torchcodec 0.9.1 from PyPI (not PyTorch repo)
      onProgress(90);
      try {
        await this.asyncExec(`"${pythonExe}" -m pip install torchcodec==0.9.1 --no-input`, onProgress, (p) => onProgress(90 + p * 0.1));
        log.info('torchcodec 0.9.1 installed from PyPI');
      } catch (err) {
        log.warn('torchcodec 0.9.1 installation failed, will continue:', err.message);
      }
      onProgress(95);

      // Cleanup
      onProgress(95);
      fs.unlinkSync(zipPath);
      if (fs.existsSync(pipPath)) fs.unlinkSync(pipPath);

      log.info('=== Python download complete ===');
      onProgress(100);
      return true;
    } catch (err) {
      log.error('Python install failed:', err);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      return false;
    }
  }

  // Resume Python installation from where it left off
  async continuePythonInstall(onProgress) {
    log.info('=== Continuing Python installation ===');
    const pythonExe = path.join(this.pythonPath, 'python.exe');
    const pipPath = path.join(this.tempPath, 'get-pip.py');

    // Check which packages are missing
    const missing = this.checkAllPythonPackages();
    log.info('Missing packages:', missing);

    // If pip missing, reinstall it first
    if (missing.includes('pip')) {
      log.info('pip missing, reinstalling...');
      onProgress(55);
      const pipUrl = 'https://bootstrap.pypa.io/get-pip.py';
      await this.downloadFile(pipUrl, pipPath, () => {});
      onProgress(60);
      await this.asyncExec(`"${pythonExe}" "${pipPath}"`, onProgress, (p) => onProgress(60 + p * 0.05));
      log.info('pip reinstalled');
      // Install setuptools and wheel after pip install
      onProgress(63);
      await this.asyncExec(`"${pythonExe}" -m pip install setuptools wheel --no-input`, onProgress, (p) => onProgress(63 + p * 0.02));
      log.info('setuptools and wheel installed');
    } else {
      // pip exists but might need setuptools/wheel to be fresh
      onProgress(58);
      await this.asyncExec(`"${pythonExe}" -m pip install setuptools wheel --no-input`, onProgress, (p) => onProgress(58 + p * 0.02));
      log.info('setuptools and wheel ensured');
    }

    // Install basic packages if any are missing
    const basicPackages = ['yt-dlp', 'demucs', 'numpy', 'scipy', 'librosa', 'soundfile'];
    const missingBasic = basicPackages.filter(p => missing.includes(p));
    if (missingBasic.length > 0) {
      log.info('Installing missing basic packages:', missingBasic);
      onProgress(65);
      await this.asyncExec(`"${pythonExe}" -m pip install ${missingBasic.join(' ')} --no-input`, onProgress, (p) => onProgress(65 + p * 0.05));
      log.info('Basic packages installed');
    }

    // Install PyTorch if missing (use torch 2.9.0 which works with soundfile)
    if (missing.includes('torch') || missing.includes('torchaudio') || missing.includes('torchvision')) {
      log.info('Installing PyTorch CUDA 2.9.0...');
      onProgress(70);
      await this.asyncExec(`"${pythonExe}" -m pip install torch==2.9.0+cu128 torchaudio==2.9.0+cu128 torchvision==0.24.0+cu128 --index-url https://download.pytorch.org/whl/cu128 --no-input`, onProgress, (p) => onProgress(70 + p * 0.2));
      log.info('PyTorch installed');
    }

    // Install torchcodec if missing (use PyPI instead of PyTorch repo)
    if (missing.includes('torchcodec')) {
      log.info('Installing torchcodec 0.9.1 from PyPI...');
      onProgress(90);
      try {
        await this.asyncExec(`"${pythonExe}" -m pip install torchcodec==0.9.1 --no-input`, onProgress, (p) => onProgress(90 + p * 0.1));
        log.info('torchcodec 0.9.1 installed from PyPI');
      } catch (err) {
        log.warn('torchcodec 0.9.1 installation failed, will continue:', err.message);
      }
    }

    // Cleanup
    if (fs.existsSync(pipPath)) fs.unlinkSync(pipPath);

    log.info('=== Python installation complete ===');
    onProgress(100);
    return true;
  }

  async downloadFFmpeg(onProgress) {
    log.info('=== Starting FFmpeg download ===');
    log.info('Temp path:', this.tempPath);
    log.info('FFmpeg path:', this.ffmpegPath);

    const zipPath = path.join(this.tempPath, 'ffmpeg.zip');

    const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip';

    try {
      await this.downloadFile(ffmpegUrl, zipPath, onProgress);
      log.info('Downloaded FFmpeg zip');

      if (!fs.existsSync(this.tempPath)) {
        fs.mkdirSync(this.tempPath, { recursive: true });
      }

      const extractCmd = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.tempPath}' -Force"`;
      execSync(extractCmd, { stdio: 'pipe' });

      // Try both folder names - gpl and gpl-shared variants
      const possibleFolders = [
        'ffmpeg-master-latest-win64-gpl',
        'ffmpeg-master-latest-win64-gpl-shared'
      ];

      let extractedFolder = null;
      for (const folder of possibleFolders) {
        const candidate = path.join(this.tempPath, folder);
        if (fs.existsSync(candidate)) {
          extractedFolder = candidate;
          log.info('Found FFmpeg folder:', folder);
          break;
        }
      }

      if (extractedFolder) {
        const binPath = path.join(extractedFolder, 'bin');
        if (fs.existsSync(binPath)) {
          if (fs.existsSync(this.ffmpegPath)) {
            fs.rmSync(this.ffmpegPath, { recursive: true });
          }
          fs.renameSync(extractedFolder, this.ffmpegPath);
          log.info('Moved FFmpeg to:', this.ffmpegPath);
        }
      } else {
        log.error('FFmpeg folder not found after extraction');
      }

      fs.unlinkSync(zipPath);
      log.info('=== FFmpeg download complete ===');
      return true;
    } catch (err) {
      log.error('FFmpeg install failed:', err);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      return false;
    }
  }

  async installDependencies(onProgress) {
    log.info('=== Starting installDependencies ===');
    log.info('this.resourcesPath:', this.resourcesPath);
    log.info('this.pythonPath:', this.pythonPath);
    log.info('this.ffmpegPath:', this.ffmpegPath);
    log.info('process.resourcesPath:', process.resourcesPath);

    const results = { python: false, ffmpeg: false };

    if (!this.checkPython()) {
      log.info('Python not found, downloading...');
      results.python = await this.downloadPython(onProgress);
      if (!results.python) {
        log.error('Python download/install failed');
        return results;
      }
    } else {
      // Python exists, check if all packages are installed
      const missing = this.checkAllPythonPackages();
      if (missing.length > 0) {
        log.info('Python exists but packages missing, continuing installation...');
        results.python = await this.continuePythonInstall(onProgress);
      } else {
        log.info('Python and all packages already installed');
        results.python = true;
      }
    }

    if (!this.checkFFmpeg()) {
      log.info('FFmpeg not found, downloading...');
      results.ffmpeg = await this.downloadFFmpeg(onProgress);
    } else {
      results.ffmpeg = true;
    }

    return results;
  }
}

module.exports = { DependencyManager };