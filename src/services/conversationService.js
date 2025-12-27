/**
 * ============================================
 * 對話服務
 * 管理多輪對話流程
 * ============================================
 */

const { ConversationState, User, Group, Activity } = require('../models');
const userService = require('./userService');
const groupService = require('./groupService');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

// 對話流程定義
const FLOWS = {
    onboarding: {
        steps: ['location', 'mobility', 'interests', 'transport', 'complete'],
        timeout: 30 * 60 * 1000 // 30 分鐘
    },
    create_group: {
        steps: ['title', 'description', 'date', 'time', 'location', 'participants', 'cost', 'confirm'],
        timeout: 15 * 60 * 1000
    },
    edit_profile: {
        steps: ['select', 'input', 'confirm'],
        timeout: 10 * 60 * 1000
    },
    add_medication: {
        steps: ['name', 'dosage', 'times', 'confirm'],
        timeout: 10 * 60 * 1000
    },
    add_appointment: {
        steps: ['hospital', 'department', 'datetime', 'confirm'],
        timeout: 10 * 60 * 1000
    },
    search_activity: {
        steps: ['keyword', 'filter', 'results'],
        timeout: 5 * 60 * 1000
    }
};

/**
 * 開始對話流程
 */
async function startFlow(userId, flowName, initialData = {}) {
    try {
        const flow = FLOWS[flowName];
        if (!flow) {
            throw new Error(`Unknown flow: ${flowName}`);
        }

        const expiresAt = new Date(Date.now() + flow.timeout);

        await ConversationState.upsert({
            userId,
            currentFlow: flowName,
            currentStep: flow.steps[0],
            flowData: initialData,
            lastMessageAt: new Date(),
            expiresAt
        });

        logger.info(`Started flow ${flowName} for user ${userId}`);
        return true;

    } catch (error) {
        logger.error('Error starting flow:', error);
        return false;
    }
}

/**
 * 取消對話流程
 */
async function cancelFlow(userId) {
    try {
        await ConversationState.destroy({ where: { userId } });
        return true;
    } catch (error) {
        logger.error('Error cancelling flow:', error);
        return false;
    }
}

/**
 * 處理流程輸入
 */
async function handleFlowInput(event, client, user, state, input) {
    try {
        const { currentFlow, currentStep, flowData } = state;

        // 檢查是否過期
        if (state.expiresAt && new Date() > state.expiresAt) {
            await cancelFlow(user.id);
            return {
                type: 'text',
                text: '操作逾時，請重新開始 ⏰'
            };
        }

        // 根據流程類型處理
        switch (currentFlow) {
            case 'onboarding':
                return await handleOnboardingFlow(user, state, input);
            
            case 'create_group':
                return await handleCreateGroupFlow(user, state, input);
            
            case 'edit_profile':
                return await handleEditProfileFlow(user, state, input);
            
            case 'add_medication':
                return await handleAddMedicationFlow(user, state, input);
            
            case 'add_appointment':
                return await handleAddAppointmentFlow(user, state, input);
            
            case 'search_activity':
                return await handleSearchActivityFlow(user, state, input);
            
            default:
                await cancelFlow(user.id);
                return { type: 'text', text: '未知的操作流程' };
        }

    } catch (error) {
        logger.error('Error handling flow input:', error);
        await cancelFlow(user.id);
        return { type: 'text', text: '操作發生錯誤，請重新開始' };
    }
}

/**
 * Onboarding 流程處理
 */
