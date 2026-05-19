// Models index - auto-switch between PostgreSQL and in-memory storage
const dbModels = require('./db');
const inMemoryModels = require('./index.bak');

const useDB = process.env.DATABASE_URL && process.env.NODE_ENV !== 'test';

module.exports = useDB
  ? {
      UserModel: dbModels.UserModel,
      SerialKeyModel: dbModels.SerialKeyModel,
      TrialRecordModel: dbModels.TrialRecordModel,
      PaymentSubmissionModel: dbModels.PaymentSubmissionModel,
      SubscriptionModel: dbModels.SubscriptionModel,
      PaymentModel: dbModels.PaymentModel,
      DeviceModel: dbModels.DeviceModel,
      PasswordResetTokenModel: dbModels.PasswordResetTokenModel
    }
  : inMemoryModels;