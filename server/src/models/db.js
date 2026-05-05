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
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
      [data.email.toLowerCase(), data.passwordHash]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    return result.rows[0];
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

// ============ SUBSCRIPTIONS ============
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

// ============ PAYMENTS ============
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

// ============ DEVICES ============
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
  SubscriptionModel,
  PaymentModel,
  DeviceModel,
  PasswordResetTokenModel
};