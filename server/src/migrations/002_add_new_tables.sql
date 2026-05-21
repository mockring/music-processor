-- Music Ring - Database Migration Script
-- Run this script to create all necessary tables for the Music Ring application
-- This script is idempotent - safe to run multiple times

-- ============ Enable UUID extension ============
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'pgcrypto not available, using fallback UUID';
END $$;

-- Create UUID generation function
CREATE OR REPLACE FUNCTION generate_uuid_v4()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
EXCEPTION WHEN undefined_function THEN
    RETURN uuid_generate_v4();
EXCEPTION WHEN undefined_function THEN
    RETURN md5(random()::text || now()::text)::uuid;
END;
$$ LANGUAGE plpgsql;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add role constraint if not exists (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_role'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_role CHECK (role IN ('user', 'admin'));
    END IF;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;

-- ============ SUBSCRIPTIONS ============
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

-- ============ SERIAL KEYS ============
CREATE TABLE IF NOT EXISTS serial_keys (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    serial_key VARCHAR(35) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    machine_id VARCHAR(64),
    is_used BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_serial_keys_serial_key ON serial_keys(serial_key);
CREATE INDEX IF NOT EXISTS idx_serial_keys_user_id ON serial_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_serial_keys_machine_id ON serial_keys(machine_id);

-- ============ TRIAL RECORDS ============
CREATE TABLE IF NOT EXISTS trial_records (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    machine_id VARCHAR(64) UNIQUE NOT NULL,
    trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trial_records_machine_id ON trial_records(machine_id);

-- ============ PAYMENT SUBMISSIONS (Bank Transfer) ============
CREATE TABLE IF NOT EXISTS payment_submissions (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    bank_account VARCHAR(10),
    amount DECIMAL(10,2) NOT NULL,
    transfer_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_user_id ON payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);

-- ============ PAYMENTS (Legacy) ============
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
CREATE INDEX IF NOT EXISTS idx_payments_ecpay_order_id ON payments(ecpay_order_id);

-- ============ DEVICES ============
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

-- ============ PASSWORD RESET TOKENS ============
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ DONE ============
SELECT 'Database migration completed successfully!' AS status;