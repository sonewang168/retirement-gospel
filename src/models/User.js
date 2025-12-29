/**
 * User Model
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
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'line_user_id'
        },
        displayName: {
            type: DataTypes.STRING(100),
            field: 'display_name'
        },
        pictureUrl: {
            type: DataTypes.STRING(500),
            field: 'picture_url'
        },
        city: {
            type: DataTypes.STRING(50),
            defaultValue: '高雄市'
        },
        district: {
            type: DataTypes.STRING(50)
        },
        interests: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        notificationEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'notification_enabled'
        },
        morningPushTime: {
            type: DataTypes.STRING(10),
            defaultValue: '06:00',
            field: 'morning_push_time'
        },
        referralCode: {
            type: DataTypes.STRING(10),
            field: 'referral_code'
        },
        onboardingCompleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'onboarding_completed'
        },
        lastActiveAt: {
            type: DataTypes.DATE,
            field: 'last_active_at'
        }
    }, {
        tableName: 'users',
        underscored: true,
        timestamps: true
    });

    return User;
};