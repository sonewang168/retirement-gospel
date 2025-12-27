/**
 * ============================================
 * 揪團服務
 * ============================================
 */

const { Group, GroupMember, User, Activity, Event } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

/**
 * 取得公開揪團列表
 */
async function getOpenGroups(city, options = {}) {
    try {
        const { limit = 20, offset = 0, category } = options;

        const whereClause = {
            status: 'open',
            isPublic: true,
            eventDate: {
                [Op.gte]: new Date()
            }
        };

        const includeClause = [
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'displayName', 'pictureUrl']
            },
            {
                model: Activity,
                attributes: ['id', 'name', 'category', 'thumbnailUrl']
            }
        ];

        // 城市篩選（如果揪團有關聯活動）
        if (city) {
            includeClause[1].where = { city };
            includeClause[1].required = false;
        }

        const groups = await Group.findAll({
            where: whereClause,
            include: includeClause,
            order: [['eventDate', 'ASC']],
            limit,
            offset
        });

        return groups;

    } catch (error) {
        logger.error('Error getting open groups:', error);
        return [];
    }
}

/**
 * 取得揪團詳情
 */
async function getGroupDetail(groupId) {
    try {
        const group = await Group.findByPk(groupId, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'displayName', 'pictureUrl']
                },
                {
                    model: GroupMember,
                    as: 'members',
                    where: { status: 'approved' },
                    required: false,
                    include: [{
                        model: User,
                        attributes: ['id', 'displayName', 'pictureUrl']
                    }]
                },
                {
                    model: Activity
                },
                {
                    model: Event
                }
            ]
        });

        return group;

    } catch (error) {
        logger.error('Error getting group detail:', error);
        return null;
    }
}

/**
 * 建立揪團
 */
async function createGroup(creatorId, groupData) {
    try {
        const group = await Group.create({
            creatorId,
            title: groupData.title,
            description: groupData.description,
            activityId: groupData.activityId,
            eventId: groupData.eventId,
            eventDate: groupData.eventDate,
            eventTime: groupData.eventTime,
            meetingPoint: groupData.meetingPoint,
            meetingPointLat: groupData.meetingPointLat,
            meetingPointLng: groupData.meetingPointLng,
            minParticipants: groupData.minParticipants || 2,
            maxParticipants: groupData.maxParticipants || 10,
            currentParticipants: 1, // 發起人算一個
            costPerPerson: groupData.costPerPerson || 0,
            costSplitMethod: groupData.costSplitMethod || 'pay_own',
            requirements: groupData.requirements,
            ageRange: groupData.ageRange,
            genderPreference: groupData.genderPreference,
            difficultyLevel: groupData.difficultyLevel || 'easy',
            status: 'open',
            registrationDeadline: groupData.registrationDeadline,
            tags: groupData.tags || [],
            imageUrl: groupData.imageUrl,
            isPublic: groupData.isPublic !== false
        });

        // 將發起人加入成員列表
        await GroupMember.create({
            groupId: group.id,
            userId: creatorId,
            role: 'organizer',
            status: 'approved',
            joinedAt: new Date()
        });

        return group;

    } catch (error) {
        logger.error('Error creating group:', error);
        throw error;
    }
}

/**
 * 更新揪團
 */
async function updateGroup(groupId, creatorId, updates) {
    try {
        const group = await Group.findOne({
            where: { id: groupId, creatorId }
        });

        if (!group) {
            throw new Error('揪團不存在或您沒有權限編輯');
        }

        await group.update(updates);
        return group;

    } catch (error) {
        logger.error('Error updating group:', error);
        throw error;
    }
}

/**
 * 加入揪團
 */
