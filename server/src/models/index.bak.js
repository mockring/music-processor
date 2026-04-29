// In production, use PostgreSQL via db.js
// In development/staging without DB, fall back to in-memory
const { UserModel, SubscriptionModel, PaymentModel, DeviceModel } = require('./db');
const inMemoryModels = require('./index.bak');

const useDB = process.env.DATABASE_URL && process.env.NODE_ENV !== 'test';

module.exports = useDB
  ? { UserModel, SubscriptionModel, PaymentModel, DeviceModel }
  : inMemoryModels;