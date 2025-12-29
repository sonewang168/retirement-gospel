/**
 * 網頁路由
 */
const express = require('express');
const router = express.Router();
const { User, Activity, TourPlan, HealthReminder, UserWishlist } = require('../models');

// 首頁
router.get('/', async (req, res) => {
    try {
        var activityCount = await Activity.count();
        var userCount = await User.count();
        var tourCount = await TourPlan.count();
        
        res.render('index', {
            title: '退休福音',
            activityCount: activityCount,
            userCount: userCount,
            tourCount: tourCount
        });
    } catch (error) {
        res.render('index', {
            title: '退休福音',
            activityCount: 0,
            userCount: 0,
            tourCount: 0
        });
    }
});

// 管理後台
router.get('/admin', async (req, res) => {
    try {
        var userCount = await User.count();
        var activityCount = await Activity.count();
        var tourCount = await TourPlan.count();
        var reminderCount = await HealthReminder.count();
        var wishlistCount = await UserWishlist.count();
        
        var recentUsers = await User.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        
        res.render('admin/dashboard', {
            title: '管理後台',
            stats: {
                users: userCount,
                activities: activityCount,
                tours: tourCount,
                reminders: reminderCount,
                wishlists: wishlistCount
            },
            recentUsers: recentUsers
        });
    } catch (error) {
        res.render('admin/dashboard', {
            title: '管理後台',
            stats: { users: 0, activities: 0, tours: 0, reminders: 0, wishlists: 0 },
            recentUsers: []
        });
    }
});

// 關於
router.get('/about', (req, res) => {
    res.render('about', { title: '關於我們' });
});

module.exports = router;