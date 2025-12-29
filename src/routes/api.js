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
// 資料庫修正 API（重建 activities 表）
// ============================================

router.get('/fix-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        
        logger.info('開始修正資料庫...');
        
        // 步驟 1: 刪除 activities 表
        await sequelize.query('DROP TABLE IF EXISTS activities CASCADE;');
        logger.info('已刪除舊的 activities 表');
        
        // 步驟 2: 刪除舊的 ENUM 類型
        await sequelize.query('DROP TYPE IF EXISTS enum_activities_category;').catch(() => {});
        await sequelize.query('DROP TYPE IF EXISTS "enum_activities_difficulty_level";').catch(() => {});
        logger.info('已刪除舊的 ENUM 類型');
        
        // 步驟 3: 建立新的 activities 表（使用 VARCHAR）
        await sequelize.query(`
            CREATE TABLE activities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                short_description VARCHAR(500),
                category VARCHAR(50) NOT NULL,
                subcategory VARCHAR(50),
                city VARCHAR(50),
                district VARCHAR(50),
                address VARCHAR(500),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                difficulty_level VARCHAR(20) DEFAULT 'easy',
                estimated_duration INTEGER,
                cost_min INTEGER DEFAULT 0,
                cost_max INTEGER DEFAULT 0,
                cost_description VARCHAR(200),
                opening_hours JSONB,
                contact_phone VARCHAR(20),
                website VARCHAR(500),
                is_indoor BOOLEAN DEFAULT false,
                is_accessible BOOLEAN DEFAULT true,
                accessibility_info TEXT,
                parking_available BOOLEAN DEFAULT false,
                public_transit_info TEXT,
                best_weather VARCHAR(50)[] DEFAULT ARRAY['sunny', 'cloudy']::VARCHAR[],
                best_season VARCHAR(50)[] DEFAULT ARRAY['spring', 'autumn']::VARCHAR[],
                min_aqi_required INTEGER DEFAULT 0,
                images VARCHAR(500)[] DEFAULT ARRAY[]::VARCHAR[],
                thumbnail_url VARCHAR(500),
                tags VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR[],
                rating DECIMAL(2,1) DEFAULT 4.0,
                review_count INTEGER DEFAULT 0,
                visit_count INTEGER DEFAULT 0,
                is_featured BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                source VARCHAR(100),
                source_url VARCHAR(500),
                last_verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('已建立新的 activities 表');
        
        res.json({ success: true, message: 'activities 表已重建完成！請執行 /api/seed?force=true 匯入資料' });
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

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, displayName: user.displayName } });
    } catch (error) {
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