async function handleOnboardingFlow(user, state, input) {
    const { currentStep, flowData } = state;
    const flexMessageBuilder = require('../linebot/flexMessageBuilder');

    switch (currentStep) {
        case 'location':
            // 等待 postback 處理，這裡處理直接輸入的情況
            if (input.includes('市') || input.includes('縣')) {
                await userService.updateUserCity(user.id, input);
                await advanceStep(user.id, 'mobility', { city: input });
                return flexMessageBuilder.buildOnboardingStep2(input);
            }
            return { type: 'text', text: '請從選單中選擇您的所在城市' };

        case 'mobility':
            const mobilityMap = {
                '輕度': 'low',
                '中度': 'medium',
                '充沛': 'high'
            };
            const mobility = Object.keys(mobilityMap).find(k => input.includes(k));
            if (mobility) {
                await userService.updateMobility(user.id, mobilityMap[mobility]);
                await advanceStep(user.id, 'interests', { ...flowData, mobility: mobilityMap[mobility] });
                return flexMessageBuilder.buildOnboardingStep3();
            }
            return { type: 'text', text: '請從選單中選擇您的行動能力' };

        case 'interests':
            // 解析興趣輸入
            const interestKeywords = {
                '自然': 'nature', '踏青': 'nature', '戶外': 'nature',
                '美食': 'food', '吃': 'food', '餐廳': 'food',
                '藝文': 'culture', '展覽': 'culture', '音樂': 'culture',
                '學習': 'learning', '課程': 'learning', '講座': 'learning',
                '宗教': 'religion', '廟': 'religion', '教會': 'religion',
                '養生': 'wellness', '溫泉': 'wellness', '按摩': 'wellness'
            };
            
            const interests = [];
            for (const [keyword, category] of Object.entries(interestKeywords)) {
                if (input.includes(keyword) && !interests.includes(category)) {
                    interests.push(category);
                }
            }

            if (interests.length > 0) {
                await userService.updateInterests(user.id, interests);
                await advanceStep(user.id, 'transport', { ...flowData, interests });
                return flexMessageBuilder.buildOnboardingStep4();
            }
            return { type: 'text', text: '請從選單中選擇您的興趣，或直接輸入關鍵字' };

        case 'transport':
            const transportMap = {
                '開車': 'car', '自己開': 'car',
                '機車': 'motorcycle', '摩托車': 'motorcycle',
                '公車': 'public_transit', '捷運': 'public_transit', '大眾': 'public_transit',
                '走路': 'walk', '步行': 'walk',
                '接送': 'need_ride'
            };
            
            const transports = [];
            for (const [keyword, mode] of Object.entries(transportMap)) {
                if (input.includes(keyword) && !transports.includes(mode)) {
                    transports.push(mode);
                }
            }

            if (transports.length > 0) {
                await userService.updateTransport(user.id, transports);
                await userService.completeOnboarding(user.id);
                await cancelFlow(user.id);
                return flexMessageBuilder.buildOnboardingComplete();
            }
            return { type: 'text', text: '請從選單中選擇您的交通方式' };

        default:
            await cancelFlow(user.id);
            return { type: 'text', text: '設定完成！' };
    }
}

/**
 * 建立揪團流程處理
 */
async function handleCreateGroupFlow(user, state, input) {
    const { currentStep, flowData } = state;

    switch (currentStep) {
        case 'title':
            if (input.length < 2) {
                return { type: 'text', text: '標題太短了，請輸入至少 2 個字' };
            }
            if (input.length > 50) {
                return { type: 'text', text: '標題太長了，請控制在 50 字以內' };
            }
            await advanceStep(user.id, 'description', { title: input });
            return { type: 'text', text: `好的，揪團標題：「${input}」\n\n請輸入活動說明（可以跳過，輸入「跳過」）` };

        case 'description':
            const description = input === '跳過' ? '' : input;
            await advanceStep(user.id, 'date', { ...flowData, description });
            return {
                type: 'flex',
                altText: '請選擇活動日期',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📅 請選擇活動日期', weight: 'bold' }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: {
                                type: 'datetimepicker',
                                label: '選擇日期',
                                data: 'action=date_selected&type=group',
                                mode: 'date',
                                min: moment().format('YYYY-MM-DD'),
                                max: moment().add(3, 'months').format('YYYY-MM-DD')
                            },
                            style: 'primary'
                        }]
                    }
                }
            };

        case 'date':
            // 日期由 postback 處理
            return { type: 'text', text: '請點擊上方按鈕選擇日期' };

        case 'time':
            // 時間由 postback 處理
            return { type: 'text', text: '請點擊上方按鈕選擇時間' };

        case 'location':
            if (input.length < 2) {
                return { type: 'text', text: '請輸入集合地點（至少 2 個字）' };
            }
            await advanceStep(user.id, 'participants', { ...flowData, meetingPoint: input });
            return { type: 'text', text: `集合地點：${input}\n\n請輸入人數上限（2-50）` };

        case 'participants':
            const maxParticipants = parseInt(input);
            if (isNaN(maxParticipants) || maxParticipants < 2 || maxParticipants > 50) {
                return { type: 'text', text: '請輸入 2-50 之間的數字' };
            }
            await advanceStep(user.id, 'cost', { ...flowData, maxParticipants });
            return { type: 'text', text: `人數上限：${maxParticipants} 人\n\n每人費用是多少？（免費請輸入 0）` };

        case 'cost':
            const cost = parseInt(input);
            if (isNaN(cost) || cost < 0) {
                return { type: 'text', text: '請輸入有效的金額（0 以上的數字）' };
            }
            await advanceStep(user.id, 'confirm', { ...flowData, costPerPerson: cost });
            
            // 顯示確認訊息
            const data = (await ConversationState.findOne({ where: { userId: user.id } })).flowData;
            return buildGroupConfirmMessage(data);

        case 'confirm':
            if (input === '確認' || input.toLowerCase() === 'yes' || input === '好') {
                try {
                    const finalData = (await ConversationState.findOne({ where: { userId: user.id } })).flowData;
                    const group = await groupService.createGroup(user.id, finalData);
                    await cancelFlow(user.id);
                    return { 
                        type: 'text', 
                        text: `🎉 揪團建立成功！\n\n「${finalData.title}」\n\n分享給朋友一起來吧！` 
                    };
                } catch (error) {
                    return { type: 'text', text: '建立失敗，請稍後再試' };
                }
            }
            if (input === '取消' || input.toLowerCase() === 'no') {
                await cancelFlow(user.id);
                return { type: 'text', text: '已取消揪團建立' };
            }
            return { type: 'text', text: '請輸入「確認」建立揪團，或「取消」重新來過' };

        default:
            await cancelFlow(user.id);
            return { type: 'text', text: '操作已結束' };
    }
}

