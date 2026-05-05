-- Music Processor - Database Migration
-- Run this script to create the database schema

-- Create database (run as superuser)
-- CREATE DATABASE ytmusic;

-- Connect to the database and run the following:

-- Enable UUID extension
-- Try pgcrypto first (more commonly available), then uuid-ossp
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN insufficient_privilege THEN
    -- Cannot create extension, try uuid-ossp
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot create UUID extensions.';
    END;
EXCEPTION WHEN others THEN
    -- Try uuid-ossp as fallback
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'UUID extensions not available.';
    END;
END $$;

-- Create a UUID generation function that works regardless of extension
CREATE OR REPLACE FUNCTION generate_uuid_v4()
RETURNS UUID AS $$
BEGIN
    -- Try uuid_generate_v4 first (uuid-ossp)
    RETURN uuid_generate_v4();
EXCEPTION WHEN undefined_function THEN
    -- Fall back to gen_random_uuid (pgcrypto)
    RETURN gen_random_uuid();
EXCEPTION WHEN undefined_function THEN
    -- Last resort: manual UUID v4 generation
    RETURN md5(random()::text || now()::text)::uuid;
END;
$$ LANGUAGE plpgsql;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    ecpay_order_id VARCHAR(50),
    amount INTEGER NOT NULL,  -- in cents (分)
    currency VARCHAR(3) DEFAULT 'TWD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    method VARCHAR(20) DEFAULT 'credit_card',  -- credit_card, atm, cvs
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

-- ============ TRIGGER FOR UPDATED_AT ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();