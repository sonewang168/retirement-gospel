/**
 * API 路由（統計功能版）
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User, Activity, TourPlan, HealthReminder, UserWishlist } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// ============================================
// 種子資料 API
// ============================================
router.get('/seed', async (req, res) => {
    try {
        var force = req.query.force === 'true';
        var count = await Activity.count();
        
        if (count > 0 && !force) {
            return res.json({ success: true, message: '已有 ' + count + ' 筆活動' });
        }

        if (force) {
            await UserWishlist.destroy({ where: {} });
            await Activity.destroy({ where: {} });
            logger.info('已清除舊活動資料');
        }

        var { allActivities } = require('../data/seedActivities');
        var result = await Activity.bulkCreate(allActivities);
        
        res.json({ success: true, message: '成功新增 ' + result.length + ' 筆活動' });
    } catch (error) {
        logger.error('Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 基本統計 API
// ============================================
router.get('/stats', async (req, res) => {
    try {
        var userCount = await User.count();
        var activityCount = await Activity.count();
        var tourCount = await TourPlan.count();
        var wishlistCount = await UserWishlist.count();
        var visitedCount = await UserWishlist.count({ where: { isVisited: true } });
        
        res.json({
            users: userCount,
            activities: activityCount,
            tours: tourCount,
            wishlists: wishlistCount,
            visited: visitedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Stats error:', error);
        res.status(500).json({ error: '取得統計失敗' });
    }
});

// ============================================
// 進階統計 API
// ============================================
router.get('/stats/advanced', async (req, res) => {
    try {
        // 用戶統計
        var userCount = await User.count();
        var activeUsers = await User.count({
            where: {
                lastActiveAt: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });
        
        // 達人分布
        var expertDistribution = await User.findAll({
            attributes: ['expertLevel', [fn('COUNT', col('id')), 'count']],
            group: ['expertLevel'],
            raw: true
        });

        // 城市分布
        var cityDistribution = await User.findAll({
            attributes: ['city', [fn('COUNT', col('id')), 'count']],
            group: ['city'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 10,
            raw: true
        });

        // 活動分類統計
        var categoryStats = await Activity.findAll({
            attributes: ['category', [fn('COUNT', col('id')), 'count']],
            group: ['category'],
            raw: true
        });

        // 熱門活動（被收藏最多）
        var popularActivities = await UserWishlist.findAll({
            attributes: ['activityId', [fn('COUNT', col('id')), 'count']],
            group: ['activityId'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 10,
            include: [{ model: Activity, as: 'activity', attributes: ['name', 'city'] }],
            raw: true,
            nest: true
        });

        // AI 行程統計
        var tourStats = await TourPlan.findAll({
            attributes: ['aiProvider', [fn('COUNT', col('id')), 'count']],
            group: ['aiProvider'],
            raw: true
        });

        // 每日新增用戶（最近7天）
        var dailyUsers = [];
        for (var i = 6; i >= 0; i--) {
            var date = new Date();
            date.setDate(date.getDate() - i);
            var startOfDay = new Date(date.setHours(0, 0, 0, 0));
            var endOfDay = new Date(date.setHours(23, 59, 59, 999));
            
            var count = await User.count({
                where: {
                    createdAt: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                }
            });
            
            dailyUsers.push({
                date: startOfDay.toISOString().split('T')[0],
                count: count
            });
        }

        res.json({
            users: {
                total: userCount,
                activeThisWeek: activeUsers,
                expertDistribution: expertDistribution,
                cityDistribution: cityDistribution
            },
            activities: {
                categoryStats: categoryStats,
                popularActivities: popularActivities
            },
            tours: {
                aiProviderStats: tourStats
            },
            trends: {
                dailyNewUsers: dailyUsers
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Advanced stats error:', error);
        res.status(500).json({ error: '取得進階統計失敗' });
    }
});

// ============================================
// 排行榜 API
// ============================================
router.get('/leaderboard', async (req, res) => {
    try {
        // 探索達人排行（去過最多景點）
        var topExplorers = await User.findAll({
            attributes: ['displayName', 'expertTitle', 'visitedCount', 'totalPoints'],
            where: { visitedCount: { [Op.gt]: 0 } },
            order: [['visitedCount', 'DESC']],
            limit: 10
        });

        // 行程收藏達人
        var topTourCollectors = await TourPlan.findAll({
            attributes: ['userId', [fn('COUNT', col('id')), 'tourCount']],
            group: ['userId'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 10,
            include: [{ model: User, attributes: ['displayName'] }],
            raw: true,
            nest: true
        });

        res.json({
            explorers: topExplorers,
            tourCollectors: topTourCollectors,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Leaderboard error:', error);
        res.status(500).json({ error: '取得排行榜失敗' });
    }
});

// ============================================
// 管理 API
// ============================================
router.get('/admin/users', async (req, res) => {
    try {
        var users = await User.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: users });
    } catch (error) {
        logger.error('Admin users error:', error);
        res.json({ data: [] });
    }
});

router.get('/admin/tours', async (req, res) => {
    try {
        var tours = await TourPlan.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ data: tours });
    } catch (error) {
        logger.error('Admin tours error:', error);
        res.json({ data: [] });
    }
});

router.get('/admin/reminders', async (req, res) => {
    try {
        var reminders = await HealthReminder.findAll({
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

router.get('/admin/wishlists', async (req, res) => {
    try {
        var wishlists = await UserWishlist.findAll({
            include: [{ model: Activity, as: 'activity' }],
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
// 活動 API
// ============================================
router.get('/activities', async (req, res) => {
    try {
        var { category, city, limit = 20, offset = 0 } = req.query;
        var whereClause = { isActive: true };
        if (category) whereClause.category = category;
        if (city) whereClause.city = city;

        var activities = await Activity.findAndCountAll({
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
        
        var itineraryHtml = '';
        if (tour.itinerary && Array.isArray(tour.itinerary)) {
            itineraryHtml = tour.itinerary.map(function(d) {
                return '<h3>Day ' + d.day + ' - ' + (d.title || '') + '</h3><ul>' + 
                    (d.activities || []).map(function(a) { return '<li>' + a + '</li>'; }).join('') + '</ul>';
            }).join('');
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + tour.name + '</title>';
        html += '<style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto}h1{color:#E74C3C}h3{color:#3498DB}ul{line-height:1.8}</style></head><body>';
        html += '<h1>🌍 ' + tour.name + '</h1>';
        html += '<p>📍 ' + tour.country + ' | ' + tour.days + '天</p>';
        html += '<p>💰 預算 $' + (tour.estimatedCostMin || 30000) + ' - $' + (tour.estimatedCostMax || 50000) + '</p>';
        html += '<p>🏷️ ' + (tour.aiProvider || 'AI') + '</p>';
        html += '<hr>';
        html += '<h2>✨ 亮點</h2><p>' + (tour.highlights || []).join('、') + '</p>';
        html += '<hr>';
        html += '<h2>📋 行程</h2>' + itineraryHtml;
        html += '<hr>';
        html += '<h2>💡 提醒</h2><ul>' + (tour.tips || []).map(function(t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
        html += '</body></html>';
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        res.status(500).send('<h1>錯誤</h1>');
    }
});

// ============================================
// 同步資料庫
// ============================================
router.get('/fix-db', async (req, res) => {
    try {
        var { sequelize } = require('../models');
        var force = req.query.force === 'true';
        
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
// 健康狀態 API
// ============================================
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ============================================
// 清除用戶資料 API
// ============================================
router.get('/clear-wishlist', async (req, res) => {
    try {
        var lineUserId = req.query.userId;
        if (!lineUserId) {
            return res.json({ error: '請提供 userId 參數' });
        }
        
        var user = await User.findOne({ where: { lineUserId: lineUserId } });
        if (!user) {
            return res.json({ error: '找不到用戶' });
        }
        
        var deleted = await UserWishlist.destroy({ where: { userId: user.id } });
        
        // 重置達人等級
        await user.update({
            visitedCount: 0,
            expertLevel: 0,
            expertTitle: '🌱 新手旅人',
            badges: [],
            totalPoints: 0
        });
        
        res.json({ success: true, message: '已清除 ' + deleted + ' 筆想去清單，達人等級已重置' });
    } catch (error) {
        res.json({ error: error.message });
    }
});
module.exports = router;