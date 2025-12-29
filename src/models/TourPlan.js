/**
 * TourPlan Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TourPlan = sequelize.define('TourPlan', {
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
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        country: {
            type: DataTypes.STRING(100)
        },
        days: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        },
        source: {
            type: DataTypes.STRING(50),
            defaultValue: 'AI'
        },
        highlights: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        itinerary: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        tips: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        estimatedCostMin: {
            type: DataTypes.INTEGER,
            field: 'estimated_cost_min'
        },
        estimatedCostMax: {
            type: DataTypes.INTEGER,
            field: 'estimated_cost_max'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft'
        }
    }, {
        tableName: 'tour_plans',
        underscored: true,
        timestamps: true
    });

    return TourPlan;
};