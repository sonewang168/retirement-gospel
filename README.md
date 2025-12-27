# 🌅 退休福音 - 智慧生活規劃助手

> 每天打開手機，就知道今天能做什麼

退休福音是一個專為 55-75 歲退休族群設計的 LINE Bot，透過智慧推薦系統，每天為用戶推薦最適合的活動、景點和行程。

## ✨ 主要功能

### 🎯 每日推薦
- 根據天氣、空氣品質、用戶偏好智慧推薦
- 每天早上 7:30 自動推播 3 個精選活動
- 一鍵採納，自動規劃路線

### 🔍 探索活動
- 六大分類：自然踏青、美食探索、藝文展演、學習成長、宗教信仰、養生保健
- 語音搜尋、模糊搜尋
- 附近活動搜尋

### 👥 揪團出遊
- 發起/加入揪團活動
- 群組聊天室
- 活動報到打卡

### ❤️ 健康關懷
- 用藥提醒
- 回診提醒
- 穿戴裝置同步

### 👨‍👩‍👧 家人連結
- 邀請家人連結帳號
- 遠端關懷長輩動態
- SOS 緊急按鈕

## 🛠️ 技術架構

### 後端
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: Sequelize

### LINE 整合
- LINE Messaging API
- LINE LIFF (Front-end Framework)
- Rich Menu

### 外部服務
- 中央氣象署 API (天氣)
- 環保署 API (空氣品質)
- Google Maps Platform (地圖、路線)
- Gemini API (AI 推薦文案)

## 📁 專案結構

```
retirement-gospel/
├── src/
│   ├── app.js                 # 主程式入口
│   ├── controllers/           # 控制器
│   │   └── lineBotController.js
│   ├── models/               # 資料模型
│   │   └── index.js
│   ├── routes/               # 路由
│   │   ├── webhook.js        # LINE Webhook
│   │   ├── api.js            # REST API
│   │   ├── liff.js           # LIFF 頁面
│   │   ├── admin.js          # 管理後台
│   │   └── qrcode.js         # QR Code 服務
│   ├── services/             # 商業邏輯
│   │   ├── userService.js
│   │   ├── recommendationService.js
│   │   ├── groupService.js
│   │   ├── conversationService.js
│   │   ├── weatherService.js
│   │   ├── cacheService.js
│   │   └── schedulerService.js
│   ├── linebot/              # LINE Bot 相關
│   │   ├── flexMessageBuilder.js
│   │   └── richMenuService.js
│   └── utils/                # 工具函數
│       └── logger.js
├── views/                    # EJS 視圖模板
│   ├── index.ejs
│   ├── error.ejs
│   ├── liff/
│   └── admin/
├── public/                   # 靜態資源
├── scripts/                  # 腳本
│   └── seedData.js
├── .env.example              # 環境變數範例
├── package.json
└── README.md
```

## 🚀 快速開始

### 1. 複製專案

```bash
git clone https://github.com/your-username/retirement-gospel.git
cd retirement-gospel
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env 檔案，填入必要的設定
```

### 4. 設定 LINE Bot

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Messaging API Channel
3. 取得 Channel Access Token 和 Channel Secret
4. 設定 Webhook URL: `https://your-domain.com/webhook`
5. 建立 LIFF App

### 5. 初始化資料庫

```bash
# 執行種子資料（可選）
npm run db:seed
```

### 6. 啟動伺服器

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

## 🌐 部署到 Render

### 1. 建立新的 Web Service

1. 前往 [Render Dashboard](https://dashboard.render.com/)
2. 點擊 "New +" → "Web Service"
3. 連結 GitHub 儲存庫

### 2. 設定環境

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node

### 3. 設定環境變數

在 Render 的 Environment 頁面新增以下變數：

```
NODE_ENV=production
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
LINE_LIFF_ID=xxx
DATABASE_URL=xxx
REDIS_URL=xxx
JWT_SECRET=xxx
CWA_API_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx
```

### 4. 設定 PostgreSQL

1. 在 Render 建立 PostgreSQL 資料庫
2. 複製 Internal Database URL 到 `DATABASE_URL`

### 5. 設定 Redis (可選)

1. 使用 Render Redis 或 Redis Cloud
2. 設定 `REDIS_URL`

## 📱 QR Code 下載

掃描 QR Code 即可加入 LINE 好友：

- 基本版: `/qrcode`
- Logo 版: `/qrcode/logo`
- 海報版: `/qrcode/poster`
- 下載頁面: `/qrcode/download`

## 🔑 API 端點

### 認證
- `POST /api/auth/line` - LINE 登入

### 用戶
- `GET /api/user/profile` - 取得個人資料
- `PUT /api/user/profile` - 更新個人資料
- `PUT /api/user/interests` - 更新興趣偏好

### 推薦
- `GET /api/recommendations` - 取得每日推薦
- `POST /api/recommendations/:id/dismiss` - 取消推薦

### 活動
- `GET /api/activities` - 活動列表
- `GET /api/activities/:id` - 活動詳情
- `POST /api/activities/:id/save` - 收藏活動
- `POST /api/activities/:id/schedule` - 加入行程

### 揪團
- `GET /api/groups` - 揪團列表
- `GET /api/groups/:id` - 揪團詳情
- `POST /api/groups` - 建立揪團
- `POST /api/groups/:id/join` - 加入揪團
- `POST /api/groups/:id/leave` - 退出揪團

### 天氣
- `GET /api/weather?city=高雄市` - 取得天氣
- `GET /api/air-quality?city=高雄市` - 取得空氣品質

## 🧪 測試

```bash
npm test
```

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Pull Request 或建立 Issue！

## 📞 聯繫我們

- Email: support@retirement-gospel.com
- LINE: @retirement-gospel

---

Made with ❤️ for our beloved elders
