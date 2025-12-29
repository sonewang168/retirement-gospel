/**
 * HealthReminder Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const HealthReminder = sequelize.define('HealthReminder', {
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
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'medication'
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        hospitalName: {
            type: DataTypes.STRING(100),
            field: 'hospital_name'
        },
        department: {
            type: DataTypes.STRING(50)
        },
        appointmentDate: {
            type: DataTypes.DATEONLY,
            field: 'appointment_date'
        },
        appointmentTime: {
            type: DataTypes.STRING(10),
            field: 'appointment_time'
        },
        medicationName: {
            type: DataTypes.STRING(100),
            field: 'medication_name'
        },
        dosage: {
            type: DataTypes.STRING(50)
        },
        frequency: {
            type: DataTypes.STRING(50)
        },
        reminderTimes: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'reminder_times',
            defaultValue: []
        },
        startDate: {
            type: DataTypes.DATEONLY,
            field: 'start_date'
        },
        endDate: {
            type: DataTypes.DATEONLY,
            field: 'end_date'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        lastNotified: {
            type: DataTypes.DATE,
            field: 'last_notified'
        },
        notifyBefore: {
            type: DataTypes.INTEGER,
            defaultValue: 60,
            field: 'notify_before'
        }
    }, {
        tableName: 'health_reminders',
        underscored: true,
        timestamps: true
    });

    return HealthReminder;
};