/**
 * 網頁路由
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { Activity, User, TourPlan } = require('../models');

// 首頁
router.get('/', async (req, res) => {
    try {
        var activityCount = await Activity.count();
        var userCount = await User.count();
        
        res.render('index', {
            title: '退休福音 - 智慧生活規劃助手',
            activityCount: activityCount,
            userCount: userCount
        });
    } catch (error) {
        logger.error('Home page error:', error);
        res.render('index', {
            title: '退休福音 - 智慧生活規劃助手',
            activityCount: 0,
            userCount: 0
        });
    }
});

// 統計頁面
router.get('/stats', async (req, res) => {
    try {
        var activityCount = await Activity.count();
        var userCount = await User.count();
        var tourCount = await TourPlan.count();
        
        res.render('stats', {
            title: '統計資訊',
            activityCount: activityCount,
            userCount: userCount,
            tourCount: tourCount
        });
    } catch (error) {
        logger.error('Stats page error:', error);
        res.render('error', {
            title: '錯誤',
            message: '無法載入統計資訊'
        });
    }
});

// 活動列表頁面
router.get('/activities', async (req, res) => {
    try {
        var activities = await Activity.findAll({
            where: { isActive: true },
            order: [['rating', 'DESC']],
            limit: 50
        });
        
        res.render('activities', {
            title: '活動列表',
            activities: activities
        });
    } catch (error) {
        logger.error('Activities page error:', error);
        res.render('error', {
            title: '錯誤',
            message: '無法載入活動列表'
        });
    }
});

// 關於頁面
router.get('/about', (req, res) => {
    res.render('about', {
        title: '關於我們'
    });
});

// 隱私政策
router.get('/privacy', (req, res) => {
    res.render('privacy', {
        title: '隱私政策'
    });
});

// 服務條款
router.get('/terms', (req, res) => {
    res.render('terms', {
        title: '服務條款'
    });
});
// 管理後台
router.get('/admin', async (req, res) => {
    res.render('admin/dashboard');
});
module.exports = router;