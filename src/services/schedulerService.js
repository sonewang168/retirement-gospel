/**
 * 排程服務 - 24小時運作 + 每天早上 6 點推送建議
 */
const logger = require('../utils/logger');
const { messagingApi } = require('@line/bot-sdk');

var client = null;
var cacheService = null;

async function initScheduler() {
    logger.info('=== Scheduler Service Starting ===');
    
    // 建立 LINE Client
    client = new messagingApi.MessagingApiClient({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
    
    // 每分鐘檢查時間
    setInterval(checkScheduledTasks, 60000);
    
    logger.info('Scheduler running 24/7');
    logger.info('Morning push scheduled at 6:00 AM Taiwan time');
    logger.info('=== Scheduler Service Started ===');
}

async function checkScheduledTasks() {
    var now = new Date();
    // 台灣時間 = UTC + 8
    var taiwanHour = (now.getUTCHours() + 8) % 24;
    var minute = now.getMinutes();
    
    // 早上 6:00 推送
    if (taiwanHour === 6 && minute === 0) {
        logger.info('=== Morning Push Triggered ===');
        await sendMorningRecommendations();
    }
}

async function sendMorningRecommendations() {
    try {
        const { User } = require('../models');
        
        // 找出活躍且開啟通知的用戶
        var users = await User.findAll({
            where: {
                isActive: true,
                notificationEnabled: true
            },
            limit: 100
        });
        
        logger.info('Morning push: Found ' + users.length + ' users');
        
        var sentCount = 0;
        
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            
            try {
                var hour = new Date().getHours();
                var greeting = hour >= 5 && hour < 12 ? '早安' : hour >= 12 && hour < 18 ? '午安' : '晚安';
                
                var message = {
                    type: 'text',
                    text: '🌅 ' + greeting + ' ' + (user.displayName || '您好') + '！\n\n' +
                          '今天是美好的一天，適合出門走走！\n\n' +
                          '🌍 輸入「日本5天」讓AI規劃出國行程\n' +
                          '📋 輸入「我的行程」查看收藏\n' +
                          '💡 輸入「今日推薦」看精選活動\n' +
                          '☁️ 輸入「天氣」查看天氣預報\n\n' +
                          '祝您有美好的一天！😊'
                };
                
                await client.pushMessage({
                    to: user.lineUserId,
                    messages: [message]
                });
                
                sentCount++;
                
                // 間隔避免 rate limit
                await new Promise(function(r) { setTimeout(r, 100); });
                
            } catch (userErr) {
                logger.error('Push error for ' + user.lineUserId + ': ' + userErr.message);
            }
        }
        
        logger.info('Morning push completed: ' + sentCount + '/' + users.length);
        
    } catch (error) {
        logger.error('Morning push error: ' + error.message);
    }
}

// 手動觸發（測試用）
async function triggerMorningPush() {
    logger.info('Manual morning push triggered');
    await sendMorningRecommendations();
}

function initCache() {
    // 空的，保持相容
    return Promise.resolve();
}

module.exports = {
    initScheduler: initScheduler,
    initCache: initCache,
    sendMorningRecommendations: sendMorningRecommendations,
    triggerMorningPush: triggerMorningPush
};