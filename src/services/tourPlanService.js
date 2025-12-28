/**
 * ============================================
 * LINE Bot Controller
 * ============================================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const conversationService = require('../services/conversationService');
const groupService = require('../services/groupService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const richMenuService = require('../linebot/richMenuService');
const tourPlanService = require('../services/tourPlanService');
const { User, ConversationState, Activity, Group } = require('../models');

async function handleFollow(event, client) {
    const userId = event.source.userId;
    logger.info('New follower: ' + userId);

    try {
        const profile = await client.getProfile(userId);
        const user = await userService.createOrUpdateUser({
            lineUserId: userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        });

        await richMenuService.setDefaultMenu(client, userId);

        const isNewUser = !user.onboardingCompleted;
        var messages;
        
        if (isNewUser) {
            messages = [
                { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎加入退休福音！\n\n我是您的智慧生活規劃助手。\n\n🌍 輸入「日本5天」讓AI幫您規劃行程！' },
                flexMessageBuilder.buildOnboardingStart()
            ];
        } else {
            messages = [
                { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎回來！' },
                flexMessageBuilder.buildQuickActions()
            ];
        }
        
        await client.replyMessage({ replyToken: event.replyToken, messages: messages });
        await userService.recordUsageStats(user.id, 'follow');

    } catch (error) {
        logger.error('Error handling follow event:', error);
    }
}

async function handleUnfollow(event, client) {
    logger.info('User unfollowed: ' + event.source.userId);
    try {
        await userService.deactivateUser(event.source.userId);
    } catch (error) {
        logger.error('Error handling unfollow:', error);
    }
}

async function handleTextMessage(event, client) {
    const userId = event.source.userId;
    const text = event.message.text.trim();
    
    logger.info('Text from ' + userId + ': ' + text);

    try {
        const user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        const conversationState = await ConversationState.findOne({ where: { userId: user.id } });

        if (conversationState && conversationState.currentFlow) {
            return await conversationService.handleFlowInput(event, client, user, conversationState, text);
        }

        const response = await handleKeywordMessage(text, user, client, event);
        
        if (response) {
            await client.replyMessage({
                replyToken: event.replyToken,
                messages: Array.isArray(response) ? response : [response]
            });
        }

    } catch (error) {
        logger.error('Error handling text:', error);
    }
}

async function handleKeywordMessage(text, user, client, event) {
    const lowerText = text.toLowerCase();

    // ============================================
    // 出國旅遊行程（AI 生成）
    // ============================================
    if (matchKeywords(lowerText, ['出國', '旅遊', '幾日遊', '日遊', '自由行', '跟團', '行程規劃', '旅行', '日本', '韓國', '泰國', '越南', '新加坡', '馬來西亞', '歐洲', '美國', '澳洲'])) {
        const aiTourService = require('../services/aiTourService');
        
        setTimeout(async function() {
            try {
                const tours = await aiTourService.generateTourWithDualAI(text);
                
                for (var i = 0; i < tours.length; i++) {
                    var tour = tours[i];
                    
                    // 直接存到資料庫
                    var dbId = await tourPlanService.saveTourToDb(user.id, tour);
                    
                    var itineraryText = (tour.itinerary || []).map(function(d) {
                        return '📅 Day' + d.day + ' ' + d.title + '\n   ' + (d.activities || []).join('、');
                    }).join('\n\n');
                    
                    var flexMessage = {
                        type: 'flex',
                        altText: '【方案' + (i + 1) + '】' + tour.name,
                        contents: {
                            type: 'bubble',
                            size: 'giga',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '🌍 【方案' + (i + 1) + '】' + tour.name, weight: 'bold', size: 'lg', color: '#ffffff', wrap: true },
                                    { type: 'text', text: '🏷️ ' + tour.source, size: 'sm', color: '#ffffff' }
                                ],
                                backgroundColor: i === 0 ? '#E74C3C' : '#3498DB',
                                paddingAll: 'lg'
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'box', layout: 'horizontal', contents: [
                                        { type: 'text', text: '📍 國家', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: tour.country || '海外', size: 'sm', color: '#333333', flex: 3 }
                                    ]},
                                    { type: 'box', layout: 'horizontal', contents: [
                                        { type: 'text', text: '📆 天數', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: (tour.days || 5) + ' 天', size: 'sm', color: '#333333', flex: 3 }
                                    ], margin: 'md'},
                                    { type: 'box', layout: 'horizontal', contents: [
                                        { type: 'text', text: '💰 預算', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: '$' + (tour.estimatedCost?.min || 30000) + ' - $' + (tour.estimatedCost?.max || 50000), size: 'sm', color: '#E74C3C', flex: 3, weight: 'bold' }
                                    ], margin: 'md'},
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '✨ 亮點', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (tour.highlights || []).slice(0, 5).join('、'), size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '📋 行程安排', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: itineraryText, size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '💡 小提醒', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (tour.tips || []).map(function(t) { return '• ' + t; }).join('\n'), size: 'xs', color: '#888888', wrap: true, margin: 'sm' },
                                    { type: 'box', layout: 'horizontal', contents: [
                                        { type: 'text', text: '🗓️ 最佳季節', size: 'xs', color: '#888888', flex: 2 },
                                        { type: 'text', text: tour.bestSeason || '全年皆宜', size: 'xs', color: '#333333', flex: 3 }
                                    ], margin: 'lg'}
                                ],
                                paddingAll: 'lg'
                            },
                            footer: {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'button',
                                        action: { type: 'postback', label: '❤️ 收藏這個', data: 'action=save_tour&id=' + dbId },
                                        style: 'primary',
                                        color: '#E74C3C'
                                    },
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: '🔍 查機票', uri: 'https://www.skyscanner.com.tw/' },
                                        style: 'secondary',
                                        margin: 'sm'
                                    }
                                ],
                                paddingAll: 'md'
                            }
                        }
                    };
                    
                    await client.pushMessage({ to: user.lineUserId, messages: [flexMessage] });
                    
                    if (i < tours.length - 1) {
                        await new Promise(function(resolve) { setTimeout(resolve, 500); });
                    }
                }
                
            } catch (err) {
                logger.error('AI Tour error:', err.message);
                await client.pushMessage({
                    to: user.lineUserId,
                    messages: [{ type: 'text', text: '抱歉，行程生成失敗 🙏' }]
                });
            }
        }, 100);
        
        return { type: 'text', text: '🤖 AI 正在為您規劃行程...\n\n⏳ 請稍候約 10 秒\n（ChatGPT + Gemini 雙引擎生成中）' };
    }

    // ============================================
    // 我的行程
    // ============================================
    if (matchKeywords(lowerText, ['我的行程', '收藏行程', '行程收藏', '我的收藏'])) {
        var tourPlans = await tourPlanService.getUserTourPlans(user.id);
        
        if (tourPlans.length === 0) {
            return { type: 'text', text: '📋 您還沒有收藏任何行程\n\n輸入「日本5天」讓 AI 幫您規劃！' };
        }
        
        var planList = tourPlans.slice(0, 5).map(function(p, idx) {
            return (idx + 1) + '. 🌍 ' + p.name + '\n   ' + p.country + ' ' + p.days + '天 | ' + p.source;
        }).join('\n\n');
        
        return { type: 'text', text: '📋 我的收藏行程\n\n' + planList + '\n\n💡 輸入「日本5天」繼續規劃新行程' };
    }

    // ============================================
    // 今日推薦
    // ============================================
    if (matchKeywords(lowerText, ['今日推薦', '今天推薦', '推薦', '今天做什麼', '今天去哪', '推薦活動'])) {
        var recommendations = await recommendationService.getDailyRecommendations(user);
        return flexMessageBuilder.buildDailyRecommendations(recommendations, user);
    }

    // ============================================
    // 天氣查詢
    // ============================================
    if (matchKeywords(lowerText, ['天氣', '氣象', '會下雨', '溫度'])) {
        var weatherService = require('../services/weatherService');
        var supportedCities = weatherService.getSupportedCities();
        var targetCity = null;
        for (var j = 0; j < supportedCities.length; j++) {
            if (text.includes(supportedCities[j])) {
                targetCity = supportedCities[j];
                break;
            }
        }
        if (!targetCity) targetCity = user.city || '高雄市';
        var weather = await weatherService.getCompleteWeatherInfo(targetCity);
        return flexMessageBuilder.buildWeatherCard(weather);
    }

    // ============================================
    // 打招呼
    // ============================================
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        var hour = new Date().getHours();
        var greeting = hour >= 5 && hour < 12 ? '早安' : hour >= 12 && hour < 18 ? '午安' : '晚安';
        return { type: 'text', text: greeting + '，' + (user.displayName || '您好') + '！\n\n🌍 輸入「日本5天」AI幫你規劃行程\n📋 輸入「我的行程」查看收藏\n💡 輸入「今日推薦」查看精選活動' };
    }

    // ============================================
    // 幫助
    // ============================================
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '怎麼用', '功能', '?', '？'])) {
        return flexMessageBuilder.buildHelpMenu();
    }

    // ============================================
    // 謝謝
    // ============================================
    if (matchKeywords(lowerText, ['謝謝', '感謝', 'thanks', '3q'])) {
        return { type: 'text', text: '不客氣！😊 有任何需要隨時找我～' };
    }

    // ============================================
    // 預設
    // ============================================
    return { type: 'text', text: '您可以試試：\n🌍 日本5天 - AI規劃出國行程\n📋 我的行程 - 查看收藏\n💡 今日推薦 - 精選活動\n❓ 幫助 - 功能說明' };
}

function matchKeywords(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
        if (text.includes(keywords[i])) return true;
    }
    return false;
}

async function handlePostback(event, client) {
    const userId = event.source.userId;
    const data = event.postback.data;
    
    logger.info('Postback: ' + data);

    try {
        const user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        const params = new URLSearchParams(data);
        const action = params.get('action');

        var response;

        switch (action) {
            case 'save_tour':
                var tourId = params.get('id');
                var confirmed = await tourPlanService.confirmSaveTour(tourId, user.id);
                if (confirmed) {
                    response = { type: 'text', text: '❤️ 已收藏此行程！\n\n輸入「我的行程」可隨時查看' };
                } else {
                    response = { type: 'text', text: '⚠️ 行程已過期或已收藏\n\n輸入「日本5天」重新規劃' };
                }
                break;

            case 'daily_recommendation':
                var recs = await recommendationService.getDailyRecommendations(user);
                response = flexMessageBuilder.buildDailyRecommendations(recs, user);
                break;

            case 'view_activity':
                var activityId = params.get('id');
                var activity = await Activity.findByPk(activityId);
                response = flexMessageBuilder.buildActivityDetail(activity, user);
                break;

            case 'save_activity':
                await userService.saveToWishlist(user.id, params.get('id'));
                response = { type: 'text', text: '已加入想去清單 ❤️' };
                break;

            case 'help':
                response = flexMessageBuilder.buildHelpMenu();
                break;

            case 'start_onboarding':
                await conversationService.startFlow(user.id, 'onboarding');
                response = flexMessageBuilder.buildOnboardingStep1();
                break;

            case 'skip_onboarding':
                await userService.completeOnboarding(user.id);
                response = { type: 'text', text: '沒問題！輸入「日本5天」試試AI行程規劃吧！' };
                break;

            default:
                response = { type: 'text', text: '功能開發中...' };
        }

        if (response) {
            await client.replyMessage({
                replyToken: event.replyToken,
                messages: Array.isArray(response) ? response : [response]
            });
        }

    } catch (error) {
        logger.error('Error handling postback:', error);
    }
}

async function handleLocationMessage(event, client) {
    const user = await userService.getOrCreateUser(event.source.userId, client);
    const nearbyActivities = await recommendationService.getNearbyActivities(
        event.message.latitude, event.message.longitude, user
    );
    const response = flexMessageBuilder.buildNearbyActivities(nearbyActivities, event.message.address);
    await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
}

async function handleStickerMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '😊 輸入「日本5天」讓AI幫您規劃行程！' }]
    });
}

async function handleImageMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到照片了！📸' }] });
}

async function handleVideoMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到影片了！🎬' }] });
}

async function handleAudioMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到語音了！🎤' }] });
}

async function handleFileMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到檔案了！📁' }] });
}

async function handleJoin(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '大家好！🌅 輸入「日本5天」AI幫你規劃行程！' }]
    });
}

async function handleLeave(event, client) { logger.info('Bot left'); }
async function handleMemberJoined(event, client) { logger.info('Member joined'); }
async function handleMemberLeft(event, client) { logger.info('Member left'); }
async function handleBeacon(event, client) { logger.info('Beacon'); }
async function handleAccountLink(event, client) { logger.info('Account link'); }

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