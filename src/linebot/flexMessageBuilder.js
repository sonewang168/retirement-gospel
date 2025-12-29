/**
 * Flex Message Builder
 */

function buildDailyRecommendations(activities, user) {
    if (!activities || activities.length === 0) {
        return {
            type: 'text',
            text: '🌅 今日推薦\n\n目前沒有推薦活動\n\n試試輸入「日本5天」讓AI規劃行程！'
        };
    }

    var bubbles = activities.slice(0, 5).map(function(act) {
        var categoryName = getCategoryName(act.category);
        return {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: act.name || '精彩活動', weight: 'bold', size: 'md', color: '#ffffff', wrap: true }
                ],
                backgroundColor: '#E74C3C',
                paddingAll: 'md'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📍 ' + (act.city || '高雄市') + ' ' + (act.district || ''), size: 'sm', color: '#666666' },
                    { type: 'text', text: '🏷️ ' + categoryName, size: 'sm', color: '#888888', margin: 'sm' },
                    { type: 'text', text: '⭐ ' + (act.rating || 4.5) + ' 分', size: 'sm', color: '#F39C12', margin: 'sm' }
                ],
                paddingAll: 'md'
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '📖 詳情', data: 'action=view_activity&id=' + act.id }, style: 'primary', color: '#3498DB', height: 'sm' },
                    { type: 'button', action: { type: 'postback', label: '❤️ 想去', data: 'action=save_activity&id=' + act.id }, style: 'secondary', height: 'sm', margin: 'sm' }
                ],
                paddingAll: 'sm'
            }
        };
    });

    return {
        type: 'flex',
        altText: '今日推薦活動',
        contents: { type: 'carousel', contents: bubbles }
    };
}

function getCategoryName(category) {
    var map = {
        'culture': '🏛️ 文化藝術',
        'nature': '🌳 自然景觀',
        'religion': '🙏 宗教聖地',
        'food': '🍜 美食品嚐',
        'sports': '💪 運動健身',
        'entertainment': '🎭 休閒娛樂'
    };
    return map[category] || '🎯 精彩活動';
}

function buildActivityDetail(activity, user) {
    if (!activity) {
        return { type: 'text', text: '找不到此活動' };
    }

    var categoryName = getCategoryName(activity.category);
    var priceText = '免費';
    if (activity.costMax && activity.costMax > 0) {
        priceText = '$' + (activity.costMin || 0) + '-$' + activity.costMax;
    }

    return {
        type: 'flex',
        altText: activity.name,
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🎯 ' + activity.name, weight: 'bold', size: 'lg', color: '#ffffff', wrap: true }
                ],
                backgroundColor: '#E74C3C',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📍 地點', size: 'sm', color: '#E74C3C', weight: 'bold' },
                    { type: 'text', text: (activity.city || '') + ' ' + (activity.district || '') + '\n' + (activity.address || ''), size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '📝 介紹', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                    { type: 'text', text: activity.description || '精彩活動等你來體驗', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'text', text: categoryName, size: 'sm', color: '#888888', flex: 1 },
                        { type: 'text', text: '⭐ ' + (activity.rating || 4.5), size: 'sm', color: '#F39C12', flex: 1 },
                        { type: 'text', text: '💰 ' + priceText, size: 'sm', color: '#27AE60', flex: 1 }
                    ]}
                ],
                paddingAll: 'lg'
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '❤️ 想去', data: 'action=save_activity&id=' + activity.id }, style: 'primary', color: '#E74C3C', height: 'sm' },
                    { type: 'button', action: { type: 'uri', label: '📍 導航', uri: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.address || activity.name) }, style: 'secondary', height: 'sm', margin: 'sm' }
                ],
                paddingAll: 'sm'
            }
        }
    };
}

function buildExploreCategories() {
    var categories = [
        { name: '🏛️ 文化藝術', id: 'culture', color: '#9B59B6' },
        { name: '🌳 自然景觀', id: 'nature', color: '#27AE60' },
        { name: '🙏 宗教聖地', id: 'religion', color: '#F39C12' },
        { name: '🍜 美食品嚐', id: 'food', color: '#E74C3C' },
        { name: '💪 運動健身', id: 'sports', color: '#3498DB' },
        { name: '🎭 休閒娛樂', id: 'entertainment', color: '#1ABC9C' }
    ];

    var buttons = categories.map(function(cat) {
        return {
            type: 'button',
            action: { type: 'postback', label: cat.name, data: 'action=explore_category&category=' + cat.id },
            style: 'primary',
            color: cat.color,
            height: 'sm',
            margin: 'sm'
        };
    });

    return {
        type: 'flex',
        altText: '探索活動分類',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🔍 探索活動', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '選擇您感興趣的類別', size: 'sm', color: '#ffffff', margin: 'sm' }
                ],
                backgroundColor: '#E74C3C',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: buttons,
                paddingAll: 'lg'
            }
        }
    };
}

