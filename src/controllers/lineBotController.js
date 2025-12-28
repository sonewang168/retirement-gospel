/**
 * LINE Bot Controller
 */
const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const conversationService = require('../services/conversationService');
const groupService = require('../services/groupService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const richMenuService = require('../linebot/richMenuService');
const tourPlanService = require('../services/tourPlanService');
const { User, ConversationState, Activity } = require('../models');

async function handleFollow(event, client) {
    var userId = event.source.userId;
    logger.info('New follower: ' + userId);
    try {
        var profile = await client.getProfile(userId);
        var user = await userService.createOrUpdateUser({
            lineUserId: userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        });
        await richMenuService.setDefaultMenu(client, userId);
        var msg = { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎加入退休福音！\n\n🌍 輸入「日本5天」讓AI幫您規劃行程！' };
        await client.replyMessage({ replyToken: event.replyToken, messages: [msg] });
    } catch (error) {
        logger.error('Follow error:', error);
    }
}

async function handleUnfollow(event, client) {
    logger.info('Unfollowed: ' + event.source.userId);
}

async function handleTextMessage(event, client) {
    var userId = event.source.userId;
    var text = event.message.text.trim();
    logger.info('Text from ' + userId + ': ' + text);

    try {
        var user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        var conversationState = await ConversationState.findOne({ where: { userId: user.id } });
        if (conversationState && conversationState.currentFlow) {
            return await conversationService.handleFlowInput(event, client, user, conversationState, text);
        }

        var response = await handleKeywordMessage(text, user, client, event);
        if (response) {
            await client.replyMessage({
                replyToken: event.replyToken,
                messages: Array.isArray(response) ? response : [response]
            });
        }
    } catch (error) {
        logger.error('Text error:', error);
    }
}

async function handleKeywordMessage(text, user, client, event) {
    var lowerText = text.toLowerCase();

    // 出國旅遊
    if (matchKeywords(lowerText, ['出國', '旅遊', '日遊', '自由行', '跟團', '行程', '旅行', '日本', '韓國', '泰國', '越南', '新加坡', '歐洲', '美國', '澳洲'])) {
        var aiTourService = require('../services/aiTourService');
        
        setTimeout(async function() {
            try {
                logger.info('=== Starting AI Tour ===');
                var tours = await aiTourService.generateTourWithDualAI(text);
                logger.info('Tours generated: ' + tours.length);
                
                for (var i = 0; i < tours.length; i++) {
                    var tour = tours[i];
                    logger.info('Processing tour ' + i + ': ' + tour.name);
                    
                    // 存到資料庫
                    var dbId = null;
                    try {
                        dbId = await tourPlanService.saveTourToDb(user.id, tour);
                        logger.info('DB saved: ' + dbId);
                    } catch (dbErr) {
                        logger.error('DB save error: ' + dbErr.message);
                    }
                    
                    // 建立行程文字
                    var itineraryText = '';
                    try {
                        itineraryText = (tour.itinerary || []).map(function(d) {
                            return 'Day' + d.day + ' ' + (d.title || '') + ': ' + (d.activities || []).join(', ');
                        }).join('\n');
                        logger.info('Itinerary built');
                    } catch (itErr) {
                        logger.error('Itinerary error: ' + itErr.message);
                        itineraryText = '行程規劃中...';
                    }
                    
                    // 用簡單文字訊息（先不用 Flex）
                    var messageText = '🌍 【方案' + (i + 1) + '】' + (tour.name || '精彩行程') + '\n\n' +
                        '📍 國家：' + (tour.country || '海外') + '\n' +
                        '📆 天數：' + (tour.days || 5) + ' 天\n' +
                        '💰 預算：$' + (tour.estimatedCost?.min || 30000) + ' - $' + (tour.estimatedCost?.max || 50000) + '\n' +
                        '🏷️ 來源：' + (tour.source || 'AI') + '\n\n' +
                        '✨ 亮點：' + (tour.highlights || []).slice(0, 5).join('、') + '\n\n' +
                        '📋 行程：\n' + itineraryText + '\n\n' +
                        '💡 提醒：' + (tour.tips || []).join('、');
                    
                    logger.info('Sending message...');
                    await client.pushMessage({
                        to: user.lineUserId,
                        messages: [{ type: 'text', text: messageText }]
                    });
                    logger.info('Message sent!');
                    
                    if (i < tours.length - 1) {
                        await new Promise(function(r) { setTimeout(r, 500); });
                    }
                }
                
                logger.info('=== AI Tour Complete ===');
                
            } catch (err) {
                logger.error('AI Tour error: ' + err.message);
                logger.error('Stack: ' + err.stack);
                await client.pushMessage({ to: user.lineUserId, messages: [{ type: 'text', text: '行程生成失敗 🙏\n\n錯誤：' + err.message }] });
            }
        }, 100);
        
        return { type: 'text', text: '🤖 AI 正在規劃行程...\n⏳ 請稍候約 10 秒' };
    }

    // 我的行程
    if (matchKeywords(lowerText, ['我的行程', '收藏', '我的收藏'])) {
        var plans = await tourPlanService.getUserTourPlans(user.id);
        if (plans.length === 0) {
            return { type: 'text', text: '📋 還沒有收藏行程\n\n輸入「日本5天」讓AI規劃！' };
        }
        var list = plans.slice(0, 5).map(function(p, idx) {
            return (idx + 1) + '. 🌍 ' + p.name + '\n   ' + p.country + ' ' + p.days + '天';
        }).join('\n\n');
        return { type: 'text', text: '📋 我的收藏\n\n' + list };
    }

    // 今日推薦
    if (matchKeywords(lowerText, ['今日推薦', '推薦', '今天'])) {
        var recs = await recommendationService.getDailyRecommendations(user);
        return flexMessageBuilder.buildDailyRecommendations(recs, user);
    }

    // 天氣
    if (matchKeywords(lowerText, ['天氣', '氣象', '下雨', '溫度'])) {
        var weatherService = require('../services/weatherService');
        var cities = weatherService.getSupportedCities();
        var city = user.city || '高雄市';
        for (var j = 0; j < cities.length; j++) {
            if (text.includes(cities[j])) { city = cities[j]; break; }
        }
        var weather = await weatherService.getCompleteWeatherInfo(city);
        return flexMessageBuilder.buildWeatherCard(weather);
    }

    // 打招呼
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        return { type: 'text', text: '您好！😊\n\n🌍 輸入「日本5天」AI規劃行程\n📋 輸入「我的行程」查看收藏' };
    }

    // 幫助
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '?', '？'])) {
        return flexMessageBuilder.buildHelpMenu();
    }

    // 預設
    return { type: 'text', text: '試試：\n🌍 日本5天\n📋 我的行程\n💡 今日推薦' };
}

