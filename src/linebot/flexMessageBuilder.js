const healthReminderService = require('../services/healthReminderService');

function getCategoryName(cat) {
    var map = { culture: '文化藝術', nature: '自然景觀', religion: '宗教聖地', food: '美食品嚐', sports: '運動健身', entertainment: '休閒娛樂' };
    return map[cat] || '精彩活動';
}

function buildDailyRecommendations(acts, user) {
    if (!acts || acts.length === 0) return { type: 'text', text: '目前沒有推薦活動' };
    var bubbles = acts.slice(0, 5).map(function(a) {
        return {
            type: 'bubble', size: 'kilo',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'md', contents: [{ type: 'text', text: a.name || '活動', weight: 'bold', size: 'md', color: '#ffffff', wrap: true }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                { type: 'text', text: '📍 ' + (a.city || '') + ' ' + (a.district || ''), size: 'sm', color: '#666666' },
                { type: 'text', text: '⭐ ' + (a.rating || 4.5), size: 'sm', color: '#F39C12', margin: 'sm' }
            ]},
            footer: { type: 'box', layout: 'horizontal', paddingAll: 'sm', contents: [
                { type: 'button', action: { type: 'postback', label: '詳情', data: 'action=view_activity&id=' + a.id }, style: 'primary', color: '#3498DB', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '❤️ 想去', data: 'action=save_activity&id=' + a.id }, style: 'secondary', height: 'sm', margin: 'sm' }
            ]}
        };
    });
    return { type: 'flex', altText: '今日推薦', contents: { type: 'carousel', contents: bubbles } };
}

function buildActivityDetail(a, user) {
    if (!a) return { type: 'text', text: '找不到活動' };
    return {
        type: 'flex', altText: a.name,
        contents: {
            type: 'bubble', size: 'giga',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: a.name, weight: 'bold', size: 'lg', color: '#ffffff', wrap: true }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '📍 ' + (a.city || '') + ' ' + (a.address || ''), size: 'sm', color: '#666666', wrap: true },
                { type: 'text', text: '⭐ ' + (a.rating || 4.5) + ' 分', size: 'sm', color: '#F39C12', margin: 'sm' },
                { type: 'text', text: '💰 ' + (a.costMin || 0) + ' ~ ' + (a.costMax || 0) + ' 元', size: 'sm', color: '#27AE60', margin: 'sm' },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: a.description || '精彩活動', size: 'sm', color: '#666666', wrap: true, margin: 'lg' }
            ]},
            footer: { type: 'box', layout: 'horizontal', paddingAll: 'sm', contents: [
                { type: 'button', action: { type: 'postback', label: '❤️ 想去', data: 'action=save_activity&id=' + a.id }, style: 'primary', color: '#E74C3C', height: 'sm' },
                { type: 'button', action: { type: 'uri', label: '📍 地圖', uri: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a.address || a.name) }, style: 'secondary', height: 'sm', margin: 'sm' }
            ]}
        }
    };
}

function buildExploreCategories() {
    var cats = [
        { name: '🏛️ 文化藝術', id: 'culture', color: '#9B59B6' },
        { name: '🌳 自然景觀', id: 'nature', color: '#27AE60' },
        { name: '🙏 宗教聖地', id: 'religion', color: '#F39C12' },
        { name: '🍜 美食品嚐', id: 'food', color: '#E74C3C' },
        { name: '💪 運動健身', id: 'sports', color: '#3498DB' },
        { name: '🎭 休閒娛樂', id: 'entertainment', color: '#1ABC9C' }
    ];
    var btns = cats.map(function(c) {
        return { type: 'button', action: { type: 'postback', label: c.name, data: 'action=explore_category&category=' + c.id }, style: 'primary', color: c.color, height: 'sm', margin: 'sm' };
    });
    return {
        type: 'flex', altText: '探索分類',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '🔍 探索活動', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: btns }
        }
    };
}

