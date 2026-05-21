# Music Ring API 文檔

## 概述

| 系統 | URL | 說明 |
|------|-----|------|
| 前端網站 | `https://music-ring.vercel.app` | Next.js (Vercel) |
| 前端 API | `https://music-ring.vercel.app/api/*` | API Routes (Proxy) |
| 後端 API | `https://music-processor-server.onrender.com/v1` | Express.js (Render) |
| 軟體 | Electron Desktop App | `Music Ring.exe` |

---

## 請求流程

```
前端瀏覽器 → 前端 API Routes (/api/*) → 後端 API (/v1/*)
                     ↓
            轉發 Authorization header
```

---

## 通用規格

### 回傳格式

**成功：**
```json
{ "success": true, "data": { ... } }
```

**失敗：**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "錯誤訊息" } }
```

### 認證 Header
```
Authorization: Bearer <jwt_token>
```

---

## 前端 API Routes

前端作為 Proxy，接收瀏覽器請求後轉發到後端。

### 認證 API

#### POST /api/auth/register
註冊新帳號。

```http
POST /api/auth/register
Content-Type: application/json

Body: { "email": "user@example.com", "password": "password123" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "user@example.com" },
    "token": "jwt_token_here"
  }
}
```

---

#### POST /api/auth/login
登入。

```http
POST /api/auth/login
Content-Type: application/json

Body: { "email": "user@example.com", "password": "password123" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "user@example.com" },
    "token": "jwt_token_here"
  }
}
```

---

#### GET /api/auth/me
取得當前會員資料。**需攜帶 Authorization header。**

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "role": "user",      // "user" 或 "admin"
    "subscription": null
  }
}
```

---

#### POST /api/auth/logout
登出。

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### 軟體授權 API

#### POST /api/trial/start
軟體啟動試用期（1小時）。

```http
POST /api/trial/start
Content-Type: application/json

Body: { "machineId": "abc123def456..." }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trialStartedAt": "2024-01-01T00:00:00.000Z",
    "trialExpiresAt": "2024-01-01T01:00:00.000Z",
    "remainingMs": 3600000
  }
}
```

---

#### GET /api/trial/status?machineId=xxx
查詢試用期狀態。

```http
GET /api/trial/status?machineId=abc123def456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasTrial": true,
    "isActive": true,
    "trialStartedAt": "2024-01-01T00:00:00.000Z",
    "trialExpiresAt": "2024-01-01T01:00:00.000Z",
    "remainingMs": 3600000,
    "remainingSeconds": 3600,
    "remainingMinutes": 60
  }
}
```

---

#### POST /api/serial/activate
軟體啟用序號。

```http
POST /api/serial/activate
Content-Type: application/json

Body: { "serialKey": "ABCD-EFGH-IJKL-MNOP", "machineId": "abc123..." }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serialKey": "ABCD-EFGH-IJKL-MNOP",
    "activatedAt": "2024-01-01T00:00:00.000Z",
    "machineId": "abc123..."
  }
}
```

---

#### GET /api/serial/status?machineId=xxx
查詢序號啟用狀態。

```http
GET /api/serial/status?machineId=abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasSerial": true,
    "isActive": true,
    "serialKey": "ABCD-EFGH-IJKL-MNOP",
    "userEmail": "user@example.com",
    "activatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 匯款 API

#### POST /api/payment/submit
提交匯款回報。

```http
POST /api/payment/submit
Content-Type: application/json

Body: {
  "email": "user@example.com",
  "accountLast5": "12345",
  "amount": "300",
  "transferTime": "2024-01-01T12:00:00"
}
```

**Response:**
```json
{ "success": true }
```

---

### 管理員 API

#### GET /api/admin/payments
取得所有匯款記錄。**需 admin 角色。**

```http
GET /api/admin/payments
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userEmail": "user@example.com",
        "bankAccount": "12345",
        "amount": 300,
        "transferTime": "2024-01-01T12:00:00",
        "status": "pending",
        "notes": "",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### POST /api/admin/confirm-payment
確認匯款並自動發送序號 Email。**需 admin 角色。**

```http
POST /api/admin/confirm-payment
Authorization: Bearer <token>
Content-Type: application/json

Body: { "paymentId": "uuid", "notes": "optional" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "serialKey": "ABCD-EFGH-IJKL-MNOP",
    "userEmail": "user@example.com"
  }
}
```

---

#### POST /api/admin/cancel-payment
取消匯款。**需 admin 角色。**

```http
POST /api/admin/cancel-payment
Authorization: Bearer <token>
Content-Type: application/json

Body: { "paymentId": "uuid", "notes": "cancelled reason" }
```

**Response:**
```json
{ "success": true }
```

---

#### POST /api/admin/create-serial
手動建立序號。**需 admin 角色。**

