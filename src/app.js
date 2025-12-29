/**
 * 退休福音 LINE Bot - 主應用程式
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
// 中間件設定
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

// 視圖引擎
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
        message: '頁面不存在'
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
// 啟動伺服器
// ============================================

async function startServer() {
    try {
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
        logger.error('啟動失敗:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;