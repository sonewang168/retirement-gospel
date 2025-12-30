/**
 * 退休福音 LINE Bot - 主程式入口
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { sequelize } = require('./models');
const lineBotRouter = require('./routes/lineBot');
const apiRouter = require('./routes/api');
const webRouter = require('./routes/web');
const liffRouter = require('./routes/liff');
const schedulerService = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中介層設定
// ============================================
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// LINE Webhook 需要 raw body
app.use('/webhook', express.raw({ type: 'application/json' }));

// 其他路由使用 JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案
app.use(express.static(path.join(__dirname, '../public')));

// 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============================================
// 路由設定
// ============================================
app.use('/webhook', lineBotRouter);
app.use('/api', apiRouter);
app.use('/liff', liffRouter);
app.use('/', webRouter);

// ============================================
// 錯誤處理
// ============================================
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

// ============================================
// 自動 Migration - 建立缺少的表格和欄位
// ============================================
async function autoMigrate() {
    try {
        logger.info('檢查資料庫結構...');

        // 建立 family_links 表
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS family_links (
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

        // 建立索引
        try {
            await sequelize.query('CREATE INDEX IF NOT EXISTS idx_family_links_elder ON family_links(elder_id);');
            await sequelize.query('CREATE INDEX IF NOT EXISTS idx_family_links_family ON family_links(family_id);');
        } catch (e) {
            // 忽略索引已存在錯誤
        }

        // users 表新增 referral_code 欄位
        try {
            await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);');
        } catch (e) {
            // 欄位可能已存在
        }

        // user_wishlists 表新增打卡照片欄位
        try {
            await sequelize.query('ALTER TABLE user_wishlists ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT;');
        } catch (e) {
            // 欄位可能已存在
        }

        logger.info('資料庫結構檢查完成');

    } catch (error) {
        logger.error('自動 Migration 錯誤:', error.message);
        // 不中斷啟動，繼續執行
    }
}

// ============================================
// 啟動伺服器
// ============================================
async function startServer() {
    try {
        // 連接資料庫
        await sequelize.authenticate();
        logger.info('資料庫連線成功');

        // 執行自動 Migration
        await autoMigrate();

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
        logger.error('啟動失敗:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
