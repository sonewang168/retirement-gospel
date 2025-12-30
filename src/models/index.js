/**
 * Models Index（關聯修正版）
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

// 定義關聯
User.hasMany(TourPlan, { foreignKey: 'userId', as: 'tourPlans' });
TourPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(ConversationState, { foreignKey: 'userId', as: 'conversationState' });
ConversationState.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(HealthReminder, { foreignKey: 'userId', as: 'healthReminders' });
HealthReminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 想去清單關聯（重要：設定別名為小寫）
User.hasMany(UserWishlist, { foreignKey: 'userId', as: 'wishlists' });
UserWishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Activity.hasMany(UserWishlist, { foreignKey: 'activityId', as: 'wishlists' });
UserWishlist.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

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
    UserWishlist
};