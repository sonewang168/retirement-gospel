/**
 * LINE Bot Controller（雙AI + 卡片版）
 */
const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const conversationService = require('../services/conversationService');
const groupService = require('../services/groupService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const richMenuService = require('../linebot/richMenuService');
const tourPlanService = require('../services/tourPlanService');
const healthReminderService = require('../services/healthReminderService');
const aiTourService = require('../services/aiTourService');
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
        var msg = { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎加入退休福音！\n\n🌍 輸入「日本5天」或「台南3天」讓AI幫您規劃行程！\n📋 輸入「我的行程」查看收藏\n❤️ 輸入「想去清單」查看收藏活動\n💡 輸入「今日推薦」看精選活動\n☁️ 輸入「天氣」查看天氣預報\n💊 輸入「健康」管理用藥回診' };
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
        
        if (conversationState && conversationState.currentFlow === 'add_appointment') {
            var parsed = healthReminderService.parseAppointmentInput(text);
            if (parsed) {
                await healthReminderService.addAppointment(user.id, parsed);
                await conversationState.update({ currentFlow: null, flowData: null });
                var response = { type: 'text', text: '✅ 已新增回診提醒！\n\n🏥 ' + parsed.hospitalName + (parsed.department ? ' ' + parsed.department : '') + '\n📅 ' + parsed.date + '\n\n輸入「健康」查看所有提醒' };
                await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
                return;
            } else {
                var response = { type: 'text', text: '❓ 格式不正確\n\n請輸入：日期 醫院 科別\n例如：1/15 高雄長庚 心臟科\n\n或輸入「取消」返回' };
                if (text === '取消') {
                    await conversationState.update({ currentFlow: null, flowData: null });
                    response = { type: 'text', text: '已取消新增回診提醒' };
                }
                await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
                return;
            }
        }
        
        if (conversationState && conversationState.currentFlow === 'add_medication') {
            var parsed = healthReminderService.parseMedicationInput(text);
            if (parsed) {
                await healthReminderService.addMedication(user.id, parsed);
                await conversationState.update({ currentFlow: null, flowData: null });
                var response = { type: 'text', text: '✅ 已新增用藥提醒！\n\n💊 ' + parsed.medicationName + '\n⏰ ' + parsed.reminderTimes.join(', ') + '\n\n輸入「健康」查看所有提醒' };
                await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
                return;
            } else {
                var response = { type: 'text', text: '❓ 格式不正確\n\n請輸入：藥名 時間\n例如：阿斯匹靈 早上8點\n\n或輸入「取消」返回' };
                if (text === '取消') {
                    await conversationState.update({ currentFlow: null, flowData: null });
                    response = { type: 'text', text: '已取消新增用藥提醒' };
                }
                await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
                return;
            }
        }

        if (conversationState && conversationState.currentFlow && conversationState.currentFlow !== 'add_appointment' && conversationState.currentFlow !== 'add_medication') {
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

    // ========== 想去清單 ==========
    if (matchKeywords(lowerText, ['想去清單', '想去', '我的收藏活動', '收藏活動'])) {
        var wishlist = await userService.getWishlist(user.id);
        return flexMessageBuilder.buildWishlistCard(wishlist);
    }

    // ========== 我的行程 ==========
    if (lowerText.includes('我的行程') || lowerText === '收藏') {
        var plans = await tourPlanService.getUserTourPlans(user.id);
        
        if (plans.length === 0) {
            return { type: 'text', text: '📋 還沒有收藏行程\n\n輸入「日本5天」或「台南3天」讓AI規劃！' };
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
                        { type: 'text', text: '🏷️ ' + (p.aiProvider || p.source || 'AI'), size: 'xs', color: '#888888', margin: 'sm' }
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

    // ========== AI 行程規劃（國內外都支援）==========
    var travelRequest = aiTourService.parseTravelRequest(text);
    if (travelRequest) {
        // 先回覆「正在規劃」
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
                type: 'text',
                text: '🤖 AI 正在規劃「' + travelRequest.destination + ' ' + travelRequest.days + '天」行程...\n⏳ 請稍候約 10 秒\n（ChatGPT + Gemini 雙引擎）'
            }]
        });

        // 非同步生成行程
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
                                        { type: 'text', text: '📍 目的地', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: tour.country || travelRequest.destination, size: 'sm', color: '#333333', flex: 3 }
                                    ]},
                                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                                        { type: 'text', text: '📆 天數', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: (tour.days || travelRequest.days) + ' 天', size: 'sm', color: '#333333', flex: 3 }
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
                                            uri: 'https://line.me/R/msg/text/?' + encodeURIComponent('🌍 推薦行程：' + (tour.name || '精彩行程') + '\n📍 ' + (tour.country || travelRequest.destination) + ' ' + (tour.days || travelRequest.days) + '天\n💰 預算 $' + (tour.estimatedCost?.min || 30000) + '-$' + (tour.estimatedCost?.max || 50000) + '\n\n✨ 亮點：' + (tour.highlights || []).slice(0, 3).join('、') + '\n\n加入退休福音讓AI幫你規劃行程！\nhttps://line.me/R/ti/p/@024wclps')
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
                logger.error('AI Tour error:', err.message);
                await client.pushMessage({ to: user.lineUserId, messages: [{ type: 'text', text: '行程生成失敗，請稍後再試 🙏' }] });
            }
        }, 100);

        return null;
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
    if (matchKeywords(lowerText, ['健康', '用藥', '回診', '吃藥', '提醒'])) {
        return await flexMessageBuilder.buildHealthMenu(user);
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
        return { type: 'text', text: greeting + '！😊\n\n🌍 輸入「日本5天」或「台南3天」AI規劃行程\n📋 輸入「我的行程」查看收藏\n❤️ 輸入「想去清單」查看活動\n💡 輸入「今日推薦」精選活動\n☁️ 輸入「天氣」查看天氣\n💊 輸入「健康」管理提醒' };
    }

    // ========== 幫助 ==========
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '怎麼用', '功能', '?', '？'])) {
        return flexMessageBuilder.buildHelpMenu();
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
    return { type: 'text', text: '試試這些功能：\n\n🌍 日本5天 - AI規劃出國行程\n🏠 台南3天 - AI規劃國內行程\n📋 我的行程 - 查看收藏\n❤️ 想去清單 - 收藏的活動\n💡 今日推薦 - 精選活動\n☁️ 天氣 - 查看天氣預報\n💊 健康 - 管理用藥回診\n❓ 幫助 - 功能說明' };
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
                    var itText = '';
                    if (plan.itinerary && Array.isArray(plan.itinerary)) {
                        itText = plan.itinerary.map(function(d) {
                            return '📅 Day' + d.day + ' ' + (d.title || '') + '\n   ' + (d.activities || []).join('、');
                        }).join('\n\n');
                    } else if (plan.content) {
                        itText = plan.content.substring(0, 1500);
                    }
                    
                    response = {
                        type: 'flex',
                        altText: plan.name,
                        contents: {
                            type: 'bubble',
                            size: 'giga',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '🌍 ' + plan.name, weight: 'bold', size: 'lg', color: '#ffffff', wrap: true },
                                    { type: 'text', text: '🏷️ ' + (plan.aiProvider || plan.source || 'AI'), size: 'sm', color: '#ffffff' }
                                ],
                                backgroundColor: '#E74C3C',
                                paddingAll: 'lg'
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📍 ' + plan.country + ' | ' + plan.days + '天', size: 'sm', color: '#666666' },
                                    { type: 'text', text: '💰 $' + (plan.estimatedCostMin || 30000) + '-$' + (plan.estimatedCostMax || 50000), size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '✨ 亮點', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (plan.highlights || []).join('、') || '精彩行程', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '📋 行程', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: itText || '精彩行程', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: '💡 提醒', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                                    { type: 'text', text: (plan.tips || []).join('、') || '祝您旅途愉快', size: 'xs', color: '#888888', wrap: true, margin: 'sm' }
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
                                            { type: 'button', action: { type: 'uri', label: '📄 下載PDF', uri: 'https://retirement-gospel.onrender.com/api/tour/' + plan.id + '/pdf' }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                                            { type: 'button', action: { type: 'uri', label: '🔍 查機票', uri: 'https://www.skyscanner.com.tw/' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                                        ]
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '📤 分享給好友',
                                            uri: 'https://line.me/R/msg/text/?' + encodeURIComponent('🌍 推薦行程：' + plan.name + '\n📍 ' + plan.country + ' ' + plan.days + '天\n💰 預算 $' + (plan.estimatedCostMin || 30000) + '-$' + (plan.estimatedCostMax || 50000) + '\n\n加入退休福音讓AI幫你規劃！\nhttps://line.me/R/ti/p/@024wclps')
                                        },
                                        style: 'primary',
                                        color: '#2ECC71',
                                        height: 'sm',
                                        margin: 'sm'
                                    }
                                ],
                                paddingAll: 'sm'
                            }
                        }
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
                var saveActId = params.get('id');
                var result = await userService.saveToWishlist(user.id, saveActId);
                if (result.exists) {
                    response = { type: 'text', text: '這個活動已經在想去清單裡了 😊\n\n輸入「想去清單」查看' };
                } else if (result.success) {
                    response = { type: 'text', text: '❤️ 已加入想去清單！\n\n輸入「想去清單」查看所有收藏' };
                } else {
                    response = { type: 'text', text: '⚠️ 收藏失敗，請重試' };
                }
                break;

            case 'remove_wishlist':
                var removeActId = params.get('id');
                var removed = await userService.removeFromWishlist(user.id, removeActId);
                response = removed
                    ? { type: 'text', text: '🗑️ 已從想去清單移除\n\n輸入「想去清單」查看剩餘收藏' }
                    : { type: 'text', text: '⚠️ 移除失敗' };
                break;

            case 'toggle_visited':
                var toggleActId = params.get('id');
                var toggled = await userService.markAsVisited(user.id, toggleActId);
                response = toggled
                    ? { type: 'text', text: '✅ 已標記為去過！\n\n輸入「想去清單」查看' }
                    : { type: 'text', text: '⚠️ 標記失敗' };
                break;

            case 'my_wishlist':
                var wishlist = await userService.getWishlist(user.id);
                response = flexMessageBuilder.buildWishlistCard(wishlist);
                break;

            case 'settings':
                response = flexMessageBuilder.buildSettingsMenu(user);
                break;

            case 'edit_profile':
            case 'edit_city':
                response = flexMessageBuilder.buildCityPickerMenu();
                break;

            case 'set_city':
                var newCity = params.get('city');
                await user.update({ city: newCity });
                response = { type: 'text', text: '✅ 城市已更新為：' + newCity + '\n\n輸入「設定」查看完整設定' };
                break;

            case 'edit_push_time':
                response = flexMessageBuilder.buildTimePickerMenu();
                break;

            case 'set_push_time':
                var newTime = params.get('time');
                await user.update({ morningPushTime: newTime });
                response = { type: 'text', text: '✅ 早安推播時間已設定為：' + newTime + '\n\n每天 ' + newTime + ' 會收到早安問候 ☀️\n\n輸入「設定」查看完整設定' };
                break;

            case 'toggle_notification':
                var newStatus = !user.notificationEnabled;
                await user.update({ notificationEnabled: newStatus });
                response = { type: 'text', text: newStatus ? '🔔 已開啟推播通知！\n\n每天 ' + (user.morningPushTime || '06:00') + ' 會收到早安問候' : '🔕 已關閉推播通知\n\n您可以隨時在「設定」中重新開啟' };
                break;

            case 'health_menu':
                response = await flexMessageBuilder.buildHealthMenu(user);
                break;

            case 'add_appointment':
                var [convState, created] = await ConversationState.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
                await convState.update({ currentFlow: 'add_appointment', flowData: {} });
                response = { type: 'text', text: '🏥 新增回診提醒\n\n請輸入回診資訊：\n日期 醫院 科別\n\n例如：1/15 高雄長庚 心臟科\n\n或輸入「取消」返回' };
                break;

            case 'add_medication':
                var [convState2, created2] = await ConversationState.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
                await convState2.update({ currentFlow: 'add_medication', flowData: {} });
                response = { type: 'text', text: '💊 新增用藥提醒\n\n請輸入用藥資訊：\n藥名 服藥時間\n\n例如：阿斯匹靈 早上8點\n例如：降血壓藥 早晚\n\n或輸入「取消」返回' };
                break;

            case 'family_menu':
                response = flexMessageBuilder.buildFamilyMenu(user);
                break;

            case 'invite_family':
                response = { type: 'text', text: '👨‍👩‍👧‍👦 邀請家人連結\n\n請將以下連結分享給您的家人：\n\nhttps://line.me/R/ti/p/@024wclps\n\n家人加入後，輸入您的邀請碼即可連結：\n🔑 ' + (user.referralCode || 'ABC123') };
                break;

            case 'create_group':
                response = { type: 'text', text: '➕ 建立揪團\n\n請輸入揪團資訊：\n\n例如：1/20 登山健行 壽山' };
                break;

            case 'join_community':
                response = { type: 'text', text: '🎉 已加入社群！\n\n您已成功加入，可以開始與同好交流！' };
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
                response = { type: 'text', text: '輸入「日本5天」或「台南3天」試試AI行程！' };
                break;

            default:
                response = { type: 'text', text: '試試：\n🌍 日本5天\n🏠 台南3天\n📋 我的行程\n❤️ 想去清單\n💡 今日推薦\n💊 健康' };
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
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '😊 輸入「日本5天」或「台南3天」試試AI規劃！' }] });
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