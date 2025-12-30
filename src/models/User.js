/**
 * User Model（欄位映射版）
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        lineUserId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: 'line_user_id'
        },
        displayName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'display_name'
        },
        pictureUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'picture_url'
        },
        city: {
            type: DataTypes.STRING,
            defaultValue: '高雄市'
        },
        interests: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        notificationEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'notification_enabled'
        },
        morningPushTime: {
            type: DataTypes.STRING,
            defaultValue: '06:00',
            field: 'morning_push_time'
        },
        visitedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'visited_count'
        },
        expertLevel: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'expert_level'
        },
        expertTitle: {
            type: DataTypes.STRING,
            defaultValue: '新手旅人',
            field: 'expert_title'
        },
        badges: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        totalPoints: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_points'
        },
        totalTours: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_tours'
        },
        lastActiveAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'last_active_at'
        },
        birthday: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        onboardingCompleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'onboarding_completed'
        },
        referralCode: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'referral_code'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true
    });

    return User;
};