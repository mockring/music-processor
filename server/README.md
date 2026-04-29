# Music Processor - Backend Server

## 安裝與執行

### 1. 安裝依賴
```bash
cd server
npm install
```

### 2. 設定環境變數
```bash
cp .env.example .env
# 編輯 .env 填入實際的值
```

### 3. 資料庫設定
```bash
# 建立 PostgreSQL 資料庫
createdb ytmusic

# 執行遷移
psql -d postgresql://user:pass@localhost:5432/ytmusic -f src/migrations/001_initial_schema.sql
```

### 4. 啟動伺服器
```bash
# 開發模式
npm run dev

# 正式環境
npm start
```

## API 端點

### 認證
- `POST /v1/auth/register` - 註冊
- `POST /v1/auth/login` - 登入
- `POST /v1/auth/logout` - 登出
- `GET /v1/auth/me` - 取得當前用戶

### 訂閱
- `GET /v1/subscription/plans` - 取得訂閱方案
- `GET /v1/subscription` - 取得當前訂閱
- `POST /v1/subscription/create` - 建立訂閱（定期定額）
- `POST /v1/subscription/one-time` - 一次性購買（永久授權）
- `POST /v1/subscription/cancel` - 取消訂閱
- `POST /v1/subscription/reactivate` - 重新啟用

### 授權
- `POST /v1/license/verify` - 驗證授權
- `POST /v1/license/register-device` - 註冊裝置
- `GET /v1/license/devices` - 取得裝置列表
- `DELETE /v1/license/devices/:deviceId` - 移除裝置

### 付款 (placeholder)
- `POST /v1/payment/card-token` - 取得信用卡 token
- `POST /v1/payment/payment-url` - 取得付款 URL

## 環境變數說明

| 變數 | 說明 | 預設值 |
|------|------|--------|
| PORT | 伺服器端口 | 3000 |
| NODE_ENV | 環境 | development |
| JWT_SECRET | JWT 金鑰（至少32字元） | - |
| DATABASE_URL | PostgreSQL 連線字串 | - |
| ECPAY_MERCHANT_ID | 綠界商店代號 | - |
| ECPAY_HASH_KEY | 綠界 HashKey | - |
| ECPAY_HASH_IV | 綠界 HashIV | - |
| FRONTEND_URL | 前端 URL（CORS 用） | http://localhost:3001 |

## 訂閱方案價格（分）

| 方案 | 特價 | 原價 |
|------|------|------|
| 月付 | 20000 (NT$200) | 25000 |
| 年付 | 210000 (NT$2100) | 270000 |
| 永久 | 600000 (NT$6000) | 900000 |