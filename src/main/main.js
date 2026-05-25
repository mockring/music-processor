const { app, BrowserWindow, ipcMain, shell, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { URLValidator } = require('./modules/urlValidator');
const { Downloader } = require('./modules/downloader');
const { AudioProcessor } = require('./modules/audioProcessor');
const { DemucsRunner } = require('./modules/demucsRunner');
const { FileManager } = require('./modules/fileManager');
const { AudioConverter } = require('./modules/audioConverter');
const { SoftwareLicenseManager } = require('./modules/softwareLicenseManager');
const axios = require('axios');

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow;
let softwareLicenseManager;
let apiBaseUrl = process.env.API_URL || 'https://music-ring.vercel.app/api/v1';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 780,
    minWidth: 700,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('validate-url', async (event, url) => {
  return URLValidator.validate(url);
});

ipcMain.handle('paste-from-clipboard', async () => {
  return clipboard.readText();
});

ipcMain.handle('select-local-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'wma'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);

  return { path: filePath, name: fileName };
});

ipcMain.handle('process', async (event, options) => {
  const { url, localFile, localFileName, pitch, removeVocal, outputFolder, format, bitrate, multiStem, stems } = options;
  const fileManager = new FileManager(outputFolder);
  const downloader = new Downloader(fileManager);
  const audioProcessor = new AudioProcessor(fileManager);
  const demucsRunner = new DemucsRunner(fileManager);
  const audioConverter = new AudioConverter(fileManager);

  try {
    fileManager.ensureDirectories();

    const sendProgress = (stage, percent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('progress', { stage, percent });
      }
    };

    let audioPath;
    let videoTitle;

    if (localFile) {
      // Use local file directly
      sendProgress('處理中', 10);
      audioPath = localFile;
      videoTitle = path.basename(localFileName, path.extname(localFileName));
    } else {
      // Download from YouTube
      sendProgress('下載中', 5);

      const downloadResult = await downloader.download(url, (percent) => {
        const adjusted = Math.min(5 + percent * 0.2, 25);
        sendProgress('下載中', Math.round(adjusted));
      });

      audioPath = downloadResult.filePath;
      videoTitle = downloadResult.title;
    }

    sendProgress('處理音高', 30);

    let processedPath = await audioProcessor.changePitch(audioPath, pitch, (percent) => {
      const adjusted = 30 + percent * 0.15;
      sendProgress('處理音高', Math.round(adjusted));
    });

    let outputPaths = [];

    if (multiStem && stems && stems.length > 0) {
      // Multi-stem output: separate all tracks, then filter
      sendProgress('分離音軌', 50);

      const allStems = await demucsRunner.separateAll(processedPath, (percent) => {
        const adjusted = 50 + percent * 0.35;
        sendProgress('分離音軌', Math.round(adjusted));
      });

      // Filter to only selected stems
      const stemFileNames = stems.map(s => `${s}.wav`);
      outputPaths = allStems.filter(sp => {
        const baseName = path.basename(sp, path.extname(sp));
        return stemFileNames.includes(baseName + '.wav') || stemFileNames.includes(path.basename(sp));
      });

      // If filter didn't work, try matching by basename
      if (outputPaths.length === 0) {
        for (const stem of stems) {
          const match = allStems.find(sp => {
            const bn = path.basename(sp, path.extname(sp));
            return bn === stem;
          });
          if (match) outputPaths.push(match);
        }
      }

      // If still empty, use all stems as fallback
      if (outputPaths.length === 0) {
        outputPaths = allStems;
      }

      // If removeVocal is also enabled, also run vocal separation to get instrumental
      if (removeVocal) {
        sendProgress('分離人聲', 70);

        const instrumentalPath = await demucsRunner.separate(processedPath, (percent) => {
          const adjusted = 70 + percent * 0.15;
          sendProgress('分離人聲', Math.round(adjusted));
        });

        // Add instrumental at the beginning
        outputPaths.unshift(instrumentalPath);
      }
    } else if (removeVocal) {
      // Vocal removal mode
      sendProgress('分離人聲', 50);

      const separatedPath = await demucsRunner.separate(processedPath, (percent) => {
        const adjusted = 50 + percent * 0.35;
        sendProgress('分離人聲', Math.round(adjusted));
      });

      outputPaths = [separatedPath];
    } else {
      // No separation, use processed audio
      outputPaths = [processedPath];
    }

    sendProgress('轉換格式', 85);

    // Convert to desired format and copy to output
    const outputDir = fileManager.getOutputPath();
    const finalPaths = [];

    for (let i = 0; i < outputPaths.length; i++) {
      const inputPath = outputPaths[i];
      const inputBaseName = path.basename(inputPath, path.extname(inputPath));
      let outputFileName;

      if (inputBaseName === 'no_vocals') {
        outputFileName = `${videoTitle}_instrumental.${format}`;
      } else if (multiStem && stems && stems.length > 0) {
        outputFileName = `${videoTitle}_${inputBaseName}.${format}`;
      } else if (removeVocal) {
        outputFileName = `${videoTitle}_instrumental.${format}`;
      } else {
        outputFileName = `${videoTitle}.${format}`;
      }

      const outputFilePath = path.join(outputDir, outputFileName);

      await audioConverter.convert(inputPath, outputFilePath, format, bitrate, () => {
        const baseProgress = 85 + (i / outputPaths.length) * 10;
        sendProgress('轉換格式', Math.round(baseProgress));
      });

      finalPaths.push(outputFilePath);
    }

    // Clean up temp files
    if (!localFile) {
      fileManager.cleanupTemp();
    } else {
      // Clean up Demucs temp directory for local files
      demucsRunner.cleanupDemacsTemp(processedPath);
    }

    sendProgress('完成', 100);

    return { success: true, filePath: finalPaths.join('\n') };

  } catch (error) {
    log.error('Process error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('get-output-path', async () => {
  const fileManager = new FileManager();
  return fileManager.getOutputPath();
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('open-license-file', async () => {
  const licensePath = app.isPackaged
    ? path.join(path.dirname(app.getAppPath()), 'LICENSE.md')
    : path.join(__dirname, '../../LICENSE.md');

  if (fs.existsSync(licensePath)) {
    shell.showItemInFolder(licensePath);
  }
});

ipcMain.handle('get-license-status', async () => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }

  return new Promise(async (resolve) => {
    const result = await softwareLicenseManager.getLicenseStatus(
      // apiTrialStatusFn - check trial status with backend
      async () => {
        try {
          const response = await axios.get(`${apiBaseUrl}/trial/status`, {
            params: { machineId: softwareLicenseManager.getMachineIdSync() }
          });
          return response.data;
        } catch (e) {
          return { success: false, error: { message: e.response?.data?.error?.message || e.message } };
        }
      },
      // apiSerialActivateFn - check serial activation with backend
      async (serialKey, machineId) => {
        try {
          const response = await axios.post(`${apiBaseUrl}/software/serial/activate`, {
            serialKey,
            machineId
          });
          return response.data;
        } catch (e) {
          return { success: false, error: { message: e.response?.data?.error?.message || e.message } };
        }
      }
    );
    resolve(result);
  });
});

ipcMain.handle('get-machine-id', async () => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }
  return softwareLicenseManager.getMachineIdSync();
});

