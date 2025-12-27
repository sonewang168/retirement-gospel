/**
 * ============================================
 * 管理後台路由
 * ============================================
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User, Activity, Event, Group, Recommendation, UsageStats, Notification } = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');

// 管理員驗證中間件
const adminAuth = (req, res, next) => {
    // 簡易驗證（實際應使用更安全的方式）
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    
    if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: '未授權' });
    }
    
    next();
};

// ============================================
// 儀表板
// ============================================

/**
 * 管理後台首頁
 * GET /admin
 */
router.get('/', adminAuth, async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.render('admin/dashboard', {
            title: '管理後台 - 退休福音',
            stats
        });
    } catch (error) {
        logger.error('Admin dashboard error:', error);
        res.status(500).send('載入失敗');
    }
});

/**
 * 取得儀表板統計
 * GET /admin/api/stats
 */
router.get('/api/stats', adminAuth, async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        logger.error('Stats error:', error);
        res.status(500).json({ error: '取得統計失敗' });
    }
});

async function getDashboardStats() {
    const today = moment().startOf('day').toDate();
    const yesterday = moment().subtract(1, 'day').startOf('day').toDate();
    const weekAgo = moment().subtract(7, 'days').startOf('day').toDate();
    const monthAgo = moment().subtract(30, 'days').startOf('day').toDate();

    // 用戶統計
    const totalUsers = await User.count({ where: { isActive: true } });
    const newUsersToday = await User.count({
        where: { createdAt: { [Op.gte]: today } }
    });
    const newUsersWeek = await User.count({
        where: { createdAt: { [Op.gte]: weekAgo } }
    });
    const activeUsersToday = await User.count({
        where: { lastActiveAt: { [Op.gte]: today } }
    });
    const premiumUsers = await User.count({
        where: { isPremium: true, isActive: true }
    });

    // 活動統計
    const totalActivities = await Activity.count({ where: { isActive: true } });
    
    // 揪團統計
    const totalGroups = await Group.count();
    const activeGroups = await Group.count({
        where: { status: { [Op.in]: ['open', 'full'] } }
    });

    // 推薦統計
    const recommendationsToday = await Recommendation.count({
        where: { recommendedAt: { [Op.gte]: today } }
    });
    const adoptedToday = await Recommendation.count({
        where: {
            recommendedAt: { [Op.gte]: today },
            userAction: 'adopted'
        }
    });

    // 通知統計
    const notificationsSentToday = await Notification.count({
        where: {
            sentAt: { [Op.gte]: today },
            status: 'sent'
        }
    });

    return {
        users: {
            total: totalUsers,
            newToday: newUsersToday,
            newWeek: newUsersWeek,
            activeToday: activeUsersToday,
            premium: premiumUsers,
            premiumRate: ((premiumUsers / totalUsers) * 100).toFixed(1)
        },
        activities: {
            total: totalActivities
        },
        groups: {
            total: totalGroups,
            active: activeGroups
        },
        recommendations: {
            today: recommendationsToday,
            adopted: adoptedToday,
            adoptionRate: recommendationsToday > 0 
                ? ((adoptedToday / recommendationsToday) * 100).toFixed(1)
                : 0
        },
        notifications: {
            sentToday: notificationsSentToday
        }
    };
}

// ============================================
// 用戶管理
// ============================================

/**
 * 用戶列表
 * GET /admin/api/users
 */
router.get('/api/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { displayName: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status === 'active') whereClause.isActive = true;
        if (status === 'inactive') whereClause.isActive = false;
        if (status === 'premium') whereClause.isPremium = true;

        const { rows, count } = await User.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['lineUserId'] }
        });

        res.json({
            data: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

/**
 * 用戶詳情
 * GET /admin/api/users/:id
 */
router.get('/api/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: ['health', 'interests']
        });

        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }

        res.json(user);

    } catch (error) {
        logger.error('Get user detail error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

/**
 * 更新用戶
 * PUT /admin/api/users/:id
 */
router.put('/api/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }

        const allowedUpdates = ['isActive', 'isPremium', 'premiumExpiresAt'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await user.update(updates);
        res.json({ success: true, user });

    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({ error: '更新失敗' });
    }
});

// ============================================
// 活動管理
// ============================================

/**
 * 活動列表
 * GET /admin/api/activities
 */
router.get('/api/activities', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search, status } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (category) whereClause.category = category;
        if (search) {
            whereClause.name = { [Op.iLike]: `%${search}%` };
        }
        if (status === 'active') whereClause.isActive = true;
        if (status === 'inactive') whereClause.isActive = false;

        const { rows, count } = await Activity.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            data: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        logger.error('Get activities error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

/**
 * 新增活動
 * POST /admin/api/activities
 */
router.post('/api/activities', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.create(req.body);
        res.status(201).json(activity);
    } catch (error) {
        logger.error('Create activity error:', error);
        res.status(500).json({ error: '新增失敗' });
    }
});

/**
 * 更新活動
 * PUT /admin/api/activities/:id
 */
