/**
 * Flex Message 建構器（完整版）
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
                    { type: 'text', text: '⭐ ' + (act.rating || 4.5) + ' 分', size: 'sm', color: '#F39C12', margin: 'sm' },
                    { type: 'text', text: act.shortDescription || '', size: 'xs', color: '#999999', margin: 'sm', wrap: true }
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
        'entertainment': '🎭 休閒娛樂',
        'shopping': '🛍️ 購物血拼',
        'health': '💆 養生保健'
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
                    { type: 'text', text: '🔧 修改設定', weight: 'bold', size: 'md', color: '#34495E', margin: 'lg' },
                    { type: 'button', action: { type: 'postback', label: '📍 修改城市', data: 'action=edit_city' }, style: 'primary', color: '#3498DB', margin: 'md', height: 'sm' },
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
                    { type: 'text', text: '請選擇您希望收到早安問候的時間：', size: 'sm', color: '#666666', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'button', action: { type: 'postback', label: '05:00', data: 'action=set_push_time&time=05:00' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '06:00', data: 'action=set_push_time&time=06:00' }, style: 'primary', color: '#9B59B6', height: 'sm', flex: 1, margin: 'sm' },
                        { type: 'button', action: { type: 'postback', label: '07:00', data: 'action=set_push_time&time=07:00' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'button', action: { type: 'postback', label: '08:00', data: 'action=set_push_time&time=08:00' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '09:00', data: 'action=set_push_time&time=09:00' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' },
                        { type: 'button', action: { type: 'postback', label: '10:00', data: 'action=set_push_time&time=10:00' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]}
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildCityPickerMenu() {
    return {
        type: 'flex',
        altText: '選擇城市',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📍 選擇您的城市', weight: 'bold', size: 'lg', color: '#ffffff' }
                ],
                backgroundColor: '#3498DB',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '請選擇您所在的城市：', size: 'sm', color: '#666666', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                        { type: 'button', action: { type: 'postback', label: '高雄市', data: 'action=set_city&city=高雄市' }, style: 'primary', color: '#E74C3C', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '台北市', data: 'action=set_city&city=台北市' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' },
                        { type: 'button', action: { type: 'postback', label: '新北市', data: 'action=set_city&city=新北市' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'button', action: { type: 'postback', label: '台中市', data: 'action=set_city&city=台中市' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '台南市', data: 'action=set_city&city=台南市' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' },
                        { type: 'button', action: { type: 'postback', label: '桃園市', data: 'action=set_city&city=桃園市' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
                        { type: 'button', action: { type: 'postback', label: '新竹市', data: 'action=set_city&city=新竹市' }, style: 'secondary', height: 'sm', flex: 1 },
                        { type: 'button', action: { type: 'postback', label: '彰化縣', data: 'action=set_city&city=彰化縣' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' },
                        { type: 'button', action: { type: 'postback', label: '屏東縣', data: 'action=set_city&city=屏東縣' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                    ]},
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '💡 或直接輸入城市名稱', size: 'xs', color: '#888888', margin: 'md' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildHealthMenu(user) {
    return {
        type: 'flex',
        altText: '健康管理',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '💊 健康管理', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '用藥提醒與回診追蹤', size: 'sm', color: '#ffffff', margin: 'sm' }
                ],
                backgroundColor: '#27AE60',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🏥 即將到來的回診', weight: 'bold', size: 'md', color: '#27AE60' },
                    { type: 'text', text: '目前沒有設定回診提醒', size: 'sm', color: '#888888', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '💊 用藥提醒', weight: 'bold', size: 'md', color: '#27AE60', margin: 'lg' },
                    { type: 'text', text: '目前沒有設定用藥提醒', size: 'sm', color: '#888888', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'button', action: { type: 'postback', label: '➕ 新增回診提醒', data: 'action=add_appointment' }, style: 'primary', color: '#27AE60', margin: 'lg' },
                    { type: 'button', action: { type: 'postback', label: '➕ 新增用藥提醒', data: 'action=add_medication' }, style: 'secondary', margin: 'sm' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildFamilyMenu(user) {
    return {
        type: 'flex',
        altText: '家人關懷',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '👨‍👩‍👧‍👦 家人關懷', weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: '與家人保持連結', size: 'sm', color: '#ffffff', margin: 'sm' }
                ],
                backgroundColor: '#E91E63',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📱 已連結的家人', weight: 'bold', size: 'md', color: '#E91E63' },
                    { type: 'text', text: '目前沒有連結家人', size: 'sm', color: '#888888', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '透過家人連結功能，您的子女可以：', size: 'sm', color: '#666666', margin: 'lg', wrap: true },
                    { type: 'text', text: '• 查看您的行程安排\n• 收到您的活動通知\n• 緊急聯絡功能', size: 'sm', color: '#888888', margin: 'sm', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'button', action: { type: 'postback', label: '➕ 邀請家人連結', data: 'action=invite_family' }, style: 'primary', color: '#E91E63', margin: 'lg' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildCommunityList() {
    var communities = [
        { name: '🎵 音樂愛好者', members: 128, id: 'music' },
        { name: '📷 攝影同好會', members: 96, id: 'photo' },
        { name: '🌱 園藝達人', members: 85, id: 'garden' },
        { name: '🎨 繪畫社', members: 72, id: 'art' },
        { name: '🧘 瑜伽養生', members: 156, id: 'yoga' },
        { name: '♟️ 棋藝交流', members: 64, id: 'chess' }
    ];

    var bubbles = communities.map(function(c) {
        return {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: c.name, weight: 'bold', size: 'md', color: '#ffffff', wrap: true }
                ],
                backgroundColor: '#1ABC9C',
                paddingAll: 'md'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '👥 ' + c.members + ' 位成員', size: 'sm', color: '#666666' }
                ],
                paddingAll: 'md'
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '加入社群', data: 'action=join_community&id=' + c.id }, style: 'primary', color: '#1ABC9C', height: 'sm' }
                ],
                paddingAll: 'sm'
            }
        };
    });

    return {
        type: 'flex',
        altText: '興趣社群',
        contents: { type: 'carousel', contents: bubbles }
    };
}

function buildWeatherCard(weather) {
    if (!weather) {
        return { type: 'text', text: '無法取得天氣資訊' };
    }

    var emoji = '☀️';
    var desc = weather.description || '晴天';
    if (desc.includes('雨')) emoji = '🌧️';
    else if (desc.includes('雲') || desc.includes('陰')) emoji = '☁️';
    else if (desc.includes('晴')) emoji = '☀️';

    return {
        type: 'flex',
        altText: weather.city + ' 天氣',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: emoji + ' ' + (weather.city || '天氣'), weight: 'bold', size: 'lg', color: '#ffffff' },
                    { type: 'text', text: desc, size: 'sm', color: '#ffffff', margin: 'sm' }
                ],
                backgroundColor: '#3498DB',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '🌡️ 溫度', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: (weather.temp || '--') + '°C', size: 'sm', color: '#333333', flex: 3, weight: 'bold' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '🤒 體感', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: (weather.feelsLike || '--') + '°C', size: 'sm', color: '#333333', flex: 3 }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '💧 濕度', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: (weather.humidity || '--') + '%', size: 'sm', color: '#333333', flex: 3 }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '🌬️ 風速', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: (weather.windSpeed || '--') + ' m/s', size: 'sm', color: '#333333', flex: 3 }
                    ]}
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildHelpMenu() {
    return {
        type: 'flex',
        altText: '功能說明',
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🌅 退休福音 功能說明', weight: 'bold', size: 'lg', color: '#ffffff' }
                ],
                backgroundColor: '#E74C3C',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🌍 AI 行程規劃', weight: 'bold', size: 'md', color: '#E74C3C' },
                    { type: 'text', text: '輸入「日本5天」「法國10天」等', size: 'sm', color: '#666666', wrap: true, margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '📋 我的行程', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                    { type: 'text', text: '查看、分享、下載PDF', size: 'sm', color: '#666666', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '☁️ 天氣查詢', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                    { type: 'text', text: '輸入「天氣」或「東京天氣」', size: 'sm', color: '#666666', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '💡 今日推薦', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                    { type: 'text', text: '每日精選活動推薦', size: 'sm', color: '#666666', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '🔍 找活動', weight: 'bold', size: 'md', color: '#E74C3C', margin: 'lg' },
                    { type: 'text', text: '依分類探索活動', size: 'sm', color: '#666666', margin: 'sm' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildQuickActions() {
    return {
        type: 'flex',
        altText: '快速功能',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'button', action: { type: 'message', label: '🌍 日本5天', text: '日本5天' }, style: 'primary', color: '#E74C3C' },
                    { type: 'button', action: { type: 'message', label: '📋 我的行程', text: '我的行程' }, style: 'secondary', margin: 'sm' },
                    { type: 'button', action: { type: 'message', label: '💡 今日推薦', text: '今日推薦' }, style: 'secondary', margin: 'sm' },
                    { type: 'button', action: { type: 'message', label: '☁️ 天氣', text: '天氣' }, style: 'secondary', margin: 'sm' }
                ],
                paddingAll: 'lg'
            }
        }
    };
}

function buildOnboardingStart() {
    return {
        type: 'flex',
        altText: '歡迎使用',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🌅 歡迎加入退休福音', weight: 'bold', size: 'lg', color: '#ffffff' }
                ],
                backgroundColor: '#E74C3C',
                paddingAll: 'lg'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '讓我們花 1 分鐘了解您，\n提供更貼心的服務！', size: 'md', color: '#666666', wrap: true }
                ],
                paddingAll: 'lg'
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '開始設定', data: 'action=start_onboarding' }, style: 'primary', color: '#E74C3C' },
                    { type: 'button', action: { type: 'postback', label: '稍後再說', data: 'action=skip_onboarding' }, style: 'secondary', margin: 'sm' }
                ],
                paddingAll: 'md'
            }
        }
    };
}

function buildOnboardingStep1() {
    return {
        type: 'text',
        text: '📍 請問您住在哪個城市？\n\n例如：高雄市、台北市、台中市'
    };
}

function buildNearbyActivities(activities, address) {
    if (!activities || activities.length === 0) {
        return { type: 'text', text: '📍 ' + (address || '您的位置') + '\n\n附近沒有找到推薦活動' };
    }
    return buildDailyRecommendations(activities, null);
}

module.exports = {
    buildDailyRecommendations: buildDailyRecommendations,
    buildActivityDetail: buildActivityDetail,
    buildExploreCategories: buildExploreCategories,
    buildCategoryActivities: buildCategoryActivities,
    buildGroupList: buildGroupList,
    buildSettingsMenu: buildSettingsMenu,
    buildTimePickerMenu: buildTimePickerMenu,
    buildCityPickerMenu: buildCityPickerMenu,
    buildHealthMenu: buildHealthMenu,
    buildFamilyMenu: buildFamilyMenu,
    buildCommunityList: buildCommunityList,
    buildWeatherCard: buildWeatherCard,
    buildHelpMenu: buildHelpMenu,
    buildQuickActions: buildQuickActions,
    buildOnboardingStart: buildOnboardingStart,
    buildOnboardingStep1: buildOnboardingStep1,
    buildNearbyActivities: buildNearbyActivities
};