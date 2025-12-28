/**
 * 行程服務
 */
const logger = require('../utils/logger');

async function saveTourToDb(userId, tour) {
    try {
        const { TourPlan } = require('../models');
        
        const tourPlan = await TourPlan.create({
            userId: userId,
            name: tour.name || '精彩行程',
            country: tour.country || '日本',
            days: tour.days || 5,
            source: tour.source || 'AI',
            estimatedCostMin: tour.estimatedCost?.min || 30000,
            estimatedCostMax: tour.estimatedCost?.max || 50000,
            highlights: tour.highlights || [],
            itinerary: tour.itinerary || [],
            tips: tour.tips || [],
            bestSeason: tour.bestSeason || '全年皆宜',
            status: 'saved'
        });

        logger.info('Tour saved: ' + tourPlan.id);
        return tourPlan.id;

    } catch (error) {
        logger.error('Save tour error: ' + error.message);
        return null;
    }
}

async function confirmSaveTour(tourPlanId, userId) {
    try {
        const { TourPlan } = require('../models');
        var plan = await TourPlan.findOne({ where: { id: tourPlanId, userId: userId } });
        return plan !== null;
    } catch (error) {
        logger.error('Confirm error: ' + error.message);
        return false;
    }
}

async function getUserTourPlans(userId) {
    try {
        const { TourPlan } = require('../models');
        return await TourPlan.findAll({
            where: { userId: userId, status: 'saved' },
            order: [['createdAt', 'DESC']],
            limit: 20
        });
    } catch (error) {
        logger.error('Get tours error: ' + error.message);
        return [];
    }
}

async function deleteTourPlan(tourPlanId, userId) {
    try {
        const { TourPlan } = require('../models');
        var result = await TourPlan.destroy({
            where: { id: tourPlanId, userId: userId }
        });
        logger.info('Tour deleted: ' + tourPlanId + ', result: ' + result);
        return result > 0;
    } catch (error) {
        logger.error('Delete tour error: ' + error.message);
        return false;
    }
}

module.exports = {
    saveTourToDb: saveTourToDb,
    confirmSaveTour: confirmSaveTour,
    getUserTourPlans: getUserTourPlans,
    deleteTourPlan: deleteTourPlan
};