function buildCategoryActivities(acts, cat) {
    if (!acts || acts.length === 0) return { type: 'text', text: '此分類沒有活動' };
    return buildDailyRecommendations(acts, null);
}

function buildGroupList(groups) {
    return { type: 'text', text: '揪團功能開發中 🚧' };
}

function buildSettingsMenu(user) {
    var notif = user.notificationEnabled ? '🔔 開啟' : '🔕 關閉';
    return {
        type: 'flex', altText: '設定',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#34495E', paddingAll: 'lg', contents: [{ type: 'text', text: '⚙️ 個人設定', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '👤 ' + (user.displayName || '用戶'), size: 'md', color: '#333333', weight: 'bold' },
                { type: 'separator', margin: 'lg' },
                { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
                    { type: 'text', text: '📍 城市', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: user.city || '未設定', size: 'sm', color: '#333333', flex: 3 }
                ]},
                { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                    { type: 'text', text: '🔔 推播', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: notif, size: 'sm', color: '#333333', flex: 3 }
                ]},
                { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                    { type: 'text', text: '⏰ 早安時間', size: 'sm', color: '#888888', flex: 2 },
                    { type: 'text', text: user.morningPushTime || '06:00', size: 'sm', color: '#333333', flex: 3 }
                ]},
                { type: 'separator', margin: 'lg' },
                { type: 'button', action: { type: 'postback', label: '📍 修改城市', data: 'action=edit_city' }, style: 'primary', color: '#3498DB', margin: 'lg', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '⏰ 修改早安時間', data: 'action=edit_push_time' }, style: 'primary', color: '#9B59B6', margin: 'sm', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '🔔 切換推播', data: 'action=toggle_notification' }, style: 'secondary', margin: 'sm', height: 'sm' }
            ]}
        }
    };
}

function buildTimePickerMenu() {
    var times = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
    var bubbles = [];
    
    // 分成兩頁
    var page1 = times.slice(0, 6);
    var page2 = times.slice(6);
    
    var btns1 = page1.map(function(t) {
        return { type: 'button', action: { type: 'postback', label: t, data: 'action=set_push_time&time=' + t }, style: 'secondary', height: 'sm', margin: 'sm' };
    });
    
    var btns2 = page2.map(function(t) {
        return { type: 'button', action: { type: 'postback', label: t, data: 'action=set_push_time&time=' + t }, style: 'secondary', height: 'sm', margin: 'sm' };
    });
    
    bubbles.push({
        type: 'bubble', size: 'kilo',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#9B59B6', paddingAll: 'md', contents: [{ type: 'text', text: '⏰ 早起時段', weight: 'bold', size: 'md', color: '#ffffff' }] },
        body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: btns1 }
    });
    
    bubbles.push({
        type: 'bubble', size: 'kilo',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#F39C12', paddingAll: 'md', contents: [{ type: 'text', text: '⏰ 晚起時段', weight: 'bold', size: 'md', color: '#ffffff' }] },
        body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: btns2 }
    });
    
    return { type: 'flex', altText: '選擇早安時間', contents: { type: 'carousel', contents: bubbles } };
}

