/**
 * LINE Bot Controller（揪團 + 家人關懷 + 打卡照片 + GPS打卡 + 景點搜尋 整合版）
 */
const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const conversationService = require('../services/conversationService');
const groupService = require('../services/groupService');
const familyService = require('../services/familyService');
const imgbbService = require('../services/imgbbService');
const placesService = require('../services/placesService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const groupFlexBuilder = require('../linebot/groupFlexBuilder');
const familyFlexBuilder = require('../linebot/familyFlexBuilder');
const placeFlexBuilder = require('../linebot/placeFlexBuilder');
const richMenuService = require('../linebot/richMenuService');
const tourPlanService = require('../services/tourPlanService');
const healthReminderService = require('../services/healthReminderService');
const aiTourService = require('../services/aiTourService');
const { User, ConversationState, Activity, UserWishlist, Group, GroupMember, FamilyLink } = require('../models');

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
        var msg = { type: 'text', text: '🌅 ' + profile.displayName + '，歡迎加入退休福音！\n\n🌍 輸入「日本5天」或「台南3天」讓AI幫您規劃行程！\n📋 輸入「我的行程」查看收藏\n❤️ 輸入「想去清單」查看收藏活動\n🔍 輸入「新增景點」搜尋景點\n🏆 輸入「達人」查看您的等級\n🗺️ 輸入「地圖」查看探索地圖\n🎉 輸入「揪團」找人一起玩\n👨‍👩‍👧 輸入「家人」連結家人關懷\n💡 輸入「今日推薦」看精選活動' };
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
        
        // 處理新增回診流程
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
        
        // 處理新增用藥流程
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

        // 處理建立揪團流程
        if (conversationState && conversationState.currentFlow === 'create_group') {
            var groupResponse = await handleCreateGroupFlow(event, client, user, conversationState, text);
            if (groupResponse) {
                await client.replyMessage({ replyToken: event.replyToken, messages: [groupResponse] });
            }
            return;
        }

        // 處理輸入邀請碼流程
        if (conversationState && conversationState.currentFlow === 'input_invite_code') {
            if (text === '取消') {
                await conversationState.update({ currentFlow: null, flowData: null });
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '已取消\n\n輸入「家人」返回家人關懷' }] });
                return;
            }
            var linkResult = await familyService.linkByInviteCode(user.id, text, 'family');
            await conversationState.update({ currentFlow: null, flowData: null });
            if (linkResult.success) {
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '✅ ' + linkResult.message + '\n\n現在可以查看 ' + linkResult.elderName + ' 的動態了！\n\n輸入「家人」查看' }] });
            } else {
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '⚠️ ' + linkResult.message }] });
            }
            return;
        }

        // 處理其他對話流程
        if (conversationState && conversationState.currentFlow && 
            conversationState.currentFlow !== 'add_appointment' && 
            conversationState.currentFlow !== 'add_medication' &&
            conversationState.currentFlow !== 'create_group' &&
            conversationState.currentFlow !== 'input_invite_code' &&
            conversationState.currentFlow !== 'checkin_photo' &&
            conversationState.currentFlow !== 'checkin_gps' &&
            conversationState.currentFlow !== 'waiting_place_search') {
            return await conversationService.handleFlowInput(event, client, user, conversationState, text);
        }

        var response = await handleKeywordMessage(text, user, client, event, conversationState);
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

async function handleKeywordMessage(text, user, client, event, conversationState) {
    var lowerText = text.toLowerCase();

    // ========== 達人系統 ==========
    if (matchKeywords(lowerText, ['達人', '等級', '積分', '我的等級', '徽章', '成就'])) {
        var status = await userService.getExpertStatus(user.id);
        return flexMessageBuilder.buildExpertCard(status);
    }

    // ========== 我的地圖 ==========
    if (matchKeywords(lowerText, ['地圖', '我的地圖', '探索地圖', '足跡', '打卡紀錄'])) {
        var visitedList = await UserWishlist.findAll({
            where: { userId: user.id, isVisited: true },
            include: [{ model: Activity, as: 'activity' }],
            order: [['visitedAt', 'DESC']]
        });
        return flexMessageBuilder.buildMapCard(visitedList);
    }

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

    // ========== AI 行程規劃 ==========
    var travelRequest = aiTourService.parseTravelRequest(text);
    if (travelRequest) {
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
                type: 'text',
                text: '🤖 AI 正在規劃「' + travelRequest.destination + ' ' + travelRequest.days + '天」行程...\n⏳ 請稍候約 10 秒\n（ChatGPT + Gemini 雙引擎）'
            }]
        });

        setTimeout(async function() {
            try {
                var tours = await aiTourService.generateTourWithDualAI(text);
                
                for (var i = 0; i < tours.length; i++) {
                    var tour = tours[i];
                    var dbId = await aiTourService.saveTourToDb(user.id, tour);
                    
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
                                        { type: 'text', text: '$' + (tour.estimatedCost ? tour.estimatedCost.min : 30000) + '-$' + (tour.estimatedCost ? tour.estimatedCost.max : 50000), size: 'sm', color: '#E74C3C', flex: 3, weight: 'bold' }
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
                                            uri: 'https://line.me/R/msg/text/?' + encodeURIComponent('🌍 推薦行程：' + (tour.name || '精彩行程') + '\n📍 ' + (tour.country || travelRequest.destination) + ' ' + (tour.days || travelRequest.days) + '天\n💰 預算 $' + (tour.estimatedCost ? tour.estimatedCost.min : 30000) + '-$' + (tour.estimatedCost ? tour.estimatedCost.max : 50000) + '\n\n✨ 亮點：' + (tour.highlights || []).slice(0, 3).join('、') + '\n\n加入退休福音讓AI幫你規劃行程！\nhttps://line.me/R/ti/p/@024wclps')
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
                
                await User.increment('totalTours', { where: { id: user.id } });
                
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
    if (!recs || recs.length === 0) {
        var cityName = user.city || '台北';
        logger.info('今日推薦：資料庫無資料，搜尋 ' + cityName + ' 景點');
        var places = await placesService.searchPlaces(cityName + ' 熱門景點');
        if (places && places.length > 0) {
            return placeFlexBuilder.buildPlaceSearchResults(places, cityName + '推薦景點');
        } else {
            return { type: 'text', text: '😊 目前還沒有推薦活動\n\n試試輸入「新增景點 ' + cityName + '」搜尋更多！' };
        }
    }
    return flexMessageBuilder.buildDailyRecommendations(recs, user);
}

    // ========== 找活動 ==========
    if (matchKeywords(lowerText, ['找活動', '探索', '附近', '去哪玩'])) {
        return flexMessageBuilder.buildExploreCategories();
    }

    // ========== 新增景點/搜尋景點 ==========
    if (matchKeywords(lowerText, ['新增景點', '搜尋景點', '找景點', '加景點'])) {
        // 檢查是否帶有搜尋關鍵字
        var searchMatch = text.match(/(?:新增景點|搜尋景點|找景點|加景點)\s*(.+)/);
        if (searchMatch && searchMatch[1].trim()) {
            // 直接搜尋
            var query = searchMatch[1].trim();
            var places = await placesService.searchPlaces(query);
            return placeFlexBuilder.buildPlaceSearchResults(places, query);
        } else {
            // 提示輸入，設定對話狀態
            var [convStatePlace, createdPlace] = await ConversationState.findOrCreate({ 
                where: { userId: user.id }, 
                defaults: { userId: user.id } 
            });
            await convStatePlace.update({ currentFlow: 'waiting_place_search', flowData: {} });
            return { type: 'text', text: '🔍 請輸入想搜尋的景點名稱\n\n例如：\n• 阿里山\n• 台南 赤崁樓\n• 日月潭\n• 東京迪士尼' };
        }
    }

    // 處理景點搜尋的對話狀態
    if (conversationState && conversationState.currentFlow === 'waiting_place_search') {
        // 用戶輸入了搜尋關鍵字
        var places = await placesService.searchPlaces(text);
        await conversationState.update({ currentFlow: null, flowData: null });
        return placeFlexBuilder.buildPlaceSearchResults(places, text);
    }

    // ========== 揪團功能 ==========
    if (matchKeywords(lowerText, ['揪團', '揪團列表', '找揪團', '揪一揪', '揪人', '找人', '一起去'])) {
        var groups = await groupService.getOpenGroups(user.city);
        return groupFlexBuilder.buildGroupList(groups);
    }

    if (matchKeywords(lowerText, ['我的揪團', '已參加', '參加的揪團'])) {
        var myGroups = await groupService.getUserGroups(user.id);
        return groupFlexBuilder.buildMyGroups(myGroups);
    }

    if (matchKeywords(lowerText, ['發起揪團', '建立揪團', '新增揪團', '開團'])) {
        return groupFlexBuilder.buildCreateGroupStep1();
    }

    // ========== 家人關懷 ==========
    if (matchKeywords(lowerText, ['家人', '家人關懷', '關懷', '子女', '連結家人'])) {
        var inviteCode = await familyService.getOrCreateInviteCode(user.id);
        var family = await familyService.getMyFamily(user.id);
        var elders = await familyService.getMyElders(user.id);
        return familyFlexBuilder.buildFamilyCareMenu(user, inviteCode, family.length, elders.length);
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

    // ========== 社群 ==========
    if (matchKeywords(lowerText, ['社群', '同好', '興趣圈'])) {
        return flexMessageBuilder.buildCommunityList();
    }

    // ========== 統計 ==========
    if (matchKeywords(lowerText, ['統計', '我的統計', '數據'])) {
        var stats = await userService.getUserStats(user.id);
        var message = '📊 您的統計數據\n━━━━━━━━━━━━━━━\n\n';
        message += '🏆 ' + (stats.expertTitle || '新手旅人') + '\n';
        message += '📍 已探索 ' + (stats.visitedCount || 0) + ' 個景點\n';
        message += '❤️ 想去清單 ' + (stats.wishlistCount || 0) + ' 個\n';
        message += '⭐ 累積 ' + (stats.points || 0) + ' 積分\n\n';
        message += '輸入「達人」查看詳細資訊！';
        return { type: 'text', text: message };
    }

    // ========== 打招呼 ==========
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        // 使用台灣時間 (UTC+8)
        var now = new Date();
        var taiwanOffset = 8 * 60;
        var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        var taiwanTime = new Date(utc + (taiwanOffset * 60000));
        var hour = taiwanTime.getHours();
        var greeting = hour >= 5 && hour < 12 ? '早安' : hour >= 12 && hour < 18 ? '午安' : '晚安';
        return { type: 'text', text: greeting + '！😊 ' + user.expertTitle + '\n\n🌍 輸入「日本5天」或「台南3天」AI規劃行程\n📋 輸入「我的行程」查看收藏\n🔍 輸入「新增景點」搜尋景點\n🏆 輸入「達人」查看等級徽章\n🗺️ 輸入「地圖」查看探索足跡\n🎉 輸入「揪團」找人一起玩\n👨‍👩‍👧 輸入「家人」連結家人關懷\n❤️ 輸入「想去清單」查看活動' };
    }

    // ========== 幫助 ==========
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '怎麼用', '功能', '?', '？'])) {
        return flexMessageBuilder.buildHelpMenu();
    }

    // ========== 純文字指令清單 ==========
    if (matchKeywords(lowerText, ['指令', '清單', '所有功能', '全部功能'])) {
        return { type: 'text', text: '📋 完整功能清單：\n\n🌍 日本5天 - AI規劃出國行程\n🏠 台南3天 - AI規劃國內行程\n📋 我的行程 - 查看收藏\n🏆 達人 - 查看等級徽章\n🗺️ 地圖 - 探索足跡\n🎉 揪團 - 找人一起玩\n👨‍👩‍👧 家人 - 家人關懷\n❤️ 想去清單 - 收藏的活動\n🔍 新增景點 - 搜尋並加入景點\n💡 今日推薦 - 精選活動\n☁️ 天氣 - 查看天氣預報\n💊 健康 - 管理用藥回診\n⚙️ 設定 - 修改城市推播\n❓ 幫助 - 功能說明卡片' };
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
    return { type: 'text', text: '試試這些功能：\n\n🌍 日本5天 - AI規劃出國行程\n🏠 台南3天 - AI規劃國內行程\n📋 我的行程 - 查看收藏\n🏆 達人 - 查看等級徽章\n🗺️ 地圖 - 探索足跡\n🎉 揪團 - 找人一起玩\n👨‍👩‍👧 家人 - 家人關懷\n❤️ 想去清單 - 收藏的活動\n🔍 新增景點 - 搜尋並加入景點\n💡 今日推薦 - 精選活動\n☁️ 天氣 - 查看天氣預報\n💊 健康 - 管理用藥回診\n❓ 幫助 - 功能說明' };
}

