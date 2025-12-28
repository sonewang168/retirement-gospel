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
const tourPlanService = require('../services/tourPlanService');
const { User, ConversationState, Activity, Group } = require('../models');

/**
 * ============================================
 * 關注事件處理
 * ============================================
 */
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

        const welcomeMessages = buildWelcomeMessages(user, profile.displayName);
        
        await client.replyMessage({
            replyToken: event.replyToken,
            messages: welcomeMessages
        });

        await userService.recordUsageStats(user.id, 'follow');

    } catch (error) {
        logger.error('Error handling follow event:', error);
        throw error;
    }
}

function buildWelcomeMessages(user, displayName) {
    const isNewUser = !user.onboardingCompleted;

    if (isNewUser) {
        return [
            {
                type: 'text',
                text: '🌅 ' + displayName + '，歡迎加入退休福音！\n\n我是您的智慧生活規劃助手，每天為您推薦最適合的活動與行程。\n\n讓我先了解您一下，才能給您最貼心的建議 💪'
            },
            flexMessageBuilder.buildOnboardingStart()
        ];
    } else {
        return [
            {
                type: 'text',
                text: '🌅 ' + displayName + '，歡迎回來！\n\n很高興再次見到您～\n今天想做什麼呢？'
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
    logger.info('User unfollowed: ' + userId);

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
    
    logger.info('Text message from ' + userId + ': ' + text);

    try {
        const user = await userService.getOrCreateUser(userId, client);
        
        await userService.updateLastActive(user.id);

        const conversationState = await ConversationState.findOne({
            where: { userId: user.id }
        });

        if (conversationState && conversationState.currentFlow) {
            return await conversationService.handleFlowInput(
                event, client, user, conversationState, text
            );
        }

        const response = await handleKeywordMessage(text, user, client, event);
        
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
async function handleKeywordMessage(text, user, client, event) {
    const lowerText = text.toLowerCase();

    // ============================================
    // 出國旅遊行程（AI 生成）
    // ============================================
    if (matchKeywords(lowerText, ['出國', '旅遊', '幾日遊', '日遊', '自由行', '跟團', '行程規劃', '旅行'])) {
        const aiTourService = require('../services/aiTourService');
        
        setTimeout(async () => {
            try {
                const tours = await aiTourService.generateTourWithDualAI(text);
                
                for (let i = 0; i < tours.length; i++) {
                    const tour = tours[i];
                    
                    // 暫存行程供收藏用
                    tourPlanService.cacheTour(user.lineUserId, tour);
                    
                    const itineraryText = (tour.itinerary || []).map(function(d) {
                        return '📅 Day' + d.day + ' ' + d.title + '\n   ' + (d.activities || []).join('、');
                    }).join('\n\n');
                    
                    // 使用 Flex Message 顯示行程（含收藏按鈕）
                    const flexMessage = {
                        type: 'flex',
                        altText: '【方案' + (i + 1) + '】' + tour.name,
                        contents: {
                            type: 'bubble',
                            size: 'giga',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🌍 【方案' + (i + 1) + '】' + tour.name,
                                        weight: 'bold',
                                        size: 'lg',
                                        color: '#ffffff',
                                        wrap: true
                                    },
                                    {
                                        type: 'text',
                                        text: '🏷️ ' + tour.source,
                                        size: 'sm',
                                        color: '#ffffff'
                                    }
                                ],
                                backgroundColor: i === 0 ? '#E74C3C' : '#3498DB',
                                paddingAll: 'lg'
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '📍 國家', size: 'sm', color: '#888888', flex: 2 },
                                            { type: 'text', text: tour.country, size: 'sm', color: '#333333', flex: 3 }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '📆 天數', size: 'sm', color: '#888888', flex: 2 },
                                            { type: 'text', text: tour.days + ' 天', size: 'sm', color: '#333333', flex: 3 }
                                        ],
                                        margin: 'md'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '💰 預算', size: 'sm', color: '#888888', flex: 2 },
                                            { type: 'text', text: '$' + (tour.estimatedCost?.min || 30000) + ' - $' + (tour.estimatedCost?.max || 50000), size: 'sm', color: '#E74C3C', flex: 3, weight: 'bold' }
                                        ],
                                        margin: 'md'
                                    },
                                    { type: 'separator', margin: 'lg' },
                                    {
                                        type: 'text',
                                        text: '✨ 亮點',
                                        size: 'sm',
                                        color: '#E74C3C',
                                        weight: 'bold',
                                        margin: 'lg'
                                    },
                                    {
                                        type: 'text',
                                        text: (tour.highlights || []).slice(0, 5).join('、'),
                                        size: 'sm',
                                        color: '#666666',
                                        wrap: true,
                                        margin: 'sm'
                                    },
                                    { type: 'separator', margin: 'lg' },
                                    {
                                        type: 'text',
                                        text: '📋 行程安排',
                                        size: 'sm',
                                        color: '#E74C3C',
                                        weight: 'bold',
                                        margin: 'lg'
                                    },
                                    {
                                        type: 'text',
                                        text: itineraryText,
                                        size: 'sm',
                                        color: '#666666',
                                        wrap: true,
                                        margin: 'sm'
                                    },
                                    { type: 'separator', margin: 'lg' },
                                    {
                                        type: 'text',
                                        text: '💡 小提醒',
                                        size: 'sm',
                                        color: '#E74C3C',
                                        weight: 'bold',
                                        margin: 'lg'
                                    },
                                    {
                                        type: 'text',
                                        text: (tour.tips || []).map(function(t) { return '• ' + t; }).join('\n'),
                                        size: 'xs',
                                        color: '#888888',
                                        wrap: true,
                                        margin: 'sm'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '🗓️ 最佳季節', size: 'xs', color: '#888888', flex: 2 },
                                            { type: 'text', text: tour.bestSeason || '全年皆宜', size: 'xs', color: '#333333', flex: 3 }
                                        ],
                                        margin: 'lg'
                                    }
                                ],
                                paddingAll: 'lg'
                            },
                            footer: {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '❤️ 收藏這個',
                                            data: 'action=save_tour&id=' + tour.id
                                        },
                                        style: 'primary',
                                        color: '#E74C3C'
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '🔍 查機票',
                                            uri: 'https://www.skyscanner.com.tw/'
                                        },
                                        style: 'secondary',
                                        margin: 'sm'
                                    }
                                ],
                                paddingAll: 'md'
                            }
                        }
                    };
                    
                    await client.pushMessage({
                        to: user.lineUserId,
                        messages: [flexMessage]
                    });
                    
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
        
        return {
            type: 'text',
            text: '🤖 AI 正在為您規劃行程...\n\n⏳ 請稍候約 10 秒\n（ChatGPT + Gemini 雙引擎生成中）'
        };
    }

    // ============================================
    // 我的行程（含收藏的出國行程）
    // ============================================
    if (matchKeywords(lowerText, ['我的行程', '收藏行程', '行程收藏'])) {
        const tourPlans = await tourPlanService.getUserTourPlans(user.id);
        
        if (tourPlans.length === 0) {
            return {
                type: 'text',
                text: '📋 您還沒有收藏任何行程\n\n輸入「日本5天自由行」讓 AI 幫您規劃，看到喜歡的就按「❤️ 收藏這個」！'
            };
        }
        
        const planList = tourPlans.slice(0, 5).map(function(p, i) {
            return (i + 1) + '. 🌍 ' + p.name + '\n   ' + p.country + ' ' + p.days + '天 | ' + p.source;
        }).join('\n\n');
        
        return {
            type: 'text',
            text: '📋 我的收藏行程\n\n' + planList + '\n\n💡 輸入「日本5天」繼續規劃新行程'
        };
    }

    // ============================================
    // 今日推薦相關
    // ============================================
    if (matchKeywords(lowerText, ['今日推薦', '今天推薦', '推薦', '今天做什麼', '今天去哪', '推薦活動'])) {
        const recommendations = await recommendationService.getDailyRecommendations(user);
        return flexMessageBuilder.buildDailyRecommendations(recommendations, user);
    }

    // ============================================
    // 天氣查詢（支援全球城市）
    // ============================================
    if (matchKeywords(lowerText, ['天氣', '氣象', '會下雨', '溫度'])) {
        const weatherService = require('../services/weatherService');
        const supportedCities = weatherService.getSupportedCities();
        let targetCity = null;
        for (var j = 0; j < supportedCities.length; j++) {
            if (text.includes(supportedCities[j])) {
                targetCity = supportedCities[j];
                break;
            }
        }
        if (!targetCity) {
            targetCity = user.city || '高雄市';
        }
        const weather = await weatherService.getCompleteWeatherInfo(targetCity);
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
            text: '感謝您的意見！\n\n📧 如有任何問題或建議，歡迎直接留言，我們會盡快回覆您。'
        };
    }

    // ============================================
    // 打招呼
    // ============================================
    if (matchKeywords(lowerText, ['你好', '哈囉', 'hi', 'hello', '嗨', '早安', '午安', '晚安'])) {
        const greeting = getTimeBasedGreeting();
        return {
            type: 'text',
            text: greeting + '，' + (user.displayName || '您好') + '！\n\n今天想做什麼呢？\n\n💡 輸入「今日推薦」查看精選活動\n🔍 輸入「找活動」探索更多\n🌍 輸入「日本5天自由行」AI幫你規劃行程\n📋 輸入「我的行程」查看收藏'
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
    // 預設回應
    // ============================================
    return await handleUnknownMessage(text, user);
}

/**
 * 處理無法識別的訊息
 */
async function handleUnknownMessage(text, user) {
    return {
        type: 'text',
        text: '抱歉，我不太理解「' + text + '」的意思 🤔\n\n您可以試試：\n📍 今日推薦 - 查看精選活動\n🌍 日本5天 - AI規劃出國行程\n📋 我的行程 - 查看收藏\n❓ 幫助 - 查看功能說明'
    };
}

/**
 * 關鍵字匹配工具
 */
function matchKeywords(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
        if (text.includes(keywords[i])) {
            return true;
        }
    }
    return false;
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
    
    logger.info('Postback from ' + userId + ': ' + data);

    try {
        const user = await userService.getOrCreateUser(userId, client);
        await userService.updateLastActive(user.id);

        const params = new URLSearchParams(data);
        const action = params.get('action');

        let response;

        switch (action) {
            // ============================================
            // 收藏行程
            // ============================================
            case 'save_tour':
                const tourId = params.get('id');
                try {
                    const saved = await tourPlanService.saveTourPlan(user.id, user.lineUserId, tourId);
                    if (saved) {
                        response = { type: 'text', text: '❤️ 已收藏此行程！\n\n輸入「我的行程」可隨時查看' };
                    } else {
                        response = { type: 'text', text: '⚠️ 行程已過期，請重新生成\n\n輸入「日本5天」重新規劃' };
                    }
                } catch (err) {
                    logger.error('Save tour error:', err);
                    response = { type: 'text', text: '收藏失敗，請稍後再試 🙏' };
                }
                break;

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
                response = { type: 'text', text: '好的，已移除此推薦 👌' };
                break;

            case 'more_recommendations':
                const moreRecs = await recommendationService.getMoreRecommendations(user, 5);
                response = flexMessageBuilder.buildMoreRecommendations(moreRecs);
                break;

            case 'explore_category':
                const category = params.get('category');
                const activities = await recommendationService.getActivitiesByCategory(category, user);
                response = flexMessageBuilder.buildCategoryActivities(activities, category);
                break;

            case 'search_nearby':
                response = flexMessageBuilder.buildRequestLocation();
                break;

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

            case 'my_schedule':
                const schedule = await userService.getUserPlannedActivities(user.id);
                response = flexMessageBuilder.buildMySchedule(schedule);
                break;

            case 'settings':
                response = flexMessageBuilder.buildSettingsMenu(user);
                break;

            case 'edit_profile':
                await conversationService.startFlow(user.id, 'edit_profile');
                response = flexMessageBuilder.buildEditProfileStart(user);
                break;

            case 'health_menu':
                response = flexMessageBuilder.buildHealthMenu(user);
                break;

            case 'family_menu':
                response = flexMessageBuilder.buildFamilyMenu(user);
                break;

            case 'community_list':
                response = flexMessageBuilder.buildCommunityList();
                break;

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

            case 'help':
                response = flexMessageBuilder.buildHelpMenu();
                break;

            case 'cancel_flow':
                await conversationService.cancelFlow(user.id);
                response = { type: 'text', text: '已取消 ❌' };
                break;

            default:
                logger.warn('Unknown postback action: ' + action);
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
    
    logger.info('Location from ' + userId + ': ' + latitude + ', ' + longitude);

    try {
        const user = await userService.getOrCreateUser(userId, client);

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
    const responses = ['😊', '收到您的貼圖了～有什麼需要幫忙的嗎？', '👍'];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: randomResponse }]
    });
}

async function handleImageMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '收到您的照片了！📸' }]
    });
}

async function handleVideoMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '收到您的影片了！🎬' }]
    });
}

async function handleAudioMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '收到您的語音訊息了！🎤' }]
    });
}

async function handleFileMessage(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '收到您的檔案了！📁' }]
    });
}

async function handleJoin(event, client) {
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: '大家好！我是退休福音小幫手 🌅\n\n📍 輸入「今日推薦」看看今天適合去哪\n🌍 輸入「日本5天」AI幫你規劃行程'
        }]
    });
}

async function handleLeave(event, client) {
    logger.info('Bot left group/room');
}

async function handleMemberJoined(event, client) {
    logger.info('Members joined');
}

async function handleMemberLeft(event, client) {
    logger.info('Members left');
}

async function handleBeacon(event, client) {
    logger.info('Beacon event');
}

async function handleAccountLink(event, client) {
    logger.info('Account link event');
}

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