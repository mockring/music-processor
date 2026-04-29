const { SubscriptionModel, DeviceModel } = require('../models');
const config = require('../config');

const LicenseController = {
  // Verify license (check subscription + register device)
  async verify(req, res) {
    try {
      const { machineId } = req.body;
      const userId = req.user.userId;

      if (!machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_MACHINE_ID', message: '缺少機器識別碼' }
        });
      }

      // Check subscription
      const subscription = await SubscriptionModel.findByUserId(userId);

      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: '沒有有效的訂閱' }
        });
      }

      // Check subscription expiry (for non-lifetime)
      if (subscription.plan !== 'lifetime') {
        const expiry = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        if (now > expiry) {
          return res.status(403).json({
            success: false,
            error: { code: 'SUBSCRIPTION_EXPIRED', message: '訂閱已過期' }
          });
        }
      }

      // Register or update device
      let device = await DeviceModel.findByMachineId(machineId);
      const deviceCount = await DeviceModel.countByUserId(userId);

      if (device) {
        // Update last active
        await DeviceModel.touch(device.id);
      } else {
        // Check device limit
        if (deviceCount >= config.maxDevicesPerUser) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'DEVICE_LIMIT_REACHED',
              message: `已達到裝置上限（${config.maxDevicesPerUser} 台）`,
              maxDevices: config.maxDevicesPerUser
            }
          });
        }

        // Create new device
        device = await DeviceModel.create({
          userId,
          machineId,
          name: req.body.deviceName || 'Unknown Device'
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          subscription: {
            status: subscription.status,
            plan: subscription.plan,
            expiresAt: subscription.currentPeriodEnd
          },
          features: ['all'],
          deviceId: device.id
        }
      });
    } catch (error) {
      console.error('Verify license error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '驗證失敗' }
      });
    }
  },

  // Register device
  async registerDevice(req, res) {
    try {
      const { machineId, deviceName } = req.body;
      const userId = req.user.userId;

      if (!machineId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_MACHINE_ID', message: '缺少機器識別碼' }
        });
      }

      // Check if already registered
      const existing = await DeviceModel.findByMachineId(machineId);
      if (existing) {
        if (existing.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: { code: 'DEVICE_ALREADY_REGISTERED', message: '此裝置已被其他帳號註冊' }
          });
        }
        // Update last active
        await DeviceModel.touch(existing.id);
        return res.json({
          success: true,
          data: {
            deviceId: existing.id,
            registeredAt: existing.createdAt
          }
        });
      }

      // Check device limit
      const deviceCount = await DeviceModel.countByUserId(userId);
      if (deviceCount >= config.maxDevicesPerUser) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEVICE_LIMIT_REACHED',
            message: `已達到裝置上限（${config.maxDevicesPerUser} 台）`,
            maxDevices: config.maxDevicesPerUser
          }
        });
      }

      // Create device
      const device = await DeviceModel.create({
        userId,
        machineId,
        name: deviceName || 'Unknown Device'
      });

      res.json({
        success: true,
        data: {
          deviceId: device.id,
          registeredAt: device.createdAt
        }
      });
    } catch (error) {
      console.error('Register device error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '註冊裝置失敗' }
      });
    }
  },

  // List devices
  async listDevices(req, res) {
    try {
      const devices = await DeviceModel.findByUserId(req.user.userId);

      res.json({
        success: true,
        data: {
          devices: devices.map(d => ({
            id: d.id,
            machineId: d.machineId,
            name: d.name,
            registeredAt: d.createdAt,
            lastActiveAt: d.lastActiveAt
          })),
          maxDevices: config.maxDevicesPerUser
        }
      });
    } catch (error) {
      console.error('List devices error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得裝置列表失敗' }
      });
    }
  },

  // Remove device
  async removeDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.userId;

      // Find device
      const devices = await DeviceModel.findByUserId(userId);
      const device = devices.find(d => d.id === deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '找不到裝置' }
        });
      }

      await DeviceModel.delete(deviceId);

      res.json({
        success: true,
        message: '裝置已移除'
      });
    } catch (error) {
      console.error('Remove device error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '移除裝置失敗' }
      });
    }
  }
};

module.exports = LicenseController;