function buildCategoryActivities(activities, category) {
    var categoryName = getCategoryName(category);
    if (!activities || activities.length === 0) {
        return { type: 'text', text: '目前「' + categoryName + '」類別沒有活動\n\n試試其他類別！' };
    }
    return buildDailyRecommendations(activities, null);
}

function buildGroupList(groups) {
    if (!groups || groups.length === 0) {
        return {
            type: 'flex',
            altText: '揪團功能',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '👥 揪團去玩', weight: 'bold', size: 'lg', color: '#ffffff' }
                    ],
                    backgroundColor: '#9B59B6',
                    paddingAll: 'lg'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '目前沒有開放的揪團', size: 'md', color: '#666666', wrap: true },
                        { type: 'text', text: '您可以建立一個新揪團！', size: 'sm', color: '#888888', wrap: true, margin: 'md' }
                    ],
                    paddingAll: 'lg'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'button', action: { type: 'postback', label: '➕ 建立揪團', data: 'action=create_group' }, style: 'primary', color: '#9B59B6' }
                    ],
                    paddingAll: 'md'
                }
            }
        };
    }

    var bubbles = groups.slice(0, 5).map(function(g) {
        return {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '👥 ' + g.title, weight: 'bold', size: 'md', color: '#ffffff', wrap: true }
                ],
                backgroundColor: '#9B59B6',
                paddingAll: 'md'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📅 ' + (g.eventDate || '待定'), size: 'sm', color: '#666666' },
                    { type: 'text', text: '👤 ' + (g.currentParticipants || 1) + '/' + (g.maxParticipants || 10) + ' 人', size: 'sm', color: '#888888', margin: 'sm' }
                ],
                paddingAll: 'md'
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '✋ 參加', data: 'action=join_group&id=' + g.id }, style: 'primary', color: '#9B59B6', height: 'sm' }
                ],
                paddingAll: 'sm'
            }
        };
    });

    return {
        type: 'flex',
        altText: '揪團列表',
        contents: { type: 'carousel', contents: bubbles }
    };
}

function buildSettingsMenu(user) {
    var notificationText = user.notificationEnabled ? '✅ 開啟' : '❌ 關閉';
    var pushTime = user.morningPushTime || '06:00';
    
    return {
        type: 'flex',
        altText: '設定選單',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '⚙️ 個人設定', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: user.displayName || '用戶', size: 'sm', color: '#ffffff', margin: 'sm' }
                ],
                backgroundColor: '#34495E',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📋 目前設定', weight: 'bold', size: 'md', color: '#34495E' },
                    { type: 'separator', margin: 'md' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'text', text: '📍 所在城市', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: user.city || '未設定', size: 'sm', color: '#333333', flex: 3, weight: 'bold' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '🔔 推播通知', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: notificationText, size: 'sm', color: '#333333', flex: 3, weight: 'bold' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '⏰ 早安時間', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: pushTime, size: 'sm', color: '#333333', flex: 3, weight: 'bold' }
                    ]},
                    { type: 'separator', margin: 'lg' },
                    { type: 'button', action: { type: 'postback', label: '📍 修改城市', data: 'action=edit_city' }, style: 'primary', color: '#3498DB', margin: 'lg', height: 'sm' },
                    { type: 'button', action: { type: 'postback', label: '⏰ 修改早安時間', data: 'action=edit_push_time' }, style: 'primary', color: '#9B59B6', margin: 'sm', height: 'sm' },
                    { type: 'button', action: { type: 'postback', label: user.notificationEnabled ? '🔕 關閉推播' : '🔔 開啟推播', data: 'action=toggle_notification' }, style: 'secondary', margin: 'sm', height: 'sm' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildTimePickerMenu() {
    return {
        type: 'flex',
        altText: '選擇早安推播時間',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '⏰ 選擇早安推播時間', weight: 'bold', size: 'lg', color: '#ffffff' }
                ],
                backgroundColor: '#9B59B6',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '請選擇您希望收到早安問候的時間', size: 'sm', color: '#666666', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'button', action: { type: 'postback', label: '05:00', data: 'action=set_push_time&time=05:00' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '06:00', data: 'action=set_push_time&time=06: