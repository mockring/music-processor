const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

const LICENSE_SECRET = 'yt-music-processor-2024'; // 簡單的混淆金鑰
const TRIAL_DAYS = 30;

class LicenseManager {
  constructor() {
    this.licensePath = this.getLicensePath();
    this.cache = null;
  }

  getLicensePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'license.dat');
  }

  encrypt(text) {
    const key = crypto.createHash('sha256').update(LICENSE_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    try {
      const key = crypto.createHash('sha256').update(LICENSE_SECRET).digest();
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return null;
    }
  }

  generateChecksum(data) {
    return crypto.createHash('sha256').update(data + LICENSE_SECRET).digest('hex').substring(0, 4).toUpperCase();
  }

  // 產生 license key
  // 格式: YYYYMMDD-XXXX-XXXX-CHECK
  // YYYYMMDD = 到期日 (8位)
  // XXXX-XXXX = 隨機資料 (8位)
  // CHECK = 校驗碼 (4位)
  generateLicenseKey(expiryDate) {
    const dateStr = this.formatDate(expiryDate); // YYYYMMDD
    const random1 = this.generateRandom(4);
    const random2 = this.generateRandom(4);
    const data = dateStr + random1 + random2;
    const checksum = this.generateChecksum(data);
    return `${dateStr}-${random1}-${random2}-${checksum}`;
  }

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  generateRandom(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 驗證 license key
  validateKey(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: '無效的授權碼格式' };
    }

    const parts = key.trim().toUpperCase().split('-');
    if (parts.length !== 4) {
      return { valid: false, error: '授權碼應為 XXXX-XXXX-XXXX-XXXX 格式' };
    }

    const [dateStr, random1, random2, checksum] = parts;

    // 檢查日期格式
    if (!/^\d{8}$/.test(dateStr)) {
      return { valid: false, error: '授權碼日期格式錯誤' };
    }

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { valid: false, error: '授權碼日期無效' };
    }

    const expiryDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 檢查是否過期
    if (expiryDate < today) {
      return { valid: false, error: '授權碼已過期' };
    }

    // 驗證校驗碼
    const data = dateStr + random1 + random2;
    const expectedChecksum = this.generateChecksum(data);

    if (checksum !== expectedChecksum) {
      return { valid: false, error: '授權碼驗證失敗' };
    }

    return {
      valid: true,
      expiryDate: expiryDate,
      isLifetime: false
    };
  }

  // 儲存 license
  saveLicense(key, validationResult) {
    try {
      const data = JSON.stringify({
        key: key.toUpperCase(),
        expiryDate: validationResult.expiryDate.toISOString(),
        activatedAt: new Date().toISOString(),
        isLifetime: validationResult.isLifetime || false
      });
      const encrypted = this.encrypt(data);
      fs.writeFileSync(this.licensePath, encrypted, 'utf8');
      log.info('License saved successfully');
      return true;
    } catch (e) {
      log.error('Failed to save license:', e);
      return false;
    }
  }

  // 讀取 license
  loadLicense() {
    try {
      if (!fs.existsSync(this.licensePath)) {
        return null;
      }
      const encrypted = fs.readFileSync(this.licensePath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      if (!decrypted) return null;
      return JSON.parse(decrypted);
    } catch (e) {
      log.error('Failed to load license:', e);
      return null;
    }
  }

  // 清除 license
  clearLicense() {
    try {
      if (fs.existsSync(this.licensePath)) {
        fs.unlinkSync(this.licensePath);
      }
      this.cache = null;
      return true;
    } catch (e) {
      log.error('Failed to clear license:', e);
      return false;
    }
  }

  // 檢查是否已授權
  checkLicense() {
    // 快取
    if (this.cache) {
      return this.cache;
    }

    const license = this.loadLicense();

    if (!license) {
      // 檢查試用期
      const trialStatus = this.getTrialStatus();
      this.cache = trialStatus;
      return trialStatus;
    }

    // 檢查儲存的 license 是否過期
    const expiryDate = new Date(license.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      // 已過期，清除並進入試用
      this.clearLicense();
      const trialStatus = this.getTrialStatus();
      this.cache = trialStatus;
      return trialStatus;
    }

    this.cache = {
      activated: true,
      valid: true,
      key: license.key,
      expiryDate: license.expiryDate,
      activatedAt: license.activatedAt,
      isLifetime: license.isLifetime || false,
      daysRemaining: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    };

    return this.cache;
  }

  // 取得試用期狀態
  getTrialStatus() {
    const firstRunPath = path.join(app.getPath('userData'), 'firstrun.dat');

    let firstRun;
    if (fs.existsSync(firstRunPath)) {
      try {
        const encrypted = fs.readFileSync(firstRunPath, 'utf8');
        const decrypted = this.decrypt(encrypted);
        if (decrypted) {
          firstRun = JSON.parse(decrypted);
        }
      } catch (e) {
        // 忽略
      }
    }

    if (!firstRun) {
      // 首次運行，記錄時間
      firstRun = { date: new Date().toISOString() };
      try {
        const encrypted = this.encrypt(JSON.stringify(firstRun));
        fs.writeFileSync(firstRunPath, encrypted, 'utf8');
      } catch (e) {
        log.error('Failed to save first run date:', e);
      }
    }

    const firstRunDate = new Date(firstRun.date);
    const today = new Date();
    const daysPassed = Math.floor((today - firstRunDate) / (1000 * 60 * 60 * 24));
    const trialRemaining = Math.max(0, TRIAL_DAYS - daysPassed);

    return {
      activated: false,
      valid: trialRemaining > 0,
      trial: true,
      trialDays: trialRemaining,
      daysUsed: daysPassed,
      totalTrialDays: TRIAL_DAYS
    };
  }

  // 啟用 license
  activate(key) {
    const validation = this.validateKey(key);
    if (!validation.valid) {
      return validation;
    }

    if (this.saveLicense(key, validation)) {
      this.cache = null; // 清除快取
      return {
        valid: true,
        activated: true,
        key: key.toUpperCase(),
        expiryDate: validation.expiryDate.toISOString()
      };
    }

    return { valid: false, error: '儲存授權碼失敗' };
  }

  // 停用 license
  deactivate() {
    if (this.clearLicense()) {
      this.cache = null;
      return { success: true };
    }
    return { success: false, error: '清除授權碼失敗' };
  }

  // 產生試用版 license key (for testing)
  generateTrialKey() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + TRIAL_DAYS);
    return this.generateLicenseKey(expiryDate);
  }
}

module.exports = { LicenseManager };