router.put('/api/activities/:id', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ error: '活動不存在' });
        }

        await activity.update(req.body);
        res.json({ success: true, activity });

    } catch (error) {
        logger.error('Update activity error:', error);
        res.status(500).json({ error: '更新失敗' });
    }
});

/**
 * 刪除活動
 * DELETE /admin/api/activities/:id
 */
router.delete('/api/activities/:id', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ error: '活動不存在' });
        }

        // 軟刪除
        await activity.update({ isActive: false });
        res.json({ success: true });

    } catch (error) {
        logger.error('Delete activity error:', error);
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ============================================
// 揪團管理
// ============================================

/**
 * 揪團列表
 * GET /admin/api/groups
 */
router.get('/api/groups', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (status) whereClause.status = status;

        const { rows, count } = await Group.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['eventDate', 'DESC']],
            include: [
                { model: User, as: 'creator', attributes: ['displayName'] }
            ]
        });

        res.json({
            data: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        logger.error('Get groups error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

// ============================================
// 推播管理
// ============================================

/**
 * 發送推播
 * POST /admin/api/push
 */
router.post('/api/push', adminAuth, async (req, res) => {
    try {
        const { userIds, message, type = 'custom' } = req.body;

        if (!message) {
            return res.status(400).json({ error: '訊息內容是必要的' });
        }

        const line = require('@line/bot-sdk');
        const client = new line.messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
        });

        let targetUsers;
        if (userIds && userIds.length > 0) {
            targetUsers = await User.findAll({
                where: { id: { [Op.in]: userIds }, isActive: true }
            });
        } else {
            // 發送給所有活躍用戶
            targetUsers = await User.findAll({
                where: { isActive: true, notificationEnabled: true },
                limit: 500
            });
        }

        let successCount = 0;
        let failCount = 0;

        for (const user of targetUsers) {
            try {
                await client.pushMessage({
                    to: user.lineUserId,
                    messages: [{
                        type: 'text',
                        text: message
                    }]
                });
                
                await Notification.create({
                    userId: user.id,
                    type: type,
                    message,
                    status: 'sent',
                    sentAt: new Date()
                });

                successCount++;
            } catch (err) {
                failCount++;
                logger.error(`Push to ${user.id} failed:`, err.message);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        res.json({
            success: true,
            total: targetUsers.length,
            sent: successCount,
            failed: failCount
        });

    } catch (error) {
        logger.error('Push notification error:', error);
        res.status(500).json({ error: '發送失敗' });
    }
});

/**
 * 手動觸發晨間推薦
 * POST /admin/api/trigger-morning-push
 */
router.post('/api/trigger-morning-push', adminAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const schedulerService = require('../services/schedulerService');

        if (userId) {
            const result = await schedulerService.triggerMorningPush(userId);
            return res.json(result);
        }

        // 觸發全部
        await schedulerService.sendMorningRecommendations();
        res.json({ success: true, message: '晨間推薦已發送' });

    } catch (error) {
        logger.error('Trigger push error:', error);
        res.status(500).json({ error: '觸發失敗' });
    }
});

// ============================================
// 報表
// ============================================

/**
 * 每日活躍用戶報表
 * GET /admin/api/reports/dau
 */
router.get('/api/reports/dau', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = moment().subtract(days, 'days').startOf('day').toDate();

        const data = await User.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('last_active_at')), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                lastActiveAt: { [Op.gte]: startDate }
            },
            group: [Sequelize.fn('DATE', Sequelize.col('last_active_at'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('last_active_at')), 'ASC']],
            raw: true
        });

        res.json(data);

    } catch (error) {
        logger.error('DAU report error:', error);
        res.status(500).json({ error: '取得報表失敗' });
    }
});

/**
 * 推薦採納率報表
 * GET /admin/api/reports/adoption
 */
router.get('/api/reports/adoption', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = moment().subtract(days, 'days').startOf('day').toDate();

        const data = await Recommendation.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('recommended_at')), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN user_action = 'adopted' THEN 1 ELSE 0 END")), 'adopted']
            ],
            where: {
                recommendedAt: { [Op.gte]: startDate }
            },
            group: [Sequelize.fn('DATE', Sequelize.col('recommended_at'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('recommended_at')), 'ASC']],
            raw: true
        });

        res.json(data);

    } catch (error) {
        logger.error('Adoption report error:', error);
        res.status(500).json({ error: '取得報表失敗' });
    }
});

/**
 * 分類熱度報表
 * GET /admin/api/reports/categories
 */
router.get('/api/reports/categories', adminAuth, async (req, res) => {
    try {
        const data = await Recommendation.findAll({
            attributes: [
                [Sequelize.col('Activity.category'), 'category'],
                [Sequelize.fn('COUNT', Sequelize.col('Recommendation.id')), 'views'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN user_action = 'adopted' THEN 1 ELSE 0 END")), 'adopted']
            ],
            include: [{
                model: Activity,
                attributes: []
            }],
            group: [Sequelize.col('Activity.category')],
            raw: true
        });

        res.json(data);

    } catch (error) {
        logger.error('Category report error:', error);
        res.status(500).json({ error: '取得報表失敗' });
    }
});

module.exports = router;
