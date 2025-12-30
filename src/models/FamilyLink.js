/**
 * FamilyLink Model（家人連結）
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FamilyLink = sequelize.define('FamilyLink', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        elderId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'elder_id'
        },
        familyId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'family_id'
        },
        relationship: {
            type: DataTypes.STRING(20),
            defaultValue: 'family'
        },
        nickname: {
            type: DataTypes.STRING(50)
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'approved'
        },
        privacySettings: {
            type: DataTypes.JSONB,
            defaultValue: {
                showActivity: true,
                showHealth: false,
                showLocation: true,
                showGroups: true
            },
            field: 'privacy_settings'
        },
        notifyOnActivity: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'notify_on_activity'
        },
        notifyOnSOS: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'notify_on_sos'
        },
        linkedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'linked_at'
        }
    }, {
        tableName: 'family_links',
        underscored: true,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['elder_id', 'family_id']
            }
        ]
    });

    return FamilyLink;
};
