/**
 * 揪團 Flex Message Builder
 */
const moment = require('moment-timezone');

// 狀態對照
const STATUS_MAP = {
    open: { text: '🟢 招募中', color: '#27AE60' },
    full: { text: '🟡 已額滿', color: '#F39C12' },
    confirmed: { text: '🔵 已確認', color: '#3498DB' },
    completed: { text: '✅ 已完成', color: '#95A5A6' },
    cancelled: { text: '❌ 已取消', color: '#E74C3C' }
};

// 難度對照
const DIFFICULTY_MAP = {
    easy: '🟢 輕鬆',
    medium: '🟡 適中',
    hard: '🔴 挑戰'
};

/**
 * 揪團列表卡片
 */
function buildGroupList(groups, title) {
    title = title || '🎉 揪團活動';
    
    if (!groups || groups.length === 0) {
        return {
            type: 'flex', altText: '揪團活動',
            contents: {
                type: 'bubble', size: 'mega',
                header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg',
                    contents: [{ type: 'text', text: '🎉 揪團出遊', weight: 'bold', size: 'lg', color: '#ffffff' }]
                },
                body: {
                    type: 'box', layout: 'vertical', paddingAll: 'lg',
                    contents: [
                        { type: 'text', text: '目前沒有進行中的揪團', size: 'md', color: '#666666', wrap: true },
                        { type: 'text', text: '成為第一個發起揪團的人吧！', size: 'sm', color: '#888888', margin: 'md', wrap: true }
                    ]
                },
                footer: {
                    type: 'box', layout: 'vertical', paddingAll: 'md',
                    contents: [
                        { type: 'button', action: { type: 'postback', label: '➕ 發起揪團', data: 'action=create_group_start' }, style: 'primary', color: '#E74C3C' }
                    ]
                }
            }
        };
    }

    var bubbles = groups.slice(0, 10).map(function(g) {
        var status = STATUS_MAP[g.status] || STATUS_MAP.open;
        var dateStr = g.eventDate ? moment(g.eventDate).format('M/D (ddd)') : '待定';
        var timeStr = g.eventTime || '';
        var spotsLeft = g.maxParticipants - g.currentParticipants;
        var creatorName = g.creator ? g.creator.displayName : '匿名';

        return {
            type: 'bubble', size: 'kilo',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'md',
                contents: [
                    { type: 'text', text: g.title, weight: 'bold', size: 'md', color: '#ffffff', wrap: true, maxLines: 2 }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'md', spacing: 'sm',
                contents: [
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '📅', size: 'sm', flex: 0 },
                        { type: 'text', text: dateStr + ' ' + timeStr, size: 'sm', color: '#333333', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '📍', size: 'sm', flex: 0 },
                        { type: 'text', text: g.meetingPoint || g.location || '待定', size: 'sm', color: '#666666', flex: 1, margin: 'sm', wrap: true, maxLines: 1 }
                    ]},
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '👥', size: 'sm', flex: 0 },
                        { type: 'text', text: g.currentParticipants + '/' + g.maxParticipants + ' 人', size: 'sm', color: '#333333', flex: 1, margin: 'sm' },
                        { type: 'text', text: spotsLeft > 0 ? '剩 ' + spotsLeft + ' 位' : '額滿', size: 'xs', color: spotsLeft > 0 ? '#27AE60' : '#E74C3C', flex: 0 }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'text', text: '👤', size: 'xs', flex: 0 },
                        { type: 'text', text: creatorName + ' 發起', size: 'xs', color: '#888888', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'text', text: status.text, size: 'xs', color: status.color, weight: 'bold' }
                    ]}
                ]
            },
            footer: {
                type: 'box', layout: 'horizontal', paddingAll: 'sm', spacing: 'sm',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '📖 詳情', data: 'action=view_group&id=' + g.id }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                    { type: 'button', action: { type: 'postback', label: '✋ 報名', data: 'action=join_group&id=' + g.id }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                ]
            }
        };
    });

    // 加入「發起揪團」按鈕
    bubbles.push({
        type: 'bubble', size: 'kilo',
        body: {
            type: 'box', layout: 'vertical', paddingAll: 'xl', justifyContent: 'center', alignItems: 'center',
            contents: [
                { type: 'text', text: '➕', size: '3xl' },
                { type: 'text', text: '發起新揪團', size: 'md', color: '#666666', margin: 'md' }
            ]
        },
        footer: {
            type: 'box', layout: 'vertical', paddingAll: 'md',
            contents: [
                { type: 'button', action: { type: 'postback', label: '發起揪團', data: 'action=create_group_start' }, style: 'primary', color: '#E74C3C' }
            ]
        }
    });

    return {
        type: 'flex', altText: title + ' (' + groups.length + '個)',
        contents: { type: 'carousel', contents: bubbles }
    };
}

