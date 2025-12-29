/**
 * Event Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Event = sequelize.define('Event', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
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
        location: {
            type: DataTypes.STRING(500)
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'events',
        underscored: true,
        timestamps: true
    });

    return Event;
};