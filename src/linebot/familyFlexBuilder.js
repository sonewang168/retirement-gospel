/**
 * 家人關懷 Flex Message Builder
 */
const moment = require('moment-timezone');

/**
 * 家人關懷主選單
 */
function buildFamilyCareMenu(user, inviteCode, familyCount, elderCount) {
    return {
        type: 'flex',
        altText: '👨‍👩‍👧 家人關懷',
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#9B59B6',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '👨‍👩‍👧 家人關懷', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '讓家人隨時關心您的動態', size: 'sm', color: '#ffffff', margin: 'sm' }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'xl',
                contents: [
                    { type: 'text', text: '📱 我的邀請碼', size: 'md', color: '#9B59B6', weight: 'bold' },
                    { type: 'text', text: inviteCode || '點擊下方產生', size: 'xl', color: '#333333', weight: 'bold', margin: 'md', align: 'center' },
                    { type: 'text', text: '分享給家人，讓他們關心您', size: 'xs', color: '#888888', margin: 'sm', align: 'center' },
                    { type: 'separator', margin: 'xl' },
                    { type: 'box', layout: 'horizontal', margin: 'xl', contents: [
                        { type: 'box', layout: 'vertical', flex: 1, contents: [
                            { type: 'text', text: '👨‍👩‍👧', size: 'xl', align: 'center' },
                            { type: 'text', text: '已連結家人', size: 'xs', color: '#888888', align: 'center', margin: 'sm' },
                            { type: 'text', text: (familyCount || 0) + ' 人', size: 'md', color: '#333333', align: 'center', weight: 'bold' }
                        ]},
                        { type: 'separator' },
                        { type: 'box', layout: 'vertical', flex: 1, contents: [
                            { type: 'text', text: '👴', size: 'xl', align: 'center' },
                            { type: 'text', text: '關懷中長輩', size: 'xs', color: '#888888', align: 'center', margin: 'sm' },
                            { type: 'text', text: (elderCount || 0) + ' 人', size: 'md', color: '#333333', align: 'center', weight: 'bold' }
                        ]}
                    ]}
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'md',
                spacing: 'sm',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '📤 分享邀請碼', data: 'action=share_invite_code' }, style: 'primary', color: '#9B59B6', height: 'sm' },
                    { type: 'button', action: { type: 'postback', label: '🔗 輸入邀請碼連結長輩', data: 'action=input_invite_code' }, style: 'secondary', height: 'sm' },
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'button', action: { type: 'postback', label: '👨‍👩‍👧 我的家人', data: 'action=my_family_list' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '👴 關懷長輩', data: 'action=my_elders_list' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'button', action: { type: 'postback', label: '🚨 SOS 緊急通知', data: 'action=send_sos' }, style: 'primary', color: '#E74C3C', height: 'sm' }
                ]
            }
        }
    };
}

/**
 * 我的家人列表（我是長輩）
 */
function buildMyFamilyList(familyList) {
    if (!familyList || familyList.length === 0) {
        return {
            type: 'flex',
            altText: '我的家人',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: 'xl',
                    contents: [
                        { type: 'text', text: '👨‍👩‍👧 我的家人', weight: 'bold', size: 'lg', color: '#9B59B6' },
                        { type: 'text', text: '尚未有家人連結', size: 'md', color: '#666666', margin: 'xl' },
                        { type: 'text', text: '分享您的邀請碼給家人吧！', size: 'sm', color: '#888888', margin: 'md', wrap: true }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: 'md',
                    contents: [
                        { type: 'button', action: { type: 'postback', label: '📤 分享邀請碼', data: 'action=share_invite_code' }, style: 'primary', color: '#9B59B6' }
                    ]
                }
            }
        };
    }

    var items = familyList.map(function(f) {
        var linkedDate = f.link.linkedAt ? moment(f.link.linkedAt).format('YYYY/M/D') : '';
        return {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            contents: [
                { type: 'text', text: '👤', size: 'lg', flex: 0 },
                { type: 'box', layout: 'vertical', flex: 1, margin: 'md', contents: [
                    { type: 'text', text: f.member.displayName, size: 'md', color: '#333333', weight: 'bold' },
                    { type: 'text', text: linkedDate + ' 連結', size: 'xs', color: '#888888' }
                ]}
            ]
        };
    });

    return {
        type: 'flex',
        altText: '我的家人 (' + familyList.length + '人)',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#9B59B6',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '👨‍👩‍👧 我的家人', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: familyList.length + ' 位家人關心您', size: 'sm', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: items
            }
        }
    };
}

/**
 * 關懷的長輩列表（我是家人）
 */
