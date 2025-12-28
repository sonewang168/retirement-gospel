/**
 * ============================================
 * 管理後台路由
 * 含統計和 CSV 匯出功能
 * ============================================
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User, Activity, Event, Group, Recommendation, UsageStats, Notification } = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');

// ============================================
// 公開統計（不需驗證）
// ============================================

/**
 * 公開統計頁面
 * GET /admin/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getPublicStats();
        
        // 如果要 JSON
        if (req.query.format === 'json') {
            return res.json(stats);
        }
        
        // HTML 頁面
        res.send(`
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>退休福音 - 統計數據</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: white; text-align: center; margin-bottom: 30px; font-size: 2.5em; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .stat-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .stat-card h3 { color: #667eea; margin-bottom: 15px; font-size: 1.1em; display: flex; align-items: center; gap: 10px; }
        .stat-number { font-size: 3em; font-weight: bold; color: #2d3748; }
        .stat-label { color: #718096; margin-top: 5px; }
        .stat-list { margin-top: 15px; }
        .stat-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .stat-item:last-child { border-bottom: none; }
        .stat-item-label { color: #4a5568; }
        .stat-item-value { font-weight: bold; color: #2d3748; }
        .export-section { margin-top: 30px; text-align: center; }
        .export-btn { display: inline-block; padding: 15px 30px; margin: 10px; background: white; color: #667eea; text-decoration: none; border-radius: 10px; font-weight: bold; transition: transform 0.2s, box-shadow 0.2s; }
        .export-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0,0,0,0.2); }
        .update-time { text-align: center; color: rgba(255,255,255,0.8); margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌅 退休福音 統計數據</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>📍 活動資料</h3>
                <div class="stat-number">${stats.activities.total}</div>
                <div class="stat-label">筆活動</div>
                <div class="stat-list">
                    ${Object.entries(stats.activities.byCategory).map(([cat, count]) => `
                        <div class="stat-item">
                            <span class="stat-item-label">${getCategoryName(cat)}</span>
                            <span class="stat-item-value">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stat-card">
                <h3>🌏 地區分布</h3>
                <div class="stat-number">${Object.keys(stats.activities.byCity).length}</div>
                <div class="stat-label">個城市</div>
                <div class="stat-list">
                    ${Object.entries(stats.activities.byCity).slice(0, 8).map(([city, count]) => `
                        <div class="stat-item">
                            <span class="stat-item-label">${city}</span>
                            <span class="stat-item-value">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stat-card">
                <h3>👥 用戶統計</h3>
                <div class="stat-number">${stats.users.total}</div>
                <div class="stat-label">位用戶</div>
                <div class="stat-list">
                    <div class="stat-item">
                        <span class="stat-item-label">今日活躍</span>
                        <span class="stat-item-value">${stats.users.activeToday}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-item-label">本週新增</span>
                        <span class="stat-item-value">${stats.users.newThisWeek}</span>
                    </div>
                </div>
            </div>
            
            <div class="stat-card">
                <h3>🎯 推薦統計</h3>
                <div class="stat-number">${stats.recommendations.total}</div>
                <div class="stat-label">次推薦</div>
                <div class="stat-list">
                    <div class="stat-item">
                        <span class="stat-item-label">今日推薦</span>
                        <span class="stat-item-value">${stats.recommendations.today}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-item-label">被採納</span>
                        <span class="stat-item-value">${stats.recommendations.adopted}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="export-section">
            <h2 style="color: white; margin-bottom: 20px;">📥 匯出資料</h2>
            <a href="/admin/export/activities" class="export-btn">📊 匯出活動 CSV</a>
            <a href="/admin/export/activities?format=json" class="export-btn">📋 匯出活動 JSON</a>
        </div>
        
        <div class="update-time">
            更新時間：${moment().format('YYYY-MM-DD HH:mm:ss')}
        </div>
    </div>
</body>
</html>
        `);
    } catch (error) {
        logger.error('Stats page error:', error);
        res.status(500).send('載入失敗');
    }
});

/**
 * 匯出活動資料
 * GET /admin/export/activities
 */
router.get('/export/activities', async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: { isActive: true },
            order: [['city', 'ASC'], ['category', 'ASC'], ['name', 'ASC']]
        });

        // JSON 格式
        if (req.query.format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=activities.json');
            return res.json(activities);
        }

        // CSV 格式
        const csv = generateActivitiesCSV(activities);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=activities.csv');
        // 加入 BOM 讓 Excel 正確顯示中文
        res.send('\ufeff' + csv);

    } catch (error) {
        logger.error('Export activities error:', error);
        res.status(500).json({ error: '匯出失敗' });
    }
});

/**
 * 產生活動 CSV
 */
