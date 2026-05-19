const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// ============ USERS ============
const UserModel = {
  async create(data) {
    const role = data.role || 'user';
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
      [data.email.toLowerCase(), data.passwordHash, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at
    };
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const result = await pool.query(
      `UPDATE users SET email = COALESCE($2, email), password_hash = COALESCE($3, password_hash) WHERE id = $1 RETURNING *`,
      [id, data.email, data.passwordHash]
    );
    return result.rows[0];
  }
};

// ============ SERIAL KEYS ============
const SerialKeyModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO serial_keys (serial_key, user_id) VALUES ($1, $2) RETURNING *`,
      [data.serialKey, data.userId]
    );
    return result.rows[0];
  },

  async findBySerialKey(serialKey) {
    const result = await pool.query(
      `SELECT sk.*, u.email as user_email
       FROM serial_keys sk
       JOIN users u ON u.id = sk.user_id
       WHERE sk.serial_key = $1`,
      [serialKey]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM serial_keys WHERE user_id = $1`,
      [userId]
    );
    return result.rows;
  },

  async activate(serialKey, machineId) {
    const result = await pool.query(
      `UPDATE serial_keys SET machine_id = $2, is_used = true, activated_at = CURRENT_TIMESTAMP
       WHERE serial_key = $1 AND is_used = false AND machine_id IS NULL
       RETURNING *`,
      [serialKey, machineId]
    );
    return result.rows[0];
  },

  async findByMachineId(machineId) {
    const result = await pool.query(
      `SELECT sk.*, u.email as user_email
       FROM serial_keys sk
       JOIN users u ON u.id = sk.user_id
       WHERE sk.machine_id = $1 AND sk.is_used = true`,
      [machineId]
    );
    return result.rows[0];
  }
};

// ============ TRIAL RECORDS ============
const TrialRecordModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO trial_records (machine_id, trial_started_at, trial_expires_at, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.machineId, data.trialStartedAt, data.trialExpiresAt, true]
    );
    return result.rows[0];
  },

  async findByMachineId(machineId) {
    const result = await pool.query(
      `SELECT * FROM trial_records WHERE machine_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [machineId]
    );
    return result.rows[0];
  },

  async updateStatus(machineId, isActive) {
    const result = await pool.query(
      `UPDATE trial_records SET is_active = $2 WHERE machine_id = $1 RETURNING *`,
      [machineId, isActive]
    );
    return result.rows[0];
  }
};

// ============ PAYMENT SUBMISSIONS ============
const PaymentSubmissionModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO payment_submissions (user_id, bank_account, amount, transfer_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.userId, data.bankAccount, data.amount, data.transferTime, 'pending', data.notes || '']
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT ps.*, sk.serial_key
       FROM payment_submissions ps
       LEFT JOIN serial_keys sk ON sk.user_id = ps.user_id
       WHERE ps.user_id = $1
       ORDER BY ps.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT ps.*, u.email as user_email
       FROM payment_submissions ps
       JOIN users u ON u.id = ps.user_id
       WHERE ps.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findPending() {
    const result = await pool.query(
      `SELECT ps.*, u.email as user_email
       FROM payment_submissions ps
       JOIN users u ON u.id = ps.user_id
       WHERE ps.status = 'pending'
       ORDER BY ps.created_at ASC`
    );
    return result.rows;
  },

  async updateStatus(id, status, notes) {
    const result = await pool.query(
      `UPDATE payment_submissions SET status = $2, notes = COALESCE($3, notes), confirmed_at = CASE WHEN $2 = 'confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END
       WHERE id = $1 RETURNING *`,
      [id, status, notes]
    );
    return result.rows[0];
  }
};

// ============ SUBSCRIPTIONS (legacy - kept for reference) ============
const SubscriptionModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.userId, data.plan, data.status || 'active', data.currentPeriodStart, data.currentPeriodEnd]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.currentPeriodEnd !== undefined) {
      fields.push(`current_period_end = $${idx++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.cancelAtPeriodEnd !== undefined) {
      fields.push(`cancel_at_period_end = $${idx++}`);
      values.push(data.cancelAtPeriodEnd);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async cancel(id) {
    return this.update(id, { status: 'cancelled', cancelAtPeriodEnd: true });
  },

  async reactivate(id) {
    return this.update(id, { status: 'active', cancelAtPeriodEnd: false });
  }
};

// ============ PAYMENTS (legacy) ============
const PaymentModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO payments (user_id, subscription_id, ecpay_order_id, amount, status, method, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.userId, data.subscriptionId, data.ecpayOrderId, data.amount, data.status || 'pending', data.method, data.description]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const result = await pool.query(
      `UPDATE payments SET status = COALESCE($2, status), paid_at = COALESCE($3, paid_at) WHERE id = $1 RETURNING *`,
      [id, data.status, data.paidAt]
    );
    return result.rows[0];
  },

  async markPaid(id) {
    return this.update(id, { status: 'paid', paidAt: new Date() });
  }
};

// ============ DEVICES (legacy) ============
const DeviceModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO devices (user_id, machine_id, name) VALUES ($1, $2, $3) RETURNING *`,
      [data.userId, data.machineId, data.name]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM devices WHERE user_id = $1 ORDER BY last_active_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByMachineId(machineId) {
    const result = await pool.query(
      `SELECT * FROM devices WHERE machine_id = $1`,
      [machineId]
    );
    return result.rows[0];
  },

  async touch(id) {
    const result = await pool.query(
      `UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query(`DELETE FROM devices WHERE id = $1`, [id]);
    return true;
  },

  async countByUserId(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM devices WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
};

// ============ PASSWORD RESET TOKENS ============
const PasswordResetTokenModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.userId, data.token, data.expiresAt]
    );
    return result.rows[0];
  },

  async findByToken(token) {
    const result = await pool.query(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    return result.rows[0];
  },

  async markUsed(token) {
    const result = await pool.query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1 RETURNING *`,
      [token]
    );
    return result.rows[0];
  },

  async deleteByUserId(userId) {
    await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
    return true;
  }
};

module.exports = {
  UserModel,
  SerialKeyModel,
  TrialRecordModel,
  PaymentSubmissionModel,
  SubscriptionModel,
  PaymentModel,
  DeviceModel,
  PasswordResetTokenModel
};