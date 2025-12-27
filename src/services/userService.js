/**
 * ============================================
 * 用戶服務
 * ============================================
 */

const { 
    User, UserHealth, UserInterest, UserActivity, 
    MedicationReminder, AppointmentReminder, FamilyLink,
    ConversationState, UsageStats, CommunityMember
} = require('../models');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

/**
 * 建立或更新用戶
 */
async function createOrUpdateUser(userData) {
    try {
        const [user, created] = await User.findOrCreate({
            where: { lineUserId: userData.lineUserId },
            defaults: {
                displayName: userData.displayName,
                pictureUrl: userData.pictureUrl,
                referralCode: generateReferralCode()
            }
        });

        if (!created && userData.displayName) {
            await user.update({
                displayName: userData.displayName,
                pictureUrl: userData.pictureUrl,
                lastActiveAt: new Date()
            });
        }

        return user;
    } catch (error) {
        logger.error('Error creating/updating user:', error);
        throw error;
    }
}

/**
 * 取得或建立用戶
 */
async function getOrCreateUser(lineUserId, client) {
    try {
        let user = await User.findOne({
            where: { lineUserId }
        });

        if (!user && client) {
            const profile = await client.getProfile(lineUserId);
            user = await createOrUpdateUser({
                lineUserId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl
            });
        }

        return user;
    } catch (error) {
        logger.error('Error getting/creating user:', error);
        throw error;
    }
}

/**
 * 停用用戶
 */
async function deactivateUser(lineUserId) {
    try {
        await User.update(
            { isActive: false },
            { where: { lineUserId } }
        );
    } catch (error) {
        logger.error('Error deactivating user:', error);
    }
}

/**
 * 更新最後活躍時間
 */
async function updateLastActive(userId) {
    try {
        await User.update(
            { lastActiveAt: new Date() },
            { where: { id: userId } }
        );
    } catch (error) {
        logger.error('Error updating last active:', error);
    }
}

/**
 * 更新用戶城市
 */
async function updateUserCity(userId, city) {
    try {
        await User.update({ city }, { where: { id: userId } });
    } catch (error) {
        logger.error('Error updating user city:', error);
        throw error;
    }
}

/**
 * 更新行動能力
 */
async function updateMobility(userId, mobilityLevel) {
    try {
        await User.update({ mobilityLevel }, { where: { id: userId } });
    } catch (error) {
        logger.error('Error updating mobility:', error);
        throw error;
    }
}

/**
 * 更新興趣
 */
async function updateInterests(userId, interests) {
    try {
        // 刪除舊的興趣
        await UserInterest.destroy({ where: { userId } });

        // 新增新的興趣
        const interestRecords = interests.map(category => ({
            userId,
            category,
            weight: 1.0
        }));

        await UserInterest.bulkCreate(interestRecords);
    } catch (error) {
        logger.error('Error updating interests:', error);
        throw error;
    }
}

/**
 * 更新交通方式
 */
async function updateTransport(userId, modes) {
    try {
        await User.update(
            { transportMode: modes },
            { where: { id: userId } }
        );
    } catch (error) {
        logger.error('Error updating transport:', error);
        throw error;
    }
}

/**
 * 完成 Onboarding
 */
async function completeOnboarding(userId) {
    try {
        await User.update(
            { 
                onboardingCompleted: true,
                onboardingStep: 4
            },
            { where: { id: userId } }
        );

        // 清除對話狀態
        await ConversationState.destroy({ where: { userId } });
    } catch (error) {
        logger.error('Error completing onboarding:', error);
        throw error;
    }
}

/**
 * 取得用戶計畫中的活動
 */
async function getUserPlannedActivities(userId) {
    try {
        const activities = await UserActivity.findAll({
            where: {
                userId,
                status: ['planned', 'wishlist']
            },
            include: ['Activity'],
            order: [['plannedDate', 'ASC']]
        });
        return activities;
    } catch (error) {
        logger.error('Error getting planned activities:', error);
        return [];
    }
}

/**
 * 取得用戶收藏清單
 */
async function getUserWishlist(userId) {
    try {
        const wishlist = await UserActivity.findAll({
            where: {
                userId,
                status: 'wishlist'
            },
            include: ['Activity'],
            order: [['createdAt', 'DESC']]
        });
        return wishlist;
    } catch (error) {
        logger.error('Error getting wishlist:', error);
        return [];
    }
}

/**
 * 取得用戶活動歷史
 */
async function getUserActivityHistory(userId) {
    try {
        const history = await UserActivity.findAll({
            where: {
                userId,
                status: 'completed'
            },
            include: ['Activity'],
            order: [['completedDate', 'DESC']],
            limit: 50
        });
        return history;
    } catch (error) {
        logger.error('Error getting activity history:', error);
        return [];
    }
}

/**
 * 加入收藏
 */
async function saveToWishlist(userId, activityId) {
    try {
        await UserActivity.findOrCreate({
            where: { userId, activityId },
            defaults: { status: 'wishlist' }
        });
    } catch (error) {
        logger.error('Error saving to wishlist:', error);
        throw error;
    }
}

/**
 * 移除收藏
 */
async function removeFromWishlist(userId, activityId) {
    try {
        await UserActivity.destroy({
            where: { userId, activityId, status: 'wishlist' }
        });
    } catch (error) {
        logger.error('Error removing from wishlist:', error);
        throw error;
    }
}

/**
 * 加入行程
 */
async function addToSchedule(userId, activityId, plannedDate = new Date()) {
    try {
        const [record, created] = await UserActivity.findOrCreate({
            where: { userId, activityId },
            defaults: {
                status: 'planned',
                plannedDate
            }
        });

        if (!created) {
            await record.update({
                status: 'planned',
                plannedDate
            });
        }

        return record;
    } catch (error) {
        logger.error('Error adding to schedule:', error);
        throw error;
    }
}

