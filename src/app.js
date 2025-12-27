/**
 * ============================================
 * 退休福音 - 智慧生活規劃助手
 * 主應用程式入口
 * ============================================
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 引入路由
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const liffRoutes = require('./routes/liff');
const adminRoutes = require('./routes/admin');
const qrcodeRoutes = require('./routes/qrcode');

// 引入服務
const { initDatabase } = require('./models');
const { initScheduler } = require('./services/schedulerService');
const { initCache } = require('./services/cacheService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中間件設定
// ============================================

// 安全性標頭
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://static.line-scdn.net", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://api.line.me", "https://opendata.cwa.gov.tw"]
        }
    }
}));

// CORS 設定
app.use(cors({
    origin: [
        'https://liff.line.me',
        process.env.BASE_URL,
        'http://localhost:3000'
    ],
    credentials: true
}));

// 壓縮回應
app.use(compression());

// 請求日誌
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));

// 速率限制 (API 路由)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 100, // 每個 IP 最多 100 次請求
    message: { error: '請求過於頻繁，請稍後再試' }
});

// 靜態檔案
app.use(express.static(path.join(__dirname, '../public')));

// 視圖引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============================================
// 路由設定
// ============================================

// LINE Webhook (不需要 JSON parser，由 SDK 處理)
app.use('/webhook', webhookRoutes);

// API 路由 (需要 JSON parser)
app.use('/api', express.json(), apiLimiter, apiRoutes);

// LIFF 頁面路由
app.use('/liff', express.json(), express.urlencoded({ extended: true }), liffRoutes);

// 管理後台路由
app.use('/admin', express.json(), express.urlencoded({ extended: true }), adminRoutes);

// QR Code 路由
app.use('/qrcode', qrcodeRoutes);

// 首頁
app.get('/', (req, res) => {
    res.render('index', {
        title: '退休福音 - 智慧生活規劃助手',
        lineOfficialUrl: `https://line.me/R/ti/p/${process.env.LINE_BOT_BASIC_ID || '@retirement-gospel'}`,
        liffUrl: `https://liff.line.me/${process.env.LINE_LIFF_ID}`
    });
});

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// 404 處理
app.use((req, res) => {
    res.status(404).render('error', {
        title: '頁面不存在',
        message: '您要找的頁面不存在',
        code: 404
    });
});

// 錯誤處理
app.use((err, req, res, next) => {
    logger.error('Application error:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? '伺服器發生錯誤' 
            : err.message,
        stack: process.env.NODE_ENV === 'production' 
            ? undefined 
            : err.stack
    });
});

// ============================================
// 應用程式啟動
// ============================================

async function startServer() {
    try {
        // 初始化資料庫
        logger.info('正在初始化資料庫...');
        await initDatabase();
        logger.info('資料庫初始化完成');

        // 初始化快取
        logger.info('正在初始化快取服務...');
        await initCache();
        logger.info('快取服務初始化完成');

        // 初始化排程器
        logger.info('正在初始化排程服務...');
        await initScheduler();
        logger.info('排程服務初始化完成');

        // 啟動伺服器
        app.listen(PORT, () => {
            logger.info(`========================================`);
            logger.info(`🌅 退休福音伺服器已啟動`);
            logger.info(`📍 Port: ${PORT}`);
            logger.info(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
            logger.info(`========================================`);
        });

    } catch (error) {
        logger.error('伺服器啟動失敗:', error);
        process.exit(1);
    }
}

// 優雅關閉
process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信號，正在關閉伺服器...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信號，正在關閉伺服器...');
    process.exit(0);
});

// 未捕獲的錯誤處理
process.on('uncaughtException', (error) => {
    logger.error('未捕獲的例外:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未處理的 Promise 拒絕:', reason);
});

// 啟動應用程式
startServer();

module.exports = app;
