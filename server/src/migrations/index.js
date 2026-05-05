const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

const migrations = [
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
  },
  {
    name: 'create_subscriptions_table',
    sql: `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ecpay_customer_id VARCHAR(50),
        plan VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'yearly', 'lifetime')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'past_due')),
        current_period_start DATE,
        current_period_end DATE,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    `
  },
  {
    name: 'create_payments_table',
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
        ecpay_order_id VARCHAR(50),
        amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'TWD',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
        method VARCHAR(20) DEFAULT 'credit_card',
        paid_at TIMESTAMP WITH TIME ZONE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    `
  },
  {
    name: 'create_devices_table',
    sql: `
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        machine_id VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_machine_id ON devices(machine_id);
    `
  },
  {
    name: 'create_updated_at_trigger',
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
      CREATE TRIGGER update_subscriptions_updated_at
        BEFORE UPDATE ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  },
  {
    name: 'create_password_reset_tokens_table',
    sql: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    `
  }
];

async function runMigrations() {
  if (!config.database.url) {
    console.log('DATABASE_URL not set, skipping migrations');
    return;
  }

  console.log('Running database migrations...');

  // First, try to enable UUID extension and create the generate_uuid_v4 function
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
    `);
    console.log('✓ Enabled pgcrypto extension');
  } catch (e) {
    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
      `);
      console.log('✓ Enabled uuid-ossp extension');
    } catch (e2) {
      console.log('○ Could not enable UUID extension, will use fallback');
    }
  }

  // Create a UUID generation function that works regardless of available extension
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_uuid_v4()
      RETURNS UUID AS $$
      BEGIN
        RETURN uuid_generate_v4();
      EXCEPTION WHEN undefined_function THEN
        RETURN gen_random_uuid();
      EXCEPTION WHEN undefined_function THEN
        RETURN md5(random()::text || now()::text)::uuid;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Created generate_uuid_v4() function');
  } catch (e) {
    console.log('○ Could not create generate_uuid_v4() function');
  }

  for (const migration of migrations) {
    try {
      await pool.query(migration.sql);
      console.log(`✓ Migration '${migration.name}' completed`);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.code !== '42P07' && error.code !== '42710') {
        console.error(`✗ Migration '${migration.name}' failed:`, error.message);
      } else {
        console.log(`○ Migration '${migration.name}' skipped (already exists)`);
      }
    }
  }

  console.log('Database migrations completed');
}

// Only run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };