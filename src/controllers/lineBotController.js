/**
 * ============================================
 * LINE Bot Controller
 * 處理所有 LINE 事件
 * ============================================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const conversationService = require('../services/conversationService');
const groupService = require('../services/groupService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const richMenuService = require('../linebot/richMenuService');
const { User, ConversationState, Activity, Group } = require('../models');

/**
 * ============================================
 * 關注事件處理
 * ============================================
 */
async function handleFollow(event, client) {
    const userId = event.source.userId;
    logger.info(`New follower: ${userId}`);

    try {
        // 取得用戶資料
        const profile = await client.getProfile(userId);
        
        // 建立或更新用戶
        const user = await userService.createOrUpdateUser({
            lineUserId: userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        });

        // 設定 Rich Menu
        await richMenuService.setDefaultMenu(client, userId);

        // 發送歡迎訊息
        const welcomeMessages = buildWelcomeMessages(user, profile.displayName);
        
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: welcomeMessages
        });

        // 記錄統計
        await userService.recordUsageStats(user.id, 'follow');

    } catch (error) {
        logger.error('Error handling follow event:', error);
        throw error;
    }
}

/**
 * 建立歡迎訊息
 */
function buildWelcomeMessages(user, displayName) {
    const isNewUser = !user.onboardingCompleted;

    if (isNewUser) {
        return [
            {
                type: 'text',
                text: `🌅 ${displayName}，歡迎加入退休福音！\n\n我是您的智慧生活規劃助手，每天為您推薦最適合的活動與行程。\n\n讓我先了解您一下，才能給您最貼心的建議 💪`
            },
            flexMessageBuilder.buildOnboardingStart()
        ];
    } else {
        return [
            {
                type: 'text',
                text: `🌅 ${displayName}，歡迎回來！\n\n很高興再次見到您～\n今天想做什麼呢？`
            },
            flexMessageBuilder.buildQuickActions()
        ];
    }
}

/**
 * ============================================
 * 取消關注事件處理
 * ============================================
 */
async function handleUnfollow(event, client) {
    const userId = event.source.userId;
    logger.info(`User unfollowed: ${userId}`);

    try {
        await userService.deactivateUser(userId);
    } catch (error) {
        logger.error('Error handling unfollow event:', error);
    }
}

/**
 * ============================================
 * 文字訊息處理
 * ============================================
 */
async function handleTextMessage(event, client) {
    const userId = event.source.userId;
    const text = event.message.text.trim();
    
    logger.info(`Text message from ${userId}: ${text}`);

    try {
        // 取得或建立用戶
        const user = await userService.getOrCreateUser(userId, client);
        
        // 更新最後活躍時間
        await userService.updateLastActive(user.id);

        // 檢查是否在對話流程中
        const conversationState = await ConversationState.findOne({
            where: { userId: user.id }
        });

        if (conversationState && conversationState.currentFlow) {
            return await conversationService.handleFlowInput(
                event, client, user, conversationState, text
            );
        }

        // 一般訊息處理 - 關鍵字匹配
        const response = await handleKeywordMessage(text, user, client);
        
        if (response) {
            await client.replyMessage({
                replyToken: event.replyToken,
                messages: Array.isArray(response) ? response : [response]
            });
        }

    } catch (error) {
        logger.error('Error handling text message:', error);
        throw error;
    }
}

/**
 * 關鍵字訊息處理
 */
async function handleKeywordMessage(text, user, client) {
    const lowerText = text.toLowerCase();

    // ============================================
    // 今日推薦相關
    // ============================================
    if (matchKeywords(lowerText, ['今日推薦', '今天推薦', '推薦', '今天做什麼', '今天去哪', '推薦活動'])) {
        const recommendations = await recommendationService.getDailyRecommendations(user);
        return flexMessageBuilder.buildDailyRecommendations(recommendations, user);
    }

    // ============================================
    // 天氣查詢
    // ============================================
    if (matchKeywords(lowerText, ['天氣', '氣象', '會下雨', '溫度'])) {
        const weather = await recommendationService.getWeatherInfo(user.city, user.district);
        return flexMessageBuilder.buildWeatherCard(weather);
    }

    // ============================================
    // 空氣品質
    // ============================================
    if (matchKeywords(lowerText, ['空氣', '空品', 'aqi', 'pm2.5', '空氣品質'])) {
        const airQuality = await recommendationService.getAirQualityInfo(user.city);
        return flexMessageBuilder.buildAirQualityCard(airQuality);
    }

    // ============================================
    // 探索活動
    // ============================================
    if (matchKeywords(lowerText, ['找活動', '探索', '附近', '景點', '去哪玩'])) {
        return flexMessageBuilder.buildExploreCategories();
    }

    // ============================================
    // 揪團相關
    // ============================================
    if (matchKeywords(lowerText, ['揪團', '揪人', '找人', '一起去', '團'])) {
        const groups = await groupService.getOpenGroups(user.city);
        return flexMessageBuilder.buildGroupList(groups);
    }

    if (matchKeywords(lowerText, ['發起揪團', '建立揪團', '我要揪團', '開團'])) {
        await conversationService.startFlow(user.id, 'create_group');
        return flexMessageBuilder.buildCreateGroupStart();
    }

    // ============================================
    // 我的行程
    // ============================================
    if (matchKeywords(lowerText, ['我的行程', '行程', '排程', '計畫', '待辦'])) {
        const activities = await userService.getUserPlannedActivities(user.id);
        return flexMessageBuilder.buildMySchedule(activities);
    }

    // ============================================
    // 收藏/想去
    // ============================================
    if (matchKeywords(lowerText, ['收藏', '想去', '我的收藏', '願望清單'])) {
        const wishlist = await userService.getUserWishlist(user.id);
        return flexMessageBuilder.buildWishlist(wishlist);
    }

    // ============================================
    // 足跡/去過
    // ============================================
    if (matchKeywords(lowerText, ['足跡', '去過', '歷史', '紀錄'])) {
        const history = await userService.getUserActivityHistory(user.id);
        return flexMessageBuilder.buildActivityHistory(history);
    }

    // ============================================
    // 設定相關
    // ============================================
    if (matchKeywords(lowerText, ['設定', '偏好', '修改資料', '個人資料'])) {
        return flexMessageBuilder.buildSettingsMenu(user);
    }

    // ============================================
    // 健康相關
    // ============================================
    if (matchKeywords(lowerText, ['健康', '用藥', '回診', '提醒', '吃藥'])) {
        return flexMessageBuilder.buildHealthMenu(user);
    }

    // ============================================
    // 家人連結
    // ============================================
    if (matchKeywords(lowerText, ['家人', '子女', '連結', '關懷', '邀請家人'])) {
        return flexMessageBuilder.buildFamilyMenu(user);
    }

    // ============================================
    // 社群同好
    // ============================================
    if (matchKeywords(lowerText, ['社群', '同好', '找同好', '興趣圈'])) {
        return flexMessageBuilder.buildCommunityList();
    }

    // ============================================
    // 幫助/說明
    // ============================================
    if (matchKeywords(lowerText, ['幫助', '說明', 'help', '怎麼用', '功能', '?', '？'])) {
        return flexMessageBuilder.buildHelpMenu();
    }

    // ============================================
    // 客服/意見
    // ============================================
    if (matchKeywords(lowerText, ['客服', '意見', '建議', '問題', '反饋', '聯繫'])) {
        return {
            type: 'text',
            text: '感謝您的意見！\n\n📧 如有任何問題或建議，歡迎直接留言，我們會盡快回覆您。\n\n或者您也可以：\n• 撥打客服專線：0800-XXX-XXX\n• 寄信至：support@retirement-gospel.com'
        };
    }

    // ============================================
    // 會員/訂閱
    // ============================================
    if (matchKeywords(lowerText, ['會員', '訂閱', '升級', 'premium', 'vip'])) {
        return flexMessageBuilder.buildPremiumInfo(user);
    }

    // ============================================
    // 打招呼
    // ============================================
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        const greeting = getTimeBasedGreeting();
        return {
            type: 'text',
            text: `${greeting}，${user.displayName || '您好'}！\n\n今天想做什麼呢？\n\n💡 輸入「今日推薦」查看為您精選的活動\n🔍 輸入「找活動」探索更多選擇\n👥 輸入「揪團」找人一起出遊`
        };
    }

    // ============================================
    // 謝謝
    // ============================================
    if (matchKeywords(lowerText, ['謝謝', '感謝', 'thanks', 'thank you', '3q'])) {
        return {
            type: 'text',
            text: '不客氣！很高興能幫到您 😊\n\n有任何需要隨時找我～'
        };
    }

    // ============================================
    // 預設回應 - 使用 AI 理解意圖
    // ============================================
    return await handleUnknownMessage(text, user);
}

/**
 * 處理無法識別的訊息
 */
async function handleUnknownMessage(text, user) {
    // 這裡可以接入 AI 理解意圖
    // 暫時返回預設回應
    
    return {
        type: 'text',
        text: `抱歉，我不太理解「${text}」的意思 🤔\n\n您可以試試：\n📍 今日推薦 - 查看精選活動\n🔍 找活動 - 探索更多\n👥 揪團 - 找人同遊\n⚙️ 設定 - 調整偏好\n❓ 幫助 - 查看功能說明`
    };
}

/**
 * 關鍵字匹配工具
 */
function matchKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

/**
 * 根據時間返回問候語
 */
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午安';
    return '晚安';
}

/**
 * ============================================
 * Postback 事件處理
 * ============================================
 */
async function handlePostback(event, client) {
    const userId = event.source.userId;
    const data = event.postback.data;
    
    logger.info(`Postback from ${userId}: ${data}`);

    try {
        const user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        // 解析 postback data
        const params = new URLSearchParams(data);
        const action = params.get('action');

        let response;

        switch (action) {
            // ============================================
            // 推薦相關
            // ============================================
            case 'daily_recommendation':
                const recommendations = await recommendationService.getDailyRecommendations(user);
                response = flexMessageBuilder.buildDailyRecommendations(recommendations, user);
                break;

            case 'view_activity':
                const activityId = params.get('id');
                const activity = await Activity.findByPk(activityId);
                response = flexMessageBuilder.buildActivityDetail(activity, user);
                break;

            case 'save_activity':
                await userService.saveToWishlist(user.id, params.get('id'));
                response = { type: 'text', text: '已加入想去清單 ❤️' };
                break;

            case 'adopt_activity':
                await userService.addToSchedule(user.id, params.get('id'));
                response = { type: 'text', text: '已加入今日行程 ✅\n\n祝您玩得愉快！' };
                break;

            case 'dismiss_activity':
                await recommendationService.dismissRecommendation(user.id, params.get('id'));
                response = { type: 'text', text: '好的，已移除此推薦\n之後會減少類似的推薦 👌' };
                break;

            case 'more_recommendations':
                const moreRecs = await recommendationService.getMoreRecommendations(user, 5);
                response = flexMessageBuilder.buildMoreRecommendations(moreRecs);
                break;

            // ============================================
            // 分類探索
            // ============================================
            case 'explore_category':
                const category = params.get('category');
                const activities = await recommendationService.getActivitiesByCategory(category, user);
                response = flexMessageBuilder.buildCategoryActivities(activities, category);
                break;

            case 'search_nearby':
                response = flexMessageBuilder.buildRequestLocation();
                break;

            // ============================================
            // 揪團相關
            // ============================================
            case 'view_groups':
                const groups = await groupService.getOpenGroups(user.city);
                response = flexMessageBuilder.buildGroupList(groups);
                break;

            case 'view_group':
                const groupId = params.get('id');
                const group = await groupService.getGroupDetail(groupId);
                response = flexMessageBuilder.buildGroupDetail(group, user);
                break;

            case 'join_group':
                const joinResult = await groupService.joinGroup(params.get('id'), user.id);
                response = flexMessageBuilder.buildJoinGroupResult(joinResult);
                break;

            case 'leave_group':
                await groupService.leaveGroup(params.get('id'), user.id);
                response = { type: 'text', text: '已退出揪團 👋' };
                break;

            case 'create_group':
                await conversationService.startFlow(user.id, 'create_group');
                response = flexMessageBuilder.buildCreateGroupStart();
                break;

            case 'my_groups':
                const myGroups = await groupService.getUserGroups(user.id);
                response = flexMessageBuilder.buildMyGroups(myGroups);
                break;

            // ============================================
            // 行程相關
            // ============================================
            case 'my_schedule':
                const schedule = await userService.getUserPlannedActivities(user.id);
                response = flexMessageBuilder.buildMySchedule(schedule);
                break;

            case 'complete_activity':
                await userService.completeActivity(user.id, params.get('id'));
                response = flexMessageBuilder.buildActivityCompleted();
                break;

            case 'rate_activity':
                const rating = parseInt(params.get('rating'));
                await userService.rateActivity(user.id, params.get('id'), rating);
                response = { type: 'text', text: `感謝您的評價！${rating >= 4 ? '很高興您喜歡 😊' : '我們會繼續改進 💪'}` };
                break;

            case 'cancel_activity':
                await userService.cancelActivity(user.id, params.get('id'));
                response = { type: 'text', text: '已取消此活動' };
                break;

            // ============================================
            // 收藏相關
            // ============================================
            case 'my_wishlist':
                const wishlist = await userService.getUserWishlist(user.id);
                response = flexMessageBuilder.buildWishlist(wishlist);
                break;

            case 'remove_wishlist':
                await userService.removeFromWishlist(user.id, params.get('id'));
                response = { type: 'text', text: '已從收藏移除' };
                break;

            // ============================================
            // 設定相關
            // ============================================
            case 'settings':
                response = flexMessageBuilder.buildSettingsMenu(user);
                break;

            case 'edit_profile':
                await conversationService.startFlow(user.id, 'edit_profile');
                response = flexMessageBuilder.buildEditProfileStart(user);
                break;

            case 'edit_interests':
                await conversationService.startFlow(user.id, 'edit_interests');
                response = flexMessageBuilder.buildEditInterestsStart(user);
                break;

            case 'edit_location':
                await conversationService.startFlow(user.id, 'edit_location');
                response = flexMessageBuilder.buildEditLocationStart();
                break;

            case 'edit_notification':
                response = flexMessageBuilder.buildNotificationSettings(user);
                break;

            case 'toggle_notification':
                const enabled = params.get('enabled') === 'true';
                await userService.updateNotificationSetting(user.id, enabled);
                response = { type: 'text', text: enabled ? '已開啟推播通知 🔔' : '已關閉推播通知 🔕' };
                break;

            case 'set_push_time':
                await conversationService.startFlow(user.id, 'set_push_time');
                response = flexMessageBuilder.buildSetPushTimeStart();
                break;

            // ============================================
            // 健康相關
            // ============================================
            case 'health_menu':
                response = flexMessageBuilder.buildHealthMenu(user);
                break;

            case 'add_medication':
                await conversationService.startFlow(user.id, 'add_medication');
                response = flexMessageBuilder.buildAddMedicationStart();
                break;

            case 'view_medications':
                const medications = await userService.getUserMedications(user.id);
                response = flexMessageBuilder.buildMedicationList(medications);
                break;

            case 'add_appointment':
                await conversationService.startFlow(user.id, 'add_appointment');
                response = flexMessageBuilder.buildAddAppointmentStart();
                break;

            case 'view_appointments':
                const appointments = await userService.getUserAppointments(user.id);
                response = flexMessageBuilder.buildAppointmentList(appointments);
                break;

            // ============================================
            // 家人相關
            // ============================================
            case 'family_menu':
                response = flexMessageBuilder.buildFamilyMenu(user);
                break;

            case 'invite_family':
                const inviteCode = await userService.generateFamilyInviteCode(user.id);
                response = flexMessageBuilder.buildFamilyInvite(inviteCode);
                break;

            case 'view_family':
                const family = await userService.getUserFamily(user.id);
                response = flexMessageBuilder.buildFamilyList(family);
                break;

            case 'family_permissions':
                response = flexMessageBuilder.buildFamilyPermissions(user);
                break;

            // ============================================
            // 社群相關
            // ============================================
            case 'community_list':
                response = flexMessageBuilder.buildCommunityList();
                break;

            case 'view_community':
                const communityId = params.get('id');
                response = await flexMessageBuilder.buildCommunityDetail(communityId);
                break;

            case 'join_community':
                await userService.joinCommunity(user.id, params.get('id'));
                response = { type: 'text', text: '歡迎加入！🎉' };
                break;

            // ============================================
            // 會員相關
            // ============================================
            case 'premium_info':
                response = flexMessageBuilder.buildPremiumInfo(user);
                break;

            case 'subscribe':
                response = flexMessageBuilder.buildSubscribePlans();
                break;

            // ============================================
            // Onboarding 相關
            // ============================================
            case 'start_onboarding':
                await conversationService.startFlow(user.id, 'onboarding');
                response = flexMessageBuilder.buildOnboardingStep1();
                break;

            case 'skip_onboarding':
                await userService.completeOnboarding(user.id);
                response = {
                    type: 'text',
                    text: '沒問題！之後可以隨時在「設定」中補填資料\n\n現在就輸入「今日推薦」試試看吧！'
                };
                break;

            case 'onboarding_location':
                const city = params.get('city');
                await userService.updateUserCity(user.id, city);
                response = flexMessageBuilder.buildOnboardingStep2(city);
                break;

            case 'onboarding_mobility':
                const mobility = params.get('level');
                await userService.updateMobility(user.id, mobility);
                response = flexMessageBuilder.buildOnboardingStep3();
                break;

            case 'onboarding_interests':
                const interests = params.get('interests').split(',');
                await userService.updateInterests(user.id, interests);
                response = flexMessageBuilder.buildOnboardingStep4();
                break;

            case 'onboarding_transport':
                const transport = params.get('modes').split(',');
                await userService.updateTransport(user.id, transport);
                response = flexMessageBuilder.buildOnboardingComplete();
                await userService.completeOnboarding(user.id);
                break;

            // ============================================
            // 日期選擇器
            // ============================================
            case 'date_selected':
                const date = event.postback.params?.date;
                if (date) {
                    response = await conversationService.handleDateSelection(user.id, date);
                }
                break;

            case 'time_selected':
                const time = event.postback.params?.time;
                if (time) {
                    response = await conversationService.handleTimeSelection(user.id, time);
                }
                break;

            case 'datetime_selected':
                const datetime = event.postback.params?.datetime;
                if (datetime) {
                    response = await conversationService.handleDatetimeSelection(user.id, datetime);
                }
                break;

            // ============================================
            // 其他
            // ============================================
            case 'help':
                response = flexMessageBuilder.buildHelpMenu();
                break;

            case 'cancel_flow':
                await conversationService.cancelFlow(user.id);
                response = { type: 'text', text: '已取消 ❌' };
                break;

            default:
                logger.warn(`Unknown postback action: ${action}`);
                response = { type: 'text', text: '抱歉，此功能暫時無法使用' };
        }

        if (response) {
            await client.replyMessage({
                replyToken: event.replyToken,
                messages: Array.isArray(response) ? response : [response]
            });
        }

    } catch (error) {
        logger.error('Error handling postback:', error);
        throw error;
    }
}

/**
 * ============================================
 * 位置訊息處理
 * ============================================
 */
async function handleLocationMessage(event, client) {
    const userId = event.source.userId;
    const { latitude, longitude, address } = event.message;
    
    logger.info(`Location from ${userId}: ${latitude}, ${longitude}`);

    try {
        const user = await userService.getOrCreateUser(userId, client);

        // 檢查是否在對話流程中需要位置
        const conversationState = await ConversationState.findOne({
            where: { userId: user.id }
        });

        if (conversationState?.currentFlow) {
            const response = await conversationService.handleLocationInput(
                user, conversationState, { latitude, longitude, address }
            );
            
            if (response) {
                await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: Array.isArray(response) ? response : [response]
                });
                return;
            }
        }

        // 預設：搜尋附近活動
        const nearbyActivities = await recommendationService.getNearbyActivities(
            latitude, longitude, user
        );

        const response = flexMessageBuilder.buildNearbyActivities(nearbyActivities, address);
        
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [response]
        });

    } catch (error) {
        logger.error('Error handling location message:', error);
        throw error;
    }
}

/**
 * ============================================
 * 貼圖訊息處理
 * ============================================
 */
async function handleStickerMessage(event, client) {
    const userId = event.source.userId;
    
    try {
        const user = await userService.getOrCreateUser(userId, client);
        
        // 隨機回應
        const responses = [
            '😊',
            '收到您的貼圖了～有什麼需要幫忙的嗎？',
            '今天想去哪裡走走呢？輸入「今日推薦」看看吧！',
            '👍'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
                type: 'text',
                text: randomResponse
            }]
        });

    } catch (error) {
        logger.error('Error handling sticker message:', error);
    }
}

/**
 * ============================================
 * 圖片訊息處理
 * ============================================
 */
async function handleImageMessage(event, client) {
    const userId = event.source.userId;
    
    try {
        const user = await userService.getOrCreateUser(userId, client);

        // 檢查是否在需要圖片的對話流程中
        const conversationState = await ConversationState.findOne({
            where: { userId: user.id }
        });

        if (conversationState?.currentFlow === 'add_activity_photo') {
            // 處理活動照片上傳
            const response = await conversationService.handleImageInput(
                user, conversationState, event.message
            );
            
            if (response) {
                await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: Array.isArray(response) ? response : [response]
                });
                return;
            }
        }

        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
                type: 'text',
                text: '收到您的照片了！📸\n\n如果是活動照片，可以在完成活動後上傳到足跡紀錄中喔！'
            }]
        });

    } catch (error) {
        logger.error('Error handling image message:', error);
    }
}

/**
 * ============================================
 * 其他訊息類型處理
 * ============================================
 */
async function handleVideoMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: '收到您的影片了！🎬'
        }]
    });
}

async function handleAudioMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: '收到您的語音訊息了！🎤\n\n目前語音功能開發中，請先用文字訊息與我互動～'
        }]
    });
}

async function handleFileMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: '收到您的檔案了！📁'
        }]
    });
}

/**
 * ============================================
 * 群組/聊天室事件處理
 * ============================================
 */
async function handleJoin(event, client) {
    const sourceType = event.source.type;
    const sourceId = sourceType === 'group' ? event.source.groupId : event.source.roomId;
    
    logger.info(`Bot joined ${sourceType}: ${sourceId}`);

    try {
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
                type: 'text',
                text: '大家好！我是退休福音小幫手 🌅\n\n我可以幫大家推薦好玩的地方、揪團出遊！\n\n📍 輸入「今日推薦」看看今天適合去哪\n👥 輸入「揪團」找人一起出遊\n❓ 輸入「幫助」查看更多功能'
            }]
        });
    } catch (error) {
        logger.error('Error handling join event:', error);
    }
}

async function handleLeave(event, client) {
    const sourceType = event.source.type;
    const sourceId = sourceType === 'group' ? event.source.groupId : event.source.roomId;
    
    logger.info(`Bot left ${sourceType}: ${sourceId}`);
}

async function handleMemberJoined(event, client) {
    const members = event.joined.members;
    logger.info(`Members joined: ${members.map(m => m.userId).join(', ')}`);
}

async function handleMemberLeft(event, client) {
    const members = event.left.members;
    logger.info(`Members left: ${members.map(m => m.userId).join(', ')}`);
}

async function handleBeacon(event, client) {
    logger.info(`Beacon event: ${event.beacon.hwid}`);
}

async function handleAccountLink(event, client) {
    logger.info(`Account link event: ${event.link.result}`);
}

// ============================================
// 匯出
// ============================================
module.exports = {
    handleFollow,
    handleUnfollow,
    handleTextMessage,
    handlePostback,
    handleLocationMessage,
    handleStickerMessage,
    handleImageMessage,
    handleVideoMessage,
    handleAudioMessage,
    handleFileMessage,
    handleJoin,
    handleLeave,
    handleMemberJoined,
    handleMemberLeft,
    handleBeacon,
    handleAccountLink
};
