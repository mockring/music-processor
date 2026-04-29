# Music Processor - Server API Specification

## 使用金流：綠界科技 (ECPay)

---

## Base URL
```
https://api.yourdomain.com/v1
```

---

## 1. Authentication (認證)

### 1.1 Register
```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxxxxxxxxxxx",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format
- `400` - Password too short (< 8 chars)

---

### 1.2 Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxxxxxxxxxxx",
      "email": "user@example.com",
      "subscription": {
        "status": "active",
        "plan": "monthly",
        "expiresAt": "2024-02-01T00:00:00.000Z"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `401` - Invalid credentials

---

### 1.3 Logout
```
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.4 Get Current User
```
GET /auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_xxxxxxxxxxxx",
    "email": "user@example.com",
    "subscription": {
      "status": "active",
      "plan": "monthly",
      "expiresAt": "2024-02-01T00:00:00.000Z"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 2. Subscription (付費方案)

### 2.1 Get Subscription Plans
```
GET /subscription/plans
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_monthly",
        "name": "月付方案",
        "price": 20000,
        "originalPrice": 25000,
        "currency": "TWD",
        "interval": "month",
        "description": "完整功能，自動月扣"
      },
      {
        "id": "plan_yearly",
        "name": "年付方案",
        "price": 210000,
        "originalPrice": 270000,
        "currency": "TWD",
        "interval": "year",
        "description": "完整功能，省22%"
      },
      {
        "id": "plan_lifetime",
        "name": "永久授權",
        "price": 600000,
        "originalPrice": 900000,
        "currency": "TWD",
        "interval": "lifetime",
        "description": "完整功能，終身使用"
      }
    ]
  }
}
```

**說明：** 價格單位為「分」（100分 = 1元）

---

### 2.2 Create Subscription (建立訂閱 - 綠界定期定額)
```
POST /subscription/create
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "planId": "plan_monthly",
  "paymentMethod": "credit_card",
  "cardToken": "crd_xxxxxxxxxxxx"  // 銀行回傳的卡號 token
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_xxxxxxxxxxxx",
      "status": "active",
      "plan": "monthly",
      "ecpayPeriodStart": "2024-01-01",
      "ecpayPeriodType": "M",
      "ecpayFrequency": "1",
      "nextBillingDate": "2024-02-01",
      "totalCycles": 0
    }
  }
}
```

**說明：**
- `ecpayPeriodType`: M=月, Y=年
- `ecpayFrequency`: 頻率（1=每1單位）
- `totalCycles`: 0=不限制（持續扣款）

---

### 2.3 Get Current Subscription
```
GET /subscription
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_xxxxxxxxxxxx",
      "status": "active",
      "plan": "monthly",
      "ecpayPeriodStart": "2024-01-01",
      "ecpayPeriodType": "M",
      "ecpayFrequency": "1",
      "nextBillingDate": "2024-02-01",
      "cancelAtPeriodEnd": false
    }
  }
}
```

---

### 2.4 Cancel Subscription (取消訂閱)
```
POST /subscription/cancel
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_xxxxxxxxxxxx",
      "status": "cancelled",
      "cancelAtPeriodEnd": true,
      "currentPeriodEnd": "2024-02-01",
      "message": "訂閱已取消，將於本週期結束後失效"
    }
  }
}
```

---

### 2.5 Reactivate Subscription (重新啟用)
```
POST /subscription/reactivate
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_xxxxxxxxxxxx",
      "status": "active",
      "cancelAtPeriodEnd": false
    }
  }
}
```

---

### 2.6 One-time Payment (一次性購買 - 永久授權)
```
POST /subscription/one-time
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "planId": "plan_lifetime"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_xxxxxxxxxxxx",
    "amount": 199900,
    "currency": "TWD",
    "paymentInfo": {
      "ecpayPaymentUrl": "https://payment.ecpay.com.tw/...",
      "method": "credit_card"
    }
  }
}
```

---

## 3. License Verification (授權驗證)

### 3.1 Verify License (驗證訂閱狀態)
```
POST /license/verify
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "machineId": "xxxx-xxxx-xxxx-xxxx"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "subscription": {
      "status": "active",
      "plan": "monthly",
      "expiresAt": "2024-02-01"
    },
    "features": ["all"],
    "deviceId": "dev_xxxxxxxxxxxx"
  }
}
```

**Errors:**
- `403` - Subscription expired
- `403` - Subscription cancelled

---

### 3.2 Register Device (註冊裝置)
```
POST /license/register-device
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "machineId": "xxxx-xxxx-xxxx-xxxx",
  "deviceName": "我的電腦"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_xxxxxxxxxxxx",
    "registeredAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3.3 List Registered Devices
