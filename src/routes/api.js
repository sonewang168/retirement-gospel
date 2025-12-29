/**
 * API 路由（完整版）
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User, Activity, TourPlan, HealthReminder } = require('../models');

// ============================================
// 資料庫修正 API（強制重建）
// ============================================

router.get('/fix-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        const force = req.query.force === 'true';
        
        logger.info('開始同步資料庫結構... force=' + force);
        
        if (force) {
            // 強制重建所有表（會清除資料）
            await sequelize.sync({ force: true });
            logger.info('所有資料表已強制重建');
            res.json({ 
                success: true, 
                message: '所有資料表已強制重建！請執行 /api/seed?force=true 匯入活動資料' 
            });
        } else {
            // 嘗試溫和同步
            try {
                await sequelize.sync({ alter: true });
                res.json({ success: true, message: '資料庫結構已同步！' });
            } catch (alterError) {
                // 如果 alter 失敗，提示用戶使用 force
                logger.error('Alter failed:', alterError.message);
                res.json({ 
                    success: false, 
                    message: '欄位類型衝突，請使用 /api/fix-db?force=true 強制重建（注意：會清除資料）',
                    error: alterError.message
                });
            }
        }
    } catch (error) {
        logger.error('Fix DB error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ============================================
// 行程 PDF 匯出 API
// ============================================

router.get('/tour/:id/pdf', async (req, res) => {
    try {
        var tour = await TourPlan.findByPk(req.params.id);
        
        if (!tour) {
            return res.status(404).send('<h1>找不到此行程</h1>');
        }
        
        var itineraryHtml = '';
        if (tour.itinerary && Array.isArray(tour.itinerary)) {
            itineraryHtml = tour.itinerary.map(function(day) {
                var activities = '';
                if (day.activities && Array.isArray(day.activities)) {
                    activities = day.activities.map(function(act) {
                        return '<li style="margin: 5px 0;">' + act + '</li>';
                    }).join('');
                }
                return '<div style="margin-bottom: 20px;"><h3 style="color: #3498DB;">📅 Day ' + day.day + ': ' + (day.title || '') + '</h3><ul style="margin-left: 20px;">' + activities + '</ul></div>';
            }).join('');
        }
        
        var highlightsHtml = (tour.highlights || []).map(function(h) {
            return '<span style="background: #FADBD8; color: #E74C3C; padding: 5px 10px; border-radius: 15px; margin: 3px; display: inline-block;">' + h + '</span>';
        }).join(' ');
        
        var tipsHtml = (tour.tips || []).map(function(t) {
            return '<li style="margin: 5px 0;">' + t + '</li>';
        }).join('');
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (tour.name || '行程') + '</title>' +
            '<style>body{font-family:"Microsoft JhengHei",sans-serif;max-width:800px;margin:0 auto;padding:20px;}' +
            '.header{background:linear-gradient(135deg,#E74C3C,#C0392B);color:white;padding:30px;border-radius:10px;margin-bottom:20px;}' +
            '.section{background:white;border:1px solid #eee;border-radius:10px;padding:20px;margin-bottom:20px;}' +
            'h2{color:#E74C3C;border-bottom:2px solid #E74C3C;padding-bottom:10px;}</style></head><body>' +
            '<div class="header"><h1>🌍 ' + (tour.name || '精彩行程') + '</h1><p>🏷️ ' + (tour.source || 'AI') + '</p></div>' +
            '<div class="section"><h2>📋 基本資訊</h2><p>📍 ' + (tour.country || '海外') + ' | 📆 ' + (tour.days || 5) + '天 | 💰 $' + (tour.estimatedCostMin || 30000) + '-$' + (tour.estimatedCostMax || 50000) + '</p></div>' +
            '<div class="section"><h2>✨ 亮點</h2><div>' + (highlightsHtml || '精彩景點') + '</div></div>' +
            '<div class="section"><h2>📋 每日行程</h2>' + (itineraryHtml || '<p>精彩行程</p>') + '</div>' +
            '<div class="section"><h2>💡 提醒</h2><ul>' + (tipsHtml || '<li>祝您旅途愉快</li>') + '</ul></div>' +
            '<div style="text-align:center;color:#888;margin-top:30px;"><p>🌅 退休福音 | https://line.me/R/ti/p/@024wclps</p></div></body></html>';
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        logger.error('PDF export error:', error);
        res.status(500).send('<h1>匯出失敗</h1>');
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
            return res.json({ 
                success: true, 
                message: '資料庫已有 ' + count + ' 筆活動資料。如需重新匯入請加 ?force=true' 
            });
        }

        if (force) {
            await Activity.destroy({ where: {}, truncate: true });
        }

        const { allActivities } = require('../data/seedActivities');
        const result = await Activity.bulkCreate(allActivities);
        
        res.json({ 
            success: true, 
            message: '成功新增 ' + result.length + ' 筆活動資料' 
        });
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
// 健康狀態 API
// ============================================

router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;