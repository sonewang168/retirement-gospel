/**
 * ============================================
 * API 路由
 * RESTful API 端點
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const logger = require('../utils/logger');
const userService = require('../services/userService');
const recommendationService = require('../services/recommendationService');
const groupService = require('../services/groupService');
const { User, Activity, Event, Group, Community } = require('../models');

// ============================================
// 中間件
// ============================================

// JWT 驗證中間件
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

// 驗證結果處理
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ============================================
// 認證相關 API
// ============================================

/**
 * 使用 LINE ID Token 登入
 * POST /api/auth/line
 */
router.post('/auth/line', [
    body('idToken').notEmpty().withMessage('ID Token 是必要的')
], validate, async (req, res) => {
    try {
        const { idToken } = req.body;

        // 驗證 LINE ID Token (簡化版，實際應呼叫 LINE API 驗證)
        // const lineProfile = await verifyLineIdToken(idToken);

        // 這裡假設 idToken 就是 LINE User ID (實際應從 LINE API 取得)
        const lineUserId = idToken;
        
        let user = await User.findOne({ where: { lineUserId } });
        
        if (!user) {
            user = await User.create({
                lineUserId,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            });
        }

        // 產生 JWT
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

/**
 * 取得用戶資料
 * GET /api/user/profile
 */
router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userService.getUserWithDetails(req.user.id);
        res.json(user);
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

/**
 * 更新用戶資料
 * PUT /api/user/profile
 */
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

/**
 * 更新用戶興趣
 * PUT /api/user/interests
 */
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

/**
 * 取得用戶行程
 * GET /api/user/schedule
 */
router.get('/user/schedule', authenticateToken, async (req, res) => {
    try {
        const schedule = await userService.getUserPlannedActivities(req.user.id);
        res.json(schedule);
    } catch (error) {
        logger.error('Get schedule error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

/**
 * 取得用戶收藏
 * GET /api/user/wishlist
 */
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

/**
 * 取得每日推薦
 * GET /api/recommendations
 */
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

/**
 * 取消推薦
 * POST /api/recommendations/:id/dismiss
 */
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

/**
 * 取得活動列表
 * GET /api/activities
 */
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

/**
 * 取得活動詳情
 * GET /api/activities/:id
 */
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

/**
 * 收藏活動
 * POST /api/activities/:id/save
 */
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

/**
 * 加入行程
 * POST /api/activities/:id/schedule
 */
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

/**
 * 取得揪團列表
 * GET /api/groups
 */
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

/**
 * 取得揪團詳情
 * GET /api/groups/:id
 */
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

/**
 * 建立揪團
 * POST /api/groups
 */
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

/**
 * 加入揪團
 * POST /api/groups/:id/join
 */
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

/**
 * 退出揪團
 * POST /api/groups/:id/leave
 */
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

/**
 * 取得用戶的揪團
 * GET /api/groups/my
 */
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

/**
 * 取得天氣資訊
 * GET /api/weather
 */
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

/**
 * 取得空氣品質
 * GET /api/air-quality
 */
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

/**
 * 取得社群列表
 * GET /api/communities
 */
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

/**
 * 健康檢查
 * GET /api/health
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('../../package.json').version
    });
});

module.exports = router;
