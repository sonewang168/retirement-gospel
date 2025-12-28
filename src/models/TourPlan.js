/**
 * AI 生成行程收藏
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
            type: DataTypes.STRING,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false
        },
        days: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        source: {
            type: DataTypes.STRING,
            defaultValue: 'AI'
        },
        estimatedCostMin: {
            type: DataTypes.INTEGER,
            field: 'estimated_cost_min'
        },
        estimatedCostMax: {
            type: DataTypes.INTEGER,
            field: 'estimated_cost_max'
        },
        highlights: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        itinerary: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        tips: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        bestSeason: {
            type: DataTypes.STRING,
            field: 'best_season'
        },
        status: {
            type: DataTypes.ENUM('saved', 'planned', 'completed'),
            defaultValue: 'saved'
        },
        plannedDate: {
            type: DataTypes.DATE,
            field: 'planned_date'
        },
        note: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'tour_plans',
        underscored: true,
        timestamps: true
    });

    return TourPlan;
};