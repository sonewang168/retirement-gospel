/**
 * 推薦服務
 */
const logger = require('../utils/logger');
const { Activity } = require('../models');
const { Op } = require('sequelize');

async function getDailyRecommendations(user, count) {
    try {
        var limit = count || 5;
        var whereClause = { isActive: true };
        
        // 如果用戶有設定城市，優先顯示該城市的活動
        if (user && user.city) {
            var cityActivities = await Activity.findAll({
                where: { ...whereClause, city: user.city },
                order: [['rating', 'DESC']],
                limit: limit
            });
            
            if (cityActivities.length >= limit) {
                return cityActivities;
            }
        }
        
        // 否則顯示精選活動
        var activities = await Activity.findAll({
            where: { ...whereClause, isFeatured: true },
            order: [['rating', 'DESC']],
            limit: limit
        });
        
        if (activities.length === 0) {
            activities = await Activity.findAll({
                where: whereClause,
                order: [['rating', 'DESC']],
                limit: limit
            });
        }
        
        return activities;
        
    } catch (error) {
        logger.error('Get recommendations error:', error);
        return [];
    }
}

async function getActivitiesByCategory(category, user) {
    try {
        var whereClause = { 
            isActive: true,
            category: category
        };
        
        var activities = await Activity.findAll({
            where: whereClause,
            order: [['rating', 'DESC']],
            limit: 10
        });
        
        return activities;
        
    } catch (error) {
        logger.error('Get activities by category error:', error);
        return [];
    }
}

async function getNearbyActivities(lat, lng, user) {
    try {
        // 簡單版：找附近城市的活動
        var activities = await Activity.findAll({
            where: { isActive: true },
            order: [['rating', 'DESC']],
            limit: 5
        });
        
        return activities;
        
    } catch (error) {
        logger.error('Get nearby activities error:', error);
        return [];
    }
}

async function dismissRecommendation(userId, activityId) {
    // TODO: 記錄用戶不想看的活動
    return true;
}

async function getWeatherInfo(city, district) {
    // 使用 weatherService
    var weatherService = require('./weatherService');
    return await weatherService.getCompleteWeatherInfo(city);
}

async function getAirQualityInfo(city) {
    // TODO: 空氣品質 API
    return { aqi: 50, status: '良好' };
}

module.exports = {
    getDailyRecommendations: getDailyRecommendations,
    getActivitiesByCategory: getActivitiesByCategory,
    getNearbyActivities: getNearbyActivities,
    dismissRecommendation: dismissRecommendation,
    getWeatherInfo: getWeatherInfo,
    getAirQualityInfo: getAirQualityInfo
};