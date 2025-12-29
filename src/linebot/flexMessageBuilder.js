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
                { type: 'button', action: { type: 'postback', label: '想去', data: 'action=save_activity&id=' + a.id }, style: 'secondary', height: 'sm', margin: 'sm' }
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
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: a.description || '精彩活動', size: 'sm', color: '#666666', wrap: true, margin: 'lg' }
            ]},
            footer: { type: 'box', layout: 'horizontal', paddingAll: 'sm', contents: [
                { type: 'button', action: { type: 'postback', label: '想去', data: 'action=save_activity&id=' + a.id }, style: 'primary', color: '#E74C3C', height: 'sm' }
            ]}
        }
    };
}

function buildExploreCategories() {
    var cats = [
        { name: '文化藝術', id: 'culture', color: '#9B59B6' },
        { name: '自然景觀', id: 'nature', color: '#27AE60' },
        { name: '宗教聖地', id: 'religion', color: '#F39C12' },
        { name: '美食品嚐', id: 'food', color: '#E74C3C' },
        { name: '運動健身', id: 'sports', color: '#3498DB' },
        { name: '休閒娛樂', id: 'entertainment', color: '#1ABC9C' }
    ];
    var btns = cats.map(function(c) {
        return { type: 'button', action: { type: 'postback', label: c.name, data: 'action=explore_category&category=' + c.id }, style: 'primary', color: c.color, height: 'sm', margin: 'sm' };
    });
    return {
        type: 'flex', altText: '探索分類',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '探索活動', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: btns }
        }
    };
}

function buildCategoryActivities(acts, cat) {
    if (!acts || acts.length === 0) return { type: 'text', text: '此分類沒有活動' };
    return buildDailyRecommendations(acts, null);
}

function buildGroupList(groups) {
    return { type: 'text', text: '揪團功能開發中' };
}

function buildSettingsMenu(user) {
    var notif = user.notificationEnabled ? '開啟' : '關閉';
    return {
        type: 'flex', altText: '設定',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#34495E', paddingAll: 'lg', contents: [{ type: 'text', text: '個人設定', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '城市: ' + (user.city || '未設定'), size: 'sm', color: '#666666' },
                { type: 'text', text: '推播: ' + notif, size: 'sm', color: '#666666', margin: 'sm' },
                { type: 'text', text: '早安時間: ' + (user.morningPushTime || '06:00'), size: 'sm', color: '#666666', margin: 'sm' },
                { type: 'separator', margin: 'lg' },
                { type: 'button', action: { type: 'postback', label: '修改城市', data: 'action=edit_city' }, style: 'primary', color: '#3498DB', margin: 'lg', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '修改早安時間', data: 'action=edit_push_time' }, style: 'primary', color: '#9B59B6', margin: 'sm', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '切換推播', data: 'action=toggle_notification' }, style: 'secondary', margin: 'sm', height: 'sm' }
            ]}
        }
    };
}

function buildTimePickerMenu() {
    var times = ['05:00', '06:00', '07:00', '08:00', '09:00', '10:00'];
    var btns = times.map(function(t) {
        return { type: 'button', action: { type: 'postback', label: t, data: 'action=set_push_time&time=' + t }, style: 'secondary', height: 'sm', margin: 'sm' };
    });
    return {
        type: 'flex', altText: '選擇時間',
        contents: {
            type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#9B59B6', paddingAll: 'lg', contents: [{ type: 'text', text: '選擇早安時間', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: btns }
        }
    };
}