ipcMain.handle('activate-license', async (event, serialKey) => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }

  return softwareLicenseManager.activate(
    serialKey,
    async (serialKey, machineId) => {
      try {
        const response = await axios.post(`${apiBaseUrl}/software/serial/activate`, {
          serialKey,
          machineId
        });
        return response.data;
      } catch (e) {
        return { success: false, error: { message: e.response?.data?.error?.message || e.message } };
      }
    }
  );
});

ipcMain.handle('deactivate-license', async () => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }
  return softwareLicenseManager.deactivate();
});

ipcMain.handle('start-trial', async () => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }

  return softwareLicenseManager.startTrial(
    // apiStartFn - start trial with backend
    async () => {
      try {
        const response = await axios.post(`${apiBaseUrl}/trial/start`, {
          machineId: softwareLicenseManager.getMachineIdSync()
        });
        return response.data;
      } catch (e) {
        return { success: false, error: { message: e.response?.data?.error?.message || e.message } };
      }
    }
  );
});

ipcMain.handle('get-trial-status', async () => {
  if (!softwareLicenseManager) {
    softwareLicenseManager = new SoftwareLicenseManager();
  }
  return softwareLicenseManager.checkTrialStatus(
    // apiStatusFn - check trial status with backend
    async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/trial/status`, {
          params: { machineId: softwareLicenseManager.getMachineIdSync() }
        });
        return response.data;
      } catch (e) {
        return { success: false, error: { message: e.response?.data?.error?.message || e.message } };
      }
    }
  );
});