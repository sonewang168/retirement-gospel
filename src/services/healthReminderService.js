/**
 * 健康提醒服務
 */
const logger = require('../utils/logger');
const { HealthReminder, User } = require('../models');
const { Op } = require('sequelize');

/**
 * 新增回診提醒
 */
async function addAppointment(userId, data) {
    try {
        var reminder = await HealthReminder.create({
            userId: userId,
            type: 'appointment',
            title: data.title || '回診提醒',
            hospitalName: data.hospitalName,
            department: data.department,
            doctorName: data.doctorName,
            appointmentDate: data.date,
            appointmentTime: data.time,
            notifyBefore: data.notifyBefore || 60
        });
        
        logger.info('新增回診提醒：' + reminder.id);
        return reminder;
    } catch (error) {
        logger.error('addAppointment error:', error);
        throw error;
    }
}

/**
 * 新增用藥提醒
 */
async function addMedication(userId, data) {
    try {
        var reminder = await HealthReminder.create({
            userId: userId,
            type: 'medication',
            title: data.title || '用藥提醒',
            medicationName: data.medicationName,
            dosage: data.dosage,
            frequency: data.frequency,
            reminderTimes: data.reminderTimes || ['08:00'],
            startDate: data.startDate,
            endDate: data.endDate
        });
        
        logger.info('新增用藥提醒：' + reminder.id);
        return reminder;
    } catch (error) {
        logger.error('addMedication error:', error);
        throw error;
    }
}

/**
 * 取得用戶所有提醒
 */
async function getUserReminders(userId) {
    try {
        var reminders = await HealthReminder.findAll({
            where: {
                userId: userId,
                isActive: true
            },
            order: [['createdAt', 'DESC']]
        });
        return reminders;
    } catch (error) {
        logger.error('getUserReminders error:', error);
        return [];
    }
}

/**
 * 取得用戶回診提醒
 */
async function getUserAppointments(userId) {
    try {
        var today = new Date().toISOString().split('T')[0];
        var reminders = await HealthReminder.findAll({
            where: {
                userId: userId,
                type: 'appointment',
                isActive: true,
                appointmentDate: {
                    [Op.gte]: today
                }
            },
            order: [['appointmentDate', 'ASC']]
        });
        return reminders;
    } catch (error) {
        logger.error('getUserAppointments error:', error);
        return [];
    }
}

/**
 * 取得用戶用藥提醒
 */
async function getUserMedications(userId) {
    try {
        var today = new Date().toISOString().split('T')[0];
        var reminders = await HealthReminder.findAll({
            where: {
                userId: userId,
                type: 'medication',
                isActive: true,
                [Op.or]: [
                    { endDate: null },
                    { endDate: { [Op.gte]: today } }
                ]
            },
            order: [['createdAt', 'DESC']]
        });
        return reminders;
    } catch (error) {
        logger.error('getUserMedications error:', error);
        return [];
    }
}

/**
 * 刪除提醒
 */
async function deleteReminder(reminderId, userId) {
    try {
        var result = await HealthReminder.update(
            { isActive: false },
            { where: { id: reminderId, userId: userId } }
        );
        return result[0] > 0;
    } catch (error) {
        logger.error('deleteReminder error:', error);
        return false;
    }
}

/**
 * 取得今天需要提醒的回診
 */
async function getTodayAppointments() {
    try {
        var today = new Date().toISOString().split('T')[0];
        var reminders = await HealthReminder.findAll({
            where: {
                type: 'appointment',
                isActive: true,
                appointmentDate: today
            },
            include: [{ model: User }]
        });
        return reminders;
    } catch (error) {
        logger.error('getTodayAppointments error:', error);
        return [];
    }
}

/**
 * 取得現在需要提醒的用藥
 */
async function getCurrentMedications() {
    try {
        var now = new Date();
        var currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');
        var today = now.toISOString().split('T')[0];
        
        var reminders = await HealthReminder.findAll({
            where: {
                type: 'medication',
                isActive: true,
                reminderTimes: {
                    [Op.contains]: [currentTime]
                },
                [Op.or]: [
                    { endDate: null },
                    { endDate: { [Op.gte]: today } }
                ]
            },
            include: [{ model: User }]
        });
        return reminders;
    } catch (error) {
        logger.error('getCurrentMedications error:', error);
        return [];
    }
}

/**
 * 解析回診輸入
 * 例如：1/15 高雄長庚 心臟科
 */
function parseAppointmentInput(text) {
    try {
        var parts = text.trim().split(/\s+/);
        if (parts.length < 2) return null;
        
        var dateStr = parts[0];
        var hospitalName = parts[1];
        var department = parts[2] || '';
        
        // 解析日期
        var dateParts = dateStr.split('/');
        var month = parseInt(dateParts[0]);
        var day = parseInt(dateParts[1]);
        var year = new Date().getFullYear();
        
        // 如果日期已過，假設是明年
        var date = new Date(year, month - 1, day);
        if (date < new Date()) {
            date = new Date(year + 1, month - 1, day);
        }
        
        return {
            date: date.toISOString().split('T')[0],
            hospitalName: hospitalName,
            department: department,
            title: hospitalName + (department ? ' ' + department : '') + ' 回診'
        };
    } catch (error) {
        return null;
    }
}

/**
 * 解析用藥輸入
 * 例如：阿斯匹靈 早上8點
 */
function parseMedicationInput(text) {
    try {
        var parts = text.trim().split(/\s+/);
        if (parts.length < 2) return null;
        
        var medicationName = parts[0];
        var timeStr = parts.slice(1).join(' ');
        
        // 解析時間
        var reminderTimes = [];
        if (timeStr.includes('早上') || timeStr.includes('早')) {
            reminderTimes.push('08:00');
        }
        if (timeStr.includes('中午') || timeStr.includes('午')) {
            reminderTimes.push('12:00');
        }
        if (timeStr.includes('晚上') || timeStr.includes('晚')) {
            reminderTimes.push('20:00');
        }
        if (timeStr.includes('睡前')) {
            reminderTimes.push('22:00');
        }
        
        // 嘗試解析具體時間
        var timeMatch = timeStr.match(/(\d{1,2})[點:時](\d{0,2})?/);
        if (timeMatch) {
            var hour = parseInt(timeMatch[1]);
            var minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            reminderTimes.push(hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0'));
        }
        
        if (reminderTimes.length === 0) {
            reminderTimes = ['08:00'];
        }
        
        return {
            medicationName: medicationName,
            reminderTimes: reminderTimes,
            title: medicationName + ' 用藥提醒',
            frequency: '每天 ' + reminderTimes.join(', ')
        };
    } catch (error) {
        return null;
    }
}

module.exports = {
    addAppointment: addAppointment,
    addMedication: addMedication,
    getUserReminders: getUserReminders,
    getUserAppointments: getUserAppointments,
    getUserMedications: getUserMedications,
    deleteReminder: deleteReminder,
    getTodayAppointments: getTodayAppointments,
    getCurrentMedications: getCurrentMedications,
    parseAppointmentInput: parseAppointmentInput,
    parseMedicationInput: parseMedicationInput
};