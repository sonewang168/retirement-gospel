/**
 * User Service（達人等級版）
 */
const logger = require('../utils/logger');
const { User, UserWishlist, Activity } = require('../models');

// 達人等級對照表
const EXPERT_LEVELS = [
    { level: 0, title: '🌱 新手旅人', minVisits: 0, badge: '新手' },
    { level: 1, title: '🚶 初級探索者', minVisits: 10, badge: '探索者' },
    { level: 2, title: '🏃 中級旅行家', minVisits: 20, badge: '旅行家' },
    { level: 3, title: '🚴 高級冒險家', minVisits: 30, badge: '冒險家' },
    { level: 4, title: '🏆 資深達人', minVisits: 50, badge: '達人' },
    { level: 5, title: '👑 旅遊大師', minVisits: 80, badge: '大師' },
    { level: 6, title: '🌟 傳奇旅人', minVisits: 100, badge: '傳奇' }
];

// 分類達人
const CATEGORY_EXPERT = {
    culture: { title: '文化達人', emoji: '🏛️', minVisits: 5 },
    nature: { title: '自然達人', emoji: '🌳', minVisits: 5 },
    religion: { title: '宗教達人', emoji: '🙏', minVisits: 5 },
    food: { title: '美食達人', emoji: '🍜', minVisits: 5 },
    sports: { title: '運動達人', emoji: '💪', minVisits: 5 },
    entertainment: { title: '娛樂達人', emoji: '🎭', minVisits: 5 }
};

class UserService {
    async createOrUpdateUser(data) {
        try {
            var [user, created] = await User.findOrCreate({
                where: { lineUserId: data.lineUserId },
                defaults: data
            });

            if (!created) {
                await user.update({
                    displayName: data.displayName || user.displayName,
                    pictureUrl: data.pictureUrl || user.pictureUrl,
                    lastActiveAt: new Date()
                });
            }

            return user;
        } catch (error) {
            logger.error('createOrUpdateUser error:', error);
            throw error;
        }
    }

    async getOrCreateUser(lineUserId, client) {
        try {
            var user = await User.findOne({ where: { lineUserId: lineUserId } });
            
            if (!user) {
                var profile = { displayName: '用戶', pictureUrl: null };
                try {
                    profile = await client.getProfile(lineUserId);
                } catch (e) {}
                
                user = await User.create({
                    lineUserId: lineUserId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl
                });
            }
            
            return user;
        } catch (error) {
            logger.error('getOrCreateUser error:', error);
            throw error;
        }
    }

    async updateLastActive(userId) {
        try {
            await User.update({ lastActiveAt: new Date() }, { where: { id: userId } });
        } catch (error) {
            logger.error('updateLastActive error:', error);
        }
    }

    async completeOnboarding(userId) {
        try {
            await User.update({ onboardingCompleted: true }, { where: { id: userId } });
        } catch (error) {
            logger.error('completeOnboarding error:', error);
        }
    }

    // ========== 想去清單功能 ==========
    async saveToWishlist(userId, activityId) {
        try {
            var existing = await UserWishlist.findOne({
                where: { userId: userId, activityId: activityId }
            });
            
            if (existing) {
                return { success: false, exists: true };
            }
            
            await UserWishlist.create({
                userId: userId,
                activityId: activityId,
                isVisited: false
            });
            
            return { success: true };
        } catch (error) {
            logger.error('saveToWishlist error:', error);
            return { success: false };
        }
    }

    async removeFromWishlist(userId, activityId) {
        try {
            var deleted = await UserWishlist.destroy({
                where: { userId: userId, activityId: activityId }
            });
            return deleted > 0;
        } catch (error) {
            logger.error('removeFromWishlist error:', error);
            return false;
        }
    }

    async markAsVisited(userId, activityId) {
        try {
            var item = await UserWishlist.findOne({
                where: { userId: userId, activityId: activityId }
            });
            
            if (!item) return false;
            
            var wasVisited = item.isVisited;
            var newStatus = !wasVisited;
            
            await item.update({ 
                isVisited: newStatus,
                visitedAt: newStatus ? new Date() : null
            });
            
            // 如果標記為去過，更新達人等級
            if (newStatus && !wasVisited) {
                await this.updateExpertLevel(userId);
            } else if (!newStatus && wasVisited) {
                // 如果取消去過，也要重新計算
                await this.updateExpertLevel(userId);
            }
            
            return true;
        } catch (error) {
            logger.error('markAsVisited error:', error);
            return false;
        }
    }

