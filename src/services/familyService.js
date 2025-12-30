/**
 * 家人關懷服務
 */
const logger = require('../utils/logger');
const { User, FamilyLink, UserWishlist, Activity, Group, GroupMember } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * 產生邀請碼
 */
function generateInviteCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * 設定或取得用戶的邀請碼
 */
async function getOrCreateInviteCode(userId) {
    try {
        var user = await User.findByPk(userId);
        if (!user) return null;

        if (!user.referralCode) {
            var code = generateInviteCode();
            await user.update({ referralCode: code });
            return code;
        }
        return user.referralCode;
    } catch (error) {
        logger.error('getOrCreateInviteCode error:', error);
        return null;
    }
}

/**
 * 透過邀請碼連結家人
 */
async function linkByInviteCode(familyUserId, inviteCode, relationship) {
    try {
        var elder = await User.findOne({
            where: { referralCode: inviteCode.toUpperCase() }
        });

        if (!elder) {
            return { success: false, message: '找不到此邀請碼，請確認後重試' };
        }

        if (elder.id === familyUserId) {
            return { success: false, message: '不能連結自己' };
        }

        var existing = await FamilyLink.findOne({
            where: { elderId: elder.id, familyId: familyUserId }
        });

        if (existing) {
            return { success: false, message: '已經連結過了' };
        }

        await FamilyLink.create({
            elderId: elder.id,
            familyId: familyUserId,
            relationship: relationship || 'family',
            status: 'approved'
        });

        return {
            success: true,
            elderName: elder.displayName,
            message: '成功連結 ' + elder.displayName
        };

    } catch (error) {
        logger.error('linkByInviteCode error:', error);
        return { success: false, message: '連結失敗，請稍後再試' };
    }
}

/**
 * 取得我連結的長輩列表（我是家人）
 */
async function getMyElders(familyUserId) {
    try {
        var links = await FamilyLink.findAll({
            where: { familyId: familyUserId, status: 'approved' }
        });

        var elders = [];
        for (var i = 0; i < links.length; i++) {
            var elder = await User.findByPk(links[i].elderId);
            if (elder) {
                elders.push({ link: links[i], elder: elder });
            }
        }
        return elders;
    } catch (error) {
        logger.error('getMyElders error:', error);
        return [];
    }
}

/**
 * 取得連結我的家人列表（我是長輩）
 */
async function getMyFamily(elderUserId) {
    try {
        var links = await FamilyLink.findAll({
            where: { elderId: elderUserId, status: 'approved' }
        });

        var family = [];
        for (var i = 0; i < links.length; i++) {
            var member = await User.findByPk(links[i].familyId);
            if (member) {
                family.push({ link: links[i], member: member });
            }
        }
        return family;
    } catch (error) {
        logger.error('getMyFamily error:', error);
        return [];
    }
}

/**
 * 取得長輩的最近動態
 */
async function getElderActivities(elderId, familyId) {
    try {
        var link = await FamilyLink.findOne({
            where: { elderId: elderId, familyId: familyId, status: 'approved' }
        });

        if (!link) {
            return { success: false, message: '沒有權限查看' };
        }

        var privacy = link.privacySettings || {};
        var activities = [];
        var elder = await User.findByPk(elderId);

        if (privacy.showActivity !== false) {
            var checkins = await UserWishlist.findAll({
                where: { userId: elderId, isVisited: true },
                include: [{ model: Activity, as: 'activity' }],
                order: [['visitedAt', 'DESC']],
                limit: 5
            });

            checkins.forEach(function(c) {
                activities.push({
                    type: 'checkin',
                    icon: '📍',
                    title: c.activity ? c.activity.name : '景點打卡',
                    time: c.visitedAt,
                    photoUrl: c.checkInPhotoUrl
                });
            });
        }

        if (privacy.showGroups !== false) {
            var memberships = await GroupMember.findAll({
                where: { userId: elderId, status: 'approved' },
                include: [{
                    model: Group,
                    as: 'group',
                    where: { status: { [Op.in]: ['open', 'full', 'confirmed'] } },
                    required: false
                }],
                order: [['createdAt', 'DESC']],
                limit: 3
            });

            memberships.forEach(function(m) {
                if (m.group) {
                    activities.push({
                        type: 'group',
                        icon: '🎉',
                        title: '參加揪團：' + m.group.title,
                        time: m.joinedAt || m.createdAt,
                        date: m.group.eventDate
                    });
                }
            });
        }

        activities.sort(function(a, b) {
            return new Date(b.time) - new Date(a.time);
        });

        return {
            success: true,
            elder: elder,
            activities: activities.slice(0, 10),
            lastActive: elder.lastActiveAt
        };

    } catch (error) {
        logger.error('getElderActivities error:', error);
        return { success: false, message: '取得動態失敗' };
    }
}

/**
 * 發送 SOS 緊急通知
 */
async function sendSOS(elderUserId, client, message) {
    try {
        var elder = await User.findByPk(elderUserId);
        if (!elder) {
            return { success: false, message: '用戶不存在' };
        }

        var links = await FamilyLink.findAll({
            where: { elderId: elderUserId, status: 'approved', notifyOnSOS: true }
        });

        if (links.length === 0) {
            return { success: false, message: '尚未連結任何家人' };
        }

        var notified = 0;
        for (var i = 0; i < links.length; i++) {
            var family = await User.findByPk(links[i].familyId);
            if (family && family.lineUserId) {
                try {
                    await client.pushMessage({
                        to: family.lineUserId,
                        messages: [{
                            type: 'flex',
                            altText: '🚨 緊急通知！',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    backgroundColor: '#E74C3C',
                                    paddingAll: 'lg',
                                    contents: [
                                        { type: 'text', text: '🚨 緊急通知', weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' }
                                    ]
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    paddingAll: 'xl',
                                    contents: [
                                        { type: 'text', text: elder.displayName + ' 發送了緊急求助！', size: 'md', color: '#333333', weight: 'bold', wrap: true },
                                        { type: 'text', text: message || '請盡快聯繫確認安全', size: 'sm', color: '#666666', margin: 'lg', wrap: true },
                                        { type: 'separator', margin: 'xl' },
                                        { type: 'text', text: '📞 請立即聯繫確認', size: 'sm', color: '#E74C3C', margin: 'lg', weight: 'bold' }
                                    ]
                                }
                            }
                        }]
                    });
                    notified++;
                } catch (e) {
                    logger.error('Failed to notify family:', e.message);
                }
            }
        }

        return { success: true, notified: notified, message: '已通知 ' + notified + ' 位家人' };

    } catch (error) {
        logger.error('sendSOS error:', error);
        return { success: false, message: '發送失敗' };
    }
}

/**
 * 解除家人連結
 */
async function unlinkFamily(elderId, familyId) {
    try {
        var deleted = await FamilyLink.destroy({
            where: { elderId: elderId, familyId: familyId }
        });
        return deleted > 0;
    } catch (error) {
        logger.error('unlinkFamily error:', error);
        return false;
    }
}

module.exports = {
    generateInviteCode: generateInviteCode,
    getOrCreateInviteCode: getOrCreateInviteCode,
    linkByInviteCode: linkByInviteCode,
    getMyElders: getMyElders,
    getMyFamily: getMyFamily,
    getElderActivities: getElderActivities,
    sendSOS: sendSOS,
    unlinkFamily: unlinkFamily
};
