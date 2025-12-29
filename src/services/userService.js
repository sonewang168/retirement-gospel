/**
 * 用戶服務（完整版）
 */
const logger = require('../utils/logger');
const { User, UserWishlist, Activity } = require('../models');

/**
 * 根據 LINE User ID 取得或建立用戶
 */
async function getOrCreateUser(lineUserId, client) {
    try {
        let user = await User.findOne({ where: { lineUserId: lineUserId } });
        
        if (!user) {
            let profile = { displayName: '用戶', pictureUrl: null };
            
            try {
                if (client && client.getProfile) {
                    profile = await client.getProfile(lineUserId);
                }
            } catch (err) {
                logger.warn('無法取得用戶資料：' + err.message);
            }
            
            user = await User.create({
                lineUserId: lineUserId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                city: '高雄市',
                notificationEnabled: true,
                morningPushTime: '06:00',
                referralCode: generateReferralCode()
            });
            
            logger.info('新用戶建立：' + profile.displayName);
        }
        
        return user;
    } catch (error) {
        logger.error('Error getting/creating user:', error.message);
        throw error;
    }
}

/**
 * 建立或更新用戶
 */
async function createOrUpdateUser(data) {
    try {
        let user = await User.findOne({ where: { lineUserId: data.lineUserId } });
        
        if (user) {
            await user.update({
                displayName: data.displayName || user.displayName,
                pictureUrl: data.pictureUrl || user.pictureUrl
            });
        } else {
            user = await User.create({
                lineUserId: data.lineUserId,
                displayName: data.displayName,
                pictureUrl: data.pictureUrl,
                city: '高雄市',
                notificationEnabled: true,
                morningPushTime: '06:00',
                referralCode: generateReferralCode()
            });
        }
        
        return user;
    } catch (error) {
        logger.error('createOrUpdateUser error:', error);
        throw error;
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
        logger.error('updateLastActive error:', error);
    }
}

/**
 * 完成新手引導
 */
async function completeOnboarding(userId) {
    try {
        await User.update(
            { onboardingCompleted: true },
            { where: { id: userId } }
        );
        return true;
    } catch (error) {
        logger.error('completeOnboarding error:', error);
        return false;
    }
}

/**
 * 更新用戶設定
 */
async function updateSettings(userId, settings) {
    try {
        await User.update(settings, { where: { id: userId } });
        return true;
    } catch (error) {
        logger.error('updateSettings error:', error);
        return false;
    }
}

/**
 * 儲存到想去清單
 */
async function saveToWishlist(userId, activityId) {
    try {
        const existing = await UserWishlist.findOne({
            where: { userId: userId, activityId: activityId }
        });
        
        if (existing) {
            logger.info('Activity already in wishlist');
            return { success: true, exists: true };
        }
        
        await UserWishlist.create({
            userId: userId,
            activityId: activityId
        });
        
        logger.info('User ' + userId + ' saved activity ' + activityId + ' to wishlist');
        return { success: true, exists: false };
    } catch (error) {
        logger.error('saveToWishlist error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 取得用戶想去清單
 */
async function getWishlist(userId) {
    try {
        const wishlist = await UserWishlist.findAll({
            where: { userId: userId },
            include: [{
                model: Activity,
                required: true
            }],
            order: [['createdAt', 'DESC']]
        });
        
        return wishlist.map(function(item) {
            return {
                id: item.id,
                activityId: item.activityId,
                isVisited: item.isVisited,
                visitedAt: item.visitedAt,
                note: item.note,
                activity: item.Activity
            };
        });
    } catch (error) {
        logger.error('getWishlist error:', error);
        return [];
    }
}

/**
 * 從想去清單移除
 */
async function removeFromWishlist(userId, activityId) {
    try {
        const result = await UserWishlist.destroy({
            where: { userId: userId, activityId: activityId }
        });
        return result > 0;
    } catch (error) {
        logger.error('removeFromWishlist error:', error);
        return false;
    }
}

/**
 * 標記已去過
 */
async function markAsVisited(userId, activityId) {
    try {
        const result = await UserWishlist.update(
            { isVisited: true, visitedAt: new Date() },
            { where: { userId: userId, activityId: activityId } }
        );
        return result[0] > 0;
    } catch (error) {
        logger.error('markAsVisited error:', error);
        return false;
    }
}

/**
 * 產生推薦碼
 */
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * 根據 ID 取得用戶
 */
async function getUserById(userId) {
    try {
        return await User.findByPk(userId);
    } catch (error) {
        logger.error('getUserById error:', error);
        return null;
    }
}

/**
 * 根據 LINE User ID 取得用戶
 */
async function getUserByLineId(lineUserId) {
    try {
        return await User.findOne({ where: { lineUserId: lineUserId } });
    } catch (error) {
        logger.error('getUserByLineId error:', error);
        return null;
    }
}

/**
 * 取得所有啟用通知的用戶
 */
async function getActiveUsers() {
    try {
        return await User.findAll({
            where: { notificationEnabled: true }
        });
    } catch (error) {
        logger.error('getActiveUsers error:', error);
        return [];
    }
}

module.exports = {
    getOrCreateUser,
    createOrUpdateUser,
    updateLastActive,
    completeOnboarding,
    updateSettings,
    saveToWishlist,
    getWishlist,
    removeFromWishlist,
    markAsVisited,
    generateReferralCode,
    getUserById,
    getUserByLineId,
    getActiveUsers
};