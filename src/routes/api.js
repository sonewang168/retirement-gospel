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
const { User, Activity, Event, Group, Community, TourPlan, HealthReminder } = require('../models');

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
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
// 資料庫修正 API（完整同步所有表）
// ============================================

router.get('/fix-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        
        logger.info('開始同步所有資料庫結構...');
        
        // 同步所有表結構（會自動新增缺少的欄位）
        await sequelize.sync({ alter: true });
        
        logger.info('所有資料庫表同步完成');
        
        res.json({ 
            success: true, 
            message: '所有資料庫結構已同步完成！包含 users, activities, tour_plans, health_reminders 等表' 
        });
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
        var tourId = req.params.id;
        var tour = await TourPlan.findByPk(tourId);
        
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
                return '<div style="margin-bottom: 20px;">' +
                    '<h3 style="color: #3498DB;">📅 Day ' + day.day + ': ' + (day.title || '') + '</h3>' +
                    '<ul style="margin-left: 20px;">' + activities + '</ul></div>';
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
// 認證 API
// ============================================

router.post('/auth/line', [
    body('idToken').notEmpty()
], validate, async (req, res) => {
    try {
        const { idToken } = req.body;
        let user = await User.findOne({ where: { lineUserId: idToken } });
        
        if (!user) {
            user = await User.create({
                lineUserId: idToken,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, displayName: user.displayName } });
    } catch (error) {
        logger.error('Auth error:', error);
        res.status(500).json({ error: '登入失敗' });
    }
});

// ============================================
// 用戶 API
// ============================================

router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ error: '取得失敗' });
    }
});

router.put('/user/profile', authenticateToken, async (req, res) => {
    try {
        const { city, district, interests, notificationEnabled, morningPushTime } = req.body;
        await req.user.update({ city, district, interests, notificationEnabled, morningPushTime });
        res.json({ success: true, user: req.user });
    } catch (error) {
        res.status(500).json({ error: '更新失敗' });
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