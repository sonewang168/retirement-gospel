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
// 種子資料 API（公開）
// ============================================

/**
 * 新增種子資料
 * GET /api/seed
 */
router.get('/seed', async (req, res) => {
    try {
        const count = await Activity.count();
        if (count > 0) {
            return res.json({ success: true, message: `資料庫已有 ${count} 筆活動資料，略過新增` });
        }

        const data = [
            { name: '蓮池潭風景區', description: '左營區著名景點，有龍虎塔、春秋閣等著名建築，環湖步道平坦好走。', shortDescription: '環湖步道賞景，龍虎塔拍照', category: 'nature', city: '高雄市', district: '左營區', address: '高雄市左營區蓮潭路', difficultyLevel: 'easy', estimatedDuration: 120, costMin: 0, costMax: 0, isIndoor: false, isAccessible: true, tags: ['免費', '散步', '拍照'], rating: 4.5, isFeatured: true, isActive: true },
            { name: '駁二藝術特區', description: '港邊文創園區，有展覽、表演、市集，週末常有活動。', shortDescription: '文創園區逛街看展', category: 'culture', city: '高雄市', district: '鹽埕區', address: '高雄市鹽埕區大勇路1號', difficultyLevel: 'easy', estimatedDuration: 150, costMin: 0, costMax: 300, isIndoor: false, isAccessible: true, tags: ['文創', '展覽', '拍照'], rating: 4.5, isFeatured: true, isActive: true },
            { name: '六合夜市', description: '高雄最知名的觀光夜市，各種在地小吃美食。', shortDescription: '品嚐在地小吃美食', category: 'food', city: '高雄市', district: '新興區', address: '高雄市新興區六合二路', difficultyLevel: 'easy', estimatedDuration: 90, costMin: 100, costMax: 500, isIndoor: false, isAccessible: true, tags: ['夜市', '小吃', '美食'], rating: 4.1, isFeatured: true, isActive: true },
            { name: '高雄市立美術館', description: '大型美術館，定期舉辦藝術展覽，戶外有雕塑公園。', shortDescription: '欣賞藝術展覽', category: 'culture', city: '高雄市', district: '鼓山區', address: '高雄市鼓山區美術館路80號', difficultyLevel: 'easy', estimatedDuration: 120, costMin: 0, costMax: 200, isIndoor: true, isAccessible: true, tags: ['美術', '展覽', '室內'], rating: 4.4, isFeatured: true, isActive: true },
            { name: '旗津海岸公園', description: '旗津島上的海濱公園，有沙灘、自行車道，可搭渡輪前往。', shortDescription: '海濱漫步，騎自行車', category: 'nature', city: '高雄市', district: '旗津區', address: '高雄市旗津區旗津三路', difficultyLevel: 'easy', estimatedDuration: 150, costMin: 0, costMax: 100, isIndoor: false, isAccessible: true, tags: ['海邊', '自行車', '渡輪'], rating: 4.4, isFeatured: true, isActive: true },
            { name: '壽山國家自然公園', description: '高雄市區內的自然綠洲，可觀察獼猴生態，山頂可眺望港都美景。', shortDescription: '登山健行，獼猴生態', category: 'nature', city: '高雄市', district: '鼓山區', address: '高雄市鼓山區壽山', difficultyLevel: 'moderate', estimatedDuration: 180, costMin: 0, costMax: 0, isIndoor: false, isAccessible: false, tags: ['登山', '健行', '獼猴'], rating: 4.3, isFeatured: true, isActive: true },
            { name: '三鳳宮', description: '主祀中壇元帥的大廟，建築雄偉壯觀，是高雄重要宗教聖地。', shortDescription: '參拜祈福', category: 'religion', city: '高雄市', district: '三民區', address: '高雄市三民區河北二路134號', difficultyLevel: 'easy', estimatedDuration: 60, costMin: 0, costMax: 0, isIndoor: false, isAccessible: true, tags: ['廟宇', '祈福', '免費'], rating: 4.6, isFeatured: true, isActive: true },
            { name: '國立科學工藝博物館', description: '大型科學博物館，有許多互動展品，適合全家同遊。', shortDescription: '互動科學展覽', category: 'learning', city: '高雄市', district: '三民區', address: '高雄市三民區九如一路720號', difficultyLevel: 'easy', estimatedDuration: 180, costMin: 0, costMax: 100, isIndoor: true, isAccessible: true, tags: ['博物館', '科學', '室內'], rating: 4.3, isFeatured: true, isActive: true }
        ];

        const result = await Activity.bulkCreate(data);
        res.json({ success: true, message: `成功新增 ${result.length} 筆活動資料` });
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