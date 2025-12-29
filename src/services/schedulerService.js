/**
 * 排程服務（完整版）
 * 支援用戶自訂早安推播時間
 */
const cron = require('node-cron');
const { messagingApi } = require('@line/bot-sdk');
const logger = require('../utils/logger');
const { User } = require('../models');
const weatherService = require('./weatherService');
const recommendationService = require('./recommendationService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');

const client = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// 儲存所有排程任務
var scheduledTasks = {};

/**
 * 初始化排程器
 */
function initScheduler() {
    logger.info('🕐 初始化排程服務...');
    
    // 每分鐘檢查是否有用戶需要推送
    cron.schedule('* * * * *', async () => {
        await checkAndSendMorningPush();
    });
    
    // 每天早上 6:00 推送給未設定時間的用戶（預設）
    cron.schedule('0 6 * * *', async () => {
        await sendDefaultMorningPush();
    }, {
        timezone: 'Asia/Taipei'
    });
    
    // 每天中午 12:00 推送午間提醒
    cron.schedule('0 12 * * *', async () => {
        await sendNoonReminder();
    }, {
        timezone: 'Asia/Taipei'
    });
    
    // 每天晚上 8:00 推送晚間總結
    cron.schedule('0 20 * * *', async () => {
        await sendEveningDigest();
    }, {
        timezone: 'Asia/Taipei'
    });
    
    // 每小時檢查天氣警報
    cron.schedule('0 * * * *', async () => {
        await checkWeatherAlerts();
    }, {
        timezone: 'Asia/Taipei'
    });
    
    logger.info('✅ 排程服務啟動完成');
}

/**
 * 檢查並發送個人化早安推播
 */
async function checkAndSendMorningPush() {
    try {
        var now = new Date();
        var taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        var currentHour = taipeiTime.getHours().toString().padStart(2, '0');
        var currentMinute = taipeiTime.getMinutes().toString().padStart(2, '0');
        var currentTime = currentHour + ':' + currentMinute;
        
        // 查找設定這個時間推播的用戶
        var users = await User.findAll({
            where: {
                notificationEnabled: true,
                morningPushTime: currentTime
            }
        });
        
        if (users.length === 0) return;
        
        logger.info('⏰ ' + currentTime + ' 推播給 ' + users.length + ' 位用戶');
        
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            try {
                await sendPersonalizedMorning(user);
                // 避免太快發送
                await sleep(100);
            } catch (err) {
                logger.error('推播失敗 ' + user.lineUserId + ':', err.message);
            }
        }
        
    } catch (error) {
        logger.error('checkAndSendMorningPush error:', error);
    }
}

/**
 * 發送個人化早安訊息
 */
async function sendPersonalizedMorning(user) {
    try {
        var city = user.city || '高雄市';
        var weather = await weatherService.getCompleteWeatherInfo(city);
        
        var greeting = getTimeGreeting();
        var weatherText = '';
        var adviceText = '';
        
        if (weather && !weather.error) {
            weatherText = '\n\n' + weather.emoji + ' ' + city + '天氣：' + weather.description + 
                '\n🌡️ ' + weather.temp + '°C（體感 ' + weather.feelsLike + '°C）' +
                '\n💧 濕度 ' + weather.humidity + '%';
            
            if (weather.advice && weather.advice.length > 0) {
                adviceText = '\n\n💡 ' + weather.advice[0];
            }
        }
        
        // 取得今日推薦
        var recommendations = await recommendationService.getDailyRecommendations(user);
        var recText = '';
        if (recommendations && recommendations.length > 0) {
            recText = '\n\n🎯 今日推薦：' + recommendations[0].name;
        }
        
        var message = {
            type: 'text',
            text: greeting + (user.displayName || '') + '！' + weatherText + adviceText + recText + 
                '\n\n輸入「今日推薦」看更多精彩活動 😊'
        };
        
        await client.pushMessage({
            to: user.lineUserId,
            messages: [message]
        });
        
        logger.info('✅ 早安推播成功：' + user.displayName);
        
    } catch (error) {
        throw error;
    }
}

