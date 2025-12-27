/**
 * ============================================
 * LIFF 路由
 * LINE Front-end Framework 頁面
 * ============================================
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { Activity, Group, User, Event, Community, FamilyLink } = require('../models');

const LIFF_ID = process.env.LINE_LIFF_ID;

// ============================================
// LIFF 頁面路由
// ============================================

/**
 * LIFF 首頁
 * GET /liff
 */
router.get('/', (req, res) => {
    res.render('liff/index', {
        title: '退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 個人資料頁面
 * GET /liff/profile
 */
router.get('/profile', (req, res) => {
    res.render('liff/profile', {
        title: '個人資料 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 設定頁面
 * GET /liff/settings
 */
router.get('/settings', (req, res) => {
    res.render('liff/settings', {
        title: '設定 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 興趣設定頁面
 * GET /liff/interests
 */
router.get('/interests', (req, res) => {
    res.render('liff/interests', {
        title: '興趣偏好 - 退休福音',
        liffId: LIFF_ID,
        categories: [
            { key: 'nature', name: '自然踏青', icon: '🌿' },
            { key: 'food', name: '美食探索', icon: '🍜' },
            { key: 'culture', name: '藝文展演', icon: '🎭' },
            { key: 'learning', name: '學習成長', icon: '📚' },
            { key: 'religion', name: '宗教信仰', icon: '🙏' },
            { key: 'wellness', name: '養生保健', icon: '♨️' }
        ]
    });
});

/**
 * 活動詳情頁面
 * GET /liff/activity/:id
 */
router.get('/activity/:id', async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).render('liff/error', {
                title: '找不到活動',
                message: '此活動不存在或已被移除',
                liffId: LIFF_ID
            });
        }

        res.render('liff/activity', {
            title: `${activity.name} - 退休福音`,
            liffId: LIFF_ID,
            activity
        });

    } catch (error) {
        logger.error('Error rendering activity page:', error);
        res.status(500).render('liff/error', {
            title: '錯誤',
            message: '頁面載入失敗',
            liffId: LIFF_ID
        });
    }
});

/**
 * 揪團列表頁面
 * GET /liff/groups
 */
router.get('/groups', (req, res) => {
    res.render('liff/groups', {
        title: '揪團 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 揪團詳情頁面
 * GET /liff/group/:id
 */
router.get('/group/:id', async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id, {
            include: [
                { model: User, as: 'creator' },
                { model: Activity }
            ]
        });

        if (!group) {
            return res.status(404).render('liff/error', {
                title: '找不到揪團',
                message: '此揪團不存在或已被取消',
                liffId: LIFF_ID
            });
        }

        res.render('liff/group-detail', {
            title: `${group.title} - 退休福音`,
            liffId: LIFF_ID,
            group
        });

    } catch (error) {
        logger.error('Error rendering group page:', error);
        res.status(500).render('liff/error', {
            title: '錯誤',
            message: '頁面載入失敗',
            liffId: LIFF_ID
        });
    }
});

/**
 * 建立揪團頁面
 * GET /liff/create-group
 */
router.get('/create-group', (req, res) => {
    res.render('liff/create-group', {
        title: '建立揪團 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 我的行程頁面
 * GET /liff/schedule
 */
router.get('/schedule', (req, res) => {
    res.render('liff/schedule', {
        title: '我的行程 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 我的收藏頁面
 * GET /liff/wishlist
 */
router.get('/wishlist', (req, res) => {
    res.render('liff/wishlist', {
        title: '我的收藏 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 探索活動頁面
 * GET /liff/explore
 */
router.get('/explore', (req, res) => {
    const category = req.query.category;
    res.render('liff/explore', {
        title: '探索活動 - 退休福音',
        liffId: LIFF_ID,
        category
    });
});

/**
 * 健康管理頁面
 * GET /liff/health
 */
router.get('/health', (req, res) => {
    res.render('liff/health', {
        title: '健康管理 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 用藥提醒頁面
 * GET /liff/medications
 */
router.get('/medications', (req, res) => {
    res.render('liff/medications', {
        title: '用藥提醒 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 回診提醒頁面
 * GET /liff/appointments
 */
router.get('/appointments', (req, res) => {
    res.render('liff/appointments', {
        title: '回診提醒 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 家人連結頁面
 * GET /liff/family
 */
router.get('/family', (req, res) => {
    res.render('liff/family', {
        title: '家人連結 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 家人連結 - 輸入邀請碼
 * GET /liff/family-link
 */
router.get('/family-link', async (req, res) => {
    const { code } = req.query;
    
    if (code) {
        const link = await FamilyLink.findOne({
            where: { inviteCode: code, status: 'pending' },
            include: [{ model: User, as: 'parent' }]
        });

        if (link) {
            return res.render('liff/family-link', {
                title: '連結家人 - 退休福音',
                liffId: LIFF_ID,
                inviteCode: code,
                parentName: link.parent?.displayName
            });
        }
    }

    res.render('liff/family-link', {
        title: '連結家人 - 退休福音',
        liffId: LIFF_ID,
        inviteCode: code,
        error: code ? '邀請碼無效或已過期' : null
    });
});

/**
 * 社群列表頁面
 * GET /liff/communities
 */
router.get('/communities', async (req, res) => {
    try {
        const communities = await Community.findAll({
            where: { isActive: true },
            order: [['memberCount', 'DESC']],
            limit: 20
        });

        res.render('liff/communities', {
            title: '同好社群 - 退休福音',
            liffId: LIFF_ID,
            communities
        });

    } catch (error) {
        logger.error('Error loading communities:', error);
        res.render('liff/communities', {
            title: '同好社群 - 退休福音',
            liffId: LIFF_ID,
            communities: []
        });
    }
});

/**
 * 會員方案頁面
 * GET /liff/premium
 */
router.get('/premium', (req, res) => {
    res.render('liff/premium', {
        title: '升級會員 - 退休福音',
        liffId: LIFF_ID,
        plans: [
            {
                name: '月費方案',
                price: 99,
                period: '月',
                features: ['無限推薦', '進階篩選', '優先客服']
            },
            {
                name: '年費方案',
                price: 990,
                period: '年',
                features: ['無限推薦', '進階篩選', '優先客服', '家人關懷功能', '專屬活動']
            },
            {
                name: '家庭方案',
                price: 149,
                period: '月',
                features: ['2 個帳號', '家人動態', '位置關懷', 'SOS 功能']
            }
        ]
    });
});

/**
 * Onboarding 頁面
 * GET /liff/onboarding
 */
router.get('/onboarding', (req, res) => {
    res.render('liff/onboarding', {
        title: '歡迎設定 - 退休福音',
        liffId: LIFF_ID
    });
});

/**
 * 地圖頁面
 * GET /liff/map
 */
router.get('/map', (req, res) => {
    res.render('liff/map', {
        title: '地圖探索 - 退休福音',
        liffId: LIFF_ID,
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    });
});

/**
 * 分享活動頁面
 * GET /liff/share/:type/:id
 */
router.get('/share/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    
    try {
        let data;
        let title;
        
        switch (type) {
            case 'activity':
                data = await Activity.findByPk(id);
                title = data?.name;
                break;
            case 'group':
                data = await Group.findByPk(id);
                title = data?.title;
                break;
            case 'event':
                data = await Event.findByPk(id);
                title = data?.title;
                break;
        }

        if (!data) {
            return res.status(404).render('liff/error', {
                title: '找不到內容',
                message: '此內容不存在',
                liffId: LIFF_ID
            });
        }

        res.render('liff/share', {
            title: `分享 ${title} - 退休福音`,
            liffId: LIFF_ID,
            type,
            data
        });

    } catch (error) {
        logger.error('Error rendering share page:', error);
        res.status(500).render('liff/error', {
            title: '錯誤',
            message: '頁面載入失敗',
            liffId: LIFF_ID
        });
    }
});

module.exports = router;
