/**
 * Group Model
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
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        eventDate: {
            type: DataTypes.DATEONLY,
            field: 'event_date'
        },
        eventTime: {
            type: DataTypes.STRING(10),
            field: 'event_time'
        },
        location: {
            type: DataTypes.STRING(500)
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
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'open'
        }
    }, {
        tableName: 'groups',
        underscored: true,
        timestamps: true
    });

    return Group;
};