/**
 * 新增用藥流程處理
 */
async function handleAddMedicationFlow(user, state, input) {
    const { currentStep, flowData } = state;

    switch (currentStep) {
        case 'name':
            if (input.length < 1) {
                return { type: 'text', text: '請輸入藥品名稱' };
            }
            await advanceStep(user.id, 'dosage', { medicationName: input });
            return { type: 'text', text: `藥品：${input}\n\n請輸入劑量（例如：一顆、半顆、5ml）` };

        case 'dosage':
            await advanceStep(user.id, 'times', { ...flowData, dosage: input });
            return { type: 'text', text: `劑量：${input}\n\n請輸入提醒時間（例如：08:00, 12:00, 20:00）\n可以輸入多個，用逗號分隔` };

        case 'times':
            // 解析時間
            const timePattern = /\d{1,2}:\d{2}/g;
            const times = input.match(timePattern);
            
            if (!times || times.length === 0) {
                return { type: 'text', text: '請輸入有效的時間格式（例如：08:00）' };
            }

            const reminderTimes = times.map(t => {
                const [h, m] = t.split(':');
                return `${h.padStart(2, '0')}:${m}:00`;
            });

            await advanceStep(user.id, 'confirm', { ...flowData, reminderTimes });
            
            const data = (await ConversationState.findOne({ where: { userId: user.id } })).flowData;
            return {
                type: 'text',
                text: `請確認用藥提醒：\n\n💊 ${data.medicationName}\n📋 ${data.dosage}\n⏰ ${reminderTimes.join(', ')}\n\n輸入「確認」儲存，或「取消」重新設定`
            };

        case 'confirm':
            if (input === '確認' || input.toLowerCase() === 'yes') {
                const finalData = (await ConversationState.findOne({ where: { userId: user.id } })).flowData;
                await userService.addMedication(user.id, finalData);
                await cancelFlow(user.id);
                return { type: 'text', text: '✅ 用藥提醒已設定！\n\n我會在指定時間提醒您服藥' };
            }
            if (input === '取消') {
                await cancelFlow(user.id);
                return { type: 'text', text: '已取消' };
            }
            return { type: 'text', text: '請輸入「確認」或「取消」' };

        default:
            await cancelFlow(user.id);
            return { type: 'text', text: '操作已結束' };
    }
}

/**
 * 新增回診流程處理
 */
async function handleAddAppointmentFlow(user, state, input) {
    const { currentStep, flowData } = state;

    switch (currentStep) {
        case 'hospital':
            await advanceStep(user.id, 'department', { hospitalName: input });
            return { type: 'text', text: `醫院：${input}\n\n請輸入科別（例如：心臟內科、骨科）` };

        case 'department':
            await advanceStep(user.id, 'datetime', { ...flowData, department: input });
            return {
                type: 'flex',
                altText: '請選擇回診日期時間',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📅 請選擇回診日期時間', weight: 'bold' }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: {
                                type: 'datetimepicker',
                                label: '選擇日期時間',
                                data: 'action=datetime_selected&type=appointment',
                                mode: 'datetime'
                            },
                            style: 'primary'
                        }]
                    }
                }
            };

        case 'datetime':
            return { type: 'text', text: '請點擊上方按鈕選擇日期時間' };

        case 'confirm':
            if (input === '確認') {
                const finalData = (await ConversationState.findOne({ where: { userId: user.id } })).flowData;
                await userService.addAppointment(user.id, finalData);
                await cancelFlow(user.id);
                return { type: 'text', text: '✅ 回診提醒已設定！\n\n我會在回診前 1 天和 3 天提醒您' };
            }
            if (input === '取消') {
                await cancelFlow(user.id);
                return { type: 'text', text: '已取消' };
            }
            return { type: 'text', text: '請輸入「確認」或「取消」' };

        default:
            await cancelFlow(user.id);
            return { type: 'text', text: '操作已結束' };
    }
}

