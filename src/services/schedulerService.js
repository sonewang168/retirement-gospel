/**
 * 排程服務（修正時區版）
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const { User, Activity } = require('../models');
const weatherService = require('./weatherService');

class SchedulerService {
    constructor() {
        this.lineClient = null;
    }

    init(lineClient) {
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

        logger.info('排程服務啟動');
    }

    // 取得台灣時間
    getTaiwanTime() {
        var now = new Date();
        // UTC+8
        var taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        return taiwanTime;
    }

    // 取得問候語（根據台灣時間）
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

    // 檢查個人化推播
    async checkPersonalizedPush() {
        try {
            var taiwanTime = this.getTaiwanTime();
            var currentHour = taiwanTime.getUTCHours();
            var currentMinute = taiwanTime.getUTCMinutes();
            var currentTimeStr = String(currentHour).padStart(2, '0') + ':' + String(currentMinute).padStart(2, '0');

            // 找出設定這個時間推播的用戶
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

    // 發送早安推播
    async sendMorningPush(user) {
        if (!this.lineClient) return;

        try {
            var greeting = this.getGreeting();
            var displayName = user.displayName || '朋友';
            var city = user.city || '高雄市';

            // 取得天氣
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

            // 取得今日推薦活動
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

            var message = greeting + '，' + displayName + '！' + weatherText + advice + recommendText;
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

    // 檢查天氣警報
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

    // 檢查單一用戶天氣警報
    async checkUserWeatherAlert(user) {
        if (!this.lineClient) return;

        try {
            var city = user.city || '高雄市';
            var weather = await weatherService.getWeather(city);

            if (!weather || weather.error) return;

            var alerts = [];

            // 高溫警報
            if (weather.temp >= 35) {
                alerts.push('🔥 高溫警報：今日氣溫高達 ' + weather.temp + '°C，請注意防曬補水！');
            }

            // 低溫警報
            if (weather.temp <= 10) {
                alerts.push('🥶 低溫警報：今日氣溫僅 ' + weather.temp + '°C，請注意保暖！');
            }

            // 下雨警報
            if (weather.description && (weather.description.includes('雨') || weather.description.includes('Rain'))) {
                alerts.push('🌧️ 降雨提醒：今日有降雨機會，出門記得帶傘！');
            }

            // 發送警報
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

    // 手動觸發早安推播（測試用）
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