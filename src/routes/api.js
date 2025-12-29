/**
 * API 路由（完整版 + 管理API）
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User, Activity, TourPlan, HealthReminder, UserWishlist } = require('../models');

// ============================================
// 資料庫修正 API
// ============================================

router.get('/fix-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        const force = req.query.force === 'true';
        
        logger.info('同步資料庫 force=' + force);
        
        if (force) {
            await sequelize.sync({ force: true });
            res.json({ success: true, message: '資料表已重建！請執行 /api/seed?force=true' });
        } else {
            await sequelize.sync({ alter: true });
            res.json({ success: true, message: '資料庫已同步！' });
        }
    } catch (error) {
        logger.error('Fix DB error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ============================================
// 種子資料 API
// ============================================

router.get('/seed', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const count = await Activity.count();
        
        if (count > 0 && !force) {
            return res.json({ success: true, message: '已有 ' + count + ' 筆活動' });
        }

        if (force) {
            await Activity.destroy({ where: {}, truncate: true });
        }

        const { allActivities } = require('../data/seedActivities');
        const result = await Activity.bulkCreate(allActivities);
        
        res.json({ success: true, message: '成功新增 ' + result.length + ' 筆活動' });
    } catch (error) {
        logger.error('Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 統計 API
// ============================================

router.get('/stats', async (req, res) => {
    try {
        const userCount = await User.count();
        const activityCount = await Activity.count();
        const tourCount = await TourPlan.count();
        
        res.json({
            users: userCount,
            activities: activityCount,
            tours: tourCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Stats error:', error);
        res.status(500).json({ error: '取得統計失敗' });
    }
});

// ============================================
// 活動 API
// ============================================

router.get('/activities', async (req, res) => {
    try {
        const { category, city, limit = 20, offset = 0 } = req.query;
        const whereClause = { isActive: true };
        if (category) whereClause.category = category;
        if (city) whereClause.city = city;

        const activities = await Activity.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['rating', 'DESC']]
        });

        res.json({ data: activities.rows, total: activities.count });
    } catch (error) {
        logger.error('Activities error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

// ============================================
// 行程 PDF API
// ============================================

router.get('/tour/:id/pdf', async (req, res) => {
    try {
        var tour = await TourPlan.findByPk(req.params.id);
        if (!tour) return res.status(404).send('<h1>找不到行程</h1>');
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + tour.name + '</title></head><body>';
        html += '<h1>' + tour.name + '</h1>';
        html += '<p>' + tour.country + ' | ' + tour.days + '天</p>';
        html += '</body></html>';
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        res.status(500).send('<h1>錯誤</h1>');
    }
});

// ============================================
// 管理 API（用戶列表）
// ============================================

router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: users });
    } catch (error) {
        logger.error('Admin users error:', error);
        res.json({ data: [] });
    }
});

// ============================================
// 管理 API（行程列表）
// ============================================

router.get('/admin/tours', async (req, res) => {
    try {
        const tours = await TourPlan.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: tours });
    } catch (error) {
        logger.error('Admin tours error:', error);
        res.json({ data: [] });
    }
});

// ============================================
// 管理 API（健康提醒）
// ============================================

router.get('/admin/reminders', async (req, res) => {
    try {
        const reminders = await HealthReminder.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: reminders });
    } catch (error) {
        logger.error('Admin reminders error:', error);
        res.json({ data: [] });
    }
});

// ============================================
// 管理 API（想去收藏）
// ============================================

router.get('/admin/wishlists', async (req, res) => {
    try {
        const wishlists = await UserWishlist.findAll({
            include: [{ model: Activity }],
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: wishlists });
    } catch (error) {
        logger.error('Admin wishlists error:', error);
        res.json({ data: [] });
    }
});

// ============================================
// 健康狀態 API
// ============================================

router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;