/**
 * 揪團詳情卡片
 */
function buildGroupDetail(group, userMembership) {
    if (!group) {
        return { type: 'text', text: '❌ 找不到此揪團' };
    }

    var status = STATUS_MAP[group.status] || STATUS_MAP.open;
    var dateStr = group.eventDate ? moment(group.eventDate).format('YYYY/M/D (ddd)') : '待定';
    var timeStr = group.eventTime || '';
    var difficulty = DIFFICULTY_MAP[group.difficultyLevel] || '🟢 輕鬆';
    var spotsLeft = group.maxParticipants - group.currentParticipants;
    var creatorName = group.creator ? group.creator.displayName : '匿名';

    var bodyContents = [
        { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: status.text, size: 'sm', color: status.color, weight: 'bold' },
            { type: 'text', text: difficulty, size: 'sm', color: '#888888', align: 'end' }
        ]},
        { type: 'separator', margin: 'lg' },
        { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
            { type: 'text', text: '📅 日期', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: dateStr, size: 'sm', color: '#333333', flex: 3, weight: 'bold' }
        ]},
        { type: 'box', layout: 'horizontal', margin: 'md', contents: [
            { type: 'text', text: '⏰ 時間', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: timeStr || '待定', size: 'sm', color: '#333333', flex: 3 }
        ]},
        { type: 'box', layout: 'horizontal', margin: 'md', contents: [
            { type: 'text', text: '📍 集合點', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: group.meetingPoint || group.location || '待定', size: 'sm', color: '#333333', flex: 3, wrap: true }
        ]},
        { type: 'separator', margin: 'lg' },
        { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
            { type: 'text', text: '👥 人數', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: group.currentParticipants + ' / ' + group.maxParticipants + ' 人', size: 'sm', color: '#333333', flex: 2 },
            { type: 'text', text: spotsLeft > 0 ? '剩 ' + spotsLeft + ' 位' : '已額滿', size: 'sm', color: spotsLeft > 0 ? '#27AE60' : '#E74C3C', flex: 1, align: 'end', weight: 'bold' }
        ]},
        { type: 'box', layout: 'horizontal', margin: 'md', contents: [
            { type: 'text', text: '💰 費用', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: group.costPerPerson > 0 ? '$' + group.costPerPerson + '/人' : '免費 / 各付各', size: 'sm', color: group.costPerPerson > 0 ? '#E74C3C' : '#27AE60', flex: 3 }
        ]},
        { type: 'box', layout: 'horizontal', margin: 'md', contents: [
            { type: 'text', text: '👤 發起人', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: creatorName, size: 'sm', color: '#333333', flex: 3 }
        ]}
    ];

    if (group.description) {
        bodyContents.push({ type: 'separator', margin: 'lg' });
        bodyContents.push({ type: 'text', text: '📝 活動說明', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' });
        bodyContents.push({ type: 'text', text: group.description, size: 'sm', color: '#666666', wrap: true, margin: 'sm' });
    }

    if (group.requirements) {
        bodyContents.push({ type: 'text', text: '⚠️ 注意事項', size: 'sm', color: '#F39C12', weight: 'bold', margin: 'lg' });
        bodyContents.push({ type: 'text', text: group.requirements, size: 'sm', color: '#666666', wrap: true, margin: 'sm' });
    }

    var footerContents = [];

    if (userMembership) {
        if (userMembership.role === 'organizer') {
            footerContents = [
                { type: 'button', action: { type: 'postback', label: '👥 成員', data: 'action=group_members&id=' + group.id }, style: 'primary', color: '#3498DB', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '❌ 取消', data: 'action=cancel_group&id=' + group.id }, style: 'secondary', height: 'sm', margin: 'sm' }
            ];
        } else if (userMembership.status === 'approved') {
            footerContents = [
                { type: 'button', action: { type: 'postback', label: '📍 報到', data: 'action=checkin_group&id=' + group.id }, style: 'primary', color: '#27AE60', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '🚪 退出', data: 'action=leave_group&id=' + group.id }, style: 'secondary', height: 'sm', margin: 'sm' }
            ];
        } else if (userMembership.status === 'pending') {
            footerContents = [
                { type: 'text', text: '⏳ 候補中，等待確認', size: 'sm', color: '#F39C12', align: 'center' }
            ];
        }
    } else {
        if (group.status === 'open' && spotsLeft > 0) {
            footerContents = [
                { type: 'button', action: { type: 'postback', label: '✋ 我要報名', data: 'action=join_group&id=' + group.id }, style: 'primary', color: '#E74C3C', height: 'sm' }
            ];
        } else if (group.status === 'open' && spotsLeft <= 0) {
            footerContents = [
                { type: 'button', action: { type: 'postback', label: '📝 加入候補', data: 'action=join_group&id=' + group.id }, style: 'secondary', height: 'sm' }
            ];
        } else {
            footerContents = [
                { type: 'text', text: '此揪團' + status.text, size: 'sm', color: '#888888', align: 'center' }
            ];
        }
    }

    if (group.meetingPoint || group.location) {
        var mapQuery = encodeURIComponent(group.meetingPoint || group.location);
        footerContents.push({
            type: 'button',
            action: { type: 'uri', label: '🗺️ 導航', uri: 'https://www.google.com/maps/search/?api=1&query=' + mapQuery },
            style: 'secondary', height: 'sm', margin: 'sm'
        });
    }

    return {
        type: 'flex', altText: '揪團：' + group.title,
        contents: {
            type: 'bubble', size: 'giga',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'xl',
                contents: [
                    { type: 'text', text: '🎉 ' + group.title, weight: 'bold', size: 'lg', color: '#ffffff', wrap: true }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'xl',
                contents: bodyContents
            },
            footer: {
                type: 'box', layout: 'horizontal', paddingAll: 'md',
                contents: footerContents
            }
        }
    };
}

