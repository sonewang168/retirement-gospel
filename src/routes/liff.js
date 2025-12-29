/**
 * LIFF 路由
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { TourPlan, User } = require('../models');

// LIFF 首頁
router.get('/', (req, res) => {
    res.render('liff/index', {
        title: '退休福音',
        liffId: process.env.LINE_LIFF_ID
    });
});

// 行程詳情頁面
router.get('/tour/:id', async (req, res) => {
    try {
        var tourId = req.params.id;
        var tour = await TourPlan.findByPk(tourId);
        
        if (!tour) {
            return res.render('liff/error', {
                title: '找不到行程',
                message: '此行程不存在或已被刪除'
            });
        }
        
        res.render('liff/tour-detail', {
            title: tour.name,
            tour: tour,
            liffId: process.env.LINE_LIFF_ID
        });
    } catch (error) {
        logger.error('LIFF tour error:', error);
        res.render('liff/error', {
            title: '錯誤',
            message: '無法載入行程'
        });
    }
});

// 行程列表頁面
router.get('/my-tours', (req, res) => {
    res.render('liff/my-tours', {
        title: '我的行程',
        liffId: process.env.LINE_LIFF_ID
    });
});

// API: 取得用戶行程
router.get('/api/tours/:lineUserId', async (req, res) => {
    try {
        var lineUserId = req.params.lineUserId;
        var user = await User.findOne({ where: { lineUserId: lineUserId } });
        
        if (!user) {
            return res.json({ success: false, error: '用戶不存在' });
        }
        
        var tours = await TourPlan.findAll({
            where: { userId: user.id, status: 'saved' },
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        
        res.json({ success: true, tours: tours });
    } catch (error) {
        logger.error('API tours error:', error);
        res.json({ success: false, error: '載入失敗' });
    }
});

// API: 取得單一行程
router.get('/api/tour/:id', async (req, res) => {
    try {
        var tour = await TourPlan.findByPk(req.params.id);
        if (!tour) {
            return res.json({ success: false, error: '行程不存在' });
        }
        res.json({ success: true, tour: tour });
    } catch (error) {
        logger.error('API tour error:', error);
        res.json({ success: false, error: '載入失敗' });
    }
});

module.exports = router;