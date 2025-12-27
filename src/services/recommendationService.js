/**
 * ============================================
 * 推薦服務
 * 智慧活動推薦引擎
 * ============================================
 */

const { Activity, Event, Recommendation, UserInterest, WeatherCache } = require('../models');
const weatherService = require('./weatherService');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');
const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');

/**
 * 推薦權重配置
 */
const WEIGHTS = {
    weather: 0.25,
    airQuality: 0.20,
    interest: 0.25,
    mobility: 0.15,
    transport: 0.10,
    time: 0.05
};

/**
 * 取得每日推薦
 */
async function getDailyRecommendations(user, count = 3) {
    try {
        // 取得天氣和空品資訊
        const weatherInfo = await getWeatherInfo(user.city, user.district);
        const airQualityInfo = await getAirQualityInfo(user.city);

        // 取得用戶興趣
        const userInterests = await UserInterest.findAll({
            where: { userId: user.id, isExcluded: false }
        });

        // 取得候選活動
        const candidates = await getCandidateActivities(user, weatherInfo, airQualityInfo);

        // 計算推薦分數
        const scoredActivities = await Promise.all(
            candidates.map(activity => calculateScore(activity, user, userInterests, weatherInfo, airQualityInfo))
        );

        // 排序並取前 N 個
        const recommendations = scoredActivities
            .sort((a, b) => b.score - a.score)
            .slice(0, count);

        // 記錄推薦
        await saveRecommendations(user.id, recommendations, weatherInfo, airQualityInfo);

        // 加入天氣資訊到結果
        return recommendations.map(rec => ({
            ...rec,
            weatherInfo
        }));

    } catch (error) {
        logger.error('Error getting daily recommendations:', error);
        return [];
    }
}

/**
 * 取得更多推薦
 */
async function getMoreRecommendations(user, count = 5, excludeIds = []) {
    try {
        const weatherInfo = await getWeatherInfo(user.city, user.district);
        const airQualityInfo = await getAirQualityInfo(user.city);

        const userInterests = await UserInterest.findAll({
            where: { userId: user.id, isExcluded: false }
        });

        const candidates = await getCandidateActivities(user, weatherInfo, airQualityInfo, excludeIds);

        const scoredActivities = await Promise.all(
            candidates.map(activity => calculateScore(activity, user, userInterests, weatherInfo, airQualityInfo))
        );

        return scoredActivities
            .sort((a, b) => b.score - a.score)
            .slice(0, count);

    } catch (error) {
        logger.error('Error getting more recommendations:', error);
        return [];
    }
}

/**
 * 取得候選活動
 */
async function getCandidateActivities(user, weatherInfo, airQualityInfo, excludeIds = []) {
    try {
        const whereClause = {
            isActive: true,
            city: user.city
        };

        // 排除已推薦過的
        if (excludeIds.length > 0) {
            whereClause.id = { [Op.notIn]: excludeIds };
        }

        // 根據天氣篩選
        if (weatherInfo?.rainProbability > 50) {
            // 高降雨機率時優先室內活動
            whereClause.isIndoor = true;
        }

        // 根據空品篩選
        if (airQualityInfo?.aqi > 100) {
            whereClause.isIndoor = true;
        }

        // 根據行動能力篩選
        if (user.mobilityLevel === 'low') {
            whereClause.difficultyLevel = 'easy';
        } else if (user.mobilityLevel === 'medium') {
            whereClause.difficultyLevel = { [Op.in]: ['easy', 'moderate'] };
        }

        const activities = await Activity.findAll({
            where: whereClause,
            limit: 50,
            order: [
                ['rating', 'DESC'],
                ['reviewCount', 'DESC']
            ]
        });

        return activities;

    } catch (error) {
        logger.error('Error getting candidate activities:', error);
        return [];
    }
}

/**
 * 計算推薦分數
 */
async function calculateScore(activity, user, userInterests, weatherInfo, airQualityInfo) {
    let score = 0;
    const breakdown = {};

    // 1. 天氣適合度 (25%)
    const weatherScore = calculateWeatherScore(activity, weatherInfo);
    breakdown.weather = weatherScore;
    score += weatherScore * WEIGHTS.weather;

    // 2. 空氣品質適合度 (20%)
    const aqiScore = calculateAqiScore(activity, airQualityInfo);
    breakdown.airQuality = aqiScore;
    score += aqiScore * WEIGHTS.airQuality;

    // 3. 興趣匹配度 (25%)
    const interestScore = calculateInterestScore(activity, userInterests);
    breakdown.interest = interestScore;
    score += interestScore * WEIGHTS.interest;

    // 4. 體能匹配度 (15%)
    const mobilityScore = calculateMobilityScore(activity, user);
    breakdown.mobility = mobilityScore;
    score += mobilityScore * WEIGHTS.mobility;

    // 5. 交通便利性 (10%)
    const transportScore = calculateTransportScore(activity, user);
    breakdown.transport = transportScore;
    score += transportScore * WEIGHTS.transport;

    // 6. 時間適合度 (5%)
    const timeScore = calculateTimeScore(activity);
    breakdown.time = timeScore;
    score += timeScore * WEIGHTS.time;

    // 正規化到 0-100
    const finalScore = Math.min(100, Math.max(0, score * 100));

    return {
        activity,
        score: finalScore,
        scoreBreakdown: breakdown
    };
}

/**
 * 天氣適合度計算
 */
function calculateWeatherScore(activity, weatherInfo) {
    if (!weatherInfo) return 0.5;

    let score = 1.0;

    // 降雨機率影響
    const rainProb = weatherInfo.rainProbability || 0;
    if (rainProb > 70 && !activity.isIndoor) {
        score *= 0.3;
    } else if (rainProb > 50 && !activity.isIndoor) {
        score *= 0.6;
    } else if (rainProb > 30 && !activity.isIndoor) {
        score *= 0.8;
    }

    // 溫度影響
    const temp = weatherInfo.temperature || 25;
    if (temp > 35 && !activity.isIndoor) {
        score *= 0.5;
    } else if (temp > 32 && !activity.isIndoor) {
        score *= 0.7;
    } else if (temp < 15 && !activity.isIndoor) {
        score *= 0.8;
    }

    // 最佳天氣匹配
    if (activity.bestWeather && activity.bestWeather.length > 0) {
        const currentWeather = weatherInfo.description || '';
        if (activity.bestWeather.some(w => currentWeather.includes(w))) {
            score *= 1.2;
        }
    }

    return Math.min(1, score);
}

/**
 * 空氣品質適合度計算
 */
function calculateAqiScore(activity, airQualityInfo) {
    if (!airQualityInfo) return 0.5;

    const aqi = airQualityInfo.aqi || 50;

    // 室內活動不受空品影響
    if (activity.isIndoor) return 1.0;

    // 檢查活動最低 AQI 要求
    if (activity.minAqiRequired && aqi > activity.minAqiRequired) {
        return 0.2;
    }

    if (aqi <= 50) return 1.0;
    if (aqi <= 100) return 0.8;
    if (aqi <= 150) return 0.5;
    if (aqi <= 200) return 0.3;
    return 0.1;
}

/**
 * 興趣匹配度計算
 */
function calculateInterestScore(activity, userInterests) {
    if (!userInterests || userInterests.length === 0) return 0.5;

    const matchedInterest = userInterests.find(
        i => i.category === activity.category || i.subcategory === activity.subcategory
    );

    if (matchedInterest) {
        return Math.min(1, matchedInterest.weight || 1.0);
    }

    return 0.3; // 未匹配但不完全排除
}

/**
 * 體能匹配度計算
 */
function calculateMobilityScore(activity, user) {
    const mobilityLevel = user.mobilityLevel || 'medium';
    const activityLevel = activity.difficultyLevel || 'easy';

    const mobilityMap = { 'low': 1, 'medium': 2, 'high': 3 };
    const difficultyMap = { 'easy': 1, 'moderate': 2, 'challenging': 3 };

    const userLevel = mobilityMap[mobilityLevel];
    const activityDifficulty = difficultyMap[activityLevel];

    if (userLevel >= activityDifficulty) return 1.0;
    if (userLevel === activityDifficulty - 1) return 0.6;
    return 0.2;
}

/**
 * 交通便利性計算
 */
function calculateTransportScore(activity, user) {
    const transportModes = user.transportMode || ['public_transit'];

    // 有車的人彈性較大
    if (transportModes.includes('car') || transportModes.includes('motorcycle')) {
        return 1.0;
    }

    // 需要接送的人
    if (transportModes.includes('need_ride')) {
        return activity.publicTransitInfo ? 0.5 : 0.3;
    }

    // 依賴大眾運輸
    if (transportModes.includes('public_transit')) {
        return activity.publicTransitInfo ? 0.9 : 0.5;
    }

    // 步行為主
    if (transportModes.includes('walk')) {
        // 這裡可以加上距離計算
        return 0.7;
    }

    return 0.5;
}

/**
 * 時間適合度計算
 */
function calculateTimeScore(activity) {
    const now = moment();
    const hour = now.hour();

    // 檢查營業時間
    if (activity.openingHours) {
        const dayOfWeek = now.format('dddd').toLowerCase();
        const todayHours = activity.openingHours[dayOfWeek];
        
        if (todayHours === 'closed') return 0;
        
        // 簡化處理，實際應解析營業時間
    }

    // 早上推薦戶外活動
    if (hour >= 6 && hour <= 10 && !activity.isIndoor) {
        return 1.0;
    }

    // 中午避免戶外
    if (hour >= 11 && hour <= 14 && !activity.isIndoor) {
        return 0.6;
    }

    // 傍晚適合各種活動
    if (hour >= 15 && hour <= 18) {
        return 1.0;
    }

    return 0.8;
}