function matchKeywords(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
        if (text.includes(keywords[i])) return true;
    }
    return false;
}

// ========== 建立揪團對話流程 ==========
async function handleCreateGroupFlow(event, client, user, convState, text) {
    var flowData = convState.flowData || {};
    var step = flowData.step || 1;

    if (text === '取消') {
        await convState.update({ currentFlow: null, flowData: null });
        return { type: 'text', text: '已取消建立揪團\n\n輸入「揪團」瀏覽活動' };
    }

    var response;

    switch (step) {
        case 1:
            flowData.title = text;
            flowData.step = 2;
            await convState.update({ flowData: flowData });
            response = { type: 'text', text: '✅ 標題：' + text + '\n\n📅 請輸入活動日期：\n\n例如：1/20\n例如：2025/1/20\n\n或輸入「取消」返回' };
            break;

        case 2:
            var dateMatch = text.match(/(\d{1,4})[\/\-]?(\d{1,2})[\/\-]?(\d{1,2})?/);
            if (dateMatch) {
                var year, month, day;
                if (dateMatch[3]) {
                    year = dateMatch[1].length === 4 ? dateMatch[1] : '2025';
                    month = dateMatch[2].padStart(2, '0');
                    day = dateMatch[3].padStart(2, '0');
                } else {
                    year = new Date().getFullYear();
                    month = dateMatch[1].padStart(2, '0');
                    day = dateMatch[2].padStart(2, '0');
                }
                flowData.eventDate = year + '-' + month + '-' + day;
                flowData.step = 3;
                await convState.update({ flowData: flowData });
                response = { type: 'text', text: '✅ 日期：' + flowData.eventDate + '\n\n⏰ 請輸入集合時間：\n\n例如：09:00\n例如：下午2點\n\n或輸入「跳過」不設定時間' };
            } else {
                response = { type: 'text', text: '❓ 日期格式不正確\n\n請輸入：月/日 或 年/月/日\n例如：1/20 或 2025/1/20' };
            }
            break;

        case 3:
            if (text === '跳過') {
                flowData.eventTime = null;
            } else {
                var timeMatch = text.match(/(\d{1,2}):?(\d{2})?/);
                if (timeMatch) {
                    var hour = timeMatch[1].padStart(2, '0');
                    var minute = timeMatch[2] || '00';
                    flowData.eventTime = hour + ':' + minute;
                } else if (text.includes('下午') || text.includes('晚上')) {
                    var numMatch = text.match(/(\d{1,2})/);
                    if (numMatch) {
                        var h = parseInt(numMatch[1]);
                        if (h < 12) h += 12;
                        flowData.eventTime = h + ':00';
                    }
                } else if (text.includes('早上') || text.includes('上午')) {
                    var numMatch2 = text.match(/(\d{1,2})/);
                    if (numMatch2) {
                        flowData.eventTime = numMatch2[1].padStart(2, '0') + ':00';
                    }
                }
            }
            flowData.step = 4;
            await convState.update({ flowData: flowData });
            response = { type: 'text', text: '✅ 時間：' + (flowData.eventTime || '未設定') + '\n\n📍 請輸入集合地點：\n\n例如：高雄捷運左營站 1 號出口\n例如：壽山登山口\n\n或輸入「取消」返回' };
            break;

        case 4:
            flowData.meetingPoint = text;
            flowData.step = 5;
            await convState.update({ flowData: flowData });
            response = { type: 'text', text: '✅ 地點：' + text + '\n\n👥 請輸入人數上限：\n\n例如：10\n\n或輸入「跳過」使用預設 10 人' };
            break;

        case 5:
            if (text === '跳過') {
                flowData.maxParticipants = 10;
            } else {
                var num = parseInt(text);
                flowData.maxParticipants = (num > 0 && num <= 100) ? num : 10;
            }
            flowData.step = 6;
            await convState.update({ flowData: flowData });
            response = groupFlexBuilder.buildCreateGroupConfirm(flowData);
            break;

        default:
            await convState.update({ currentFlow: null, flowData: null });
            response = { type: 'text', text: '⚠️ 流程異常，請重新發起揪團' };
    }

    return response;
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
            case 'my_expert':
                var status = await userService.getExpertStatus(user.id);
                response = flexMessageBuilder.buildExpertCard(status);
                break;

            case 'my_map':
                var visitedList = await UserWishlist.findAll({
                    where: { userId: user.id, isVisited: true },
                    include: [{ model: Activity, as: 'activity' }],
                    order: [['visitedAt', 'DESC']]
                });
                response = flexMessageBuilder.buildMapCard(visitedList);
                break;

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
                if (!recs || recs.length === 0) {
                    // 資料庫沒有推薦，改用 Google Places 搜尋用戶城市景點
                    var cityName = user.city || '台北';
                    logger.info('今日推薦：資料庫無資料，搜尋 ' + cityName + ' 景點');
                    var places = await placesService.searchPlaces(cityName + ' 熱門景點');
                    if (places && places.length > 0) {
                        response = placeFlexBuilder.buildPlaceSearchResults(places, cityName + '推薦景點');
                    } else {
                        response = { type: 'text', text: '😊 目前還沒有推薦活動\n\n試試輸入「新增景點 ' + cityName + '」搜尋更多！' };
                    }
                } else {
                    response = flexMessageBuilder.buildDailyRecommendations(recs, user);
                }
                break;

            case 'explore_category':
                var category = params.get('category');
                
                // 英文到中文分類映射
                var categoryMap = {
                    'culture': '文化藝術',
                    'nature': '自然景觀',
                    'religious': '宗教聖地',
                    'food': '美食品嚐',
                    'sports': '運動健身',
                    'entertainment': '休閒娛樂'
                };
                var categoryName = categoryMap[category] || category;
                
                var activities = await recommendationService.getActivitiesByCategory(category, user);
                
                // 如果資料庫沒有該分類的活動，改用 Google Places 搜尋
                if (!activities || activities.length === 0) {
                    logger.info('資料庫無 ' + categoryName + ' 活動，改用 Google Places 搜尋');
                    var searchQuery = categoryName + ' ' + (user.city || '台灣');
                    var places = await placesService.searchPlaces(searchQuery);
                    if (places && places.length > 0) {
                        response = placeFlexBuilder.buildPlaceSearchResults(places, categoryName);
                    } else {
                        response = { type: 'text', text: '😕 目前沒有找到「' + categoryName + '」相關活動\n\n試試輸入「新增景點 ' + categoryName + '」搜尋更多！' };
                    }
                } else {
                    response = flexMessageBuilder.buildCategoryActivities(activities, categoryName);
                }
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

            case 'add_place':
                // 從 Google Places 新增景點到想去清單
                var placeId = params.get('placeId');
                var placeName = decodeURIComponent(params.get('name') || '');
                logger.info('新增景點: ' + placeName + ' (placeId: ' + placeId + ')');
                
                try {
                    // 取得景點詳細資訊
                    var placeDetails = await placesService.getPlaceDetails(placeId);
                    
                    if (placeDetails) {
                        // 檢查是否已存在（用原始 SQL 查詢）
                        var { sequelize } = require('../models');
                        var [existingRows] = await sequelize.query(
                            'SELECT id FROM activities WHERE google_place_id = :placeId LIMIT 1',
                            { replacements: { placeId: placeId } }
                        );
                        
                        var activityId;
                        
                        if (existingRows.length > 0) {
                            activityId = existingRows[0].id;
                        } else {
                            // 建立新活動（用原始 SQL）
                            var typeLabel = placesService.getTypeLabel(placeDetails.types);
                            var cityName = placeFlexBuilder.extractCity(placeDetails.address);
                            var [insertResult] = await sequelize.query(
                                `INSERT INTO activities (id, name, description, category, city, address, latitude, longitude, image_url, google_place_id, rating, source, created_at, updated_at)
                                 VALUES (gen_random_uuid(), :name, :description, :category, :city, :address, :latitude, :longitude, :imageUrl, :googlePlaceId, :rating, :source, NOW(), NOW())
                                 RETURNING id`,
                                {
                                    replacements: {
                                        name: placeDetails.name,
                                        description: typeLabel + ' · ' + (placeDetails.address || ''),
                                        category: typeLabel,
                                        city: cityName,
                                        address: placeDetails.address || '',
                                        latitude: placeDetails.lat || 0,
                                        longitude: placeDetails.lng || 0,
                                        imageUrl: placeDetails.photo || null,
                                        googlePlaceId: placeId,
                                        rating: placeDetails.rating || null,
                                        source: 'google_places'
                                    }
                                }
                            );
                            activityId = insertResult[0].id;
                        }
                        
                        // 加入想去清單
                        var added = await userService.saveToWishlist(user.id, activityId);
                        if (added.exists) {
                            response = { type: 'text', text: '「' + placeName + '」已經在想去清單裡了 😊\n\n輸入「想去清單」查看' };
                        } else if (added.success) {
                            response = placeFlexBuilder.buildAddPlaceSuccess({ name: placeName });
                        } else {
                            response = { type: 'text', text: '⚠️ 新增失敗，請重試' };
                        }
                    } else {
                        response = { type: 'text', text: '⚠️ 無法取得景點資訊，請重試' };
                    }
                } catch (addPlaceError) {
                    logger.error('新增景點錯誤:', addPlaceError);
                    response = { type: 'text', text: '⚠️ 新增失敗：' + addPlaceError.message };
                }
                break;

            case 'search_place_prompt':
                // 提示搜尋景點
                var [convStatePrompt, createdPrompt] = await ConversationState.findOrCreate({ 
                    where: { userId: user.id }, 
                    defaults: { userId: user.id } 
                });
                await convStatePrompt.update({ currentFlow: 'waiting_place_search', flowData: {} });
                response = { type: 'text', text: '🔍 請輸入想搜尋的景點名稱\n\n例如：\n• 阿里山\n• 台南 赤崁樓\n• 日月潭\n• 東京迪士尼' };
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
                if (toggled) {
                    var newStatus = await userService.getExpertStatus(user.id);
                    var levelUpMsg = '';
                    if (newStatus && newStatus.visitedCount % 10 === 0 && newStatus.visitedCount > 0) {
                        levelUpMsg = '\n\n🎉 恭喜！已達成 ' + newStatus.visitedCount + ' 個景點！\n🏆 ' + newStatus.title;
                    }
                    response = { type: 'text', text: '✅ 已標記為去過！' + levelUpMsg + '\n\n輸入「達人」查看等級\n輸入「地圖」查看足跡' };
                } else {
                    response = { type: 'text', text: '⚠️ 標記失敗' };
                }
                break;

            case 'checkin_with_photo':
                var checkinActId = params.get('id');
                var [convStateCheckin, created] = await ConversationState.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
                await convStateCheckin.update({ currentFlow: 'checkin_photo', flowData: { activityId: checkinActId } });
                response = { type: 'text', text: '📸 照片打卡\n\n請上傳一張現場照片，即可完成打卡！\n\n✅ 成功可獲得 10 積分\n\n或輸入「取消」返回' };
                break;

            case 'checkin_with_gps':
                var gpsActId = params.get('id');
                var [convStateGps, createdGps] = await ConversationState.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
                await convStateGps.update({ currentFlow: 'checkin_gps', flowData: { activityId: gpsActId } });
                response = {
                    type: 'text',
                    text: '📍 現場打卡\n\n請點選下方「傳送位置」按鈕，分享您的目前位置！\n\n⚠️ 需在景點 500 公尺內才能打卡成功\n✅ 成功可獲得 20 積分！\n\n或輸入「取消」返回',
                    quickReply: {
                        items: [{
                            type: 'action',
                            action: { type: 'location', label: '📍 傳送位置' }
                        }]
                    }
                };
                break;

            case 'my_wishlist':
            case 'wishlist':
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
                logger.info('=== 設定推播時間 ===');
                logger.info('收到 postback data: ' + data);
                logger.info('解析出 time 參數: ' + newTime);
                logger.info('用戶: ' + user.displayName + ' (ID: ' + user.id + ')');
                
                await user.update({ morningPushTime: newTime });
                
                // 重新讀取確認
                await user.reload();
                var savedTime = user.morningPushTime;
                logger.info('資料庫存入後的值: ' + savedTime);
                
                response = { type: 'text', text: '✅ 早安推播時間已設定為：' + savedTime + '\n\n每天 ' + savedTime + ' 會收到早安問候 ☀️\n\n輸入「設定」查看完整設定' };
                break;

            case 'toggle_notification':
                var newNotifStatus = !user.notificationEnabled;
                await user.update({ notificationEnabled: newNotifStatus });
                response = { type: 'text', text: newNotifStatus ? '🔔 已開啟推播通知！\n\n每天 ' + (user.morningPushTime || '06:00') + ' 會收到早安問候' : '🔕 已關閉推播通知\n\n您可以隨時在「設定」中重新開啟' };
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
                var inviteCode = await familyService.getOrCreateInviteCode(user.id);
                var family = await familyService.getMyFamily(user.id);
                var elders = await familyService.getMyElders(user.id);
                response = familyFlexBuilder.buildFamilyCareMenu(user, inviteCode, family.length, elders.length);
                break;

            case 'share_invite_code':
                var code = await familyService.getOrCreateInviteCode(user.id);
                response = { type: 'text', text: '📤 分享邀請碼給家人\n\n🔑 您的邀請碼：' + code + '\n\n請告訴家人：\n1. 加入「退休福音」LINE 好友\n2. 輸入「家人」\n3. 點選「輸入邀請碼」\n4. 輸入邀請碼 ' + code + '\n\n連結後家人可以關心您的動態！' };
                break;

            case 'input_invite_code':
                var [convStateInvite, createdInvite] = await ConversationState.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
                await convStateInvite.update({ currentFlow: 'input_invite_code', flowData: {} });
                response = { type: 'text', text: '🔗 請輸入長輩的邀請碼：\n\n（6位數字英文，例如：ABC123）\n\n或輸入「取消」返回' };
                break;

            case 'my_family_list':
                var myFamily = await familyService.getMyFamily(user.id);
                response = familyFlexBuilder.buildMyFamilyList(myFamily);
                break;

            case 'my_elders_list':
                var myElders = await familyService.getMyElders(user.id);
                response = familyFlexBuilder.buildMyEldersList(myElders);
                break;

            case 'view_elder_activity':
                var elderId = params.get('id');
                var elderData = await familyService.getElderActivities(elderId, user.id);
                response = familyFlexBuilder.buildElderActivityCard(elderData);
                break;

            case 'send_sos':
                response = familyFlexBuilder.buildSOSConfirm();
                break;

            case 'confirm_sos':
                var sosResult = await familyService.sendSOS(user.id, client, '緊急求助');
                response = { type: 'text', text: sosResult.success ? '🚨 ' + sosResult.message + '\n\n家人們會盡快聯繫您！' : '⚠️ ' + sosResult.message };
                break;

            case 'cancel_sos':
                response = { type: 'text', text: '已取消\n\n輸入「家人」返回家人關懷' };
                break;

            case 'invite_family':
                var inviteCode2 = await familyService.getOrCreateInviteCode(user.id);
                response = { type: 'text', text: '👨‍👩‍👧 邀請家人連結\n\n請將以下連結分享給您的家人：\n\nhttps://line.me/R/ti/p/@024wclps\n\n家人加入後，輸入您的邀請碼即可連結：\n🔑 ' + inviteCode2 };
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

            // ========== 揪團相關 ==========
            case 'browse_groups':
                var groups = await groupService.getOpenGroups(user.city);
                response = groupFlexBuilder.buildGroupList(groups);
                break;

            case 'view_group':
                var groupId = params.get('id');
                var group = await groupService.getGroupDetail(groupId);
                var membership = await GroupMember.findOne({
                    where: { groupId: groupId, userId: user.id }
                });
                response = groupFlexBuilder.buildGroupDetail(group, membership);
                break;

            case 'join_group':
                var joinGroupId = params.get('id');
                var joinResult = await groupService.joinGroup(joinGroupId, user.id);
                if (joinResult.success) {
                    if (joinResult.isWaitlist) {
                        response = { type: 'text', text: '📝 已加入候補名單！\n\n有人退出時會自動通知您。\n\n輸入「我的揪團」查看狀態' };
                    } else {
                        response = { type: 'text', text: '🎉 報名成功！\n\n記得準時出席！\n\n輸入「我的揪團」查看詳情' };
                    }
                } else {
                    response = { type: 'text', text: '⚠️ ' + joinResult.message };
                }
                break;

            case 'leave_group':
                var leaveGroupId = params.get('id');
                try {
                    await groupService.leaveGroup(leaveGroupId, user.id);
                    response = { type: 'text', text: '✅ 已退出揪團\n\n輸入「揪團」找其他活動' };
                } catch (e) {
                    response = { type: 'text', text: '⚠️ ' + e.message };
                }
                break;

            case 'checkin_group':
                var checkinGroupId = params.get('id');
                try {
                    await groupService.checkIn(checkinGroupId, user.id);
                    var checkedGroup = await Group.findByPk(checkinGroupId);
                    response = groupFlexBuilder.buildCheckInSuccess(checkedGroup, null);
                    await user.increment('totalPoints', { by: 20 });
                } catch (e) {
                    response = { type: 'text', text: '⚠️ ' + e.message };
                }
                break;

            case 'cancel_group':
                var cancelGroupId = params.get('id');
                try {
                    await groupService.cancelGroup(cancelGroupId, user.id, '團主取消');
                    response = { type: 'text', text: '❌ 揪團已取消\n\n已通知所有參加者' };
                } catch (e) {
                    response = { type: 'text', text: '⚠️ ' + e.message };
                }
                break;

            case 'group_members':
                var membersGroupId = params.get('id');
                var membersGroup = await groupService.getGroupDetail(membersGroupId);
                if (membersGroup && membersGroup.members) {
                    response = groupFlexBuilder.buildGroupMembers(membersGroup, membersGroup.members);
                } else {
                    response = { type: 'text', text: '目前沒有成員' };
                }
                break;

            case 'create_group_start':
                response = groupFlexBuilder.buildCreateGroupStep1();
                break;

            case 'create_group_type':
                var groupType = params.get('type');
                var [convStateGroup, createdGroup] = await ConversationState.findOrCreate({
                    where: { userId: user.id },
                    defaults: { userId: user.id }
                });
                await convStateGroup.update({
                    currentFlow: 'create_group',
                    flowData: { step: 1, type: groupType }
                });
                response = { type: 'text', text: '📝 請輸入揪團標題：\n\n例如：週末壽山登山\n例如：高雄美食探索團\n\n或輸入「取消」返回' };
                break;

            case 'create_group_confirm':
                var convStateConfirm = await ConversationState.findOne({ where: { userId: user.id } });
                if (convStateConfirm && convStateConfirm.flowData) {
                    var gData = convStateConfirm.flowData;
                    try {
                        var newGroup = await groupService.createGroup(user.id, {
                            title: gData.title,
                            description: gData.description,
                            eventDate: gData.eventDate,
                            eventTime: gData.eventTime,
                            meetingPoint: gData.meetingPoint,
                            maxParticipants: gData.maxParticipants || 10,
                            city: user.city
                        });
                        await convStateConfirm.update({ currentFlow: null, flowData: null });
                        await user.increment('totalPoints', { by: 10 });
                        response = { type: 'text', text: '🎉 揪團建立成功！\n\n📌 ' + newGroup.title + '\n🏆 獲得 10 積分\n\n快分享給朋友一起參加吧！\n\n輸入「我的揪團」查看詳情' };
                    } catch (e) {
                        response = { type: 'text', text: '⚠️ 建立失敗：' + e.message };
                    }
                } else {
                    response = { type: 'text', text: '⚠️ 請重新發起揪團' };
                }
                break;

            case 'create_group_cancel':
                var convStateCancel = await ConversationState.findOne({ where: { userId: user.id } });
                if (convStateCancel) {
                    await convStateCancel.update({ currentFlow: null, flowData: null });
                }
                response = { type: 'text', text: '已取消建立揪團\n\n輸入「揪團」瀏覽其他活動' };
                break;

            default:
                response = { type: 'text', text: '試試：\n🌍 日本5天\n🏠 台南3天\n📋 我的行程\n🏆 達人\n🗺️ 地圖\n🎉 揪團\n👨‍👩‍👧 家人\n❤️ 想去清單\n🔍 新增景點\n💡 今日推薦\n💊 健康' };
        }

        if (response) {
            await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
        }
    } catch (error) {
        logger.error('Postback error:', error);
    }
}

