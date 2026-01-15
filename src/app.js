/**
 * 退休福音 LINE Bot - 主程式入口
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { Sequelize } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中介層設定
// ============================================
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());

// LINE Webhook 需要 raw body
app.use('/webhook', express.raw({ type: 'application/json' }));

// 其他路由使用 JSON
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 靜態檔案
app.use(express.static(path.join(__dirname, '../public')));

// 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============================================
// 自動 Migration - 在載入 models 之前執行
// ============================================
async function ensureTables() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        },
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('✅ 資料庫連線成功');

        // 先刪除舊的 family_links 表（結構可能不對）
        console.log('📦 重建 family_links 表...');
        await sequelize.query('DROP TABLE IF EXISTS family_links CASCADE;');

        // 建立 family_links 表
        await sequelize.query(`
            CREATE TABLE family_links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                elder_id UUID NOT NULL,
                family_id UUID NOT NULL,
                relationship VARCHAR(20) DEFAULT 'family',
                nickname VARCHAR(50),
                status VARCHAR(20) DEFAULT 'approved',
                privacy_settings JSONB DEFAULT '{"showActivity": true, "showHealth": false, "showLocation": true, "showGroups": true}',
                notify_on_activity BOOLEAN DEFAULT true,
                notify_on_sos BOOLEAN DEFAULT true,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(elder_id, family_id)
            );
        `);
        console.log('✅ family_links 表建立完成');

        // 建立索引
        await sequelize.query('CREATE INDEX IF NOT EXISTS idx_family_links_elder ON family_links(elder_id);');
        await sequelize.query('CREATE INDEX IF NOT EXISTS idx_family_links_family ON family_links(family_id);');
        console.log('✅ 索引建立完成');

        // users 表新增 referral_code 欄位
        try {
            await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);');
            console.log('✅ referral_code 欄位已確認');
        } catch (e) {}

        // user_wishlists 表新增打卡照片欄位
        try {
            await sequelize.query('ALTER TABLE user_wishlists ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT;');
            console.log('✅ check_in_photo_url 欄位已確認');
        } catch (e) {}

        // activities 表新增 Google Places 相關欄位
        try {
            await sequelize.query('ALTER TABLE activities ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);');
            await sequelize.query('ALTER TABLE activities ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);');
            await sequelize.query('ALTER TABLE activities ADD COLUMN IF NOT EXISTS source VARCHAR(50);');
            await sequelize.query('CREATE INDEX IF NOT EXISTS idx_activities_google_place_id ON activities(google_place_id);');
            console.log('✅ activities Google Places 欄位已確認');
        } catch (e) {}

        await sequelize.close();
        console.log('📦 資料庫結構檢查完成\n');

    } catch (error) {
        console.error('❌ Migration 錯誤:', error.message);
        try { await sequelize.close(); } catch(e) {}
        throw error;
    }
}

// ============================================
// 啟動伺服器
// ============================================
async function startServer() {
    try {
        // 先確保表格存在
        await ensureTables();

        // 現在才載入 models 和其他模組
        const logger = require('./utils/logger');
        const { sequelize } = require('./models');
        const lineBotRouter = require('./routes/lineBot');
        const apiRouter = require('./routes/api');
        const webRouter = require('./routes/web');
        const liffRouter = require('./routes/liff');
        const schedulerService = require('./services/schedulerService');

        // 設定 morgan
        app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

        // 測試推播 API（放在其他路由之前）
        app.get('/api/test-push', async function(req, res) {
            try {
                logger.info('收到測試推播請求');
                await schedulerService.sendMorningPush();
                res.json({ 
                    success: true, 
                    message: '推播已發送！請檢查 LINE',
                    taiwanTime: schedulerService.getTaiwanTime().toISOString(),
                    greeting: schedulerService.getGreeting()
                });
            } catch (error) {
                logger.error('測試推播失敗:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 檢查時間 API
        app.get('/api/check-time', function(req, res) {
            res.json({
                utc: new Date().toISOString(),
                taiwanTime: schedulerService.getTaiwanTime().toISOString(),
                taiwanHour: schedulerService.getTaiwanTime().getHours(),
                greeting: schedulerService.getGreeting()
            });
        });

        // 路由設定
        app.use('/webhook', lineBotRouter);
        app.use('/api', apiRouter);
        app.use('/liff', liffRouter);
        app.use('/', webRouter);

        // 錯誤處理
        app.use((req, res, next) => {
            res.status(404).render('error', {
                title: '404',
                message: '找不到頁面'
            });
        });

        app.use((err, req, res, next) => {
            logger.error('Server error:', err);
            res.status(500).render('error', {
                title: '500',
                message: '伺服器錯誤'
            });
        });

        // 連接資料庫
        await sequelize.authenticate();
        logger.info('資料庫連線成功');

        // 同步資料庫
        await sequelize.sync({ alter: false });
        logger.info('資料庫同步完成');

        // 啟動排程服務
        schedulerService.initScheduler();
        logger.info('排程服務啟動');

        // 啟動伺服器
        app.listen(PORT, () => {
            logger.info('伺服器運行於 port ' + PORT);
            logger.info('Webhook URL: ' + (process.env.BASE_URL || 'http://localhost:' + PORT) + '/webhook');
        });

    } catch (error) {
        console.error('啟動失敗:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