/**
 * 編輯個人資料流程處理
 */
async function handleEditProfileFlow(user, state, input) {
    // 簡化實作
    await cancelFlow(user.id);
    return { type: 'text', text: '個人資料編輯功能開發中...' };
}

/**
 * 搜尋活動流程處理
 */
async function handleSearchActivityFlow(user, state, input) {
    // 簡化實作
    await cancelFlow(user.id);
    return { type: 'text', text: '搜尋功能開發中...' };
}

/**
 * 處理日期選擇
 */
async function handleDateSelection(userId, date) {
    const state = await ConversationState.findOne({ where: { userId } });
    if (!state) return null;

    const { currentFlow, flowData } = state;

    if (currentFlow === 'create_group') {
        await advanceStep(userId, 'time', { ...flowData, eventDate: date });
        return {
            type: 'flex',
            altText: '請選擇活動時間',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: `📅 日期：${date}`, size: 'sm' },
                        { type: 'text', text: '⏰ 請選擇集合時間', weight: 'bold', margin: 'md' }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: {
                            type: 'datetimepicker',
                            label: '選擇時間',
                            data: 'action=time_selected&type=group',
                            mode: 'time'
                        },
                        style: 'primary'
                    }]
                }
            }
        };
    }

    return null;
}

/**
 * 處理時間選擇
 */
async function handleTimeSelection(userId, time) {
    const state = await ConversationState.findOne({ where: { userId } });
    if (!state) return null;

    const { currentFlow, flowData } = state;

    if (currentFlow === 'create_group') {
        await advanceStep(userId, 'location', { ...flowData, eventTime: time });
        return { type: 'text', text: `集合時間：${time}\n\n請輸入集合地點` };
    }

    return null;
}

/**
 * 處理日期時間選擇
 */
async function handleDatetimeSelection(userId, datetime) {
    const state = await ConversationState.findOne({ where: { userId } });
    if (!state) return null;

    const { currentFlow, flowData } = state;

    if (currentFlow === 'add_appointment') {
        await advanceStep(userId, 'confirm', { ...flowData, appointmentDate: datetime });
        
        const data = (await ConversationState.findOne({ where: { userId } })).flowData;
        const dateStr = moment(datetime).format('YYYY/M/D HH:mm');
        
        return {
            type: 'text',
            text: `請確認回診預約：\n\n🏥 ${data.hospitalName}\n👨‍⚕️ ${data.department}\n📅 ${dateStr}\n\n輸入「確認」儲存，或「取消」重新設定`
        };
    }

    return null;
}

/**
 * 處理位置輸入
 */
async function handleLocationInput(user, state, location) {
    // 可用於需要位置的流程
    return null;
}

/**
 * 處理圖片輸入
 */
async function handleImageInput(user, state, message) {
    // 可用於需要圖片的流程（如活動照片上傳）
    return null;
}

/**
 * 推進步驟
 */
async function advanceStep(userId, nextStep, newData = {}) {
    await ConversationState.update(
        {
            currentStep: nextStep,
            flowData: newData,
            lastMessageAt: new Date()
        },
        { where: { userId } }
    );
}

/**
 * 建立揪團確認訊息
 */
function buildGroupConfirmMessage(data) {
    const dateStr = moment(data.eventDate).format('M/D (dd)');
    const timeStr = data.eventTime || '待定';
    
    return {
        type: 'text',
        text: `📋 請確認揪團資訊：\n\n📌 ${data.title}\n📝 ${data.description || '(無說明)'}\n📅 ${dateStr} ${timeStr}\n📍 ${data.meetingPoint}\n👥 最多 ${data.maxParticipants} 人\n💰 ${data.costPerPerson === 0 ? '免費' : `$${data.costPerPerson}/人`}\n\n輸入「確認」建立揪團\n輸入「取消」重新來過`
    };
}

module.exports = {
    startFlow,
    cancelFlow,
    handleFlowInput,
    handleDateSelection,
    handleTimeSelection,
    handleDatetimeSelection,
    handleLocationInput,
    handleImageInput
};