function matchKeywords(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
        if (text.includes(keywords[i])) return true;
    }
    return false;
}

async function handlePostback(event, client) {
    var userId = event.source.userId;
    var data = event.postback.data;
    logger.info('Postback: ' + data);

    try {
        var user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        var params = new URLSearchParams(data);
        var action = params.get('action');
        var response;

        if (action === 'save_tour') {
            var tourId = params.get('id');
            var ok = await tourPlanService.confirmSaveTour(tourId, user.id);
            response = ok 
                ? { type: 'text', text: '❤️ 已收藏！輸入「我的行程」查看' }
                : { type: 'text', text: '⚠️ 行程已過期，輸入「日本5天」重新規劃' };
        } else if (action === 'daily_recommendation') {
            var recs = await recommendationService.getDailyRecommendations(user);
            response = flexMessageBuilder.buildDailyRecommendations(recs, user);
        } else if (action === 'help') {
            response = flexMessageBuilder.buildHelpMenu();
        } else if (action === 'start_onboarding') {
            await conversationService.startFlow(user.id, 'onboarding');
            response = flexMessageBuilder.buildOnboardingStep1();
        } else if (action === 'skip_onboarding') {
            await userService.completeOnboarding(user.id);
            response = { type: 'text', text: '輸入「日本5天」試試AI行程！' };
        } else {
            response = { type: 'text', text: '功能開發中...' };
        }

        if (response) {
            await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
        }
    } catch (error) {
        logger.error('Postback error:', error);
    }
}

async function handleLocationMessage(event, client) {
    try {
        var user = await userService.getOrCreateUser(event.source.userId, client);
        var nearby = await recommendationService.getNearbyActivities(event.message.latitude, event.message.longitude, user);
        var response = flexMessageBuilder.buildNearbyActivities(nearby, event.message.address);
        await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
    } catch (error) {
        logger.error('Location error:', error);
    }
}

async function handleStickerMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '😊 輸入「日本5天」試試！' }] });
}

async function handleImageMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到照片！📸' }] });
}

async function handleVideoMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到影片！🎬' }] });
}

async function handleAudioMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到語音！🎤' }] });
}

async function handleFileMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到檔案！📁' }] });
}

async function handleJoin(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '大家好！輸入「日本5天」試試AI規劃！' }] });
}

async function handleLeave(event, client) { logger.info('Left'); }
async function handleMemberJoined(event, client) { logger.info('Joined'); }
async function handleMemberLeft(event, client) { logger.info('Left'); }
async function handleBeacon(event, client) { logger.info('Beacon'); }
async function handleAccountLink(event, client) { logger.info('Link'); }

module.exports = {
    handleFollow: handleFollow,
    handleUnfollow: handleUnfollow,
    handleTextMessage: handleTextMessage,
    handlePostback: handlePostback,
    handleLocationMessage: handleLocationMessage,
    handleStickerMessage: handleStickerMessage,
    handleImageMessage: handleImageMessage,
    handleVideoMessage: handleVideoMessage,
    handleAudioMessage: handleAudioMessage,
    handleFileMessage: handleFileMessage,
    handleJoin: handleJoin,
    handleLeave: handleLeave,
    handleMemberJoined: handleMemberJoined,
    handleMemberLeft: handleMemberLeft,
    handleBeacon: handleBeacon,
    handleAccountLink: handleAccountLink
};