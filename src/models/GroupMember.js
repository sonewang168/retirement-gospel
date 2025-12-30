/**
 * GroupMember Model（揪團成員）
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GroupMember = sequelize.define('GroupMember', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        groupId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'group_id'
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id'
        },
        role: {
            type: DataTypes.STRING(20),
            defaultValue: 'member'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending'
        },
        message: {
            type: DataTypes.TEXT
        },
        joinedAt: {
            type: DataTypes.DATE,
            field: 'joined_at'
        },
        checkedIn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'checked_in'
        },
        checkInTime: {
            type: DataTypes.DATE,
            field: 'check_in_time'
        },
        checkInPhotoUrl: {
            type: DataTypes.TEXT,
            field: 'check_in_photo_url'
        },
        rating: {
            type: DataTypes.INTEGER,
            validate: { min: 1, max: 5 }
        },
        review: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'group_members',
        underscored: true,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['group_id', 'user_id']
            }
        ]
    });

    return GroupMember;
};