```http
POST /api/admin/create-serial
Authorization: Bearer <token>
Content-Type: application/json

Body: { "email": "user@example.com" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serialKey": "ABCD-EFGH-IJKL-MNOP",
    "userId": "uuid"
  }
}
```

---

## 後端直接 API

供軟體直接調用（繞過前端 Proxy）：

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | /v1/trial/start | 啟動試用期 |
| GET | /v1/trial/status | 查詢試用狀態 |
| POST | /v1/serial/activate | 啟用序號 |
| GET | /v1/serial/status | 查詢序號狀態 |

---

## 軟體 IPC API

軟體 (`Music Ring.exe`) 透過 Electron IPC 暴露給前端：

```javascript
// ===== 授權 =====
window.api.getLicenseStatus()           // 取得授權狀態
window.api.getMachineId()                // 取得機器 ID (用於序號綁定)
window.api.activateLicense(serialKey)   // 啟用序號
window.api.deactivateLicense()          // 取消授權
window.api.startTrial()                 // 開始試用（需後端確認）
window.api.getTrialStatus()             // 取得試用狀態

// ===== 處理音訊 =====
window.api.validateUrl(url)             // 驗證 YouTube URL
window.api.process(options)             // 處理音訊（下載+音高+人聲移除）
window.api.selectLocalFile()            // 選擇本地音訊檔案
window.api.selectOutputFolder()         // 選擇輸出資料夾
window.api.getOutputPath()               // 取得預設輸出路徑
window.api.pasteFromClipboard()          // 貼上剪貼簿內容
window.api.openFolder(path)              // 在檔案總管開啟資料夾
window.api.openLicenseFile()             // 開啟授權檔案
```

### process() 選項格式

```javascript
{
  url: "https://youtube.com/...",      // YouTube URL (與 localFile 二選一)
  localFile: "/path/to/file.mp3",       // 本地檔案路徑
  pitch: 0,                             // 音高調整 (-12 到 +12 半音)
  removeVocal: true,                    // 是否移除人聲
  format: "wav",                        // 輸出格式: wav, mp3, flac
  bitrate: 32,                          // 位元率: 16, 24, 32
  multiStem: false,                     // 多軌輸出
  stems: ["vocals", "bass", "drums"],  // 選擇的軌數
  outputFolder: null                    // 自訂輸出資料夾 (null 為預設)
}
```

### 授權狀態格式

```javascript
// 序號模式
{ mode: 'serial', valid: true, serialKey: 'ABCD-EFGH-IJKL-MNOP', activatedAt: '...' }

// 試用模式
{ mode: 'trial', valid: true, remainingTime: 3600000, expiresAt: '...', hasUsedTrial: true }

// 無授權
{ mode: 'none', valid: false, error: '試用期已結束' }
```

---

## 資料庫 Schema

### users
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| email | VARCHAR(255) | 信箱（唯一） |
| password_hash | VARCHAR(255) | bcrypt 密碼雜湊 |
| role | VARCHAR(50) | 'user' 或 'admin' |
| created_at | TIMESTAMP | 建立時間 |

### serial_keys
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| serial_key | VARCHAR(20) | 序號（唯一） |
| user_id | UUID | 擁有者 |
| machine_id | VARCHAR(64) | 綁定機器 ID |
| is_used | BOOLEAN | 是否已啟用 |
| activated_at | TIMESTAMP | 啟用時間 |
| created_at | TIMESTAMP | 建立時間 |

### trial_records
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| machine_id | VARCHAR(64) | 機器 ID（唯一） |
| trial_started_at | TIMESTAMP | 開始時間 |
| trial_expires_at | TIMESTAMP | 過期時間 |
| is_active | BOOLEAN | 是否啟用 |

### payment_submissions
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 匯款會員 |
| user_email | VARCHAR(255) | 會員信箱 |
| bank_account | VARCHAR(10) | 帳號後五碼 |
| amount | DECIMAL | 匯款金額 |
| transfer_time | TIMESTAMP | 匯款時間 |
| status | VARCHAR(20) | pending/confirmed/cancelled |
| notes | TEXT | 備註 |
| created_at | TIMESTAMP | 提交時間 |

---

## Rate Limiting

| API | 限制 |
|-----|------|
| /auth/* | 15 分鐘內最多 10 次 |
| /trial/* | 1 小時內最多 5 次 |
| /serial/* | 1 小時內最多 10 次 |
| /payment/* | 1 小時內最多 5 次 |

---

## 序號格式
```
XXXX-XXXX-XXXX-XXXX
```
- 4 段，每段 4 個十六進位字元
- 總共 16 個字元，128 位元亂數
- 終身使用，綁定一台機器

---

## 版本

- 2026-05-20: 更新登入流程、管理員 API、軟體 IPC 文件