/**
 * 完成活動
 */
async function completeActivity(userId, activityId) {
    try {
        await UserActivity.update(
            {
                status: 'completed',
                completedDate: new Date()
            },
            { where: { userId, activityId } }
        );
    } catch (error) {
        logger.error('Error completing activity:', error);
        throw error;
    }
}

/**
 * 評價活動
 */
async function rateActivity(userId, activityId, rating, review = null) {
    try {
        await UserActivity.update(
            { rating, review },
            { where: { userId, activityId } }
        );
    } catch (error) {
        logger.error('Error rating activity:', error);
        throw error;
    }
}

/**
 * 取消活動
 */
async function cancelActivity(userId, activityId) {
    try {
        await UserActivity.update(
            { status: 'cancelled' },
            { where: { userId, activityId } }
        );
    } catch (error) {
        logger.error('Error cancelling activity:', error);
        throw error;
    }
}

/**
 * 更新通知設定
 */
async function updateNotificationSetting(userId, enabled) {
    try {
        await User.update(
            { notificationEnabled: enabled },
            { where: { id: userId } }
        );
    } catch (error) {
        logger.error('Error updating notification setting:', error);
        throw error;
    }
}

/**
 * 取得用戶用藥提醒
 */
async function getUserMedications(userId) {
    try {
        return await MedicationReminder.findAll({
            where: { userId, isActive: true },
            order: [['createdAt', 'DESC']]
        });
    } catch (error) {
        logger.error('Error getting medications:', error);
        return [];
    }
}

/**
 * 新增用藥提醒
 */
async function addMedication(userId, medicationData) {
    try {
        return await MedicationReminder.create({
            userId,
            ...medicationData
        });
    } catch (error) {
        logger.error('Error adding medication:', error);
        throw error;
    }
}

/**
 * 取得用戶回診提醒
 */
async function getUserAppointments(userId) {
    try {
        return await AppointmentReminder.findAll({
            where: {
                userId,
                status: 'scheduled',
                appointmentDate: {
                    [require('sequelize').Op.gte]: new Date()
                }
            },
            order: [['appointmentDate', 'ASC']]
        });
    } catch (error) {
        logger.error('Error getting appointments:', error);
        return [];
    }
}

/**
 * 新增回診提醒
 */
async function addAppointment(userId, appointmentData) {
    try {
        return await AppointmentReminder.create({
            userId,
            ...appointmentData
        });
    } catch (error) {
        logger.error('Error adding appointment:', error);
        throw error;
    }
}

/**
 * 產生家人邀請碼
 */
async function generateFamilyInviteCode(userId) {
    try {
        const code = generateInviteCode();
        
        await FamilyLink.create({
            parentUserId: userId,
            inviteCode: code,
            status: 'pending'
        });

        return code;
    } catch (error) {
        logger.error('Error generating family invite code:', error);
        throw error;
    }
}

/**
 * 取得用戶家人列表
 */
async function getUserFamily(userId) {
    try {
        const asParent = await FamilyLink.findAll({
            where: { parentUserId: userId, status: 'approved' },
            include: [{ model: User, as: 'child' }]
        });

        const asChild = await FamilyLink.findAll({
            where: { childUserId: userId, status: 'approved' },
            include: [{ model: User, as: 'parent' }]
        });

        return { asParent, asChild };
    } catch (error) {
        logger.error('Error getting user family:', error);
        return { asParent: [], asChild: [] };
    }
}

/**
 * 加入社群
 */
async function joinCommunity(userId, communityId) {
    try {
        await CommunityMember.findOrCreate({
            where: { userId, communityId },
            defaults: {
                status: 'approved',
                joinedAt: new Date()
            }
        });
    } catch (error) {
        logger.error('Error joining community:', error);
        throw error;
    }
}

/**
 * 記錄使用統計
 */
async function recordUsageStats(userId, eventType, eventData = {}) {
    try {
        const today = moment().format('YYYY-MM-DD');
        
        await UsageStats.create({
            userId,
            date: today,
            eventType,
            eventData
        });
    } catch (error) {
        logger.error('Error recording usage stats:', error);
    }
}

/**
 * 取得需要推播的用戶
 */
async function getUsersForPush(pushTime) {
    try {
        const users = await User.findAll({
            where: {
                isActive: true,
                notificationEnabled: true,
                morningPushTime: pushTime
            }
        });
        return users;
    } catch (error) {
        logger.error('Error getting users for push:', error);
        return [];
    }
}

/**
 * 取得用戶完整資料（含關聯）
 */
async function getUserWithDetails(userId) {
    try {
        const user = await User.findByPk(userId, {
            include: [
                { model: UserHealth, as: 'health' },
                { model: UserInterest, as: 'interests' }
            ]
        });
        return user;
    } catch (error) {
        logger.error('Error getting user with details:', error);
        throw error;
    }
}

// ============================================
// 工具函數
// ============================================

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ============================================
// 匯出
// ============================================
module.exports = {
    createOrUpdateUser,
    getOrCreateUser,
    deactivateUser,
    updateLastActive,
    updateUserCity,
    updateMobility,
    updateInterests,
    updateTransport,
    completeOnboarding,
    getUserPlannedActivities,
    getUserWishlist,
    getUserActivityHistory,
    saveToWishlist,
    removeFromWishlist,
    addToSchedule,
    completeActivity,
    rateActivity,
    cancelActivity,
    updateNotificationSetting,
    getUserMedications,
    addMedication,
    getUserAppointments,
    addAppointment,
    generateFamilyInviteCode,
    getUserFamily,
    joinCommunity,
    recordUsageStats,
    getUsersForPush,
    getUserWithDetails
};
