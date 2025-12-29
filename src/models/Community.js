/**
 * Community Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Community = sequelize.define('Community', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        category: {
            type: DataTypes.STRING(50)
        },
        memberCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'member_count'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'communities',
        underscored: true,
        timestamps: true
    });

    return Community;
};