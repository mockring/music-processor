const crypto = require('crypto');
const { SerialKeyModel, UserModel } = require('../models');

const SerialController = {
  // Generate a new serial key for a user
  // Format: XXXX-XXXX-XXXX-XXXX (each segment is 4 bytes = 32 bits, total 128 bits entropy)
  async generate(data) {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const segment = crypto.randomBytes(4).toString('hex').toUpperCase();
      segments.push(segment);
    }
    return segments.join('-');
  },

  // Create serial key for a user
  async createForUser(userId) {
    const serialKey = await this.generate();
    const serial = await SerialKeyModel.create({
      serialKey,
      userId
    });
    return serial;
  },

  // Activate serial key with machine ID
  async activate(req, res) {
    try {
      const { serialKey, machineId } = req.body;

      if (!serialKey || !machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '缺少 serialKey 或 machineId' }
        });
      }

      // Find the serial key
      const serial = await SerialKeyModel.findBySerialKey(serialKey);

      if (!serial) {
        return res.status(404).json({
          success: false,
          error: { code: 'SERIAL_NOT_FOUND', message: '序號不存在' }
        });
      }

      if (serial.is_used) {
        return res.status(400).json({
          success: false,
          error: { code: 'SERIAL_ALREADY_USED', message: '序號已被使用' }
        });
      }

      if (serial.machine_id && serial.machine_id !== machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'SERIAL_BOUND_TO_ANOTHER_MACHINE', message: '序號已被其他裝置綁定' }
        });
      }

      // Activate the serial key
      const activated = await SerialKeyModel.activate(serialKey, machineId);

      if (!activated) {
        return res.status(400).json({
          success: false,
          error: { code: 'ACTIVATION_FAILED', message: '啟用失敗' }
        });
      }

      res.json({
        success: true,
        data: {
          serialKey: activated.serial_key,
          activatedAt: activated.activated_at,
          machineId: activated.machine_id
        }
      });
    } catch (error) {
      console.error('Serial activate error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '啟用序號失敗' }
      });
    }
  },

  // Get serial status for a machine
  async status(req, res) {
    try {
      const { machineId } = req.query;

      if (!machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_MACHINE_ID', message: '缺少 machineId' }
        });
      }

      const serial = await SerialKeyModel.findByMachineId(machineId);

      if (!serial) {
        return res.json({
          success: true,
          data: {
            hasSerial: false,
            isActive: false,
            message: 'No active serial found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          hasSerial: true,
          isActive: true,
          serialKey: serial.serial_key,
          userEmail: serial.user_email,
          activatedAt: serial.activated_at
        }
      });
    } catch (error) {
      console.error('Serial status error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得序號狀態失敗' }
      });
    }
  }
};

module.exports = SerialController;