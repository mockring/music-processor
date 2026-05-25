const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { execSync } = require('child_process');
const log = require('electron-log');

const TRIAL_HOURS = 1; // 1 hour trial

class SoftwareLicenseManager {
  constructor() {
    this.licensePath = this.getLicensePath();
    this.trialPath = this.getTrialPath();
    this.machineId = this.getMachineId();
    this.cache = null;
  }

  getLicensePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'software_license.json');
  }

  getTrialPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'trial_record.json');
  }

  getMachineId() {
    const userDataPath = app.getPath('userData');
    const machineIdPath = path.join(userDataPath, 'machine_id.json');

    // 嘗試讀取快取
    if (fs.existsSync(machineIdPath)) {
      try {
        return JSON.parse(fs.readFileSync(machineIdPath, 'utf8')).machineId;
      } catch (e) {
        // Fall through to generate new
      }
    }

    // 使用硬體特徵生成 machine ID
    let hardwareId = this.getHardwareId();
    try {
      fs.writeFileSync(machineIdPath, JSON.stringify({ machineId: hardwareId }), 'utf8');
    } catch (e) {
      log.error('Failed to save machine ID:', e);
    }
    return hardwareId;
  }

  getHardwareId() {
    try {
      // 取得 CPU ID
      const cpuId = execSync('wmic cpu get ProcessorId', { encoding: 'utf8', timeout: 5000 })
        .toString().split('\n')[1].trim();
      // 取得主機板序號
      const boardId = execSync('wmic baseboard get SerialNumber', { encoding: 'utf8', timeout: 5000 })
        .toString().split('\n')[1].trim();

      if (cpuId && boardId) {
        // 使用 SHA256 雜湊 combine cpuId + boardId
        return crypto.createHash('sha256').update(cpuId + boardId).digest('hex').substring(0, 32);
      }
    } catch (e) {
      log.warn('Failed to get hardware ID, using fallback:', e.message);
    }

    // Fallback: 使用隨機 ID（万一硬件信息读取失败）
    return crypto.randomBytes(16).toString('hex');
  }

  // Get machine ID (for API calls)
  getMachineIdSync() {
    return this.machineId;
  }

  // Check trial status - returns { hasTrial: bool, remainingTime: number (ms), isExpired: bool }
  // This now checks the server for authoritative trial status
  checkTrialStatus(apiStatusFn) {
    return new Promise(async (resolve) => {
      try {
        // Always check with backend first
        if (apiStatusFn) {
          const serverStatus = await apiStatusFn();
          if (serverStatus.success && serverStatus.data) {
            const data = serverStatus.data;

            // Update local cache
            this.cacheTrialRecord(data);

            resolve({
              hasTrial: data.hasTrial,
              hasUsedTrial: data.hasTrial,
              startedAt: data.trialStartedAt,
              expiresAt: data.trialExpiresAt,
              remainingTime: data.remainingMs,
              isExpired: !data.isActive
            });
            return;
          }
        }
      } catch (e) {
        log.warn('Failed to check trial with server:', e.message);
      }

      // Fallback to local check
      if (!fs.existsSync(this.trialPath)) {
        resolve({ hasTrial: false, hasUsedTrial: false, remainingTime: 0, isExpired: true });
        return;
      }

      try {
        const record = JSON.parse(fs.readFileSync(this.trialPath, 'utf8'));
        const startedAt = new Date(record.startedAt);
        const expiresAt = new Date(startedAt.getTime() + TRIAL_HOURS * 60 * 60 * 1000);
        const now = new Date();
        const remainingTime = expiresAt - now;

        resolve({
          hasTrial: true,
          hasUsedTrial: true,
          startedAt: record.startedAt,
          expiresAt: expiresAt.toISOString(),
          remainingTime: Math.max(0, remainingTime),
          isExpired: remainingTime <= 0
        });
      } catch (e) {
        log.error('Failed to read trial record:', e);
        resolve({ hasTrial: false, hasUsedTrial: false, remainingTime: 0, isExpired: true });
      }
    });
  }

  // Cache trial record locally
  cacheTrialRecord(data) {
    try {
      const record = {
        startedAt: data.trialStartedAt,
        machineId: this.machineId
      };
      fs.writeFileSync(this.trialPath, JSON.stringify(record), 'utf8');
    } catch (e) {
      log.warn('Failed to cache trial record:', e.message);
    }
  }

  // Start trial period (now requires server confirmation)
  startTrial(apiStartFn) {
    return new Promise(async (resolve) => {
      try {
        // Call backend API to start trial
        const result = await apiStartFn();

        if (result.success && result.data) {
          // Cache the trial record locally
          this.cacheTrialRecord(result.data);
          resolve({
            success: true,
            trialStartedAt: result.data.trialStartedAt,
            trialExpiresAt: result.data.trialExpiresAt,
            remainingMs: result.data.remainingMs
          });
        } else {
          resolve({ success: false, error: result.error?.message || '啟動試用期失敗' });
        }
      } catch (e) {
        log.error('Start trial error:', e);
        resolve({ success: false, error: e.message });
      }
    });
  }

  // Check if serial is activated for this machine
  checkSerialStatus() {
    if (!fs.existsSync(this.licensePath)) {
      return { hasSerial: false, isActivated: false };
    }

    try {
      const license = JSON.parse(fs.readFileSync(this.licensePath, 'utf8'));

      // Verify machine ID matches
      if (license.machineId !== this.machineId) {
        log.warn('Machine ID mismatch in license file');
        return { hasSerial: false, isActivated: false, error: 'Machine ID mismatch' };
      }

      return {
        hasSerial: true,
        isActivated: true,
        serialKey: license.serialKey,
        activatedAt: license.activatedAt
      };
    } catch (e) {
      log.error('Failed to read license:', e);
      return { hasSerial: false, isActivated: false, error: e.message };
    }
  }

  // Activate with serial key
  activate(serialKey, apiActivateFn) {
    return new Promise(async (resolve) => {
      try {
        // Call backend API to activate
        const result = await apiActivateFn(serialKey, this.machineId);

        if (result.success) {
          // Save to local file
          const license = {
            serialKey: serialKey,
            machineId: this.machineId,
            activatedAt: new Date().toISOString(),
            backendActivatedAt: result.data?.activatedAt
          };

          fs.writeFileSync(this.licensePath, JSON.stringify(license, null, 2), 'utf8');
          log.info('Serial key activated:', serialKey);

          this.cache = null; // Clear cache
          resolve({ success: true, activatedAt: license.activatedAt });
        } else {
          resolve({ success: false, error: result.error?.message || '啟用失敗' });
        }
      } catch (e) {
        log.error('Activation error:', e);
        resolve({ success: false, error: e.message });
      }
    });
  }

  // Deactivate (remove local license)
  deactivate() {
    try {
      if (fs.existsSync(this.licensePath)) {
        fs.unlinkSync(this.licensePath);
      }
      this.cache = null;
      log.info('License deactivated');
      return { success: true };
    } catch (e) {
      log.error('Failed to deactivate:', e);
      return { success: false, error: e.message };
    }
  }

  // Get overall license status (checks server for trial)
  getLicenseStatus(apiTrialStatusFn, apiSerialActivateFn) {
    return new Promise(async (resolve) => {
      // Check local serial first
      const serialStatus = this.checkSerialStatus();
      if (serialStatus.isActivated) {
        resolve({
          mode: 'serial',
          valid: true,
          serialKey: serialStatus.serialKey,
          activatedAt: serialStatus.activatedAt
        });
        return;
      }

      // Check trial with server authority
      const trialStatus = await this.checkTrialStatus(apiTrialStatusFn);

      if (!trialStatus.isExpired) {
        resolve({
          mode: 'trial',
          valid: true,
          remainingTime: trialStatus.remainingTime,
          expiresAt: trialStatus.expiresAt,
          hasUsedTrial: trialStatus.hasUsedTrial
        });
        return;
      }

      // Trial expired or not started
      resolve({
        mode: 'none',
        valid: false,
        hasUsedTrial: trialStatus.hasUsedTrial,
        error: trialStatus.hasUsedTrial ? '試用期已結束' : '請先試用'
      });
    });
  }

  // Clear all local data
  clearAll() {
    try {
      if (fs.existsSync(this.licensePath)) {
        fs.unlinkSync(this.licensePath);
      }
      if (fs.existsSync(this.trialPath)) {
        fs.unlinkSync(this.trialPath);
      }
      this.cache = null;
      log.info('All license data cleared');
      return { success: true };
    } catch (e) {
      log.error('Failed to clear license data:', e);
      return { success: false, error: e.message };
    }
  }
}

module.exports = { SoftwareLicenseManager };