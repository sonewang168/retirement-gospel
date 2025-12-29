/**
 * Activity Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Activity = sequelize.define('Activity', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        shortDescription: {
            type: DataTypes.STRING(500),
            field: 'short_description'
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        subcategory: {
            type: DataTypes.STRING(50)
        },
        city: {
            type: DataTypes.STRING(50)
        },
        district: {
            type: DataTypes.STRING(50)
        },
        address: {
            type: DataTypes.STRING(500)
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8)
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8)
        },
        difficultyLevel: {
            type: DataTypes.STRING(20),
            defaultValue: 'easy',
            field: 'difficulty_level'
        },
        estimatedDuration: {
            type: DataTypes.INTEGER,
            field: 'estimated_duration'
        },
        costMin: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'cost_min'
        },
        costMax: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'cost_max'
        },
        isIndoor: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_indoor'
        },
        isAccessible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_accessible'
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        rating: {
            type: DataTypes.DECIMAL(2, 1),
            defaultValue: 4.0
        },
        isFeatured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_featured'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'activities',
        underscored: true,
        timestamps: true
    });

    return Activity;
};