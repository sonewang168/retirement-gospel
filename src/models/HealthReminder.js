/**
 * 健康提醒 Model
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
            defaultValue: 'medication' // medication, appointment
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        // 回診專用
        hospitalName: {
            type: DataTypes.STRING(100),
            field: 'hospital_name'
        },
        department: {
            type: DataTypes.STRING(50)
        },
        doctorName: {
            type: DataTypes.STRING(50),
            field: 'doctor_name'
        },
        appointmentDate: {
            type: DataTypes.DATEONLY,
            field: 'appointment_date'
        },
        appointmentTime: {
            type: DataTypes.STRING(10),
            field: 'appointment_time'
        },
        // 用藥專用
        medicationName: {
            type: DataTypes.STRING(100),
            field: 'medication_name'
        },
        dosage: {
            type: DataTypes.STRING(50)
        },
        frequency: {
            type: DataTypes.STRING(50) // 每天一次, 每天兩次, 飯前, 飯後
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
        // 通用
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
            defaultValue: 60, // 提前幾分鐘通知
            field: 'notify_before'
        }
    }, {
        tableName: 'health_reminders',
        underscored: true,
        timestamps: true
    });

    return HealthReminder;
};