/**
 * Models Index（家人關懷 + 揪團功能版）
 */
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// 載入 Models
const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const TourPlan = require('./TourPlan')(sequelize);
const ConversationState = require('./ConversationState')(sequelize);
const HealthReminder = require('./HealthReminder')(sequelize);
const UserWishlist = require('./UserWishlist')(sequelize);
const Group = require('./Group')(sequelize);
const GroupMember = require('./GroupMember')(sequelize);
const Event = require('./Event')(sequelize);
const FamilyLink = require('./FamilyLink')(sequelize);

// ========== 既有關聯 ==========

User.hasMany(TourPlan, { foreignKey: 'userId', as: 'tourPlans' });
TourPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(ConversationState, { foreignKey: 'userId', as: 'conversationState' });
ConversationState.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(HealthReminder, { foreignKey: 'userId', as: 'healthReminders' });
HealthReminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserWishlist, { foreignKey: 'userId', as: 'wishlists' });
UserWishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Activity.hasMany(UserWishlist, { foreignKey: 'activityId', as: 'wishlists' });
UserWishlist.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

// ========== 揪團關聯 ==========

User.hasMany(Group, { foreignKey: 'creatorId', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Activity.hasMany(Group, { foreignKey: 'activityId', as: 'groups' });
Group.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

Event.hasMany(Group, { foreignKey: 'eventId', as: 'groups' });
Group.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

User.hasMany(GroupMember, { foreignKey: 'userId', as: 'groupMemberships' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ========== 家人關懷關聯 ==========

// 長輩 -> 多個家人連結
User.hasMany(FamilyLink, { foreignKey: 'elderId', as: 'familyLinks' });
FamilyLink.belongsTo(User, { foreignKey: 'elderId', as: 'elder' });

// 家人 -> 多個長輩連結
User.hasMany(FamilyLink, { foreignKey: 'familyId', as: 'elderLinks' });
FamilyLink.belongsTo(User, { foreignKey: 'familyId', as: 'family' });

// 測試連線
sequelize.authenticate()
    .then(() => logger.info('✅ 資料庫連線成功'))
    .catch(err => logger.error('❌ 資料庫連線失敗:', err));

module.exports = {
    sequelize,
    Sequelize,
    User,
    Activity,
    TourPlan,
    ConversationState,
    HealthReminder,
    UserWishlist,
    Group,
    GroupMember,
    Event,
    FamilyLink
};