function buildCityPickerMenu() {
    var regions = [
        {
            name: '北部',
            color: '#3498DB',
            cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣']
        },
        {
            name: '中部',
            color: '#27AE60',
            cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣']
        },
        {
            name: '南部',
            color: '#E74C3C',
            cities: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣']
        },
        {
            name: '東部',
            color: '#9B59B6',
            cities: ['宜蘭縣', '花蓮縣', '台東縣']
        },
        {
            name: '離島',
            color: '#F39C12',
            cities: ['澎湖縣', '金門縣', '連江縣']
        }
    ];

    var bubbles = regions.map(function(region) {
        var btns = region.cities.map(function(city) {
            return { type: 'button', action: { type: 'postback', label: city, data: 'action=set_city&city=' + city }, style: 'secondary', height: 'sm', margin: 'sm' };
        });
        return {
            type: 'bubble', size: 'kilo',
            header: { type: 'box', layout: 'vertical', backgroundColor: region.color, paddingAll: 'md', contents: [{ type: 'text', text: '📍 ' + region.name, weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: btns }
        };
    });

    return { type: 'flex', altText: '選擇城市', contents: { type: 'carousel', contents: bubbles } };
}

function buildWeatherCard(w) {
    if (!w || w.error) return { type: 'text', text: '❌ 無法取得天氣資訊' };
    var forecast = (w.forecast || []).slice(0, 4).map(function(d) {
        return { type: 'box', layout: 'vertical', flex: 1, contents: [
            { type: 'text', text: d.dayName || '', size: 'xs', color: '#888888', align: 'center' },
            { type: 'text', text: d.emoji || '☀️', size: 'xl', align: 'center' },
            { type: 'text', text: d.temp + '°', size: 'sm', align: 'center', weight: 'bold' }
        ]};
    });
    return {
        type: 'flex', altText: w.city + ' ' + w.temp + '°C',
        contents: {
            type: 'bubble', size: 'giga',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'xl', contents: [
                { type: 'box', layout: 'horizontal', contents: [
                    { type: 'text', text: w.emoji || '☀️', size: '4xl', flex: 0 },
                    { type: 'box', layout: 'vertical', margin: 'lg', flex: 1, contents: [
                        { type: 'text', text: w.city, size: 'xl', color: '#ffffff', weight: 'bold' },
                        { type: 'text', text: w.description || '', size: 'md', color: '#ffffff' }
                    ]}
                ]},
                { type: 'text', text: w.temp + '°C', size: '5xl', color: '#ffffff', weight: 'bold', margin: 'lg' },
                { type: 'text', text: '體感 ' + (w.feelsLike || w.temp) + '°C', size: 'sm', color: '#ffffff' }
            ]},
            body: { type: 'box', layout: 'vertical', paddingAll: 'xl', contents: [
                { type: 'box', layout: 'horizontal', contents: [
                    { type: 'text', text: '💧 濕度 ' + w.humidity + '%', size: 'sm', flex: 1 },
                    { type: 'text', text: '💨 風速 ' + w.windSpeed + 'm/s', size: 'sm', flex: 1 }
                ]},
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '📅 未來預報', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                { type: 'box', layout: 'horizontal', margin: 'md', contents: forecast.length > 0 ? forecast : [{ type: 'text', text: '無資料', size: 'sm' }] },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '💡 活動建議', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                { type: 'text', text: (w.advice || ['適合出遊']).join('\n'), size: 'sm', color: '#666666', wrap: true, margin: 'sm' }
            ]}
        }
    };
}

async function buildHealthMenu(user) {
    var appts = [], meds = [];
    try {
        appts = await healthReminderService.getUserAppointments(user.id);
        meds = await healthReminderService.getUserMedications(user.id);
    } catch (e) {}
    var apptText = appts.length > 0 ? appts.slice(0, 3).map(function(a) { return '📅 ' + a.appointmentDate + ' ' + a.hospitalName; }).join('\n') : '尚無回診提醒';
    var medText = meds.length > 0 ? meds.slice(0, 3).map(function(m) { return '💊 ' + m.medicationName; }).join('\n') : '尚無用藥提醒';
    return {
        type: 'flex', altText: '健康管理',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'lg', contents: [{ type: 'text', text: '💚 健康管理', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '🏥 回診提醒 (' + appts.length + ')', weight: 'bold', size: 'md', color: '#27AE60' },
                { type: 'text', text: apptText, size: 'sm', color: '#666666', margin: 'sm', wrap: true },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '💊 用藥提醒 (' + meds.length + ')', weight: 'bold', size: 'md', color: '#27AE60', margin: 'lg' },
                { type: 'text', text: medText, size: 'sm', color: '#666666', margin: 'sm', wrap: true },
                { type: 'separator', margin: 'lg' },
                { type: 'button', action: { type: 'postback', label: '➕ 新增回診', data: 'action=add_appointment' }, style: 'primary', color: '#27AE60', margin: 'lg', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '➕ 新增用藥', data: 'action=add_medication' }, style: 'secondary', margin: 'sm', height: 'sm' }
            ]}
        }
    };
}

