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
            field: 'difficulty_level',
            defaultValue: 'easy'
        },
        estimatedDuration: {
            type: DataTypes.INTEGER,
            field: 'estimated_duration',
            comment: '預估時間（分鐘）'
        },
        costMin: {
            type: DataTypes.INTEGER,
            field: 'cost_min',
            defaultValue: 0
        },
        costMax: {
            type: DataTypes.INTEGER,
            field: 'cost_max',
            defaultValue: 0
        },
        costDescription: {
            type: DataTypes.STRING(200),
            field: 'cost_description'
        },
        openingHours: {
            type: DataTypes.JSONB,
            field: 'opening_hours'
        },
        contactPhone: {
            type: DataTypes.STRING(20),
            field: 'contact_phone'
        },
        website: {
            type: DataTypes.STRING(500)
        },
        isIndoor: {
            type: DataTypes.BOOLEAN,
            field: 'is_indoor',
            defaultValue: false
        },
        isAccessible: {
            type: DataTypes.BOOLEAN,
            field: 'is_accessible',
            defaultValue: true
        },
        accessibilityInfo: {
            type: DataTypes.TEXT,
            field: 'accessibility_info'
        },
        parkingAvailable: {
            type: DataTypes.BOOLEAN,
            field: 'parking_available',
            defaultValue: false
        },
        publicTransitInfo: {
            type: DataTypes.TEXT,
            field: 'public_transit_info'
        },
        bestWeather: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'best_weather',
            defaultValue: ['sunny', 'cloudy']
        },
        bestSeason: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'best_season',
            defaultValue: ['spring', 'autumn']
        },
        minAqiRequired: {
            type: DataTypes.INTEGER,
            field: 'min_aqi_required',
            defaultValue: 0
        },
        images: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        thumbnailUrl: {
            type: DataTypes.STRING(500),
            field: 'thumbnail_url'
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        rating: {
            type: DataTypes.DECIMAL(2, 1),
            defaultValue: 4.0
        },
        reviewCount: {
            type: DataTypes.INTEGER,
            field: 'review_count',
            defaultValue: 0
        },
        visitCount: {
            type: DataTypes.INTEGER,
            field: 'visit_count',
            defaultValue: 0
        },
        isFeatured: {
            type: DataTypes.BOOLEAN,
            field: 'is_featured',
            defaultValue: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            field: 'is_active',
            defaultValue: true
        },
        source: {
            type: DataTypes.STRING(100)
        },
        sourceUrl: {
            type: DataTypes.STRING(500),
            field: 'source_url'
        },
        lastVerifiedAt: {
            type: DataTypes.DATE,
            field: 'last_verified_at'
        }
    }, {
        tableName: 'activities',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Activity;
};