/**
 * 排程服務 - 早安推播（台灣時區修正版）
 * 
 * 重要：Render 使用 UTC 時間
 * 台灣 (UTC+8) 早上 7:00 = UTC 23:00 (前一天)
 * 台灣 (UTC+8) 早上 8:00 = UTC 00:00
 */
const cron = require('node-cron');
const logger = require('../utils/logger');

// 取得台灣時間
function getTaiwanTime() {
    var now = new Date();
    // 轉換為台灣時間 (UTC+8)
    var taiwanOffset = 8 * 60; // 分鐘
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var taiwanTime = new Date(utc + (taiwanOffset * 60000));
    return taiwanTime;
}

// 取得問候語（根據台灣時間）
function getGreeting() {
    var taiwanTime = getTaiwanTime();
    var hour = taiwanTime.getHours();
    
    if (hour >= 5 && hour < 12) {
        return '早安';
    } else if (hour >= 12 && hour < 18) {
        return '午安';
    } else {
        return '晚安';
    }
}

// 格式化台灣時間
function formatTaiwanTime() {
    var taiwanTime = getTaiwanTime();
    var month = taiwanTime.getMonth() + 1;
    var day = taiwanTime.getDate();
    var hour = taiwanTime.getHours();
    var minute = taiwanTime.getMinutes();
    
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    var weekday = weekdays[taiwanTime.getDay()];
    
    return month + '/' + day + ' (' + weekday + ') ' + 
           (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
}

// 發送早安推播
async function sendMorningPush() {
    try {
        var taiwanTime = getTaiwanTime();
        logger.info('=== 早安推播任務開始 ===');
        logger.info('UTC 時間: ' + new Date().toISOString());
        logger.info('台灣時間: ' + taiwanTime.toISOString());
        logger.info('台灣小時: ' + taiwanTime.getHours());

        var { User } = require('../models');
        var { messagingApi } = require('@line/bot-sdk');
        
        var client = new messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
        });

        // 找出啟用通知的用戶
        var users = await User.findAll({
            where: { notificationEnabled: true }
        });

        logger.info('找到 ' + users.length + ' 位用戶需要推播');

        var greeting = getGreeting();
        var timeStr = formatTaiwanTime();
        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            try {
                var message = {
                    type: 'flex',
                    altText: greeting + '！' + (user.displayName || '朋友'),
                    contents: {
                        type: 'bubble',
                        size: 'kilo',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            backgroundColor: '#FFB347',
                            paddingAll: 'lg',
                            contents: [
                                { type: 'text', text: '☀️ ' + greeting + '！', weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' }
                            ]
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            paddingAll: 'lg',
                            contents: [
                                { type: 'text', text: (user.displayName || '朋友') + '，' + greeting + '！', size: 'md', color: '#333333', align: 'center' },
                                { type: 'text', text: '🗓️ ' + timeStr, size: 'sm', color: '#888888', align: 'center', margin: 'md' },
                                { type: 'text', text: '今天想去哪裡走走呢？', size: 'sm', color: '#666666', align: 'center', margin: 'lg' }
                            ]
                        },
                        footer: {
                            type: 'box',
                            layout: 'horizontal',
                            paddingAll: 'sm',
                            contents: [
                                { type: 'button', action: { type: 'postback', label: '🎯 今日推薦', data: 'action=daily_recommendation' }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                                { type: 'button', action: { type: 'postback', label: '🗺️ 我的地圖', data: 'action=my_map' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                            ]
                        }
                    }
                };

                await client.pushMessage({
                    to: user.lineUserId,
                    messages: [message]
                });
                successCount++;
                
                // 避免超過 LINE API 速率限制
                if (i < users.length - 1) {
                    await new Promise(function(resolve) { setTimeout(resolve, 100); });
                }
            } catch (pushError) {
                failCount++;
                logger.error('推播失敗 userId=' + user.id + ': ' + pushError.message);
            }
        }

        logger.info('=== 早安推播完成 ===');
        logger.info('成功: ' + successCount + ', 失敗: ' + failCount);

    } catch (error) {
        logger.error('早安推播錯誤:', error.message || error);
    }
}

// 初始化排程
function initScheduler() {
    logger.info('=== 排程服務初始化 ===');
    logger.info('伺服器時區: ' + Intl.DateTimeFormat().resolvedOptions().timeZone);
    logger.info('UTC 時間: ' + new Date().toISOString());
    logger.info('台灣時間: ' + getTaiwanTime().toISOString());

    // 台灣早上 7:00 = UTC 23:00 (前一天)
    // 使用 cron: 分 時 日 月 週
    // '0 23 * * *' = 每天 UTC 23:00 = 台灣 07:00
    
    cron.schedule('0 23 * * *', function() {
        logger.info('Cron 觸發: UTC 23:00 = 台灣 07:00');
        sendMorningPush();
    }, {
        timezone: 'UTC'
    });

    logger.info('早安推播排程已設定: 每天台灣時間 07:00 (UTC 23:00)');

    // 測試用：每小時執行一次 log（可以之後移除）
    cron.schedule('0 * * * *', function() {
        var taiwanTime = getTaiwanTime();
        logger.info('[每小時檢查] UTC: ' + new Date().toISOString() + ', 台灣: ' + taiwanTime.getHours() + ':00');
    });
}

// 手動觸發推播（測試用）
async function triggerMorningPush() {
    logger.info('手動觸發早安推播');
    await sendMorningPush();
}

// 測試 API handler
async function handleTestPush(req, res) {
    try {
        logger.info('收到測試推播請求');
        await sendMorningPush();
        res.json({ success: true, message: '推播已發送，請檢查 LINE' });
    } catch (error) {
        logger.error('測試推播失敗:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    initScheduler: initScheduler,
    sendMorningPush: sendMorningPush,
    triggerMorningPush: triggerMorningPush,
    getTaiwanTime: getTaiwanTime,
    getGreeting: getGreeting,
    handleTestPush: handleTestPush
};