function generateActivitiesCSV(activities) {
    const headers = [
        '編號', '名稱', '簡述', '分類', '城市', '區域', '地址',
        '緯度', '經度', '難度', '時長(分)', '最低費用', '最高費用',
        '室內', '無障礙', '評分', '標籤', '建立時間'
    ];

    const rows = activities.map((a, i) => [
        i + 1,
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${(a.shortDescription || '').replace(/"/g, '""')}"`,
        getCategoryName(a.category),
        a.city || '',
        a.district || '',
        `"${(a.address || '').replace(/"/g, '""')}"`,
        a.latitude || '',
        a.longitude || '',
        getDifficultyName(a.difficultyLevel),
        a.estimatedDuration || '',
        a.costMin || 0,
        a.costMax || 0,
        a.isIndoor ? '是' : '否',
        a.isAccessible ? '是' : '否',
        a.rating || '',
        `"${(a.tags || []).join(', ')}"`,
        moment(a.createdAt).format('YYYY-MM-DD')
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function getCategoryName(cat) {
    const names = {
        nature: '自然踏青',
        food: '美食探索',
        culture: '藝文展演',
        learning: '學習成長',
        religion: '宗教信仰',
        wellness: '養生保健',
        social: '社交活動',
        home: '居家活動'
    };
    return names[cat] || cat || '其他';
}

function getDifficultyName(level) {
    const names = { easy: '輕鬆', moderate: '適中', challenging: '挑戰' };
    return names[level] || '輕鬆';
}

async function getPublicStats() {
    const today = moment().startOf('day').toDate();
    const weekAgo = moment().subtract(7, 'days').startOf('day').toDate();

    // 活動統計
    const totalActivities = await Activity.count({ where: { isActive: true } });
    
    const activitiesByCategory = await Activity.findAll({
        attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { isActive: true },
        group: ['category'],
        raw: true
    });

    const activitiesByCity = await Activity.findAll({
        attributes: ['city', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { isActive: true },
        group: ['city'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
        raw: true
    });

    // 用戶統計
    const totalUsers = await User.count({ where: { isActive: true } });
    const activeToday = await User.count({ where: { lastActiveAt: { [Op.gte]: today } } });
    const newThisWeek = await User.count({ where: { createdAt: { [Op.gte]: weekAgo } } });

    // 推薦統計
    const totalRecommendations = await Recommendation.count();
    const recommendationsToday = await Recommendation.count({ where: { recommendedAt: { [Op.gte]: today } } });
    const adoptedRecommendations = await Recommendation.count({ where: { userAction: 'adopted' } });

    return {
        activities: {
            total: totalActivities,
            byCategory: activitiesByCategory.reduce((acc, item) => {
                acc[item.category] = parseInt(item.count);
                return acc;
            }, {}),
            byCity: activitiesByCity.reduce((acc, item) => {
                if (item.city) acc[item.city] = parseInt(item.count);
                return acc;
            }, {})
        },
        users: {
            total: totalUsers,
            activeToday,
            newThisWeek
        },
        recommendations: {
            total: totalRecommendations,
            today: recommendationsToday,
            adopted: adoptedRecommendations
        }
    };
}

// ============================================
// 管理員驗證中間件
// ============================================

const adminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    
    if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: '未授權' });
    }
    
    next();
};

// ============================================
// 以下需要管理員驗證
// ============================================

router.get('/', adminAuth, async (req, res) => {
    try {
        const stats = await getPublicStats();
        res.render('admin/dashboard', { title: '管理後台 - 退休福音', stats });
    } catch (error) {
        logger.error('Admin dashboard error:', error);
        res.status(500).send('載入失敗');
    }
});

router.get('/api/stats', adminAuth, async (req, res) => {
    try {
        const stats = await getPublicStats();
        res.json(stats);
    } catch (error) {
        logger.error('Stats error:', error);
        res.status(500).json({ error: '取得統計失敗' });
    }
});

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

        res.json({ data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.get('/api/activities', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search, status } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (category) whereClause.category = category;
        if (search) whereClause.name = { [Op.iLike]: `%${search}%` };
        if (status === 'active') whereClause.isActive = true;
        if (status === 'inactive') whereClause.isActive = false;

        const { rows, count } = await Activity.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({ data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
    } catch (error) {
        logger.error('Get activities error:', error);
        res.status(500).json({ error: '取得失敗' });
    }
});

router.post('/api/activities', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.create(req.body);
        res.status(201).json(activity);
    } catch (error) {
        logger.error('Create activity error:', error);
        res.status(500).json({ error: '新增失敗' });
    }
});

router.put('/api/activities/:id', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) return res.status(404).json({ error: '活動不存在' });
        await activity.update(req.body);
        res.json({ success: true, activity });
    } catch (error) {
        logger.error('Update activity error:', error);
        res.status(500).json({ error: '更新失敗' });
    }
});

router.delete('/api/activities/:id', adminAuth, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) return res.status(404).json({ error: '活動不存在' });
        await activity.update({ isActive: false });
        res.json({ success: true });
    } catch (error) {
        logger.error('Delete activity error:', error);
        res.status(500).json({ error: '刪除失敗' });
    }
});

module.exports = router;