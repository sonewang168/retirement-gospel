/**
 * API 路由（完整版）
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const groupService = require('../services/groupService');
const { User, Activity, Event, Group, Community, TourPlan } = require('../models');

// ============================================
// 中間件
// ============================================

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供認證 Token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findByPk(decoded.userId);
        
        if (!req.user) {
            return res.status(401).json({ error: '用戶不存在' });
        }
        
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token 無效或已過期' });
    }
};

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ============================================
// 資料庫修正 API
// ============================================

router.get('/fix-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        
        // 修正 category 欄位從 ENUM 改為 VARCHAR
        await sequelize.query(`
            ALTER TABLE activities 
            ALTER COLUMN category TYPE VARCHAR(50);
        `);
        
        res.json({ success: true, message: 'category 欄位已修正為 VARCHAR(50)' });
    } catch (error) {
        logger.error('Fix DB error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ============================================
// 行程 PDF 匯出 API（公開）
// ============================================

router.get('/tour/:id/pdf', async (req, res) => {
    try {
        var tourId = req.params.id;
        logger.info('PDF export request: ' + tourId);
        
        var tour = await TourPlan.findByPk(tourId);
        
        if (!tour) {
            logger.warn('Tour not found: ' + tourId);
            return res.status(404).send('<h1>找不到此行程</h1><p>行程可能已被刪除</p>');
        }
        
        logger.info('Generating PDF for: ' + tour.name);
        
        // 建立 HTML 內容
        var itineraryHtml = '';
        if (tour.itinerary && Array.isArray(tour.itinerary)) {
            itineraryHtml = tour.itinerary.map(function(day) {
                var activities = '';
                if (day.activities && Array.isArray(day.activities)) {
                    activities = day.activities.map(function(act) {
                        return '<li style="margin: 5px 0;">' + act + '</li>';
                    }).join('');
                }
                return '<div style="margin-bottom: 20px;">' +
                    '<h3 style="color: #3498DB; margin-bottom: 10px;">📅 Day ' + day.day + ': ' + (day.title || '') + '</h3>' +
                    '<ul style="margin-left: 20px;">' + activities + '</ul>' +
                    '</div>';
            }).join('');
        }
        
        var highlightsHtml = '';
        if (tour.highlights && Array.isArray(tour.highlights)) {
            highlightsHtml = tour.highlights.map(function(h) {
                return '<span style="background: #FADBD8; color: #E74C3C; padding: 5px 10px; border-radius: 15px; margin: 3px; display: inline-block;">' + h + '</span>';
            }).join(' ');
        }
        
        var tipsHtml = '';
        if (tour.tips && Array.isArray(tour.tips)) {
            tipsHtml = tour.tips.map(function(t) {
                return '<li style="margin: 5px 0;">' + t + '</li>';
            }).join('');
        }
        
        var html = '<!DOCTYPE html>' +
            '<html><head><meta charset="UTF-8">' +
            '<title>' + (tour.name || '行程') + ' - 退休福音</title>' +
            '<style>' +
            'body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }' +
            '.header { background: linear-gradient(135deg, #E74C3C, #C0392B); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }' +
            '.section { background: white; border: 1px solid #eee; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }' +
            '.info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }' +
            '.info-label { color: #888; }' +
            '.info-value { font-weight: bold; }' +
            '.price { color: #E74C3C; }' +
            'h2 { color: #E74C3C; border-bottom: 2px solid #E74C3C; padding-bottom: 10px; }' +
            '.footer { text-align: center; color: #888; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }' +
            '</style></head><body>' +
            
            '<div class="header">' +
            '<h1 style="margin: 0;">🌍 ' + (tour.name || '精彩行程') + '</h1>' +
            '<p style="margin: 10px 0 0 0; opacity: 0.9;">🏷️ ' + (tour.source || 'AI') + '</p>' +
            '</div>' +
            
            '<div class="section">' +
            '<h2>📋 基本資訊</h2>' +
            '<div class="info-row"><span class="info-label">📍 國家</span><span class="info-value">' + (tour.country || '海外') + '</span></div>' +
            '<div class="info-row"><span class="info-label">📆 天數</span><span class="info-value">' + (tour.days || 5) + ' 天</span></div>' +
            '<div class="info-row"><span class="info-label">💰 預算</span><span class="info-value price">NT$ ' + (tour.estimatedCostMin || 30000) + ' - ' + (tour.estimatedCostMax || 50000) + '</span></div>' +
            '<div class="info-row"><span class="info-label">🗓️ 最佳季節</span><span class="info-value">' + (tour.bestSeason || '全年皆宜') + '</span></div>' +
            '</div>' +
            
            '<div class="section">' +
            '<h2>✨ 行程亮點</h2>' +
            '<div style="margin-top: 15px;">' + (highlightsHtml || '精彩景點') + '</div>' +
            '</div>' +
            
            '<div class="section">' +
            '<h2>📋 每日行程</h2>' +
            (itineraryHtml || '<p>精彩行程規劃中</p>') +
            '</div>' +
            
            '<div class="section">' +
            '<h2>💡 旅遊提醒</h2>' +
            '<ul style="margin-left: 20px;">' + (tipsHtml || '<li>祝您旅途愉快</li>') + '</ul>' +
            '</div>' +
            
            '<div class="footer">' +
            '<p>🌅 退休福音 - 智慧生活規劃助手</p>' +
            '<p>加入我們：https://line.me/R/ti/p/@024wclps</p>' +
            '</div>' +
            
            '</body></html>';
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        
    } catch (error) {
        logger.error('PDF export error: ' + error.message);
        res.status(500).send('<h1>匯出失敗</h1><p>' + error.message + '</p>');
    }
});

// ============================================
// 種子資料 API（公開）
// ============================================

router.get('/seed', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        
        const count = await Activity.count();
        if (count > 0 && !force) {
            return res.json({ 
                success: true, 
                message: `資料庫已有 ${count} 筆活動資料。如需重新匯入請加 ?force=true` 
            });
        }

        if (force) {
            await Activity.destroy({ where: {} });
        }

        const { allActivities } = require('../data/seedActivities');
        const result = await Activity.bulkCreate(allActivities);
        
        res.json({ 
            success: true, 
            message: `成功新增 ${result.length} 筆活動資料` 
        });
    } catch (error) {
        logger.error('Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 認證相關 API
// ============================================

router.post('/auth/line', [
    body('idToken').notEmpty().withMessage('ID Token 是必要的')
], validate, async (req, res) => {
    try {
        const { idToken } = req.body;
        const lineUserId = idToken;
        
        let user = await User.findOne({ where: { lineUserId } });
        
        if (!user) {
            user = await User.create({
                lineUserId,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl,
                isPremium: user.isPremium,
                onboardingCompleted: user.onboardingCompleted
            }
        });

    } catch (error) {
        logger.error('Auth error:', error);
        res.status(500).json({ error: '登入失敗' });
    }
});

// ============================================
// 用戶相關 API
// ============================================

router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userService.getUserWithDetails(req.user.id);
        res.json(user);
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

router.put('/user/profile', authenticateToken, [
    body('displayName').optional().isLength({ max: 100 }),
    body('phone').optional().isMobilePhone('zh-TW'),
    body('city').optional().isLength({ max: 20 }),
    body('district').optional().isLength({ max: 20 })
], validate, async (req, res) => {
    try {
        const allowedFields = ['displayName', 'phone', 'city', 'district', 'address', 
            'mobilityLevel', 'transportMode', 'budgetMonthly', 'budgetSingle'];
        
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await req.user.update(updates);
        res.json({ success: true, user: req.user });

    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({ error: '更新失敗' });
    }
});

router.put('/user/interests', authenticateToken, [
    body('interests').isArray()
], validate, async (req, res) => {
    try {
        await userService.updateInterests(req.user.id, req.body.interests);
        res.json({ success: true });
    } catch (error) {
        logger.error('Update interests error:', error);
        res.status(500).json({ error: '更新失敗' });
    }
});

router.get('/user/schedule', authenticateToken, async (req, res) => {
    try {
        const schedule = await userService.getUserPlannedActivities(req.user.id);
        res.json(schedule);
    } catch (error) {
        logger.error('Get schedule error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.get('/user/wishlist', authenticateToken, async (req, res) => {
    try {
        const wishlist = await userService.getUserWishlist(req.user.id);
        res.json(wishlist);
    } catch (error) {
        logger.error('Get wishlist error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

// ============================================
// 推薦相關 API
// ============================================

router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 5;
        const recommendations = await recommendationService.getDailyRecommendations(req.user, count);
        res.json(recommendations);
    } catch (error) {
        logger.error('Get recommendations error:', error);
        res.status(500).json({ error: '取得推薦失敗' });
    }
});

router.post('/recommendations/:id/dismiss', authenticateToken, [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        await recommendationService.dismissRecommendation(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Dismiss recommendation error:', error);
        res.status(500).json({ error: '操作失敗' });
    }
});

// ============================================
// 活動相關 API
// ============================================

router.get('/activities', [
    query('category').optional(),
    query('city').optional(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
], validate, async (req, res) => {
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

        res.json({
            data: activities.rows,
            total: activities.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        logger.error('Get activities error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.get('/activities/:id', [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ error: '活動不存在' });
        }

        res.json(activity);

    } catch (error) {
        logger.error('Get activity error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.post('/activities/:id/save', authenticateToken, [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        await userService.saveToWishlist(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Save activity error:', error);
        res.status(500).json({ error: '收藏失敗' });
    }
});

router.post('/activities/:id/schedule', authenticateToken, [
    param('id').isUUID(),
    body('plannedDate').optional().isISO8601()
], validate, async (req, res) => {
    try {
        const result = await userService.addToSchedule(
            req.user.id, 
            req.params.id, 
            req.body.plannedDate
        );
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Schedule activity error:', error);
        res.status(500).json({ error: '加入失敗' });
    }
});

// ============================================
// 揪團相關 API
// ============================================

router.get('/groups', [
    query('city').optional(),
    query('status').optional(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
], validate, async (req, res) => {
    try {
        const { city, limit = 20, offset = 0 } = req.query;
        const groups = await groupService.getOpenGroups(city, { limit: parseInt(limit), offset: parseInt(offset) });
        res.json(groups);
    } catch (error) {
        logger.error('Get groups error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.get('/groups/:id', [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        const group = await groupService.getGroupDetail(req.params.id);
        
        if (!group) {
            return res.status(404).json({ error: '揪團不存在' });
        }

        res.json(group);

    } catch (error) {
        logger.error('Get group error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.post('/groups', authenticateToken, [
    body('title').notEmpty().isLength({ min: 2, max: 100 }),
    body('eventDate').isISO8601(),
    body('maxParticipants').optional().isInt({ min: 2, max: 50 })
], validate, async (req, res) => {
    try {
        const group = await groupService.createGroup(req.user.id, req.body);
        res.status(201).json(group);
    } catch (error) {
        logger.error('Create group error:', error);
        res.status(500).json({ error: '建立失敗' });
    }
});

router.post('/groups/:id/join', authenticateToken, [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        const result = await groupService.joinGroup(req.params.id, req.user.id, req.body.message);
        res.json(result);
    } catch (error) {
        logger.error('Join group error:', error);
        res.status(500).json({ error: '加入失敗' });
    }
});

router.post('/groups/:id/leave', authenticateToken, [
    param('id').isUUID()
], validate, async (req, res) => {
    try {
        await groupService.leaveGroup(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Leave group error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/groups/my', authenticateToken, async (req, res) => {
    try {
        const groups = await groupService.getUserGroups(req.user.id);
        res.json(groups);
    } catch (error) {
        logger.error('Get my groups error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

// ============================================
// 天氣相關 API
// ============================================

router.get('/weather', [
    query('city').notEmpty()
], validate, async (req, res) => {
    try {
        const weather = await recommendationService.getWeatherInfo(req.query.city, req.query.district);
        res.json(weather);
    } catch (error) {
        logger.error('Get weather error:', error);
        res.status(500).json({ error: '取得天氣失敗' });
    }
});

router.get('/air-quality', [
    query('city').notEmpty()
], validate, async (req, res) => {
    try {
        const airQuality = await recommendationService.getAirQualityInfo(req.query.city);
        res.json(airQuality);
    } catch (error) {
        logger.error('Get air quality error:', error);
        res.status(500).json({ error: '取得空品失敗' });
    }
});

// ============================================
// 社群相關 API
// ============================================

router.get('/communities', async (req, res) => {
    try {
        const { category, city, limit = 20 } = req.query;
        
        const whereClause = { isActive: true };
        if (category) whereClause.category = category;
        if (city) whereClause.city = city;

        const communities = await Community.findAll({
            where: whereClause,
            limit: parseInt(limit),
            order: [['memberCount', 'DESC']]
        });

        res.json(communities);

    } catch (error) {
        logger.error('Get communities error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

// ============================================
// 健康狀態 API
// ============================================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('../../package.json').version
    });
});

module.exports = router;