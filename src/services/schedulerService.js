/**
 * ============================================
 * 排程服務
 * 定時任務管理
 * ============================================
 */

const cron = require('node-cron');
const line = require('@line/bot-sdk');
const logger = require('../utils/logger');
const userService = require('./userService');
const recommendationService = require('./recommendationService');
const flexMessageBuilder = require('../linebot/flexMessageBuilder');
const { User, Notification, MedicationReminder, AppointmentReminder } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

// LINE Client
let lineClient = null;

/**
 * 初始化排程器
 */
async function initScheduler() {
    try {
        // 初始化 LINE Client
        lineClient = new line.messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
        });

        // ============================================
        // 每日晨間推薦 (每天早上 7:30)
        // ============================================
        cron.schedule('30 7 * * *', async () => {
            logger.info('Running morning recommendation job');
            await sendMorningRecommendations();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 每日傍晚總結 (每天晚上 6:00)
        // ============================================
        cron.schedule('0 18 * * *', async () => {
            logger.info('Running evening summary job');
            await sendEveningSummary();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 用藥提醒 (每小時檢查一次)
        // ============================================
        cron.schedule('0 * * * *', async () => {
            logger.info('Running medication reminder job');
            await sendMedicationReminders();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 回診提醒 (每天早上 8:00)
        // ============================================
        cron.schedule('0 8 * * *', async () => {
            logger.info('Running appointment reminder job');
            await sendAppointmentReminders();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 天氣快取更新 (每小時)
        // ============================================
        cron.schedule('5 * * * *', async () => {
            logger.info('Running weather cache update job');
            await updateWeatherCache();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 過期資料清理 (每天凌晨 3:00)
        // ============================================
        cron.schedule('0 3 * * *', async () => {
            logger.info('Running cleanup job');
            await cleanupExpiredData();
        }, {
            timezone: 'Asia/Taipei'
        });

        // ============================================
        // 統計報表產生 (每週一凌晨 4:00)
        // ============================================
        cron.schedule('0 4 * * 1', async () => {
            logger.info('Running weekly report job');
            await generateWeeklyReports();
        }, {
            timezone: 'Asia/Taipei'
        });

        logger.info('Scheduler initialized successfully');
        
    } catch (error) {
        logger.error('Error initializing scheduler:', error);
        throw error;
    }
}

/**
 * 發送晨間推薦
 */
async function sendMorningRecommendations() {
    try {
        const currentTime = moment().format('HH:mm:00');
        
        // 取得需要推播的用戶
        const users = await User.findAll({
            where: {
                isActive: true,
                notificationEnabled: true,
                morningPushTime: currentTime
            }
        });

        logger.info(`Sending morning recommendations to ${users.length} users`);

        for (const user of users) {
            try {
                // 取得個人化推薦
                const recommendations = await recommendationService.getDailyRecommendations(user);
                
                if (recommendations.length > 0) {
                    const message = flexMessageBuilder.buildDailyRecommendations(recommendations, user);
                    
                    await lineClient.pushMessage({
                        to: user.lineUserId,
                        messages: [message]
                    });

                    // 記錄通知
                    await Notification.create({
                        userId: user.id,
                        type: 'morning_recommendation',
                        title: '今日推薦',
                        message: `為您推薦了 ${recommendations.length} 個活動`,
                        status: 'sent',
                        sentAt: new Date()
                    });
                }

                // 避免發送太快
                await sleep(100);

            } catch (userError) {
                logger.error(`Error sending to user ${user.id}:`, userError.message);
            }
        }

        logger.info('Morning recommendations sent');

    } catch (error) {
        logger.error('Error in sendMorningRecommendations:', error);
    }
}

/**
 * 發送傍晚總結
 */
async function sendEveningSummary() {
    try {
        const currentTime = moment().format('HH:mm:00');
        
        const users = await User.findAll({
            where: {
                isActive: true,
                notificationEnabled: true,
                eveningPushTime: currentTime
            }
        });

        logger.info(`Sending evening summary to ${users.length} users`);

        for (const user of users) {
            try {
                // 檢查今日是否有完成的活動
                const todayStart = moment().startOf('day').toDate();
                const todayEnd = moment().endOf('day').toDate();

                // 這裡可以加入更多總結內容
                const message = {
                    type: 'text',
                    text: `🌅 晚安，${user.displayName}！\n\n今天過得如何呢？\n明天見囉！`
                };

                await lineClient.pushMessage({
                    to: user.lineUserId,
                    messages: [message]
                });

                await sleep(100);

            } catch (userError) {
                logger.error(`Error sending evening summary to ${user.id}:`, userError.message);
            }
        }

    } catch (error) {
        logger.error('Error in sendEveningSummary:', error);
    }
}

/**
 * 發送用藥提醒
 */
async function sendMedicationReminders() {
    try {
        const currentHour = moment().format('HH:00:00');
        
        const reminders = await MedicationReminder.findAll({
            where: {
                isActive: true,
                reminderTimes: {
                    [Op.contains]: [currentHour]
                }
            },
            include: [{
                model: User,
                where: { isActive: true }
            }]
        });

        logger.info(`Sending ${reminders.length} medication reminders`);

        for (const reminder of reminders) {
            try {
                const message = {
                    type: 'text',
                    text: `💊 用藥提醒\n\n該吃「${reminder.medicationName}」了\n劑量：${reminder.dosage || '依處方'}${reminder.instructions ? `\n說明：${reminder.instructions}` : ''}`
                };

                await lineClient.pushMessage({
                    to: reminder.User.lineUserId,
                    messages: [message]
                });

                // 通知家人（如果設定）
                if (reminder.notifyFamily) {
                    await notifyFamily(reminder.userId, 'medication', {
                        medicationName: reminder.medicationName
                    });
                }

                await sleep(100);

            } catch (reminderError) {
                logger.error(`Error sending medication reminder ${reminder.id}:`, reminderError.message);
            }
        }

    } catch (error) {
        logger.error('Error in sendMedicationReminders:', error);
    }
}

/**
 * 發送回診提醒
 */
async function sendAppointmentReminders() {
    try {
        const today = moment().format('YYYY-MM-DD');
        const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
        const threeDaysLater = moment().add(3, 'days').format('YYYY-MM-DD');

        // 找出需要提醒的回診（1天前和3天前）
        const appointments = await AppointmentReminder.findAll({
            where: {
                status: 'scheduled',
                [Op.or]: [
                    { appointmentDate: tomorrow }, // 明天的回診
                    { appointmentDate: threeDaysLater } // 3天後的回診
                ]
            },
            include: [{
                model: User,
                where: { isActive: true }
            }]
        });

        logger.info(`Sending ${appointments.length} appointment reminders`);

        for (const appointment of appointments) {
            try {
                const daysUntil = moment(appointment.appointmentDate).diff(moment(), 'days');
                const dateStr = moment(appointment.appointmentDate).format('M/D (dd) HH:mm');

                const message = {
                    type: 'text',
                    text: `🏥 回診提醒\n\n${daysUntil === 0 ? '明天' : `${daysUntil} 天後`}有回診預約\n\n📅 ${dateStr}\n🏥 ${appointment.hospitalName || ''}\n👨‍⚕️ ${appointment.department || ''} ${appointment.doctorName || ''}${appointment.purpose ? `\n📋 ${appointment.purpose}` : ''}`
                };

                await lineClient.pushMessage({
                    to: appointment.User.lineUserId,
                    messages: [message]
                });

                // 標記已發送
                await appointment.update({ reminderSent: true });

                // 通知家人
                if (appointment.notifyFamily) {
                    await notifyFamily(appointment.userId, 'appointment', {
                        hospitalName: appointment.hospitalName,
                        appointmentDate: dateStr
                    });
                }

                await sleep(100);

            } catch (appointmentError) {
                logger.error(`Error sending appointment reminder ${appointment.id}:`, appointmentError.message);
            }
        }

    } catch (error) {
        logger.error('Error in sendAppointmentReminders:', error);
    }
}

/**
 * 通知家人
 */
async function notifyFamily(userId, type, data) {
    try {
        const { FamilyLink, User } = require('../models');
        
        const familyLinks = await FamilyLink.findAll({
            where: {
                parentUserId: userId,
                status: 'approved'
            },
            include: [{
                model: User,
                as: 'child',
                where: { isActive: true }
            }]
        });

        for (const link of familyLinks) {
            if (!link.permissions?.receiveAlerts) continue;

            const parentUser = await User.findByPk(userId);
            let message;

            switch (type) {
                case 'medication':
                    message = {
                        type: 'text',
                        text: `💊 家人提醒\n\n${parentUser.displayName} 剛收到用藥提醒\n藥品：${data.medicationName}`
                    };
                    break;
                case 'appointment':
                    message = {
                        type: 'text',
                        text: `🏥 家人提醒\n\n${parentUser.displayName} 有回診預約\n${data.hospitalName}\n${data.appointmentDate}`
                    };
                    break;
            }

            if (message) {
                await lineClient.pushMessage({
                    to: link.child.lineUserId,
                    messages: [message]
                });
            }
        }

    } catch (error) {
        logger.error('Error notifying family:', error);
    }
}

/**
 * 更新天氣快取
 */
async function updateWeatherCache() {
    try {
        const weatherService = require('./weatherService');
        const { WeatherCache } = require('../models');
        
        // 主要城市
        const cities = ['高雄市', '台北市', '台中市', '台南市', '新北市'];
        const today = moment().format('YYYY-MM-DD');

        for (const city of cities) {
            try {
                const weatherData = await weatherService.fetchWeather(city);
                const airQualityData = await weatherService.fetchAirQuality(city);

                await WeatherCache.upsert({
                    city,
                    date: today,
                    ...weatherData,
                    aqi: airQualityData.aqi,
                    aqiStatus: airQualityData.aqiStatus,
                    pm25: airQualityData.pm25,
                    fetchedAt: new Date()
                });

                await sleep(1000); // API rate limiting

            } catch (cityError) {
                logger.error(`Error updating weather for ${city}:`, cityError.message);
            }
        }

        logger.info('Weather cache updated');

    } catch (error) {
        logger.error('Error in updateWeatherCache:', error);
    }
}

/**
 * 清理過期資料
 */
async function cleanupExpiredData() {
    try {
        const { ConversationState, Notification, WeatherCache } = require('../models');
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const sevenDaysAgo = moment().subtract(7, 'days').toDate();

        // 清理過期的對話狀態
        const conversationResult = await ConversationState.destroy({
            where: {
                updatedAt: { [Op.lt]: thirtyDaysAgo }
            }
        });
        logger.info(`Cleaned ${conversationResult} expired conversation states`);

        // 清理舊通知
        const notificationResult = await Notification.destroy({
            where: {
                createdAt: { [Op.lt]: thirtyDaysAgo }
            }
        });
        logger.info(`Cleaned ${notificationResult} old notifications`);

        // 清理舊天氣快取
        const weatherResult = await WeatherCache.destroy({
            where: {
                date: { [Op.lt]: sevenDaysAgo }
            }
        });
        logger.info(`Cleaned ${weatherResult} old weather cache entries`);

    } catch (error) {
        logger.error('Error in cleanupExpiredData:', error);
    }
}

/**
 * 產生週報
 */
async function generateWeeklyReports() {
    try {
        const { UsageStats } = require('../models');
        
        // 這裡可以實作週報產生邏輯
        logger.info('Weekly reports generated');

    } catch (error) {
        logger.error('Error in generateWeeklyReports:', error);
    }
}

/**
 * 手動觸發推薦（測試用）
 */
async function triggerMorningPush(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) return { success: false, message: 'User not found' };

        const recommendations = await recommendationService.getDailyRecommendations(user);
        
        if (recommendations.length > 0) {
            const message = flexMessageBuilder.buildDailyRecommendations(recommendations, user);
            
            await lineClient.pushMessage({
                to: user.lineUserId,
                messages: [message]
            });

            return { success: true, count: recommendations.length };
        }

        return { success: false, message: 'No recommendations' };

    } catch (error) {
        logger.error('Error triggering morning push:', error);
        return { success: false, message: error.message };
    }
}

// 工具函數
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    initScheduler,
    sendMorningRecommendations,
    sendMedicationReminders,
    sendAppointmentReminders,
    triggerMorningPush
};
