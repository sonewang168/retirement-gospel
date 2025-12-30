/**
 * 排程服務 - 早安推播（根據用戶設定時間）
 * 
 * 邏輯：每小時整點檢查，找出 morningPushTime 符合的用戶發送推播
 * 例如：用戶設定 06:00，台灣時間 06:00 時會收到推播
 */
const cron = require('node-cron');
const logger = require('../utils/logger');

// 取得台灣時間
function getTaiwanTime() {
    var now = new Date();
    var taiwanOffset = 8 * 60;
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var taiwanTime = new Date(utc + (taiwanOffset * 60000));
    return taiwanTime;
}

// 取得台灣時間的 HH:00 格式
function getTaiwanHourString() {
    var taiwanTime = getTaiwanTime();
    var hour = taiwanTime.getHours();
    return (hour < 10 ? '0' : '') + hour + ':00';
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

// 發送推播給特定用戶
async function sendPushToUser(client, user) {
    var greeting = getGreeting();
    var timeStr = formatTaiwanTime();
    
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
}

// 根據時間發送推播（每小時檢查）
async function checkAndSendPush() {
    try {
        var taiwanHour = getTaiwanHourString();
        logger.info('=== 檢查推播任務 ===');
        logger.info('台灣時間: ' + taiwanHour);

        var { User } = require('../models');
        var { messagingApi } = require('@line/bot-sdk');
        
        var client = new messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
        });

        // 找出 morningPushTime 符合當前小時且啟用通知的用戶
        var users = await User.findAll({
            where: { 
                notificationEnabled: true,
                morningPushTime: taiwanHour
            }
        });

        logger.info('找到 ' + users.length + ' 位用戶設定 ' + taiwanHour + ' 推播');

        if (users.length === 0) {
            logger.info('沒有用戶需要推播');
            return { success: true, count: 0, time: taiwanHour };
        }

        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            try {
                await sendPushToUser(client, user);
                successCount++;
                logger.info('✅ 推播成功: ' + user.displayName);
                
                if (i < users.length - 1) {
                    await new Promise(function(resolve) { setTimeout(resolve, 100); });
                }
            } catch (pushError) {
                failCount++;
                logger.error('❌ 推播失敗 ' + user.displayName + ': ' + pushError.message);
            }
        }

        logger.info('=== 推播完成 === 成功: ' + successCount + ', 失敗: ' + failCount);
        return { success: true, successCount: successCount, failCount: failCount, time: taiwanHour };

    } catch (error) {
        logger.error('推播檢查錯誤:', error.message || error);
        return { success: false, error: error.message };
    }
}

// 手動發送推播給所有啟用通知的用戶（測試用）
async function sendMorningPush() {
    try {
        logger.info('=== 手動觸發推播 ===');

        var { User } = require('../models');
        var { messagingApi } = require('@line/bot-sdk');
        
        var client = new messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
        });

        // 找出所有啟用通知的用戶
        var users = await User.findAll({
            where: { notificationEnabled: true }
        });

        logger.info('找到 ' + users.length + ' 位用戶');

        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            try {
                await sendPushToUser(client, user);
                successCount++;
                logger.info('✅ 推播成功: ' + user.displayName);
                
                if (i < users.length - 1) {
                    await new Promise(function(resolve) { setTimeout(resolve, 100); });
                }
            } catch (pushError) {
                failCount++;
                logger.error('❌ 推播失敗 ' + user.displayName + ': ' + pushError.message);
            }
        }

        logger.info('=== 推播完成 === 成功: ' + successCount + ', 失敗: ' + failCount);
        return { success: true, successCount: successCount, failCount: failCount };

    } catch (error) {
        logger.error('手動推播錯誤:', error.message || error);
        return { success: false, error: error.message };
    }
}

// 初始化排程
function initScheduler() {
    logger.info('=== 排程服務初始化 ===');
    logger.info('UTC 時間: ' + new Date().toISOString());
    logger.info('台灣時間: ' + formatTaiwanTime());

    // 每小時整點執行檢查（UTC 時間）
    // UTC 22:00 = 台灣 06:00
    // UTC 23:00 = 台灣 07:00
    // UTC 00:00 = 台灣 08:00
    // ...以此類推
    
    cron.schedule('0 * * * *', function() {
        var taiwanHour = getTaiwanHourString();
        logger.info('⏰ 整點檢查: 台灣 ' + taiwanHour);
        checkAndSendPush();
    });

    logger.info('✅ 排程已設定: 每小時整點檢查用戶推播時間');
    logger.info('用戶可在設定中選擇: 05:00 ~ 10:00');
}

module.exports = {
    initScheduler: initScheduler,
    checkAndSendPush: checkAndSendPush,
    sendMorningPush: sendMorningPush,
    getTaiwanTime: getTaiwanTime,
    getTaiwanHourString: getTaiwanHourString,
    getGreeting: getGreeting,
    formatTaiwanTime: formatTaiwanTime
};