async function joinGroup(groupId, userId, message = '') {
    try {
        const group = await Group.findByPk(groupId);
        
        if (!group) {
            return { success: false, message: '揪團不存在' };
        }

        if (group.creatorId === userId) {
            return { success: false, message: '您是揪團發起人' };
        }

        // 檢查是否已加入
        const existingMember = await GroupMember.findOne({
            where: { groupId, userId }
        });

        if (existingMember) {
            if (existingMember.status === 'approved') {
                return { success: false, message: '您已經是成員了' };
            }
            if (existingMember.status === 'pending') {
                return { success: false, message: '您已申請過，等待審核中' };
            }
        }

        // 檢查人數
        const isFull = group.currentParticipants >= group.maxParticipants;
        const isWaitlist = isFull;

        // 檢查報名截止
        if (group.registrationDeadline && new Date() > group.registrationDeadline) {
            return { success: false, message: '報名已截止' };
        }

        // 加入成員
        await GroupMember.create({
            groupId,
            userId,
            role: 'member',
            status: isWaitlist ? 'pending' : 'approved',
            message,
            joinedAt: isWaitlist ? null : new Date()
        });

        // 更新人數
        if (!isWaitlist) {
            await group.increment('currentParticipants');
            
            // 檢查是否額滿
            if (group.currentParticipants + 1 >= group.maxParticipants) {
                await group.update({ status: 'full' });
            }
        }

        return { 
            success: true, 
            isWaitlist,
            message: isWaitlist ? '已加入候補名單' : '報名成功！'
        };

    } catch (error) {
        logger.error('Error joining group:', error);
        return { success: false, message: '加入失敗，請稍後再試' };
    }
}

/**
 * 退出揪團
 */
async function leaveGroup(groupId, userId) {
    try {
        const group = await Group.findByPk(groupId);
        if (!group) {
            throw new Error('揪團不存在');
        }

        if (group.creatorId === userId) {
            throw new Error('發起人無法退出，請取消揪團');
        }

        const member = await GroupMember.findOne({
            where: { groupId, userId }
        });

        if (!member) {
            throw new Error('您不是此揪團的成員');
        }

        const wasApproved = member.status === 'approved';

        await member.update({ status: 'withdrawn' });

        // 如果是已批准的成員，減少人數
        if (wasApproved) {
            await group.decrement('currentParticipants');
            
            // 如果原本額滿，更新狀態
            if (group.status === 'full') {
                await group.update({ status: 'open' });
            }

            // 自動讓候補遞補
            await promoteWaitlist(groupId);
        }

        return { success: true };

    } catch (error) {
        logger.error('Error leaving group:', error);
        throw error;
    }
}

/**
 * 候補遞補
 */
async function promoteWaitlist(groupId) {
    try {
        const group = await Group.findByPk(groupId);
        if (!group || group.currentParticipants >= group.maxParticipants) {
            return;
        }

        // 找出最早的候補
        const waitingMember = await GroupMember.findOne({
            where: { groupId, status: 'pending' },
            order: [['createdAt', 'ASC']],
            include: [User]
        });

        if (waitingMember) {
            await waitingMember.update({
                status: 'approved',
                joinedAt: new Date()
            });

            await group.increment('currentParticipants');

            // 通知候補者
            // TODO: 發送 LINE 通知

            logger.info(`Promoted waitlist member ${waitingMember.userId} to group ${groupId}`);
        }

    } catch (error) {
        logger.error('Error promoting waitlist:', error);
    }
}

/**
 * 取消揪團
 */
async function cancelGroup(groupId, creatorId, reason = '') {
    try {
        const group = await Group.findOne({
            where: { id: groupId, creatorId }
        });

        if (!group) {
            throw new Error('揪團不存在或您沒有權限');
        }

        await group.update({
            status: 'cancelled',
            cancelReason: reason
        });

        // 通知所有成員
        const members = await GroupMember.findAll({
            where: { groupId, status: 'approved' },
            include: [User]
        });

        // TODO: 發送取消通知

        return { success: true };

    } catch (error) {
        logger.error('Error cancelling group:', error);
        throw error;
    }
}

/**
 * 取得用戶的揪團列表
 */
