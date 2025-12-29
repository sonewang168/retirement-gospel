/**
 * UserWishlist Model - 想去清單
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserWishlist = sequelize.define('UserWishlist', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id'
        },
        activityId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'activity_id'
        },
        note: {
            type: DataTypes.STRING(500)
        },
        isVisited: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_visited'
        },
        visitedAt: {
            type: DataTypes.DATE,
            field: 'visited_at'
        }
    }, {
        tableName: 'user_wishlists',
        underscored: true,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'activity_id']
            }
        ]
    });

    return UserWishlist;
};