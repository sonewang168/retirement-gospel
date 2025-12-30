/**
 * Group Model（揪團完整版）
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Group = sequelize.define('Group', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        creatorId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'creator_id'
        },
        activityId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'activity_id'
        },
        eventId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'event_id'
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        eventDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'event_date'
        },
        eventTime: {
            type: DataTypes.STRING(10),
            field: 'event_time'
        },
        location: {
            type: DataTypes.STRING(500)
        },
        meetingPoint: {
            type: DataTypes.STRING(500),
            field: 'meeting_point'
        },
        meetingPointLat: {
            type: DataTypes.DECIMAL(10, 8),
            field: 'meeting_point_lat'
        },
        meetingPointLng: {
            type: DataTypes.DECIMAL(11, 8),
            field: 'meeting_point_lng'
        },
        city: {
            type: DataTypes.STRING(50)
        },
        minParticipants: {
            type: DataTypes.INTEGER,
            defaultValue: 2,
            field: 'min_participants'
        },
        maxParticipants: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
            field: 'max_participants'
        },
        currentParticipants: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'current_participants'
        },
        costPerPerson: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'cost_per_person'
        },
        costSplitMethod: {
            type: DataTypes.STRING(20),
            defaultValue: 'pay_own',
            field: 'cost_split_method'
        },
        requirements: {
            type: DataTypes.TEXT
        },
        ageRange: {
            type: DataTypes.STRING(50),
            field: 'age_range'
        },
        genderPreference: {
            type: DataTypes.STRING(20),
            defaultValue: 'all',
            field: 'gender_preference'
        },
        difficultyLevel: {
            type: DataTypes.STRING(20),
            defaultValue: 'easy',
            field: 'difficulty_level'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'open'
        },
        registrationDeadline: {
            type: DataTypes.DATE,
            field: 'registration_deadline'
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: []
        },
        imageUrl: {
            type: DataTypes.TEXT,
            field: 'image_url'
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_public'
        },
        cancelReason: {
            type: DataTypes.TEXT,
            field: 'cancel_reason'
        },
        averageRating: {
            type: DataTypes.DECIMAL(2, 1),
            defaultValue: 0,
            field: 'average_rating'
        },
        totalRatings: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_ratings'
        }
    }, {
        tableName: 'groups',
        underscored: true,
        timestamps: true
    });

    return Group;
};
