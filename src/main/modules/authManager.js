const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// Backend server URL - Vercel (Next.js API Routes) + Supabase
const SERVER_URL = 'https://music-ring.vercel.app/api/v1';

class AuthManager {
  constructor() {
    this.tokenPath = path.join(app.getPath('userData'), 'auth.dat');
    this.userDataPath = path.join(app.getPath('userData'), 'user.dat');
    this.rememberedEmailPath = path.join(app.getPath('userData'), 'remember.dat');
    this.token = null;
    this.user = null;
    this.loadToken();
  }

  saveRememberedEmail(email) {
    try {
      fs.writeFileSync(this.rememberedEmailPath, email, 'utf8');
    } catch (e) {
      log.error('Failed to save remembered email:', e);
    }
  }

  getRememberedEmail() {
    try {
      if (fs.existsSync(this.rememberedEmailPath)) {
        return fs.readFileSync(this.rememberedEmailPath, 'utf8');
      }
    } catch (e) {
      log.error('Failed to read remembered email:', e);
    }
    return null;
  }

  clearRememberedEmail() {
    try {
      if (fs.existsSync(this.rememberedEmailPath)) {
        fs.unlinkSync(this.rememberedEmailPath);
      }
    } catch (e) {
      log.error('Failed to clear remembered email:', e);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${SERVER_URL}/v1${endpoint}`;
    log.info('Auth request:', url, options.method || 'GET');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      log.info('Auth response status:', response.status);

      const data = await response.json();
      log.info('Auth response data:', JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      log.error('Auth request error:', error);
      throw error;
    }
  }

  loadToken() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const encrypted = fs.readFileSync(this.tokenPath, 'utf8');
        this.token = this.decrypt(encrypted);
      }
      if (fs.existsSync(this.userDataPath)) {
        const encrypted = fs.readFileSync(this.userDataPath, 'utf8');
        this.user = JSON.parse(this.decrypt(encrypted));
      }
    } catch (e) {
      log.error('Failed to load auth data:', e);
    }
  }

  saveToken() {
    try {
      const encrypted = this.encrypt(this.token);
      fs.writeFileSync(this.tokenPath, encrypted, 'utf8');
    } catch (e) {
      log.error('Failed to save token:', e);
    }
  }

  saveUser() {
    try {
      const encrypted = this.encrypt(JSON.stringify(this.user));
      fs.writeFileSync(this.userDataPath, encrypted, 'utf8');
    } catch (e) {
      log.error('Failed to save user:', e);
    }
  }

  encrypt(text) {
    // 簡單的 Base64 編碼（生產環境應該用更安全的方式）
    return Buffer.from(text).toString('base64');
  }

  decrypt(encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8');
  }

  async register(email, password) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (result.success && result.data) {
      this.token = result.data.token;
      this.user = result.data.user;
      this.saveToken();
      this.saveUser();
    }

    return result;
  }

  async login(email, password) {
    log.info('Attempting login for:', email);
    try {
      const result = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (result.success && result.data) {
        this.token = result.data.token;
        this.user = result.data.user;
        this.saveToken();
        this.saveUser();
        log.info('Login successful');
      }

      return result;
    } catch (e) {
      log.error('Login error:', e.message);
      throw e;
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    this.token = null;
    this.user = null;
    this.clearStorage();
  }

  clearStorage() {
    try {
      if (fs.existsSync(this.tokenPath)) fs.unlinkSync(this.tokenPath);
      if (fs.existsSync(this.userDataPath)) fs.unlinkSync(this.userDataPath);
    } catch (e) {
      log.error('Failed to clear auth storage:', e);
    }
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  async getSubscriptionPlans() {
    return this.request('/subscription/plans');
  }

  async getSubscription() {
    return this.request('/subscription');
  }

  async verifyLicense(machineId, deviceName) {
    return this.request('/license/verify', {
      method: 'POST',
      body: JSON.stringify({ machineId, deviceName })
    });
  }

  async getDevices() {
    return this.request('/license/devices');
  }

  async removeDevice(deviceId) {
    return this.request(`/license/devices/${deviceId}`, {
      method: 'DELETE'
    });
  }

  // 檢查是否已訂閱
  async checkSubscription() {
    if (!this.token) {
      return { valid: false, error: 'NOT_LOGGED_IN' };
    }

    try {
      const result = await this.request('/license/verify', {
        method: 'POST',
        body: JSON.stringify({
          machineId: this.getMachineId(),
          deviceName: require('os').hostname()
        })
      });

      return result;
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  getMachineId() {
    // 簡單的機器識別碼 - 基於 CPU + 主機板 ID
    const os = require('os');
    const crypto = require('crypto');
    const machineId = os.hostname() + os.platform() + os.arch() + os.cpus()[0].model;
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32);
  }
}

module.exports = { AuthManager, SERVER_URL };