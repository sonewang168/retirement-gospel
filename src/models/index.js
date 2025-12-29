/**
 * 資料庫 Models（完整版）
 */
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// 載入 Models
const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const TourPlan = require('./TourPlan')(sequelize);
const Group = require('./Group')(sequelize);
const Event = require('./Event')(sequelize);
const Community = require('./Community')(sequelize);
const ConversationState = require('./ConversationState')(sequelize);
const HealthReminder = require('./HealthReminder')(sequelize);
const UserWishlist = require('./UserWishlist')(sequelize);

// 關聯設定
User.hasMany(TourPlan, { foreignKey: 'userId' });
TourPlan.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(HealthReminder, { foreignKey: 'userId' });
HealthReminder.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserWishlist, { foreignKey: 'userId' });
UserWishlist.belongsTo(User, { foreignKey: 'userId' });

UserWishlist.belongsTo(Activity, { foreignKey: 'activityId' });
Activity.hasMany(UserWishlist, { foreignKey: 'activityId' });

User.hasMany(Group, { foreignKey: 'creatorId', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

User.hasOne(ConversationState, { foreignKey: 'userId' });
ConversationState.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    Sequelize,
    User,
    Activity,
    TourPlan,
    Group,
    Event,
    Community,
    ConversationState,
    HealthReminder,
    UserWishlist
};