/**
 * 我的揪團卡片
 */
function buildMyGroups(userGroups) {
    var created = userGroups.created || [];
    var joined = userGroups.joined || [];
    var total = created.length + joined.length;

    if (total === 0) {
        return {
            type: 'flex', altText: '我的揪團',
            contents: {
                type: 'bubble', size: 'mega',
                header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#9B59B6', paddingAll: 'lg',
                    contents: [{ type: 'text', text: '👤 我的揪團', weight: 'bold', size: 'lg', color: '#ffffff' }]
                },
                body: {
                    type: 'box', layout: 'vertical', paddingAll: 'lg',
                    contents: [
                        { type: 'text', text: '您還沒有參加任何揪團', size: 'md', color: '#666666' },
                        { type: 'text', text: '快去看看有什麼有趣的活動吧！', size: 'sm', color: '#888888', margin: 'md', wrap: true }
                    ]
                },
                footer: {
                    type: 'box', layout: 'vertical', paddingAll: 'md',
                    contents: [
                        { type: 'button', action: { type: 'postback', label: '🔍 瀏覽揪團', data: 'action=browse_groups' }, style: 'primary', color: '#3498DB' },
                        { type: 'button', action: { type: 'postback', label: '➕ 發起揪團', data: 'action=create_group_start' }, style: 'secondary', margin: 'sm' }
                    ]
                }
            }
        };
    }

    var bubbles = [];

    if (created.length > 0) {
        var createdItems = created.slice(0, 5).map(function(g) {
            var dateStr = g.eventDate ? moment(g.eventDate).format('M/D') : '待定';
            return {
                type: 'box', layout: 'horizontal', margin: 'md',
                action: { type: 'postback', data: 'action=view_group&id=' + g.id },
                contents: [
                    { type: 'text', text: '👑', size: 'sm', flex: 0 },
                    { type: 'text', text: g.title, size: 'sm', color: '#333333', flex: 3, margin: 'sm', wrap: true, maxLines: 1 },
                    { type: 'text', text: dateStr, size: 'xs', color: '#888888', flex: 1, align: 'end' }
                ]
            };
        });

        bubbles.push({
            type: 'bubble', size: 'kilo',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#F39C12', paddingAll: 'md',
                contents: [
                    { type: 'text', text: '👑 我發起的 (' + created.length + ')', weight: 'bold', size: 'md', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'md',
                contents: createdItems
            },
            footer: {
                type: 'box', layout: 'vertical', paddingAll: 'sm',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '➕ 發起新揪團', data: 'action=create_group_start' }, style: 'primary', color: '#F39C12', height: 'sm' }
                ]
            }
        });
    }

    if (joined.length > 0) {
        var joinedItems = joined.slice(0, 5).map(function(g) {
            var dateStr = g.eventDate ? moment(g.eventDate).format('M/D') : '待定';
            return {
                type: 'box', layout: 'horizontal', margin: 'md',
                action: { type: 'postback', data: 'action=view_group&id=' + g.id },
                contents: [
                    { type: 'text', text: '✋', size: 'sm', flex: 0 },
                    { type: 'text', text: g.title, size: 'sm', color: '#333333', flex: 3, margin: 'sm', wrap: true, maxLines: 1 },
                    { type: 'text', text: dateStr, size: 'xs', color: '#888888', flex: 1, align: 'end' }
                ]
            };
        });

        bubbles.push({
            type: 'bubble', size: 'kilo',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'md',
                contents: [
                    { type: 'text', text: '✋ 我參加的 (' + joined.length + ')', weight: 'bold', size: 'md', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'md',
                contents: joinedItems
            },
            footer: {
                type: 'box', layout: 'vertical', paddingAll: 'sm',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '🔍 找更多揪團', data: 'action=browse_groups' }, style: 'primary', color: '#3498DB', height: 'sm' }
                ]
            }
        });
    }

    return {
        type: 'flex', altText: '我的揪團 (' + total + '個)',
        contents: { type: 'carousel', contents: bubbles }
    };
}

/**
 * 發起揪團 - 選擇類型
 */
function buildCreateGroupStep1() {
    var types = [
        { id: 'hiking', name: '🥾 登山健行', color: '#27AE60' },
        { id: 'food', name: '🍜 美食聚餐', color: '#E74C3C' },
        { id: 'culture', name: '🏛️ 文化參訪', color: '#9B59B6' },
        { id: 'sports', name: '💪 運動健身', color: '#3498DB' },
        { id: 'travel', name: '🚗 輕旅行', color: '#F39C12' },
        { id: 'other', name: '🎯 其他活動', color: '#95A5A6' }
    ];

    var buttons = types.map(function(t) {
        return {
            type: 'button',
            action: { type: 'postback', label: t.name, data: 'action=create_group_type&type=' + t.id },
            style: 'primary', color: t.color, height: 'sm', margin: 'sm'
        };
    });

    return {
        type: 'flex', altText: '發起揪團',
        contents: {
            type: 'bubble', size: 'mega',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '➕ 發起揪團', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '步驟 1/5：選擇活動類型', size: 'sm', color: '#ffffff', margin: 'sm' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'lg',
                contents: buttons
            }
        }
    };
}

/**
 * 發起揪團 - 確認頁面
 */
function buildCreateGroupConfirm(groupData) {
    return {
        type: 'flex', altText: '確認揪團資訊',
        contents: {
            type: 'bubble', size: 'giga',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '✅ 確認揪團資訊', weight: 'bold', size: 'lg', color: '#ffffff' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'xl',
                contents: [
                    { type: 'text', text: groupData.title || '未命名揪團', weight: 'bold', size: 'lg', color: '#E74C3C' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'text', text: '📅 日期', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: groupData.eventDate || '待定', size: 'sm', color: '#333333', flex: 3 }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '⏰ 時間', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: groupData.eventTime || '待定', size: 'sm', color: '#333333', flex: 3 }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '📍 地點', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: groupData.meetingPoint || '待定', size: 'sm', color: '#333333', flex: 3, wrap: true }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '👥 人數', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: '最多 ' + (groupData.maxParticipants || 10) + ' 人', size: 'sm', color: '#333333', flex: 3 }
                    ]}
                ]
            },
            footer: {
                type: 'box', layout: 'horizontal', paddingAll: 'md',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '✅ 確認發起', data: 'action=create_group_confirm' }, style: 'primary', color: '#27AE60', height: 'sm' },
                    { type: 'button', action: { type: 'postback', label: '❌ 取消', data: 'action=create_group_cancel' }, style: 'secondary', height: 'sm', margin: 'sm' }
                ]
            }
        }
    };
}

/**
 * 報到成功卡片
 */
function buildCheckInSuccess(group, member) {
    return {
        type: 'flex', altText: '報到成功',
        contents: {
            type: 'bubble',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'xl',
                contents: [
                    { type: 'text', text: '✅ 報到成功！', weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'xl', alignItems: 'center',
                contents: [
                    { type: 'text', text: '🎉', size: '3xl' },
                    { type: 'text', text: group.title, weight: 'bold', size: 'lg', color: '#333333', margin: 'lg', wrap: true, align: 'center' },
                    { type: 'text', text: '報到時間：' + moment().format('HH:mm'), size: 'sm', color: '#888888', margin: 'md' },
                    { type: 'separator', margin: 'xl' },
                    { type: 'text', text: '🏆 獲得 20 積分！', size: 'md', color: '#E74C3C', weight: 'bold', margin: 'lg' }
                ]
            }
        }
    };
}

/**
 * 揪團成員列表
 */
function buildGroupMembers(group, members) {
    if (!members || members.length === 0) {
        return { type: 'text', text: '目前沒有成員' };
    }

    var memberItems = members.slice(0, 10).map(function(m, idx) {
        var user = m.user || {};
        var roleIcon = m.role === 'organizer' ? '👑' : '👤';
        var statusIcon = m.checkedIn ? '✅' : (m.status === 'approved' ? '🟢' : '⏳');
        return {
            type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
                { type: 'text', text: roleIcon, size: 'sm', flex: 0 },
                { type: 'text', text: user.displayName || '用戶', size: 'sm', color: '#333333', flex: 3, margin: 'sm' },
                { type: 'text', text: statusIcon, size: 'sm', flex: 0, align: 'end' }
            ]
        };
    });

    return {
        type: 'flex', altText: '揪團成員',
        contents: {
            type: 'bubble', size: 'mega',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '👥 ' + group.title, weight: 'bold', size: 'md', color: '#ffffff', wrap: true },
                    { type: 'text', text: members.length + ' / ' + group.maxParticipants + ' 人', size: 'sm', color: '#ffffff', margin: 'sm' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'lg',
                contents: [
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '👑 團主', size: 'xs', color: '#888888', flex: 1 },
                        { type: 'text', text: '✅ 已報到', size: 'xs', color: '#888888', flex: 1 },
                        { type: 'text', text: '🟢 已加入', size: 'xs', color: '#888888', flex: 1 }
                    ]},
                    { type: 'separator', margin: 'md' }
                ].concat(memberItems)
            }
        }
    };
}

module.exports = {
    buildGroupList: buildGroupList,
    buildGroupDetail: buildGroupDetail,
    buildMyGroups: buildMyGroups,
    buildCreateGroupStep1: buildCreateGroupStep1,
    buildCreateGroupConfirm: buildCreateGroupConfirm,
    buildCheckInSuccess: buildCheckInSuccess,
    buildGroupMembers: buildGroupMembers
};