function buildMyEldersList(eldersList) {
    if (!eldersList || eldersList.length === 0) {
        return {
            type: 'flex',
            altText: '關懷的長輩',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: 'xl',
                    contents: [
                        { type: 'text', text: '👴 關懷的長輩', weight: 'bold', size: 'lg', color: '#3498DB' },
                        { type: 'text', text: '尚未連結任何長輩', size: 'md', color: '#666666', margin: 'xl' },
                        { type: 'text', text: '請向長輩索取邀請碼', size: 'sm', color: '#888888', margin: 'md', wrap: true }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: 'md',
                    contents: [
                        { type: 'button', action: { type: 'postback', label: '🔗 輸入邀請碼', data: 'action=input_invite_code' }, style: 'primary', color: '#3498DB' }
                    ]
                }
            }
        };
    }

    var bubbles = eldersList.map(function(e) {
        var lastActive = e.elder.lastActiveAt ? moment(e.elder.lastActiveAt).fromNow() : '未知';
        return {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#3498DB',
                paddingAll: 'md',
                contents: [
                    { type: 'text', text: '👴 ' + e.elder.displayName, weight: 'bold', size: 'md', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'md',
                contents: [
                    { type: 'text', text: '🏆 ' + (e.elder.expertTitle || '新手旅人'), size: 'sm', color: '#666666' },
                    { type: 'text', text: '⏰ ' + lastActive, size: 'xs', color: '#888888', margin: 'sm' }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'sm',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '📋 查看動態', data: 'action=view_elder_activity&id=' + e.elder.id }, style: 'primary', color: '#3498DB', height: 'sm' }
                ]
            }
        };
    });

    return {
        type: 'flex',
        altText: '關懷的長輩 (' + eldersList.length + '人)',
        contents: { type: 'carousel', contents: bubbles }
    };
}

/**
 * 長輩動態卡片
 */
function buildElderActivityCard(data) {
    if (!data.success) {
        return { type: 'text', text: '⚠️ ' + data.message };
    }

    var elder = data.elder;
    var activities = data.activities || [];

    var activityItems = [];
    if (activities.length === 0) {
        activityItems.push({ type: 'text', text: '最近沒有動態', size: 'sm', color: '#888888', margin: 'lg' });
    } else {
        activities.forEach(function(a) {
            var timeStr = a.time ? moment(a.time).format('M/D HH:mm') : '';
            activityItems.push({
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                    { type: 'text', text: a.icon, size: 'md', flex: 0 },
                    { type: 'box', layout: 'vertical', flex: 1, margin: 'sm', contents: [
                        { type: 'text', text: a.title, size: 'sm', color: '#333333', wrap: true },
                        { type: 'text', text: timeStr, size: 'xs', color: '#888888' }
                    ]}
                ]
            });
        });
    }

    var lastActiveStr = elder.lastActiveAt ? moment(elder.lastActiveAt).fromNow() : '未知';

    return {
        type: 'flex',
        altText: elder.displayName + ' 的動態',
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#3498DB',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '👴 ' + elder.displayName, weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '最後活動：' + lastActiveStr, size: 'sm', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '📋 最近動態', size: 'md', color: '#3498DB', weight: 'bold' }
                ].concat(activityItems)
            }
        }
    };
}

/**
 * SOS 確認卡片
 */
function buildSOSConfirm() {
    return {
        type: 'flex',
        altText: '🚨 確認發送緊急通知？',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#E74C3C',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '🚨 緊急求助', weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'xl',
                contents: [
                    { type: 'text', text: '確定要發送緊急通知給所有家人嗎？', size: 'md', color: '#333333', wrap: true, align: 'center' },
                    { type: 'text', text: '所有已連結的家人都會收到通知', size: 'sm', color: '#666666', margin: 'lg', wrap: true, align: 'center' }
                ]
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                paddingAll: 'md',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '🚨 確認發送', data: 'action=confirm_sos' }, style: 'primary', color: '#E74C3C', height: 'sm', flex: 1 },
                    { type: 'button', action: { type: 'postback', label: '取消', data: 'action=cancel_sos' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                ]
            }
        }
    };
}

/**
 * 打卡成功卡片（含照片）
 */
function buildCheckInWithPhoto(activity, photoUrl, points) {
    var contents = [
        { type: 'text', text: '✅ 打卡成功！', weight: 'bold', size: 'xl', color: '#27AE60', align: 'center' },
        { type: 'text', text: activity.name || '景點打卡', size: 'md', color: '#333333', margin: 'lg', align: 'center', wrap: true },
        { type: 'text', text: '🏆 獲得 ' + (points || 10) + ' 積分', size: 'md', color: '#E74C3C', margin: 'md', weight: 'bold', align: 'center' }
    ];

    if (photoUrl) {
        contents.splice(1, 0, {
            type: 'image',
            url: photoUrl,
            size: 'full',
            aspectRatio: '4:3',
            aspectMode: 'cover',
            margin: 'lg'
        });
    }

    return {
        type: 'flex',
        altText: '打卡成功！',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'xl',
                contents: contents
            }
        }
    };
}

module.exports = {
    buildFamilyCareMenu: buildFamilyCareMenu,
    buildMyFamilyList: buildMyFamilyList,
    buildMyEldersList: buildMyEldersList,
    buildElderActivityCard: buildElderActivityCard,
    buildSOSConfirm: buildSOSConfirm,
    buildCheckInWithPhoto: buildCheckInWithPhoto
};
