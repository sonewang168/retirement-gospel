/**
 * 排程服務（多種推播類型）
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const { User, Activity, HealthReminder, UserWishlist } = require('../models');
const weatherService = require('./weatherService');

class SchedulerService {
    constructor() {
        this.lineClient = null;
    }

    initScheduler(lineClient) {
        this.lineClient = lineClient;
        this.startAllJobs();
        logger.info('✅ 排程服務啟動完成');
    }

    startAllJobs() {
        // 每分鐘檢查個人化推播時間
        cron.schedule('* * * * *', () => {
            this.checkPersonalizedPush();
        });

        // 每小時檢查天氣警報
        cron.schedule('0 * * * *', () => {
            this.checkWeatherAlerts();
        });

        // 每天早上8點檢查回診提醒
        cron.schedule('0 8 * * *', () => {
            this.checkAppointmentReminders();
        });

        // 每天檢查用藥提醒（每小時）
        cron.schedule('0 * * * *', () => {
            this.checkMedicationReminders();
        });

        // 每週一早上9點發送週報
        cron.schedule('0 9 * * 1', () => {
            this.sendWeeklyReport();
        });

        // 每天檢查生日祝福
        cron.schedule('0 9 * * *', () => {
            this.checkBirthdayGreetings();
        });

        // 節日問候（每天早上8點檢查）
        cron.schedule('0 8 * * *', () => {
            this.checkHolidayGreetings();
        });

        logger.info('所有排程任務已啟動');
    }

    getTaiwanTime() {
        var now = new Date();
        var taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        return taiwanTime;
    }

    getGreeting() {
        var taiwanTime = this.getTaiwanTime();
        var hour = taiwanTime.getUTCHours();
        
        if (hour >= 5 && hour < 12) {
            return '🌅 早安';
        } else if (hour >= 12 && hour < 18) {
            return '☀️ 午安';
        } else {
            return '🌙 晚安';
        }
    }

    // ========== 早安推播 ==========
    async checkPersonalizedPush() {
        try {
            var taiwanTime = this.getTaiwanTime();
            var currentHour = taiwanTime.getUTCHours();
            var currentMinute = taiwanTime.getUTCMinutes();
            var currentTimeStr = String(currentHour).padStart(2, '0') + ':' + String(currentMinute).padStart(2, '0');

            var users = await User.findAll({
                where: {
                    notificationEnabled: true,
                    morningPushTime: currentTimeStr
                }
            });

            for (var user of users) {
                await this.sendMorningPush(user);
            }
        } catch (error) {
            logger.error('檢查個人化推播錯誤:', error);
        }
    }

    async sendMorningPush(user) {
        if (!this.lineClient) return;

        try {
            var greeting = this.getGreeting();
            var displayName = user.displayName || '朋友';
            var city = user.city || '高雄市';

            var weather = await weatherService.getWeather(city);
            var weatherText = '';
            var advice = '';

            if (weather && !weather.error) {
                weatherText = '\n\n🌤️ ' + city + '天氣：' + weather.description;
                weatherText += '\n🌡️ ' + weather.temp + '°C（體感 ' + weather.feelsLike + '°C）';
                weatherText += '\n💧 濕度 ' + weather.humidity + '%';

                if (weather.advice && weather.advice.length > 0) {
                    advice = '\n\n💡 ' + weather.advice[0];
                }
            }

            var activities = await Activity.findAll({
                where: { isActive: true },
                order: [['rating', 'DESC']],
                limit: 3
            });

            var recommendText = '';
            if (activities.length > 0) {
                var randomAct = activities[Math.floor(Math.random() * activities.length)];
                recommendText = '\n\n🎯 今日推薦：' + randomAct.name;
            }

            // 達人進度
            var expertText = '';
            if (user.visitedCount > 0) {
                expertText = '\n\n🏆 ' + user.expertTitle + '（' + user.visitedCount + '個景點）';
            }

            var message = greeting + '，' + displayName + '！' + weatherText + advice + recommendText + expertText;
            message += '\n\n輸入「今日推薦」看更多精彩活動 😊';

            await this.lineClient.pushMessage(user.lineUserId, {
                type: 'text',
                text: message
            });

            logger.info('早安推播已發送給: ' + displayName);
        } catch (error) {
            logger.error('發送早安推播錯誤:', error);
        }
    }

    // ========== 天氣警報 ==========
    async checkWeatherAlerts() {
        try {
            var users = await User.findAll({
                where: { notificationEnabled: true }
            });

            for (var user of users) {
                await this.checkUserWeatherAlert(user);
            }
        } catch (error) {
            logger.error('天氣警報檢查錯誤:', error);
        }
    }

    async checkUserWeatherAlert(user) {
        if (!this.lineClient) return;

        try {
            var city = user.city || '高雄市';
            var weather = await weatherService.getWeather(city);

            if (!weather || weather.error) return;

            var alerts = [];

            if (weather.temp >= 35) {
                alerts.push('🔥 高溫警報：今日氣溫高達 ' + weather.temp + '°C，請注意防曬補水！');
            }

            if (weather.temp <= 10) {
                alerts.push('🥶 低溫警報：今日氣溫僅 ' + weather.temp + '°C，請注意保暖！');
            }

            if (weather.description && (weather.description.includes('雨') || weather.description.includes('Rain'))) {
                alerts.push('🌧️ 降雨提醒：今日有降雨機會，出門記得帶傘！');
            }

            if (weather.humidity >= 85) {
                alerts.push('💧 高濕度提醒：濕度 ' + weather.humidity + '%，注意除濕！');
            }

            if (alerts.length > 0) {
                var message = '⚠️ 天氣提醒\n\n' + alerts.join('\n\n');
                await this.lineClient.pushMessage(user.lineUserId, {
                    type: 'text',
                    text: message
                });
                logger.info('天氣警報已發送給: ' + (user.displayName || user.lineUserId));
            }
        } catch (error) {
            logger.error('用戶天氣警報錯誤:', error);
        }
    }

    // ========== 回診提醒 ==========
    async checkAppointmentReminders() {
        if (!this.lineClient) return;

        try {
            var taiwanTime = this.getTaiwanTime();
            var today = taiwanTime.toISOString().split('T')[0];
            var tomorrow = new Date(taiwanTime.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            var reminders = await HealthReminder.findAll({
                where: {
                    type: 'appointment',
                    isActive: true
                }
            });

            for (var reminder of reminders) {
                var appointmentDate = reminder.appointmentDate;
                
                if (appointmentDate === today) {
                    // 今天回診
                    var user = await User.findByPk(reminder.userId);
                    if (user && user.notificationEnabled) {
                        var message = '🏥 今日回診提醒！\n\n';
                        message += '📅 今天 ' + (reminder.appointmentTime || '') + '\n';
                        message += '🏥 ' + reminder.hospitalName + '\n';
                        if (reminder.department) message += '🩺 ' + reminder.department + '\n';
                        message += '\n祝您看診順利！😊';
                        
                        await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
                        logger.info('今日回診提醒已發送: ' + reminder.hospitalName);
                    }
                } else if (appointmentDate === tomorrow) {
                    // 明天回診
                    var user = await User.findByPk(reminder.userId);
                    if (user && user.notificationEnabled) {
                        var message = '🏥 明日回診提醒\n\n';
                        message += '📅 明天 ' + (reminder.appointmentTime || '') + '\n';
                        message += '🏥 ' + reminder.hospitalName + '\n';
                        if (reminder.department) message += '🩺 ' + reminder.department + '\n';
                        message += '\n記得準備健保卡！';
                        
                        await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
                        logger.info('明日回診提醒已發送: ' + reminder.hospitalName);
                    }
                }
            }
        } catch (error) {
            logger.error('回診提醒檢查錯誤:', error);
        }
    }

    // ========== 用藥提醒 ==========
    async checkMedicationReminders() {
        if (!this.lineClient) return;

        try {
            var taiwanTime = this.getTaiwanTime();
            var currentHour = taiwanTime.getUTCHours();
            var currentTimeStr = String(currentHour).padStart(2, '0') + ':00';

            var reminders = await HealthReminder.findAll({
                where: {
                    type: 'medication',
                    isActive: true
                }
            });

            for (var reminder of reminders) {
                var times = reminder.reminderTimes || [];
                
                for (var time of times) {
                    if (time.includes(currentTimeStr) || this.matchTimeSlot(time, currentHour)) {
                        var user = await User.findByPk(reminder.userId);
                        if (user && user.notificationEnabled) {
                            var message = '💊 用藥提醒\n\n';
                            message += '💊 ' + reminder.medicationName + '\n';
                            if (reminder.dosage) message += '📊 ' + reminder.dosage + '\n';
                            message += '\n記得按時服藥，保持健康！💪';
                            
                            await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
                            logger.info('用藥提醒已發送: ' + reminder.medicationName);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('用藥提醒檢查錯誤:', error);
        }
    }

    matchTimeSlot(timeStr, hour) {
        if (timeStr.includes('早') && hour >= 6 && hour <= 9) return true;
        if (timeStr.includes('中午') && hour >= 11 && hour <= 13) return true;
        if (timeStr.includes('晚') && hour >= 17 && hour <= 20) return true;
        if (timeStr.includes('睡前') && hour >= 21 && hour <= 23) return true;
        return false;
    }

    // ========== 週報 ==========
    async sendWeeklyReport() {
        if (!this.lineClient) return;

        try {
            var users = await User.findAll({
                where: { notificationEnabled: true }
            });

            for (var user of users) {
                var wishlistCount = await UserWishlist.count({ where: { userId: user.id } });
                var visitedCount = await UserWishlist.count({ where: { userId: user.id, isVisited: true } });

                var message = '📊 您的每週報告\n';
                message += '━━━━━━━━━━━━━━━\n\n';
                message += '🏆 ' + user.expertTitle + '\n';
                message += '📍 已探索 ' + visitedCount + ' 個景點\n';
                message += '❤️ 想去清單 ' + wishlistCount + ' 個\n';
                message += '⭐ 累積 ' + (user.totalPoints || 0) + ' 點\n\n';
                message += '繼續探索，下週更精彩！🎉';

                await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
            }

            logger.info('週報已發送');
        } catch (error) {
            logger.error('週報發送錯誤:', error);
        }
    }

    // ========== 生日祝福 ==========
    async checkBirthdayGreetings() {
        if (!this.lineClient) return;

        try {
            var taiwanTime = this.getTaiwanTime();
            var today = (taiwanTime.getUTCMonth() + 1) + '-' + taiwanTime.getUTCDate();

            var users = await User.findAll({
                where: { notificationEnabled: true }
            });

            for (var user of users) {
                if (user.birthday) {
                    var bday = new Date(user.birthday);
                    var bdayStr = (bday.getMonth() + 1) + '-' + bday.getDate();
                    
                    if (bdayStr === today) {
                        var message = '🎂 生日快樂！\n\n';
                        message += '親愛的 ' + (user.displayName || '朋友') + '，\n';
                        message += '祝您生日快樂！🎉🎈🎁\n\n';
                        message += '願您健康平安，天天開心！\n';
                        message += '退休福音陪您度過美好的每一天 ❤️';

                        await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
                        logger.info('生日祝福已發送給: ' + user.displayName);
                    }
                }
            }
        } catch (error) {
            logger.error('生日祝福檢查錯誤:', error);
        }
    }

    // ========== 節日問候 ==========
    async checkHolidayGreetings() {
        if (!this.lineClient) return;

        try {
            var taiwanTime = this.getTaiwanTime();
            var monthDay = (taiwanTime.getUTCMonth() + 1) + '-' + taiwanTime.getUTCDate();

            var holidays = {
                '1-1': { name: '元旦', emoji: '🎊', message: '新年快樂！祝您新的一年健康平安！' },
                '2-14': { name: '情人節', emoji: '💕', message: '情人節快樂！願愛與幸福常伴左右！' },
                '4-4': { name: '兒童節', emoji: '🧒', message: '兒童節快樂！保持童心，快樂每一天！' },
                '5-1': { name: '勞動節', emoji: '💪', message: '勞動節快樂！感謝您的辛勤付出！' },
                '8-8': { name: '父親節', emoji: '👨', message: '父親節快樂！祝天下爸爸健康幸福！' },
                '9-28': { name: '教師節', emoji: '📚', message: '教師節快樂！感謝所有老師的付出！' },
                '10-10': { name: '國慶日', emoji: '🇹🇼', message: '國慶日快樂！' },
                '12-25': { name: '聖誕節', emoji: '🎄', message: '聖誕快樂！Merry Christmas！' }
            };

            var holiday = holidays[monthDay];
            if (!holiday) return;

            var users = await User.findAll({
                where: { notificationEnabled: true }
            });

            for (var user of users) {
                var message = holiday.emoji + ' ' + holiday.name + '快樂！\n\n';
                message += '親愛的 ' + (user.displayName || '朋友') + '，\n';
                message += holiday.message + '\n\n';
                message += '退休福音祝您佳節愉快 🎉';

                await this.lineClient.pushMessage(user.lineUserId, { type: 'text', text: message });
            }

            logger.info(holiday.name + '問候已發送');
        } catch (error) {
            logger.error('節日問候錯誤:', error);
        }
    }

    // 手動觸發
    async triggerMorningPush(userId) {
        try {
            var user = await User.findOne({ where: { lineUserId: userId } });
            if (user) {
                await this.sendMorningPush(user);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('手動觸發推播錯誤:', error);
            return false;
        }
    }
}

module.exports = new SchedulerService();