function buildCityPickerMenu() {
    var cities = ['高雄市', '台北市', '新北市', '台中市', '台南市', '桃園市'];
    var btns = cities.map(function(c) {
        return { type: 'button', action: { type: 'postback', label: c, data: 'action=set_city&city=' + c }, style: 'secondary', height: 'sm', margin: 'sm' };
    });
    return {
        type: 'flex', altText: '選擇城市',
        contents: {
            type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'lg', contents: [{ type: 'text', text: '選擇城市', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: btns }
        }
    };
}

function buildWeatherCard(w) {
    if (!w || w.error) return { type: 'text', text: '無法取得天氣' };
    var forecast = (w.forecast || []).slice(0, 4).map(function(d) {
        return { type: 'box', layout: 'vertical', flex: 1, contents: [
            { type: 'text', text: d.dayName || '', size: 'xs', color: '#888888', align: 'center' },
            { type: 'text', text: d.emoji || '', size: 'xl', align: 'center' },
            { type: 'text', text: d.temp + '°', size: 'sm', align: 'center', weight: 'bold' }
        ]};
    });
    return {
        type: 'flex', altText: w.city + ' ' + w.temp + '°C',
        contents: {
            type: 'bubble', size: 'giga',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#3498DB', paddingAll: 'xl', contents: [
                { type: 'box', layout: 'horizontal', contents: [
                    { type: 'text', text: w.emoji || '', size: '4xl', flex: 0 },
                    { type: 'box', layout: 'vertical', margin: 'lg', flex: 1, contents: [
                        { type: 'text', text: w.city, size: 'xl', color: '#ffffff', weight: 'bold' },
                        { type: 'text', text: w.description || '', size: 'md', color: '#ffffff' }
                    ]}
                ]},
                { type: 'text', text: w.temp + '°C', size: '5xl', color: '#ffffff', weight: 'bold', margin: 'lg' }
            ]},
            body: { type: 'box', layout: 'vertical', paddingAll: 'xl', contents: [
                { type: 'box', layout: 'horizontal', contents: [
                    { type: 'text', text: '濕度 ' + w.humidity + '%', size: 'sm', flex: 1 },
                    { type: 'text', text: '風速 ' + w.windSpeed + 'm/s', size: 'sm', flex: 1 }
                ]},
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '未來預報', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
                { type: 'box', layout: 'horizontal', margin: 'md', contents: forecast.length > 0 ? forecast : [{ type: 'text', text: '無資料', size: 'sm' }] },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '活動建議', size: 'sm', color: '#E74C3C', weight: 'bold', margin: 'lg' },
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
    var apptText = appts.length > 0 ? appts.slice(0, 3).map(function(a) { return a.appointmentDate + ' ' + a.hospitalName; }).join('\n') : '無回診提醒';
    var medText = meds.length > 0 ? meds.slice(0, 3).map(function(m) { return m.medicationName; }).join('\n') : '無用藥提醒';
    return {
        type: 'flex', altText: '健康管理',
        contents: {
            type: 'bubble', size: 'mega',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#27AE60', paddingAll: 'lg', contents: [{ type: 'text', text: '健康管理', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '回診提醒 (' + appts.length + ')', weight: 'bold', size: 'md', color: '#27AE60' },
                { type: 'text', text: apptText, size: 'sm', color: '#666666', margin: 'sm', wrap: true },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: '用藥提醒 (' + meds.length + ')', weight: 'bold', size: 'md', color: '#27AE60', margin: 'lg' },
                { type: 'text', text: medText, size: 'sm', color: '#666666', margin: 'sm', wrap: true },
                { type: 'separator', margin: 'lg' },
                { type: 'button', action: { type: 'postback', label: '新增回診', data: 'action=add_appointment' }, style: 'primary', color: '#27AE60', margin: 'lg', height: 'sm' },
                { type: 'button', action: { type: 'postback', label: '新增用藥', data: 'action=add_medication' }, style: 'secondary', margin: 'sm', height: 'sm' }
            ]}
        }
    };
}

function buildFamilyMenu(user) {
    return {
        type: 'flex', altText: '家人關懷',
        contents: {
            type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E91E63', paddingAll: 'lg', contents: [{ type: 'text', text: '家人關懷', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '目前沒有連結家人', size: 'sm', color: '#888888' },
                { type: 'button', action: { type: 'postback', label: '邀請家人', data: 'action=invite_family' }, style: 'primary', color: '#E91E63', margin: 'lg' }
            ]}
        }
    };
}

function buildCommunityList() {
    return { type: 'text', text: '社群功能開發中' };
}

function buildHelpMenu() {
    return {
        type: 'flex', altText: '功能說明',
        contents: {
            type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '功能說明', weight: 'bold', size: 'lg', color: '#ffffff' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                { type: 'text', text: '日本5天 - AI規劃行程\n我的行程 - 查看收藏\n想去清單 - 收藏活動\n天氣 - 查天氣\n健康 - 管理提醒', size: 'sm', color: '#666666', wrap: true }
            ]}
        }
    };
}

function buildQuickActions() {
    return { type: 'text', text: '試試：日本5天、我的行程、想去清單、天氣、健康' };
}

function buildOnboardingStart() {
    return { type: 'text', text: '歡迎！輸入「日本5天」試試AI規劃' };
}

function buildOnboardingStep1() {
    return { type: 'text', text: '請問您住在哪個城市？' };
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
                header: { type: 'box', layout: 'vertical', backgroundColor: '#E74C3C', paddingAll: 'lg', contents: [{ type: 'text', text: '我的想去清單', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: [
                    { type: 'text', text: '還沒有收藏活動', size: 'md', color: '#666666' },
                    { type: 'text', text: '輸入「找活動」開始探索', size: 'sm', color: '#888888', margin: 'md' }
                ]},
                footer: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                    { type: 'button', action: { type: 'message', label: '找活動', text: '找活動' }, style: 'primary', color: '#E74C3C' }
                ]}
            }
        };
    }
    var bubbles = list.slice(0, 10).map(function(item) {
        var a = item.activity;
        var col = item.isVisited ? '#27AE60' : '#E74C3C';
        return {
            type: 'bubble', size: 'kilo',
            header: { type: 'box', layout: 'vertical', backgroundColor: col, paddingAll: 'md', contents: [{ type: 'text', text: a.name || '活動', weight: 'bold', size: 'md', color: '#ffffff', wrap: true }] },
            body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: [
                { type: 'text', text: '📍 ' + (a.city || ''), size: 'sm', color: '#666666' },
                { type: 'text', text: item.isVisited ? '已去過' : '想去', size: 'sm', color: col, margin: 'sm', weight: 'bold' }
            ]},
            footer: { type: 'box', layout: 'horizontal', paddingAll: 'sm', contents: [
                { type: 'button', action: { type: 'postback', label: '詳情', data: 'action=view_activity&id=' + a.id }, style: 'primary', color: '#3498DB', height: 'sm', flex: 1 },
                { type: 'button', action: { type: 'postback', label: '去過', data: 'action=toggle_visited&id=' + a.id }, style: 'secondary', height: 'sm', flex: 1, margin: 'sm' }
            ]}
        };
    });
    return { type: 'flex', altText: '想去清單(' + list.length + '個)', contents: { type: 'carousel', contents: bubbles } };
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
    buildWishlistCard: buildWishlistCard
};