/**
 * ConversationState Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ConversationState = sequelize.define('ConversationState', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'user_id'
        },
        currentFlow: {
            type: DataTypes.STRING(50),
            field: 'current_flow'
        },
        flowData: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'flow_data'
        },
        lastMessageAt: {
            type: DataTypes.DATE,
            field: 'last_message_at'
        }
    }, {
        tableName: 'conversation_states',
        underscored: true,
        timestamps: true
    });

    return ConversationState;
};