// 計算兩點距離（公尺）
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function handleLocationMessage(event, client) {
    try {
        var user = await userService.getOrCreateUser(event.source.userId, client);
        var conversationState = await ConversationState.findOne({ where: { userId: user.id } });
        
        // GPS 打卡驗證
        if (conversationState && conversationState.currentFlow === 'checkin_gps') {
            var activityId = conversationState.flowData ? conversationState.flowData.activityId : null;
            var activity = activityId ? await Activity.findByPk(activityId) : null;
            
            if (!activity) {
                await conversationState.update({ currentFlow: null, flowData: null });
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '⚠️ 找不到景點資料' }] });
                return;
            }
            
            // 計算距離
            var userLat = event.message.latitude;
            var userLon = event.message.longitude;
            var actLat = activity.latitude || 25.0330;
            var actLon = activity.longitude || 121.5654;
            var distance = calculateDistance(userLat, userLon, actLat, actLon);
            
            logger.info('GPS Check - User: ' + userLat + ',' + userLon + ' Activity: ' + actLat + ',' + actLon + ' Distance: ' + distance + 'm');
            
            if (distance <= 500) {
                // 打卡成功
                await UserWishlist.update(
                    { isVisited: true, visitedAt: new Date() },
                    { where: { userId: user.id, activityId: activityId } }
                );
                await user.increment('totalPoints', { by: 20 });
                await conversationState.update({ currentFlow: null, flowData: null });
                
                await client.replyMessage({ replyToken: event.replyToken, messages: [{
                    type: 'flex',
                    altText: '打卡成功！',
                    contents: {
                        type: 'bubble',
                        header: { type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'lg', contents: [
                            { type: 'text', text: '✅ 現場打卡成功！', weight: 'bold', size: 'lg', color: '#ffffff', align: 'center' }
                        ]},
                        body: { type: 'box', layout: 'vertical', paddingAll: 'xl', contents: [
                            { type: 'text', text: '📍 ' + activity.name, size: 'md', color: '#333333', weight: 'bold', wrap: true, align: 'center' },
                            { type: 'text', text: '距離：' + Math.round(distance) + ' 公尺', size: 'sm', color: '#666666', margin: 'md', align: 'center' },
                            { type: 'text', text: '🏆 獲得 20 積分！', size: 'lg', color: '#E74C3C', weight: 'bold', margin: 'lg', align: 'center' }
                        ]}
                    }
                }] });
            } else {
                // 太遠
                await client.replyMessage({ replyToken: event.replyToken, messages: [{
                    type: 'text',
                    text: '❌ 打卡失敗\n\n您距離「' + activity.name + '」還有 ' + Math.round(distance) + ' 公尺，超過 500 公尺限制。\n\n請到達景點附近再試一次，或選擇「📸 照片打卡」！',
                    quickReply: {
                        items: [
                            { type: 'action', action: { type: 'location', label: '📍 重新定位' } },
                            { type: 'action', action: { type: 'message', label: '取消', text: '取消' } }
                        ]
                    }
                }] });
            }
            return;
        }
        
        // 一般位置訊息 - 顯示附近景點
        var nearby = await recommendationService.getNearbyActivities(event.message.latitude, event.message.longitude, user);
        var response = flexMessageBuilder.buildNearbyActivities(nearby, event.message.address);
        await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
    } catch (error) {
        logger.error('Location error:', error);
    }
}

