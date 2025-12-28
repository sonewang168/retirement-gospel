/**
 * 行程收藏服務
 */
const logger = require('../utils/logger');

// 暫存 AI 生成的行程
const tourCache = new Map();

function cacheTour(visitorId, tour) {
    const key = visitorId + '-' + tour.id;
    tourCache.set(key, {
        tour: tour,
        createdAt: Date.now()
    });
    setTimeout(function() {
        tourCache.delete(key);
    }, 30 * 60 * 1000);
    return tour.id;
}

function getCachedTour(visitorId, tourId) {
    const key = visitorId + '-' + tourId;
    const cached = tourCache.get(key);
    return cached ? cached.tour : null;
}

async function saveTourPlan(userId, visitorId, tourId) {
    try {
        const { TourPlan } = require('../models');
        const tour = getCachedTour(visitorId, tourId);
        
        if (!tour) {
            logger.warn('Tour not found in cache: ' + tourId);
            return null;
        }

        const tourPlan = await TourPlan.create({
            userId: userId,
            name: tour.name,
            country: tour.country,
            days: tour.days,
            source: tour.source,
            estimatedCostMin: tour.estimatedCost?.min,
            estimatedCostMax: tour.estimatedCost?.max,
            highlights: tour.highlights,
            itinerary: tour.itinerary,
            tips: tour.tips,
            bestSeason: tour.bestSeason,
            status: 'saved'
        });

        logger.info('Tour plan saved: ' + tourPlan.id);
        return tourPlan;

    } catch (error) {
        logger.error('Error saving tour plan:', error);
        throw error;
    }
}

async function getUserTourPlans(userId) {
    try {
        const { TourPlan } = require('../models');
        const plans = await TourPlan.findAll({
            where: { userId: userId },
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        return plans;
    } catch (error) {
        logger.error('Error getting user tour plans:', error);
        return [];
    }
}

async function getTourPlanById(id) {
    try {
        const { TourPlan } = require('../models');
        return await TourPlan.findByPk(id);
    } catch (error) {
        logger.error('Error getting tour plan:', error);
        return null;
    }
}

async function deleteTourPlan(id, userId) {
    try {
        const { TourPlan } = require('../models');
        const result = await TourPlan.destroy({
            where: { id: id, userId: userId }
        });
        return result > 0;
    } catch (error) {
        logger.error('Error deleting tour plan:', error);
        return false;
    }
}

module.exports = {
    cacheTour: cacheTour,
    getCachedTour: getCachedTour,
    saveTourPlan: saveTourPlan,
    getUserTourPlans: getUserTourPlans,
    getTourPlanById: getTourPlanById,
    deleteTourPlan: deleteTourPlan
};