const { TrialRecordModel } = require('../models');

const TrialController = {
  // Start trial for a machine
  async start(req, res) {
    try {
      const { machineId } = req.body;

      if (!machineId || typeof machineId !== 'string') {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_MACHINE_ID', message: '缺少 machineId' }
        });
      }

      // Check if already has trial record
      const existing = await TrialRecordModel.findByMachineId(machineId);

      if (existing) {
        // Check if trial is still active
        if (existing.is_active && new Date(existing.trial_expires_at) > new Date()) {
          return res.status(400).json({
            success: false,
            error: { code: 'TRIAL_ALREADY_STARTED', message: '試用期已開始' }
          });
        }

        // Trial expired or used, cannot start again
        return res.status(400).json({
          success: false,
          error: { code: 'TRIAL_EXHAUSTED', message: '已使用過試用期' }
        });
      }

      // Create new trial record (1 hour)
      const trialStartedAt = new Date();
      const trialExpiresAt = new Date(trialStartedAt.getTime() + 60 * 60 * 1000);

      const trial = await TrialRecordModel.create({
        machineId,
        trialStartedAt,
        trialExpiresAt
      });

      res.json({
        success: true,
        data: {
          trialStartedAt: trial.trial_started_at,
          trialExpiresAt: trial.trial_expires_at,
          remainingMs: trialExpiresAt.getTime() - Date.now()
        }
      });
    } catch (error) {
      console.error('Trial start error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '啟動試用期失敗' }
      });
    }
  },

  // Get trial status for a machine
  async status(req, res) {
    try {
      const { machineId } = req.query;

      if (!machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_MACHINE_ID', message: '缺少 machineId' }
        });
      }

      const trial = await TrialRecordModel.findByMachineId(machineId);

      if (!trial) {
        return res.json({
          success: true,
          data: {
            hasTrial: false,
            isActive: false,
            message: 'No trial record found'
          }
        });
      }

      const now = new Date();
      const expiresAt = new Date(trial.trial_expires_at);
      const isActive = trial.is_active && expiresAt > now;
      const remainingMs = isActive ? expiresAt.getTime() - now.getTime() : 0;

      res.json({
        success: true,
        data: {
          hasTrial: true,
          isActive,
          trialStartedAt: trial.trial_started_at,
          trialExpiresAt: trial.trial_expires_at,
          remainingMs,
          remainingSeconds: Math.floor(remainingMs / 1000),
          remainingMinutes: Math.floor(remainingMs / 60000)
        }
      });
    } catch (error) {
      console.error('Trial status error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得試用狀態失敗' }
      });
    }
  }
};

module.exports = TrialController;