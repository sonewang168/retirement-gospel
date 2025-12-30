# 家人關懷 + 打卡照片功能

## 📁 檔案清單

| 檔案 | 位置 | 說明 |
|------|------|------|
| `FamilyLink.js` | `src/models/` | 新增 |
| `imgbbService.js` | `src/services/` | 新增 |
| `familyService.js` | `src/services/` | 新增 |
| `familyFlexBuilder.js` | `src/linebot/` | 新增 |
| `index.js` | `src/models/` | 取代 |
| `lineBotController.js` | `src/controllers/` | 取代 |
| `migrateFamily.js` | `scripts/` | 新增 |

## 🚀 安裝步驟

```bash
# 1. 進入專案
cd retirement-gospel

# 2. 備份原檔案
cp src/models/index.js src/models/index.js.bak
cp src/controllers/lineBotController.js src/controllers/lineBotController.js.bak

# 3. 複製新檔案
# 新增 src/models/FamilyLink.js
# 新增 src/services/imgbbService.js
# 新增 src/services/familyService.js
# 新增 src/linebot/familyFlexBuilder.js
# 取代 src/models/index.js
# 取代 src/controllers/lineBotController.js
# 新增 scripts/migrateFamily.js

# 4. 執行 Migration
node scripts/migrateFamily.js

# 5. Git 提交
git add .
git commit -m "feat: 新增家人關懷和打卡照片功能"
git push
```

## 📱 新增 LINE Bot 指令

| 指令 | 功能 |
|------|------|
| `家人` | 家人關懷主選單 |

## 🔧 家人關懷功能

### 長輩端
- 📤 分享邀請碼（6位英數字）
- 👨‍👩‍👧 查看已連結的家人
- 🚨 SOS 緊急通知（一鍵通知所有家人）

### 家人端（子女）
- 🔗 輸入邀請碼連結長輩
- 👴 查看長輩動態
  - 最近打卡紀錄
  - 參加的揪團
  - 最後活動時間

## 📸 打卡照片功能

1. 在「想去清單」點選景點
2. 點選「📸 打卡」按鈕
3. 上傳照片
4. 自動上傳到 ImgBB 並記錄

照片會顯示在：
- 打卡成功卡片
- 家人查看長輩動態時

## 🔑 環境變數

確保已設定：
```
IMGBB_API_KEY=你的ImgBB金鑰
```

## 📊 資料庫結構

### family_links 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| elder_id | UUID | 長輩 ID |
| family_id | UUID | 家人 ID |
| relationship | VARCHAR(20) | 關係 |
| status | VARCHAR(20) | 狀態 |
| privacy_settings | JSONB | 隱私設定 |
| notify_on_sos | BOOLEAN | SOS 通知 |

### 新增欄位
- `users.referral_code` - 邀請碼
- `user_wishlists.check_in_photo_url` - 打卡照片網址
