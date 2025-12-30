/**
 * UserWishlist Model
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
        isVisited: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_visited'
        },
        visitedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'visited_at'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'user_wishlists',
        timestamps: true,
        underscored: true
    });

    return UserWishlist;
};