/**
 * 儲存推薦紀錄
 */
async function saveRecommendations(userId, recommendations, weatherInfo, airQualityInfo) {
    try {
        const records = recommendations.map(rec => ({
            userId,
            activityId: rec.activity.id,
            recommendedAt: new Date(),
            recommendationType: 'morning_push',
            score: rec.score,
            scoreBreakdown: rec.scoreBreakdown,
            weatherCondition: weatherInfo,
            aqiValue: airQualityInfo?.aqi
        }));

        await Recommendation.bulkCreate(records);
    } catch (error) {
        logger.error('Error saving recommendations:', error);
    }
}

/**
 * 取消推薦（記錄用戶不喜歡）
 */
async function dismissRecommendation(userId, activityId) {
    try {
        await Recommendation.update(
            { userAction: 'dismissed', userActionAt: new Date() },
            { where: { userId, activityId } }
        );

        // 降低該類別的權重
        const activity = await Activity.findByPk(activityId);
        if (activity) {
            await UserInterest.update(
                { weight: Sequelize.literal('GREATEST(0.1, weight - 0.1)') },
                { where: { userId, category: activity.category } }
            );
        }
    } catch (error) {
        logger.error('Error dismissing recommendation:', error);
    }
}

/**
 * 依分類取得活動
 */
async function getActivitiesByCategory(category, user, limit = 10) {
    try {
        const whereClause = {
            isActive: true,
            category
        };

        if (user.city) {
            whereClause.city = user.city;
        }

        const activities = await Activity.findAll({
            where: whereClause,
            limit,
            order: [
                ['rating', 'DESC'],
                ['reviewCount', 'DESC']
            ]
        });

        return activities;
    } catch (error) {
        logger.error('Error getting activities by category:', error);
        return [];
    }
}

/**
 * 取得附近活動
 */
async function getNearbyActivities(latitude, longitude, user, radius = 5) {
    try {
        // 使用 Haversine 公式計算距離
        const activities = await Activity.findAll({
            where: {
                isActive: true,
                latitude: { [Op.ne]: null },
                longitude: { [Op.ne]: null }
            },
            attributes: {
                include: [
                    [
                        Sequelize.literal(`
                            (6371 * acos(
                                cos(radians(${latitude})) * 
                                cos(radians(latitude)) * 
                                cos(radians(longitude) - radians(${longitude})) + 
                                sin(radians(${latitude})) * 
                                sin(radians(latitude))
                            ))
                        `),
                        'distance'
                    ]
                ]
            },
            having: Sequelize.literal(`distance < ${radius}`),
            order: [[Sequelize.literal('distance'), 'ASC']],
            limit: 20
        });

        return activities;
    } catch (error) {
        logger.error('Error getting nearby activities:', error);
        return [];
    }
}

/**
 * 取得天氣資訊
 */
async function getWeatherInfo(city, district) {
    try {
        // 先查快取
        const cacheKey = `weather:${city}:${district || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        // 從資料庫快取取得
        const today = moment().format('YYYY-MM-DD');
        const weatherCache = await WeatherCache.findOne({
            where: { city, date: today }
        });

        if (weatherCache) {
            await cacheService.set(cacheKey, weatherCache.toJSON(), 3600);
            return weatherCache.toJSON();
        }

        // 呼叫外部 API
        const weatherData = await weatherService.fetchWeather(city, district);
        
        // 儲存快取
        await WeatherCache.upsert({
            city,
            district,
            date: today,
            ...weatherData,
            fetchedAt: new Date()
        });

        await cacheService.set(cacheKey, weatherData, 3600);
        return weatherData;

    } catch (error) {
        logger.error('Error getting weather info:', error);
        return {
            city,
            temperature: 26,
            temperatureMin: 22,
            temperatureMax: 30,
            humidity: 70,
            rainProbability: 20,
            description: '多雲時晴',
            aqi: 50
        };
    }
}

/**
 * 取得空氣品質資訊
 */
async function getAirQualityInfo(city) {
    try {
        const cacheKey = `airquality:${city}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const airQualityData = await weatherService.fetchAirQuality(city);
        
        await cacheService.set(cacheKey, airQualityData, 3600);
        return airQualityData;

    } catch (error) {
        logger.error('Error getting air quality info:', error);
        return {
            city,
            aqi: 50,
            aqiStatus: '良好',
            pm25: 15
        };
    }
}

// ============================================
// 匯出
// ============================================
module.exports = {
    getDailyRecommendations,
    getMoreRecommendations,
    dismissRecommendation,
    getActivitiesByCategory,
    getNearbyActivities,
    getWeatherInfo,
    getAirQualityInfo
};