/**
 * 預設早安推播（給未設定時間的用戶）
 */
async function sendDefaultMorningPush() {
    try {
        var users = await User.findAll({
            where: {
                notificationEnabled: true,
                morningPushTime: null
            }
        });
        
        logger.info('📢 預設早安推播：' + users.length + ' 位用戶');
        
        for (var i = 0; i < users.length; i++) {
            try {
                await sendPersonalizedMorning(users[i]);
                await sleep(100);
            } catch (err) {
                logger.error('預設推播失敗:', err.message);
            }
        }
        
    } catch (error) {
        logger.error('sendDefaultMorningPush error:', error);
    }
}

/**
 * 午間提醒
 */
async function sendNoonReminder() {
    try {
        // 只推送給有今天行程的用戶（未來功能）
        logger.info('🌞 午間提醒時段');
        
    } catch (error) {
        logger.error('sendNoonReminder error:', error);
    }
}

/**
 * 晚間總結
 */
async function sendEveningDigest() {
    try {
        logger.info('🌙 晚間總結時段');
        
    } catch (error) {
        logger.error('sendEveningDigest error:', error);
    }
}

/**
 * 天氣警報檢查
 */
async function checkWeatherAlerts() {
    try {
        // 檢查極端天氣並通知用戶
        var cities = ['高雄市', '台北市', '台中市', '台南市'];
        
        for (var i = 0; i < cities.length; i++) {
            var city = cities[i];
            var weather = await weatherService.getCompleteWeatherInfo(city);
            
            if (weather && !weather.error) {
                var alert = null;
                
                // 高溫警報
                if (weather.temp >= 36) {
                    alert = '🔥 高溫警報！' + city + '氣溫達 ' + weather.temp + '°C，請注意防曬補水！';
                }
                // 大雨警報
                else if (weather.description.includes('大雨') || weather.description.includes('暴雨')) {
                    alert = '🌧️ 大雨警報！' + city + '預計有大雨，請攜帶雨具！';
                }
                // 寒流警報
                else if (weather.temp <= 10) {
                    alert = '❄️ 低溫警報！' + city + '氣溫僅 ' + weather.temp + '°C，請注意保暖！';
                }
                
                if (alert) {
                    await sendWeatherAlert(city, alert);
                }
            }
        }
        
    } catch (error) {
        logger.error('checkWeatherAlerts error:', error);
    }
}

/**
 * 發送天氣警報
 */
async function sendWeatherAlert(city, alertMessage) {
    try {
        var users = await User.findAll({
            where: {
                notificationEnabled: true,
                city: city
            }
        });
        
        if (users.length === 0) return;
        
        logger.info('⚠️ 發送天氣警報給 ' + city + ' ' + users.length + ' 位用戶');
        
        for (var i = 0; i < users.length; i++) {
            try {
                await client.pushMessage({
                    to: users[i].lineUserId,
                    messages: [{ type: 'text', text: alertMessage }]
                });
                await sleep(100);
            } catch (err) {
                // 忽略個別失敗
            }
        }
        
    } catch (error) {
        logger.error('sendWeatherAlert error:', error);
    }
}

/**
 * 取得時間問候語
 */
function getTimeGreeting() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '☀️ 早安，';
    if (hour >= 12 && hour < 18) return '🌞 午安，';
    return '🌙 晚安，';
}

/**
 * 延遲函數
 */
function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * 手動觸發推播（測試用）
 */
async function triggerManualPush(userId) {
    try {
        var user = await User.findOne({ where: { lineUserId: userId } });
        if (user) {
            await sendPersonalizedMorning(user);
            return true;
        }
        return false;
    } catch (error) {
        logger.error('triggerManualPush error:', error);
        return false;
    }
}

module.exports = {
    initScheduler: initScheduler,
    sendPersonalizedMorning: sendPersonalizedMorning,
    checkWeatherAlerts: checkWeatherAlerts,
    triggerManualPush: triggerManualPush
};