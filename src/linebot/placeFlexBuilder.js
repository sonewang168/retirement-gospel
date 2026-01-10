/**
 * 景點搜尋 Flex Message Builder
 */
const placesService = require('../services/placesService');

/**
 * 建立搜尋結果輪播卡片
 */
function buildPlaceSearchResults(places, query) {
    if (!places || places.length === 0) {
        return {
            type: 'text',
            text: '😕 找不到「' + query + '」相關景點\n\n請試試：\n• 使用更具體的名稱\n• 加上地區，如「台南 赤崁樓」\n• 檢查是否有錯字'
        };
    }

    var bubbles = places.map(function(place) {
        var rating = place.rating || 0;
        var stars = '⭐'.repeat(Math.round(rating));
        var ratingText = rating > 0 ? stars + ' ' + rating.toFixed(1) : '尚無評分';
        var typeLabel = placesService.getTypeLabel(place.types);
        
        // 從地址提取城市
        var city = extractCity(place.address);

        var bubble = {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#27AE60',
                paddingAll: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '📍 ' + typeLabel,
                        color: '#ffffff',
                        size: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'text',
                        text: place.name,
                        weight: 'bold',
                        size: 'md',
                        wrap: true,
                        maxLines: 2
                    },
                    {
                        type: 'text',
                        text: ratingText + (place.userRatingsTotal > 0 ? ' (' + place.userRatingsTotal + '則)' : ''),
                        size: 'sm',
                        color: '#F39C12',
                        margin: 'sm'
                    },
                    {
                        type: 'text',
                        text: '📍 ' + city,
                        size: 'xs',
                        color: '#888888',
                        margin: 'sm'
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'sm',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'postback',
                            label: '❤️ 加入想去清單',
                            data: 'action=add_place&placeId=' + place.placeId + '&name=' + encodeURIComponent(place.name)
                        },
                        style: 'primary',
                        color: '#E74C3C',
                        height: 'sm'
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🗺️ 查看地圖',
                            uri: 'https://www.google.com/maps/place/?q=place_id:' + place.placeId
                        },
                        style: 'secondary',
                        height: 'sm',
                        margin: 'sm'
                    }
                ]
            }
        };

        // 如果有照片，加入 hero
        if (place.photo) {
            bubble.hero = {
                type: 'image',
                url: place.photo,
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
            };
        }

        return bubble;
    });

    return {
        type: 'flex',
        altText: '🔍 找到 ' + places.length + ' 個「' + query + '」相關景點',
        contents: {
            type: 'carousel',
            contents: bubbles
        }
    };
}

/**
 * 從地址提取城市
 */
function extractCity(address) {
    if (!address) return '台灣';
    
    // 台灣縣市列表
    var cities = [
        '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣',
        '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣',
        '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣',
        '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
    ];
    
    for (var i = 0; i < cities.length; i++) {
        if (address.indexOf(cities[i]) !== -1) {
            return cities[i];
        }
    }
    
    // 嘗試提取日本地區
    if (address.indexOf('日本') !== -1) {
        var match = address.match(/日本(.{2,4}[都道府縣])/);
        if (match) return match[1];
        return '日本';
    }
    
    return address.split(',')[0] || '未知地區';
}

/**
 * 建立新增成功訊息
 */
function buildAddPlaceSuccess(place) {
    return {
        type: 'flex',
        altText: '✅ 已新增「' + place.name + '」',
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#27AE60',
                paddingAll: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '✅ 新增成功！',
                        weight: 'bold',
                        color: '#ffffff',
                        align: 'center'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'text',
                        text: place.name,
                        weight: 'bold',
                        size: 'md',
                        align: 'center',
                        wrap: true
                    },
                    {
                        type: 'text',
                        text: '已加入想去清單 ❤️',
                        size: 'sm',
                        color: '#888888',
                        align: 'center',
                        margin: 'md'
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                paddingAll: 'sm',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'postback',
                            label: '📋 想去清單',
                            data: 'action=wishlist'
                        },
                        style: 'primary',
                        color: '#3498DB',
                        height: 'sm',
                        flex: 1
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'postback',
                            label: '🔍 繼續搜尋',
                            data: 'action=search_place_prompt'
                        },
                        style: 'secondary',
                        height: 'sm',
                        flex: 1,
                        margin: 'sm'
                    }
                ]
            }
        }
    };
}

module.exports = {
    buildPlaceSearchResults: buildPlaceSearchResults,
    buildAddPlaceSuccess: buildAddPlaceSuccess,
    extractCity: extractCity
};