async function getUserGroups(userId) {
    try {
        // 發起的揪團
        const createdGroups = await Group.findAll({
            where: { creatorId: userId },
            include: [Activity],
            order: [['eventDate', 'ASC']]
        });

        // 參加的揪團
        const memberships = await GroupMember.findAll({
            where: { userId, status: 'approved' },
            include: [{
                model: Group,
                include: [Activity, { model: User, as: 'creator' }]
            }]
        });

        const joinedGroups = memberships
            .map(m => m.Group)
            .filter(g => g && g.creatorId !== userId);

        return {
            created: createdGroups,
            joined: joinedGroups,
            total: createdGroups.length + joinedGroups.length
        };

    } catch (error) {
        logger.error('Error getting user groups:', error);
        return { created: [], joined: [], total: 0 };
    }
}

/**
 * 成員報到
 */
async function checkIn(groupId, userId) {
    try {
        const member = await GroupMember.findOne({
            where: { groupId, userId, status: 'approved' }
        });

        if (!member) {
            throw new Error('您不是此揪團的成員');
        }

        await member.update({
            checkedIn: true,
            checkInTime: new Date()
        });

        return { success: true };

    } catch (error) {
        logger.error('Error checking in:', error);
        throw error;
    }
}

/**
 * 完成揪團
 */
async function completeGroup(groupId, creatorId) {
    try {
        const group = await Group.findOne({
            where: { id: groupId, creatorId }
        });

        if (!group) {
            throw new Error('揪團不存在或您沒有權限');
        }

        await group.update({ status: 'completed' });

        // 可以在這裡觸發評價流程

        return { success: true };

    } catch (error) {
        logger.error('Error completing group:', error);
        throw error;
    }
}

/**
 * 評價揪團
 */
async function rateGroup(groupId, userId, rating, review = '') {
    try {
        const member = await GroupMember.findOne({
            where: { groupId, userId }
        });

        if (!member) {
            throw new Error('您不是此揪團的成員');
        }

        await member.update({ rating, review });

        // 更新揪團平均評分
        // TODO: 計算並更新

        return { success: true };

    } catch (error) {
        logger.error('Error rating group:', error);
        throw error;
    }
}

/**
 * 搜尋揪團
 */
async function searchGroups(query, options = {}) {
    try {
        const { city, category, dateFrom, dateTo, limit = 20 } = options;

        const whereClause = {
            status: 'open',
            isPublic: true,
            [Op.or]: [
                { title: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } },
                { tags: { [Op.contains]: [query.toLowerCase()] } }
            ]
        };

        if (dateFrom) {
            whereClause.eventDate = { [Op.gte]: dateFrom };
        }
        if (dateTo) {
            whereClause.eventDate = { ...whereClause.eventDate, [Op.lte]: dateTo };
        }

        const groups = await Group.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['displayName', 'pictureUrl'] },
                { model: Activity, where: category ? { category } : undefined, required: !!category }
            ],
            order: [['eventDate', 'ASC']],
            limit
        });

        return groups;

    } catch (error) {
        logger.error('Error searching groups:', error);
        return [];
    }
}

/**
 * 取得即將到來的揪團提醒
 */
async function getUpcomingGroups() {
    try {
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();
        const dayAfterTomorrow = moment().add(2, 'days').startOf('day').toDate();

        const groups = await Group.findAll({
            where: {
                status: { [Op.in]: ['open', 'full', 'confirmed'] },
                eventDate: {
                    [Op.gte]: tomorrow,
                    [Op.lt]: dayAfterTomorrow
                }
            },
            include: [{
                model: GroupMember,
                as: 'members',
                where: { status: 'approved' },
                include: [User]
            }]
        });

        return groups;

    } catch (error) {
        logger.error('Error getting upcoming groups:', error);
        return [];
    }
}

module.exports = {
    getOpenGroups,
    getGroupDetail,
    createGroup,
    updateGroup,
    joinGroup,
    leaveGroup,
    cancelGroup,
    getUserGroups,
    checkIn,
    completeGroup,
    rateGroup,
    searchGroups,
    getUpcomingGroups
};