function buildFamilyMenu(user) {
    return {
        type: 'flex', altText: '家人關懷',
        contents: {
            type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E91E63', paddingAll: 'lg', contents: [{ type: 'text', text: '👨‍👩‍👧‍👦 家人關懷', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '目前沒有連結家人', size: 'sm', color: '#888888' },
                { type: 'text', text: '邀請家人加入，可以互相關心健康狀況', size: 'xs', color: '#aaaaaa', margin: 'sm', wrap: true },
                { type: 'button', action: { type: 'postback', label: '📨 邀請家人', data: 'action=invite_family' }, style: 'primary', color: '#E91E63', margin: 'lg' }
            ]}
        }
    };
}

function buildCommunityList() {
    return { type: 'text', text: '社群功能開發中 🚧' };
}

function buildHelpMenu() {
    return {
        type: 'flex', altText: '功能說明',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '❓ 功能說明', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '🌍 AI行程規劃', weight: 'bold', size: 'sm', color: '#E74C3C' },
                { type: 'text', text: '輸入「日本5天」或「台南3天」', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '📋 我的行程', weight: 'bold', size: 'sm', color: '#E74C3C', margin: 'md' },
                { type: 'text', text: '查看收藏的AI行程', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '❤️ 想去清單', weight: 'bold', size: 'sm', color: '#E74C3C', margin: 'md' },
                { type: 'text', text: '查看收藏的活動景點', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '🔍 新增景點', weight: 'bold', size: 'sm', color: '#06B6D4', margin: 'md' },
                { type: 'text', text: '搜尋景點並加入想去清單', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '☁️ 天氣', weight: 'bold', size: 'sm', color: '#E74C3C', margin: 'md' },
                { type: 'text', text: '查看天氣預報與活動建議', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '💊 健康', weight: 'bold', size: 'sm', color: '#E74C3C', margin: 'md' },
                { type: 'text', text: '管理回診與用藥提醒', size: 'xs', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'md' },
                { type: 'text', text: '⚙️ 設定', weight: 'bold', size: 'sm', color: '#E74C3C', margin: 'md' },
                { type: 'text', text: '修改城市、推播時間', size: 'xs', color: '#666666', margin: 'sm' }
            ]}
        }
    };
}

function buildQuickActions() {
    return { type: 'text', text: '試試：日本5天、台南3天、我的行程、想去清單、天氣、健康' };
}

function buildOnboardingStart() {
    return { type: 'text', text: '歡迎！輸入「日本5天」或「台南3天」試試AI規劃' };
}

function buildOnboardingStep1() {
    return buildCityPickerMenu();
}

function buildNearbyActivities(acts, addr) {
    if (!acts || acts.length === 0) return { type: 'text', text: '附近沒有活動' };
    return buildDailyRecommendations(acts, null);
}