```
GET /license/devices
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "dev_xxxxxxxxxxxx",
        "machineId": "xxxx-xxxx-xxxx-xxxx",
        "name": "我的電腦",
        "registeredAt": "2024-01-01T00:00:00.000Z",
        "lastActiveAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "maxDevices": 3
  }
}
```

---

### 3.4 Remove Device
```
DELETE /license/devices/:deviceId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device removed"
}
```

---

## 4. Payment (金流 - 綠界)

### 4.1 Get Payment Token (取得信用卡 token)
```
POST /payment/card-token
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cardNumber": "4000123456789012",
  "cardExpiry": "12/25",
  "cardCVV": "123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cardToken": "crd_xxxxxxxxxxxx",
    "maskedCard": "**** **** **** 9012",
    "cardBrand": "VISA"
  }
}
```

**說明：** 此 API 在客戶端直接呼叫綠界 token API，伺服器只接收已加密的 token。

---

### 4.2 Get Payment Url (取得 ATM/超商付款 Url)
```
POST /payment/payment-url
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "orderId": "ord_xxxxxxxxxxxx",
  "amount": 9900,
  "method": "atm"  // atm, cvs, credit_card
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://payment.ecpay.com.tw/...",
    "atmParams": {
      "BankCode": "1234",
      "VirtualAccount": "1234567890123456",
      "ExpireDate": "2024-01-08"
    }
  }
}
```

---

### 4.3 Get Payment Status
```
GET /payment/status/:orderId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_xxxxxxxxxxxx",
    "status": "paid",
    "paidAt": "2024-01-01T12:00:00.000Z",
    "paymentMethod": "credit_card"
  }
}
```

---

### 4.4 List Payment History
```
GET /payment/history
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay_xxxxxxxxxxxx",
        "orderId": "ord_xxxxxxxxxxxx",
        "amount": 9900,
        "currency": "TWD",
        "status": "paid",
        "method": "credit_card",
        "paidAt": "2024-01-01T12:00:00.000Z",
        "description": "月付方案 - 2024年1月"
      }
    ]
  }
}
```

---

## 5. Webhook (綠界回調)

### 5.1 Payment Notify (付款回調)
```
POST /webhook/payment
```

綠界付款完成後通知：

**Response:**
```json
{
  "success": true,
  "received": true
}
```

**處理邏輯：**
1. 驗證 CheckMacValue
2. 更新訂閱狀態
3. 記錄交易

---

### 5.2 Recurring Notify (定期定额回調)
```
POST /webhook/recurring
```

綠界自動扣款回調：

**Response:**
```json
{
  "success": true,
  "received": true
}
```

**處理邏輯：**
1. 驗證 CheckMacValue
2. 確認扣款成功
3. 更新下次扣款日期
4. 失敗通知

---

## 6. Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email 格式無效"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_EMAIL` | 400 | Email 格式無效 |
| `EMAIL_EXISTS` | 400 | Email 已被註冊 |
| `PASSWORD_TOO_SHORT` | 400 | 密碼太短 |
| `INVALID_CREDENTIALS` | 401 | 帳號或密碼錯誤 |
| `UNAUTHORIZED` | 401 | 未登入或 Token 過期 |
| `SUBSCRIPTION_EXPIRED` | 403 | 訂閱已過期 |
| `SUBSCRIPTION_CANCELLED` | 403 | 訂閱已取消 |
| `PAYMENT_FAILED` | 402 | 付款失敗 |
| `NOT_FOUND` | 404 | 找不到資源 |
| `ECPAY_ERROR` | 502 | 綠界 API 錯誤 |

