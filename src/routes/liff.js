/**
 * LIFF 路由
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { TourPlan, User } = require('../models');

router.get('/', (req, res) => {
    res.send('LIFF OK');
});

router.get('/tour/:id', async (req, res) => {
    try {
        var tour = await TourPlan.findByPk(req.params.id);
        if (!tour) {
            return res.status(404).send('行程不存在');
        }
        res.json(tour);
    } catch (error) {
        res.status(500).send('錯誤');
    }
});

router.get('/api/tours/:lineUserId', async (req, res) => {
    try {
        var user = await User.findOne({ where: { lineUserId: req.params.lineUserId } });
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
        res.json({ success: false, error: '載入失敗' });
    }
});

module.exports = router;