function buildWishlistCard(list) {
    if (!list || list.length === 0) {
        return {
            type: 'flex', altText: '想去清單',
            contents: {
                type: 'bubble',
                header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '❤️ 我的想去清單', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                    { type: 'text', text: '😢 還沒有收藏活動', size: 'md', color: '#666666' },
                    { type: 'text', text: '輸入「找活動」開始探索', size: 'sm', color: '#888888', margin: 'md' }
                ]},
                footer: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                    { type: 'button', action: { type: 'message', label: '🔍 找活動', text: '找活動' }, style: 'primary', color: '#E74C3C' }
                ]}
            }
        };
    }
    var bubbles = list.slice(0, 10).map(function(item) {
        var a = item.activity;
        var col = item.isVisited ? '#27AE60' : '#E74C3C';
        var status = item.isVisited ? '✅ 已去過' : '📍 想去';
        return {
            type: 'bubble', size: 'kilo',
            header: { type: 'box', layout: 'vertical', backgroundColor: col, paddingAll: 'md', contents: [{ type: 'text', text: a.name || '活動', weight: 'bold', size: 'md', color: '#ffffff', wrap: true }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                { type: 'text', text: '📍 ' + (a.city || ''), size: 'sm', color: '#666666' },
                { type: 'text', text: '⭐ ' + (a.rating || 4.5), size: 'sm', color: '#F39C12', margin: 'sm' },
                { type: 'text', text: status, size: 'sm', color: col, margin: 'sm', weight: 'bold' }
            ]},
            footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [
                { type: 'box', layout: 'horizontal', contents: [
                    { type: 'button', action: { type: 'postback', label: '詳情', data: 'action=view_activity&id=' + a.id }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                    { type: 'button', action: { type: 'postback', label: item.isVisited ? '📍想去' : '✅去過', data: 'action=toggle_visited&id=' + a.id }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                ]},
                { type: 'button', action: { type: 'postback', label: '🗑️ 移除', data: 'action=remove_wishlist&id=' + a.id }, style: 'secondary', height: 'sm', margin: 'sm' }
            ]}
        };
    });
    return { type: 'flex', altText: '想去清單(' + list.length + '個)', contents: { type: 'carousel', contents: bubbles } };
}
function buildExpertCard(status) {
    if (!status) return { type: 'text', text: '無法取得達人資訊' };

    var user = status.user;
    var progressBar = '';
    var progressPercent = status.progress || 0;
    var filled = Math.round(progressPercent / 10);
    for (var i = 0; i < 10; i++) {
        progressBar += i < filled ? '🟩' : '⬜';
    }

    var categoryText = '';
    var cats = status.categoryCount || {};
    var catNames = { culture: '文化', nature: '自然', religion: '宗教', food: '美食', sports: '運動', entertainment: '娛樂' };
    Object.keys(cats).forEach(function(cat) {
        categoryText += catNames[cat] + ':' + cats[cat] + ' ';
    });

    var badgeText = (status.badges || []).slice(0, 6).join('\n') || '尚無徽章';

    var recentText = '';
    if (status.recentVisited && status.recentVisited.length > 0) {
        recentText = status.recentVisited.slice(0, 3).map(function(item) {
            return '✅ ' + (item.activity ? item.activity.name : '景點');
        }).join('\n');
    } else {
        recentText = '尚無打卡紀錄';
    }

    return {
        type: 'flex', altText: '我的達人資訊',
        contents: {
            type: 'bubble', size: 'giga',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'xl',
                contents: [
                    { type: 'text', text: status.title, weight: 'bold', size: 'xl', color: '#ffffff', align: 'center' },
                    { type: 'text', text: 'Lv.' + status.level, size: 'md', color: '#ffffff', align: 'center', margin: 'sm' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', paddingAll: 'xl',
                contents: [
                    { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: '📍 探索景點', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: status.visitedCount + ' 個', size: 'sm', color: '#333333', flex: 1, weight: 'bold' }
                    ]},
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                        { type: 'text', text: '⭐ 累積積分', size: 'sm', color: '#888888', flex: 2 },
                        { type: 'text', text: status.points + ' 點', size: 'sm', color: '#E74C3C', flex: 1, weight: 'bold' }
                    ]},
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '📊 升級進度', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                    { type: 'text', text: progressBar + ' ' + progressPercent + '%', size: 'sm', margin: 'sm' },
                    { type: 'text', text: status.nextLevelVisits ? '還需 ' + (status.nextLevelVisits - status.visitedCount) + ' 個景點升級' : '已達最高等級！', size: 'xs', color: '#888888', margin: 'sm' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '🏷️ 分類統計', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                    { type: 'text', text: categoryText || '尚無統計', size: 'xs', color: '#666666', margin: 'sm', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '🎖️ 獲得徽章', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                    { type: 'text', text: badgeText, size: 'xs', color: '#666666', margin: 'sm', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '📝 最近打卡', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                    { type: 'text', text: recentText, size: 'xs', color: '#666666', margin: 'sm', wrap: true }
                ]
            },
            footer: {
                type: 'box', layout: 'horizontal', paddingAll: 'md',
                contents: [
                    { type: 'button', action: { type: 'postback', label: '🗺️ 我的地圖', data: 'action=my_map' }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                    { type: 'button', action: { type: 'postback', label: '🔍 找活動', data: 'action=explore_category&category=all' }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
                ]
            }
        }
    };
}

function buildMapCard(visitedList) {
    if (!visitedList || visitedList.length === 0) {
        return {
            type: 'flex', altText: '我的探索地圖',
            contents: {
                type: 'bubble',
                header: { type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'lg', contents: [{ type: 'text', text: '🗺️ 我的探索地圖', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                    { type: 'text', text: '😢 還沒有打卡紀錄', size: 'md', color: '#666666' },
                    { type: 'text', text: '去「找活動」探索景點，標記「去過」開始收集！', size: 'sm', color: '#888888', margin: 'md', wrap: true }
                ]},
                footer: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                    { type: 'button', action: { type: 'message', label: '🔍 找活動', text: '找活動' }, style: 'primary', color: '#E74C3C' }
                ]}
            }
        };
    }

    // 依城市分組
    var cityGroups = {};
    visitedList.forEach(function(item) {
        var city = item.activity ? item.activity.city : '其他';
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(item);
    });

    var bubbles = Object.keys(cityGroups).slice(0, 10).map(function(city) {
        var items = cityGroups[city];
        var spots = items.slice(0, 5).map(function(item) {
            return {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                    { type: 'text', text: '✅', size: 'sm', flex: 0 },
                    { type: 'text', text: item.activity ? item.activity.name : '景點', size: 'sm', color: '#666666', flex: 1, margin: 'sm', wrap: true }
                ]
            };
        });

        if (items.length > 5) {
            spots.push({ type: 'text', text: '...還有 ' + (items.length - 5) + ' 個', size: 'xs', color: '#888888', margin: 'sm' });
        }

        // Google Maps 連結
        var firstItem = items[0];
        var mapQuery = firstItem.activity ? encodeURIComponent(firstItem.activity.address || firstItem.activity.name) : '';

        return {
            type: 'bubble', size: 'kilo',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'md',
                contents: [
                    { type: 'text', text: '📍 ' + city, weight: 'bold', size: 'md', color: '#ffffff' },
                    { type: 'text', text: items.length + ' 個景點', size: 'xs', color: '#ffffff' }
                ]
            },
            body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: spots },
            footer: {
                type: 'box', layout: 'vertical', paddingAll: 'sm',
                contents: [
                    { type: 'button', action: { type: 'uri', label: '🗺️ 開啟地圖', uri: 'https://www.google.com/maps/search/?api=1&query=' + mapQuery }, style: 'primary', color: '#3498DB', height: 'sm' }
                ]
            }
        };
    });

    return {
        type: 'flex', altText: '我的探索地圖（' + visitedList.length + '個景點）',
        contents: { type: 'carousel', contents: bubbles }
    };
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
    buildWeatherCard: buildWeatherCard,
    buildHealthMenu: buildHealthMenu,
    buildFamilyMenu: buildFamilyMenu,
    buildCommunityList: buildCommunityList,
    buildHelpMenu: buildHelpMenu,
    buildQuickActions: buildQuickActions,
    buildOnboardingStart: buildOnboardingStart,
    buildOnboardingStep1: buildOnboardingStep1,
    buildNearbyActivities: buildNearbyActivities,
    buildWishlistCard: buildWishlistCard,
	buildExpertCard: buildExpertCard,
    buildMapCard: buildMapCard
};