---

## 7. Authentication Flow

```
1. 使用者註冊 → 取得 JWT Token
2. Token 存入本地端 (Electron app)
3. 每次 API 請求攜帶 Token (Authorization: Bearer <token>)
4. Token 過期 → 需重新登入
5. 訂閱驗證時，同時檢查 device 註冊狀態
```

### Token Structure
```json
{
  "userId": "usr_xxxxxxxxxxxx",
  "email": "user@example.com",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### Token Expiry
- Access Token: 24 小時
- 需實作 Refresh Token 機制

---

## 8. Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | 主鍵 |
| email | VARCHAR(255) | 唯一 email |
| password_hash | VARCHAR(255) | bcrypt hash |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

### subscriptions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | 主鍵 |
| user_id | UUID | 外鍵 users |
| ecpay_customer_id | VARCHAR(50) | 綠界會員識別碼 |
| plan | ENUM | monthly/yearly/lifetime |
| status | ENUM | active/cancelled/expired/past_due |
| current_period_start | DATE | 週期開始 |
| current_period_end | DATE | 週期結束 |
| cancel_at_period_end | BOOLEAN | 是否在週期結束取消 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | 主鍵 |
| user_id | UUID | 外鍵 users |
| subscription_id | UUID | 外鍵 subscriptions |
| ecpay_order_id | VARCHAR(50) | 綠界訂單編號 |
| amount | INTEGER | 金額（分） |
| currency | VARCHAR(3) | 幣別 TWD |
| status | ENUM | pending/paid/failed/refunded |
| method | VARCHAR(20) | credit_card/atm/cvs |
| paid_at | TIMESTAMP | 付款時間 |
| created_at | TIMESTAMP | 建立時間 |

### devices
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | 主鍵 |
| user_id | UUID | 外鍵 users |
| machine_id | VARCHAR(255) | 機器識別碼 |
| name | VARCHAR(255) | 裝置名稱 |
| last_active_at | TIMESTAMP | 最後活躍時間 |
| created_at | TIMESTAMP | 建立時間 |

---

## 9. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/register` | 5/小時 |
| `/auth/login` | 10/分鐘 |
| `/license/verify` | 60/分鐘 |

---

## 10. Security

- 所有 API 需 HTTPS
- 密碼使用 bcrypt (cost factor 12)
- JWT Secret 至少 32 字元
- 輸入驗證 + SQL Injection 防護
- 綠界 CheckMacValue 驗證
- 信用卡 token 只存绿界代碼，不存卡號

---

## 11. 綠界定期定額特別說明

### 申請需要的項目
1. 綠界會員帳號 (一般會員/特店)
2. 商店代號 (MerchantID)
3. 金鑰 (HashKey, HashIV)
4. 開通「信用卡定期定額」服務

### 定期定額流程
```
1. 用戶選擇月付/年付方案
2. 前端取得卡 token (透過綠界token API)
3. 後端建立代收定型 (CreateRecurring)
4. 綠界於每期自動扣款
5. 扣款後 Webhook 通知伺服器
```

### 支援的付款方式
- 信用卡定期定額（月繳、年繳）
- 一次性信用卡（永久授權）
- ATM 轉帳（一次性）
- 超商代碼（一次性）

---

## 12. 環境變數

```env
# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your-32-char-secret-key-here
JWT_EXPIRY=24h

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ytmusic

# 綠界
ECPAY_MERCHANT_ID=your_merchant_id
ECPAY_HASH_KEY=your_hash_key
ECPAY_HASH_IV=your_hash_iv
ECPAY_DEBUG=true

# Frontend
FRONTEND_URL=https://yourdomain.com
```