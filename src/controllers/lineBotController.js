/**
 * LINE Bot Controller（完整版）
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
        var msg = { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎加入退休福音！\n\n🌍 輸入「日本5天」讓AI幫您規劃行程！\n📋 輸入「我的行程」查看收藏\n💡 輸入「今日推薦」看精選活動\n☁️ 輸入「天氣」查看天氣預報' };
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

    // ========== 我的行程 ==========
    if (lowerText.includes('我的行程') || lowerText.includes('我的收藏') || lowerText === '收藏') {
        var plans = await tourPlanService.getUserTourPlans(user.id);
        
        if (plans.length === 0) {
            return { type: 'text', text: '📋 還沒有收藏行程\n\n輸入「日本5天」讓AI規劃！' };
        }
        
        var bubbles = plans.slice(0, 5).map(function(p, idx) {
            return {
                type: 'bubble',
                size: 'kilo',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🌍 ' + p.name, weight: 'bold', size: 'md', color: '#ffffff', wrap: true }
                    ],
                    backgroundColor: '#E74C3C',
                    paddingAll: 'md'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '📍 ' + p.country + ' | ' + p.days + '天', size: 'sm', color: '#666666' },
                        { type: 'text', text: '💰 $' + (p.estimatedCostMin || 30000) + '-$' + (p.estimatedCostMax || 50000), size: 'sm', color: '#E74C3C', margin: 'sm' },
                        { type: 'text', text: '🏷️ ' + p.source, size: 'xs', color: '#888888', margin: 'sm' }
                    ],
                    paddingAll: 'md'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'button', action: { type: 'postback', label: '📖 詳情', data: 'action=view_tour&id=' + p.id }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                                { type: 'button', action: { type: 'postback', label: '🗑️ 刪除', data: 'action=delete_tour&id=' + p.id }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                            ]
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '📤 分享給好友',
                                uri: 'https://line.me/R/msg/text/?' + encodeURIComponent('🌍 推薦行程：' + p.name + '\n📍 ' + p.country + ' ' + p.days + '天\n💰 預算 $' + (p.estimatedCostMin || 30000) + '-$' + (p.estimatedCostMax || 50000) + '\n\n加入退休福音讓AI幫你規劃行程！\nhttps://line.me/R/ti/p/@024wclps')
                            },
                            style: 'primary',
                            color: '#2ECC71',
                            height: 'sm',
                            margin: 'sm'
                        }
                    ],
                    paddingAll: 'sm'
                }
            };
        });
        
        return {
            type: 'flex',
            altText: '我的收藏行程',
            contents: { type: 'carousel', contents: bubbles }
        };
    }

    // ========== 出國旅遊 ==========
    if (matchKeywords(lowerText, ['出國', '旅遊', '日遊', '自由行', '跟團', '旅行', '日本', '韓國', '泰國', '越南', '新加坡', '馬來西亞', '印尼', '菲律賓', '柬埔寨', '香港', '澳門', '中國', '歐洲', '法國', '義大利', '英國', '德國', '西班牙', '瑞士', '美國', '加拿大', '澳洲', '紐西蘭', '埃及', '杜拜', '馬爾地夫'])) {
        var aiTourService = require('../services/aiTourService');
        
        setTimeout(async function() {
            try {
                var tours = await aiTourService.generateTourWithDualAI(text);
                
                for (var i = 0; i < tours.length; i++) {
                    var tour = tours[i];
                    var dbId = await tourPlanService.saveTourToDb(user.id, tour);
                    
                    var itineraryText = (tour.itinerary || []).map(function(d) {
                        return '📅 Day' + d.day + ' ' + (d.title || '') + '\n   ' + (d.activities || []).join('、');
                    }).join('\n\n');
                    
                    var flexMessage = {
                        type: 'flex',
                        altText: '【方案' + (i + 1) + '】' + (tour.name || '精彩行程'),
                        contents: {
                            type: 'bubble',
                            size: 'giga',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '🌍 【方案' + (i + 1) + '】' + (tour.name || '精彩行程'), weight: 'bold', size: 'lg', color: '#ffffff', wrap: true },
                                    { type: 'text', text: '🏷️ ' + (tour.source || 'AI'), size: 'sm', color: '#ffffff' }
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
                                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                                        { type: 'text', text: '📆 天數', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: (tour.days || 5) + ' 天', size: 'sm', color: '#333333', flex: 3 }
                                    ]},
                                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                                        { type: 'text', text: '💰 預算', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: '$' + (tour.estimatedCost?.min || 30000) + '-$' + (tour.estimatedCost?.max || 50000), size: 'sm', color: '#E74C3C', flex: 3, weight: 'bold' }
                                    ]},
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '✨ 亮點', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (tour.highlights || ['精彩景點']).slice(0, 5).join('、'), size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '📋 行程', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: itineraryText || '精彩行程規劃中', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '💡 提醒', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (tour.tips || ['祝您旅途愉快']).map(function(t) { return '• ' + t; }).join('\n'), size: 'xs', color: '#888888', wrap: true, margin: 'sm' }
                                ],
                                paddingAll: 'lg'
                            },
                            footer: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'button', action: { type: 'postback', label: '❤️ 收藏', data: 'action=save_tour&id=' + (dbId || 'none') }, style: 'primary', color: '#E74C3C', flex: 1 },
                                            { type: 'button', action: { type: 'uri', label: '🔍 查機票', uri: 'https://www.skyscanner.com.tw/' }, style: 'secondary', flex: 1, margin: 'sm' }
                                        ]
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '📤 分享給好友',
                                            uri: 'https://line.me/R/msg/text/?' + encodeURIComponent('🌍 推薦行程：' + (tour.name || '精彩行程') + '\n📍 ' + (tour.country || '海外') + ' ' + (tour.days || 5) + '天\n💰 預算 $' + (tour.estimatedCost?.min || 30000) + '-$' + (tour.estimatedCost?.max || 50000) + '\n\n✨ 亮點：' + (tour.highlights || []).slice(0, 3).join('、') + '\n\n加入退休福音讓AI幫你規劃行程！\nhttps://line.me/R/ti/p/@024wclps')
                                        },
                                        style: 'primary',
                                        color: '#2ECC71',
                                        margin: 'sm'
                                    }
                                ],
                                paddingAll: 'md'
                            }
                        }
                    };
                    
                    await client.pushMessage({ to: user.lineUserId, messages: [flexMessage] });
                    if (i < tours.length - 1) await new Promise(function(r) { setTimeout(r, 500); });
                }
                
            } catch (err) {
                logger.error('AI Tour error: ' + err.message);
                await client.pushMessage({ to: user.lineUserId, messages: [{ type: 'text', text: '行程生成失敗 🙏' }] });
            }
        }, 100);
        
        return { type: 'text', text: '🤖 AI 正在規劃行程...\n⏳ 請稍候約 10 秒\n（ChatGPT + Gemini 雙引擎）' };
    }

    // ========== 今日推薦 ==========
    if (matchKeywords(lowerText, ['今日推薦', '推薦', '推薦活動'])) {
        var recs = await recommendationService.getDailyRecommendations(user);
        return flexMessageBuilder.buildDailyRecommendations(recs, user);
    }

    // ========== 找活動 ==========
    if (matchKeywords(lowerText, ['找活動', '探索', '附近', '景點', '去哪玩'])) {
        return flexMessageBuilder.buildExploreCategories();
    }

    // ========== 揪團 ==========
    if (matchKeywords(lowerText, ['揪團', '揪人', '找人', '一起去'])) {
        var groups = await groupService.getOpenGroups(user.city);
        return flexMessageBuilder.buildGroupList(groups);
    }

    // ========== 天氣 ==========
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

    // ========== 設定 ==========
    if (matchKeywords(lowerText, ['設定', '偏好', '個人資料'])) {
        return flexMessageBuilder.buildSettingsMenu(user);
    }

    // ========== 健康 ==========
    if (matchKeywords(lowerText, ['健康', '用藥', '回診', '吃藥'])) {
        return flexMessageBuilder.buildHealthMenu(user);
    }

    // ========== 家人 ==========
    if (matchKeywords(lowerText, ['家人', '子女', '連結', '關懷'])) {
        return flexMessageBuilder.buildFamilyMenu(user);
    }

    // ========== 社群 ==========
    if (matchKeywords(lowerText, ['社群', '同好', '興趣圈'])) {
        return flexMessageBuilder.buildCommunityList();
    }

    // ========== 打招呼 ==========
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        var hour = new Date().getHours();
        var greeting = hour >= 5 && hour < 12 ? '早安' : hour >= 12 && hour < 18 ? '午安' : '晚安';
        return { type: 'text', text: greeting + '！😊\n\n🌍 輸入「日本5天」AI規劃行程\n📋 輸入「我的行程」查看收藏\n💡 輸入「今日推薦」精選活動\n☁️ 輸入「天氣」查看天氣' };
    }

    // ========== 幫助 ==========
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '怎麼用', '功能', '?', '？'])) {
        return {
            type: 'flex',
            altText: '功能說明',
            contents: {
                type: 'bubble',
                size: 'giga',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🌅 退休福音 功能說明', weight: 'bold', size: 'lg', color: '#ffffff' }
                    ],
                    backgroundColor: '#E74C3C',
                    paddingAll: 'lg'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🌍 AI 行程規劃', weight: 'bold', size: 'md', color: '#E74C3C' },
                        { type: 'text', text: '輸入「日本5天」「韓國3天」等\nAI 會用 ChatGPT + Gemini 雙引擎\n為您規劃專屬行程', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                        { type: 'separator', margin: 'lg' },
                        { type: 'text', text: '📋 我的行程', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                        { type: 'text', text: '查看收藏的行程、刪除、分享給好友', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                        { type: 'separator', margin: 'lg' },
                        { type: 'text', text: '💡 今日推薦', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                        { type: 'text', text: '根據天氣、您的偏好推薦活動', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                        { type: 'separator', margin: 'lg' },
                        { type: 'text', text: '☁️ 天氣查詢', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                        { type: 'text', text: '輸入「天氣」或「東京天氣」\n支援全球 200+ 城市', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                        { type: 'separator', margin: 'lg' },
                        { type: 'text', text: '🔔 每日推播', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                        { type: 'text', text: '每天早上 6 點推送今日建議', size: 'sm', color: '#666666', wrap: true, margin: 'sm' }
                    ],
                    paddingAll: 'lg'
                }
            }
        };
    }

    // ========== 客服 ==========
    if (matchKeywords(lowerText, ['客服', '意見', '建議', '問題'])) {
        return { type: 'text', text: '感謝您的意見！\n\n如有任何問題或建議，歡迎直接留言，我們會盡快回覆您 😊' };
    }

    // ========== 謝謝 ==========
    if (matchKeywords(lowerText, ['謝謝', '感謝', 'thanks', '3q'])) {
        return { type: 'text', text: '不客氣！😊 有任何需要隨時找我～' };
    }

    // ========== 預設 ==========
    return { type: 'text', text: '試試這些功能：\n\n🌍 日本5天 - AI規劃出國行程\n📋 我的行程 - 查看收藏\n💡 今日推薦 - 精選活動\n☁️ 天氣 - 查看天氣預報\n❓ 幫助 - 功能說明' };
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

        switch (action) {
            case 'save_tour':
                var saveId = params.get('id');
                if (saveId && saveId !== 'none') {
                    var ok = await tourPlanService.confirmSaveTour(saveId, user.id);
                    response = ok 
                        ? { type: 'text', text: '❤️ 已收藏！\n\n輸入「我的行程」查看' }
                        : { type: 'text', text: '⚠️ 收藏失敗，請重試' };
                } else {
                    response = { type: 'text', text: '⚠️ 行程儲存失敗，請重新生成' };
                }
                break;

            case 'delete_tour':
                var delId = params.get('id');
                var deleted = await tourPlanService.deleteTourPlan(delId, user.id);
                response = deleted
                    ? { type: 'text', text: '🗑️ 已刪除！\n\n輸入「我的行程」查看剩餘收藏' }
                    : { type: 'text', text: '⚠️ 刪除失敗' };
                break;

            case 'view_tour':
                var viewId = params.get('id');
                var { TourPlan } = require('../models');
                var plan = await TourPlan.findByPk(viewId);
                if (plan) {
                    var itText = (plan.itinerary || []).map(function(d) {
                        return '📅 Day' + d.day + ' ' + (d.title || '') + '\n   ' + (d.activities || []).join('、');
                    }).join('\n\n');
                    
                    response = { 
                        type: 'text', 
                        text: '🌍 ' + plan.name + '\n\n' +
                              '📍 ' + plan.country + ' | ' + plan.days + '天\n' +
                              '💰 $' + plan.estimatedCostMin + '-$' + plan.estimatedCostMax + '\n' +
                              '🏷️ ' + plan.source + '\n\n' +
                              '✨ 亮點：\n' + (plan.highlights || []).join('、') + '\n\n' +
                              '📋 行程：\n' + itText + '\n\n' +
                              '💡 提醒：\n' + (plan.tips || []).join('、')
                    };
                } else {
                    response = { type: 'text', text: '找不到此行程' };
                }
                break;

            case 'daily_recommendation':
                var recs = await recommendationService.getDailyRecommendations(user);
                response = flexMessageBuilder.buildDailyRecommendations(recs, user);
                break;

            case 'explore_category':
                var category = params.get('category');
                var activities = await recommendationService.getActivitiesByCategory(category, user);
                response = flexMessageBuilder.buildCategoryActivities(activities, category);
                break;

            case 'view_activity':
                var actId = params.get('id');
                var activity = await Activity.findByPk(actId);
                response = flexMessageBuilder.buildActivityDetail(activity, user);
                break;

            case 'save_activity':
                await userService.saveToWishlist(user.id, params.get('id'));
                response = { type: 'text', text: '已加入想去清單 ❤️' };
                break;

            case 'settings':
                response = flexMessageBuilder.buildSettingsMenu(user);
                break;

            case 'health_menu':
                response = flexMessageBuilder.buildHealthMenu(user);
                break;

            case 'family_menu':
                response = flexMessageBuilder.buildFamilyMenu(user);
                break;

            case 'help':
                response = { type: 'text', text: '🌍 日本5天 - AI規劃行程\n📋 我的行程 - 查看收藏\n💡 今日推薦 - 精選活動\n☁️ 天氣 - 天氣預報' };
                break;

            case 'start_onboarding':
                await conversationService.startFlow(user.id, 'onboarding');
                response = flexMessageBuilder.buildOnboardingStep1();
                break;

            case 'skip_onboarding':
                await userService.completeOnboarding(user.id);
                response = { type: 'text', text: '輸入「日本5天」試試AI行程！' };
                break;

            default:
                response = { type: 'text', text: '試試：\n🌍 日本5天\n📋 我的行程\n💡 今日推薦' };
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
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '😊 輸入「日本5天」試試AI規劃！' }] });
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
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '大家好！輸入「日本5天」試試AI規劃！🌅' }] });
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