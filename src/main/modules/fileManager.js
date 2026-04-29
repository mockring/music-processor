const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class FileManager {
  constructor(customOutputDir = null) {
    this.tempDir = path.join(os.tmpdir(), 'music_processor');
    this.outputDir = customOutputDir || path.join(app.getPath('music'), 'MusicProcessor');
  }

  ensureDirectories() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  getTempDir() {
    return this.tempDir;
  }

  getOutputPath() {
    return this.outputDir;
  }

  generateTempFilePath(prefix, extension) {
    const timestamp = Date.now();
    return path.join(this.tempDir, `${prefix}_${timestamp}.${extension}`);
  }

  generateOutputFilePath(title, extension = 'wav') {
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
    const timestamp = Date.now();
    return path.join(this.outputDir, `${sanitizedTitle}_${timestamp}.${extension}`);
  }

  cleanupTemp() {
    if (fs.existsSync(this.tempDir)) {
      const deleteRecursive = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            if (fs.statSync(filePath).isDirectory()) {
              deleteRecursive(filePath);
              fs.rmdirSync(filePath);
            } else {
              try {
                fs.unlinkSync(filePath);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          }
        }
      };
      deleteRecursive(this.tempDir);
    }
  }

  deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = { FileManager };