async function handleStickerMessage(event, client) {
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '😊 輸入「日本5天」或「台南3天」試試AI規劃！\n🏆 輸入「達人」查看您的等級！\n🎉 輸入「揪團」找人一起玩！\n👨‍👩‍👧 輸入「家人」連結家人關懷！' }] });
}

async function handleImageMessage(event, client) {
    try {
        var user = await userService.getOrCreateUser(event.source.userId, client);
        var conversationState = await ConversationState.findOne({ where: { userId: user.id } });

        logger.info('Image message - currentFlow: ' + (conversationState ? conversationState.currentFlow : 'none'));

        // 處理打卡照片上傳
        if (conversationState && conversationState.currentFlow === 'checkin_photo') {
            var activityId = conversationState.flowData ? conversationState.flowData.activityId : null;
            logger.info('Checkin photo flow - activityId: ' + activityId);
            
            // 上傳到 ImgBB
            var uploadResult = await imgbbService.uploadFromLine(client, event.message.id, 'checkin_' + user.id);
            logger.info('Upload result: ' + JSON.stringify(uploadResult));
            
            if (uploadResult.success) {
                // 更新打卡記錄
                if (activityId) {
                    await UserWishlist.update(
                        { 
                            isVisited: true, 
                            visitedAt: new Date(),
                            checkInPhotoUrl: uploadResult.url
                        },
                        { where: { userId: user.id, activityId: activityId } }
                    );
                    logger.info('Wishlist updated');
                }
                
                // 加積分（照片打卡 10 分）
                await user.increment('totalPoints', { by: 10 });
                logger.info('Points added');
                
                // 清除流程狀態
                await conversationState.update({ currentFlow: null, flowData: null });
                logger.info('Flow cleared');
                
                var activity = activityId ? await Activity.findByPk(activityId) : { name: '景點' };
                logger.info('Activity: ' + (activity ? activity.name : 'null'));
                
                // Flex Message 卡片顯示打卡成功
                var response = {
                    type: 'flex',
                    altText: '✅ 打卡成功！' + (activity ? activity.name : '景點'),
                    contents: {
                        type: 'bubble',
                        size: 'mega',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            backgroundColor: '#27AE60',
                            paddingAll: 'lg',
                            contents: [
                                { type: 'text', text: '✅ 打卡成功！', weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' }
                            ]
                        },
                        hero: {
                            type: 'image',
                            url: uploadResult.url,
                            size: 'full',
                            aspectRatio: '1:1',
                            aspectMode: 'cover'
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            paddingAll: 'xl',
                            contents: [
                                { type: 'text', text: '📍 ' + (activity ? activity.name : '景點'), size: 'lg', color: '#333333', weight: 'bold', align: 'center', wrap: true },
                                { type: 'text', text: '🏆 獲得 10 積分！', size: 'md', color: '#E74C3C', weight: 'bold', align: 'center', margin: 'lg' },
                                { type: 'text', text: '繼續探索更多景點吧！', size: 'sm', color: '#888888', align: 'center', margin: 'md' }
                            ]
                        },
                        footer: {
                            type: 'box',
                            layout: 'horizontal',
                            paddingAll: 'md',
                            contents: [
                                { type: 'button', action: { type: 'postback', label: '🗺️ 我的地圖', data: 'action=my_map' }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                                { type: 'button', action: { type: 'postback', label: '🏆 達人等級', data: 'action=my_expert' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                            ]
                        }
                    }
                };
                
                logger.info('Sending reply...');
                await client.replyMessage({ replyToken: event.replyToken, messages: [response] });
                logger.info('Reply sent');
            } else {
                logger.error('Upload failed: ' + uploadResult.error);
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '⚠️ 照片上傳失敗：' + (uploadResult.error || '未知錯誤') + '\n\n請重試或輸入「取消」返回' }] });
            }
            return;
        }

        // 一般照片訊息
        logger.info('General image message');
        try {
            await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '收到照片！📸\n\n在「想去清單」點選景點的「📸 +10分」按鈕，可以上傳打卡照片喔！' }] });
        } catch (replyErr) {
            logger.error('General image reply error:', replyErr.message);
        }
    } catch (error) {
        logger.error('Image error:', error.message || error);
        if (error.response) {
            logger.error('Response status:', error.response.status);
            logger.error('Response data:', JSON.stringify(error.response.data));
        }
    }
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
    await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: '大家好！輸入「日本5天」試試AI規劃！🌅\n輸入「揪團」找人一起玩！🎉' }] });
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