    async getWishlist(userId) {
        try {
            var items = await UserWishlist.findAll({
                where: { userId: userId },
                include: [{ model: Activity, as: 'activity' }],
                order: [['createdAt', 'DESC']]
            });
            
            return items.map(function(item) {
                return {
                    id: item.id,
                    activityId: item.activityId,
                    isVisited: item.isVisited,
                    visitedAt: item.visitedAt,
                    activity: item.activity
                };
            });
        } catch (error) {
            logger.error('getWishlist error:', error);
            return [];
        }
    }

    // ========== 達人等級系統 ==========
    async updateExpertLevel(userId) {
        try {
            // 計算去過的景點數量
            var visitedCount = await UserWishlist.count({
                where: { userId: userId, isVisited: true }
            });

            // 計算各分類去過的數量
            var visitedItems = await UserWishlist.findAll({
                where: { userId: userId, isVisited: true },
                include: [{ model: Activity, as: 'activity' }]
            });

            var categoryCount = {};
            visitedItems.forEach(function(item) {
                if (item.activity && item.activity.category) {
                    var cat = item.activity.category;
                    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                }
            });

            // 計算總等級
            var newLevel = 0;
            var newTitle = '🌱 新手旅人';
            for (var i = EXPERT_LEVELS.length - 1; i >= 0; i--) {
                if (visitedCount >= EXPERT_LEVELS[i].minVisits) {
                    newLevel = EXPERT_LEVELS[i].level;
                    newTitle = EXPERT_LEVELS[i].title;
                    break;
                }
            }

            // 計算徽章
            var badges = [];
            Object.keys(categoryCount).forEach(function(cat) {
                if (CATEGORY_EXPERT[cat] && categoryCount[cat] >= CATEGORY_EXPERT[cat].minVisits) {
                    badges.push(CATEGORY_EXPERT[cat].emoji + ' ' + CATEGORY_EXPERT[cat].title);
                }
            });

            // 特殊徽章
            if (visitedCount >= 1) badges.push('🎯 首次打卡');
            if (visitedCount >= 10) badges.push('🔟 十景達成');
            if (visitedCount >= 50) badges.push('5️⃣0️⃣ 五十景達成');
            if (visitedCount >= 100) badges.push('💯 百景達成');

            // 計算積分
            var points = visitedCount * 10 + badges.length * 50;

            // 更新用戶
            await User.update({
                visitedCount: visitedCount,
                expertLevel: newLevel,
                expertTitle: newTitle,
                badges: badges,
                totalPoints: points
            }, { where: { id: userId } });

            logger.info('用戶 ' + userId + ' 達人等級更新: Lv.' + newLevel + ' ' + newTitle);

            return {
                visitedCount: visitedCount,
                level: newLevel,
                title: newTitle,
                badges: badges,
                points: points
            };
        } catch (error) {
            logger.error('updateExpertLevel error:', error);
            return null;
        }
    }

    async getExpertStatus(userId) {
        try {
            var user = await User.findByPk(userId);
            if (!user) return null;

            var visitedItems = await UserWishlist.findAll({
                where: { userId: userId, isVisited: true },
                include: [{ model: Activity, as: 'activity' }],
                order: [['visitedAt', 'DESC']]
            });

            var categoryCount = {};
            visitedItems.forEach(function(item) {
                if (item.activity && item.activity.category) {
                    var cat = item.activity.category;
                    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                }
            });

            // 下一級需要的數量
            var nextLevel = EXPERT_LEVELS.find(function(l) { return l.level === user.expertLevel + 1; });
            var nextLevelVisits = nextLevel ? nextLevel.minVisits : null;
            var progress = nextLevelVisits ? Math.round((user.visitedCount / nextLevelVisits) * 100) : 100;

            return {
                user: user,
                visitedCount: user.visitedCount,
                level: user.expertLevel,
                title: user.expertTitle,
                badges: user.badges || [],
                points: user.totalPoints,
                categoryCount: categoryCount,
                recentVisited: visitedItems.slice(0, 5),
                nextLevelVisits: nextLevelVisits,
                progress: Math.min(progress, 100)
            };
        } catch (error) {
            logger.error('getExpertStatus error:', error);
            return null;
        }
    }

    // ========== 統計功能 ==========
    async getUserStats(userId) {
        try {
            var user = await User.findByPk(userId);
            var wishlistCount = await UserWishlist.count({ where: { userId: userId } });
            var visitedCount = await UserWishlist.count({ where: { userId: userId, isVisited: true } });
            
            return {
                wishlistCount: wishlistCount,
                visitedCount: visitedCount,
                expertLevel: user.expertLevel,
                expertTitle: user.expertTitle,
                points: user.totalPoints
            };
        } catch (error) {
            logger.error('getUserStats error:', error);
            return null;
        }
    }
}

module.exports = new UserService();