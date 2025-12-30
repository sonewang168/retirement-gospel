/**
 * User Model（達人等級版）
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
            unique: true
        },
        displayName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pictureUrl: {
            type: DataTypes.TEXT,
            allowNull: true
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
            defaultValue: true
        },
        morningPushTime: {
            type: DataTypes.STRING,
            defaultValue: '06:00'
        },
        // 達人系統
        visitedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        expertLevel: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        expertTitle: {
            type: DataTypes.STRING,
            defaultValue: '新手旅人'
        },
        badges: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        totalPoints: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // 統計
        totalTours: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastActiveAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        birthday: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        onboardingCompleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        referralCode: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'users',
        timestamps: true
    });

    return User;
};