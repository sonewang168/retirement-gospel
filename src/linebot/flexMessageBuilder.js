/**
 * ============================================
 * Flex Message Builder
 * LINE Flex Message 模板構建器
 * ============================================
 */

const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Taipei');

/**
 * 顏色配置
 */
const COLORS = {
    primary: '#E74C3C',
    secondary: '#3498DB',
    success: '#27AE60',
    warning: '#F39C12',
    danger: '#E74C3C',
    info: '#17A2B8',
    dark: '#2C3E50',
    light: '#ECF0F1',
    white: '#FFFFFF',
    gray: '#95A5A6',
    
    // 分類顏色
    nature: '#27AE60',
    food: '#E67E22',
    culture: '#9B59B6',
    learning: '#3498DB',
    religion: '#F1C40F',
    wellness: '#1ABC9C',
    social: '#E91E63',
    home: '#607D8B'
};

/**
 * 圖示配置
 */
const ICONS = {
    nature: '🌿',
    food: '🍜',
    culture: '🎭',
    learning: '📚',
    religion: '🙏',
    wellness: '♨️',
    social: '👥',
    home: '🏠',
    
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    thunderstorm: '⛈️',
    
    easy: '🟢',
    moderate: '🟡',
    challenging: '🔴',
    
    walking: '🚶',
    bus: '🚌',
    train: '🚃',
    car: '🚗',
    bike: '🚲'
};

/**
 * 分類名稱對照
 */
const CATEGORY_NAMES = {
    nature: '自然踏青',
    food: '美食探索',
    culture: '藝文展演',
    learning: '學習成長',
    religion: '宗教信仰',
    wellness: '養生保健',
    social: '社交活動',
    home: '居家活動'
};

/**
 * ============================================
 * 每日推薦訊息
 * ============================================
 */
function buildDailyRecommendations(recommendations, user) {
    if (!recommendations || recommendations.length === 0) {
        return {
            type: 'text',
            text: '抱歉，目前沒有符合條件的推薦 😅\n\n可能是因為今天天氣或空氣品質不太理想\n\n您可以：\n• 調整偏好設定\n• 查看室內活動\n• 明天再來看看'
        };
    }

    const weather = recommendations[0]?.weatherInfo || {};
    const greeting = getTimeBasedGreeting();
    
    const bubbles = recommendations.slice(0, 3).map((rec, index) => 
        buildRecommendationBubble(rec, index + 1)
    );

    return {
        type: 'flex',
        altText: `${greeting}！今日為您推薦 ${recommendations.length} 個活動`,
        contents: {
            type: 'carousel',
            contents: [
                // 天氣總覽卡片
                buildWeatherSummaryBubble(weather, user),
                // 推薦活動卡片
                ...bubbles
            ]
        }
    };
}

/**
 * 天氣總覽泡泡
 */
function buildWeatherSummaryBubble(weather, user) {
    const greeting = getTimeBasedGreeting();
    const weatherIcon = getWeatherIcon(weather.description);
    const aqiStatus = getAqiStatus(weather.aqi);

    return {
        type: 'bubble',
        size: 'kilo',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `${greeting}！${user?.displayName || ''}`,
                    color: COLORS.white,
                    size: 'lg',
                    weight: 'bold'
                },
                {
                    type: 'text',
                    text: moment().format('M月D日 dddd'),
                    color: COLORS.white,
                    size: 'sm',
                    margin: 'sm'
                }
            ],
            backgroundColor: COLORS.primary,
            paddingAll: '20px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: weatherIcon,
                            size: '3xl',
                            flex: 0
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: weather.description || '晴天',
                                    size: 'lg',
                                    weight: 'bold'
                                },
                                {
                                    type: 'text',
                                    text: `${weather.temperatureMin || 20}°-${weather.temperatureMax || 28}°C`,
                                    size: 'md',
                                    color: COLORS.gray
                                }
                            ],
                            margin: 'lg'
                        }
                    ],
                    alignItems: 'center'
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '降雨機率',
                                    size: 'xs',
                                    color: COLORS.gray
                                },
                                {
                                    type: 'text',
                                    text: `${weather.rainProbability || 10}%`,
                                    size: 'lg',
                                    weight: 'bold'
                                }
                            ],
                            flex: 1,
                            alignItems: 'center'
                        },
                        {
                            type: 'separator'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '空氣品質',
                                    size: 'xs',
                                    color: COLORS.gray
                                },
                                {
                                    type: 'text',
                                    text: aqiStatus.text,
                                    size: 'lg',
                                    weight: 'bold',
                                    color: aqiStatus.color
                                }
                            ],
                            flex: 1,
                            alignItems: 'center'
                        }
                    ],
                    margin: 'lg',
                    paddingAll: 'md'
                }
            ],
            paddingAll: '20px'
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '👇 以下是為您精選的今日推薦',
                    size: 'sm',
                    color: COLORS.gray,
                    align: 'center'
                }
            ],
            paddingAll: '15px'
        }
    };
}

/**
 * 推薦活動泡泡
 */
function buildRecommendationBubble(recommendation, rank) {
    const activity = recommendation.activity || recommendation;
    const score = recommendation.score || 85;
    const categoryIcon = ICONS[activity.category] || '📍';
    const categoryColor = COLORS[activity.category] || COLORS.primary;
    const difficultyIcon = ICONS[activity.difficultyLevel] || '🟢';
    
    return {
        type: 'bubble',
        size: 'kilo',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: `#${rank}`,
                            color: COLORS.white,
                            size: 'sm',
                            weight: 'bold'
                        },
                        {
                            type: 'text',
                            text: `適合度 ${Math.round(score)}%`,
                            color: COLORS.white,
                            size: 'sm',
                            align: 'end'
                        }
                    ]
                },
                {
                    type: 'text',
                    text: `${categoryIcon} ${activity.name}`,
                    color: COLORS.white,
                    size: 'lg',
                    weight: 'bold',
                    wrap: true,
                    margin: 'md'
                }
            ],
            backgroundColor: categoryColor,
            paddingAll: '20px'
        },
        hero: activity.thumbnailUrl ? {
            type: 'image',
            url: activity.thumbnailUrl,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
        } : undefined,
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: activity.shortDescription || activity.description?.substring(0, 60) || '',
                    size: 'sm',
                    color: COLORS.dark,
                    wrap: true,
                    maxLines: 2
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📍',
                                    size: 'sm',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: `${activity.district || ''} ${activity.address?.substring(0, 15) || ''}`,
                                    size: 'sm',
                                    color: COLORS.gray,
                                    margin: 'sm',
                                    wrap: true,
                                    maxLines: 1
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '⏱️',
                                    size: 'sm',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: formatDuration(activity.estimatedDuration),
                                    size: 'sm',
                                    color: COLORS.gray,
                                    margin: 'sm'
                                },
                                {
                                    type: 'text',
                                    text: `${difficultyIcon}`,
                                    size: 'sm',
                                    margin: 'lg',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: getDifficultyText(activity.difficultyLevel),
                                    size: 'sm',
                                    color: COLORS.gray,
                                    margin: 'sm'
                                }
                            ],
                            margin: 'sm'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '💰',
                                    size: 'sm',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: formatCost(activity.costMin, activity.costMax),
                                    size: 'sm',
                                    color: COLORS.gray,
                                    margin: 'sm'
                                }
                            ],
                            margin: 'sm'
                        }
                    ],
                    margin: 'lg',
                    spacing: 'sm'
                }
            ],
            paddingAll: '20px'
        },
        footer: {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '詳細',
                        data: `action=view_activity&id=${activity.id}`
                    },
                    style: 'secondary',
                    height: 'sm',
                    flex: 1
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '❤️ 收藏',
                        data: `action=save_activity&id=${activity.id}`
                    },
                    style: 'secondary',
                    height: 'sm',
                    flex: 1,
                    margin: 'sm'
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '✓ 就決定',
                        data: `action=adopt_activity&id=${activity.id}`
                    },
                    style: 'primary',
                    height: 'sm',
                    flex: 1,
                    margin: 'sm',
                    color: COLORS.primary
                }
            ],
            paddingAll: '15px',
            spacing: 'sm'
        }
    };
}

/**
 * ============================================
 * 活動詳情訊息
 * ============================================
 */
function buildActivityDetail(activity, user) {
    if (!activity) {
        return { type: 'text', text: '找不到此活動資訊' };
    }

    const categoryIcon = ICONS[activity.category] || '📍';
    const categoryColor = COLORS[activity.category] || COLORS.primary;
    const difficultyIcon = ICONS[activity.difficultyLevel] || '🟢';
    
    return {
        type: 'flex',
        altText: `${activity.name} - 活動詳情`,
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: `${categoryIcon} ${CATEGORY_NAMES[activity.category] || '活動'}`,
                                color: COLORS.white,
                                size: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⭐',
                                        size: 'sm'
                                    },
                                    {
                                        type: 'text',
                                        text: `${activity.rating || 4.5}`,
                                        color: COLORS.white,
                                        size: 'sm',
                                        margin: 'xs'
                                    },
                                    {
                                        type: 'text',
                                        text: `(${activity.reviewCount || 0})`,
                                        color: COLORS.light,
                                        size: 'xs',
                                        margin: 'xs'
                                    }
                                ],
                                flex: 0
                            }
                        ]
                    },
                    {
                        type: 'text',
                        text: activity.name,
                        color: COLORS.white,
                        size: 'xl',
                        weight: 'bold',
                        wrap: true,
                        margin: 'md'
                    }
                ],
                backgroundColor: categoryColor,
                paddingAll: '20px'
            },
            hero: activity.thumbnailUrl ? {
                type: 'image',
                url: activity.thumbnailUrl,
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
            } : undefined,
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    // 描述
                    {
                        type: 'text',
                        text: activity.description || '暫無描述',
                        size: 'sm',
                        color: COLORS.dark,
                        wrap: true,
                        maxLines: 5
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    // 詳細資訊
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            // 地址
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📍 地址',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: activity.address || `${activity.city}${activity.district}`,
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5,
                                        wrap: true
                                    }
                                ]
                            },
                            // 時間
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⏱️ 時長',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: formatDuration(activity.estimatedDuration),
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5
                                    }
                                ],
                                margin: 'md'
                            },
                            // 難度
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💪 難度',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: `${difficultyIcon} ${getDifficultyText(activity.difficultyLevel)}`,
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5
                                    }
                                ],
                                margin: 'md'
                            },
                            // 費用
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💰 費用',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: formatCost(activity.costMin, activity.costMax),
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5
                                    }
                                ],
                                margin: 'md'
                            },
                            // 無障礙
                            activity.isAccessible ? {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '♿ 無障礙',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: activity.accessibilityInfo || '有無障礙設施',
                                        size: 'sm',
                                        color: COLORS.success,
                                        flex: 5
                                    }
                                ],
                                margin: 'md'
                            } : null,
                            // 停車
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🅿️ 停車',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: activity.parkingAvailable ? '有停車場' : '路邊停車',
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5
                                    }
                                ],
                                margin: 'md'
                            },
                            // 交通
                            activity.publicTransitInfo ? {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🚌 交通',
                                        size: 'sm',
                                        color: COLORS.gray,
                                        flex: 2
                                    },
                                    {
                                        type: 'text',
                                        text: activity.publicTransitInfo,
                                        size: 'sm',
                                        color: COLORS.dark,
                                        flex: 5,
                                        wrap: true
                                    }
                                ],
                                margin: 'md'
                            } : null
                        ].filter(Boolean),
                        margin: 'lg',
                        spacing: 'sm'
                    },
                    // 標籤
                    activity.tags && activity.tags.length > 0 ? {
                        type: 'box',
                        layout: 'horizontal',
                        contents: activity.tags.slice(0, 4).map(tag => ({
                            type: 'box',
                            layout: 'vertical',
                            contents: [{
                                type: 'text',
                                text: `#${tag}`,
                                size: 'xs',
                                color: categoryColor
                            }],
                            backgroundColor: `${categoryColor}20`,
                            paddingAll: '5px',
                            cornerRadius: 'md',
                            margin: 'sm'
                        })),
                        margin: 'lg',
                        wrap: true
                    } : null
                ].filter(Boolean),
                paddingAll: '20px'
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    label: '🗺️ 導航',
                                    uri: `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`
                                },
                                style: 'secondary',
                                height: 'sm',
                                flex: 1
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '❤️ 收藏',
                                    data: `action=save_activity&id=${activity.id}`
                                },
                                style: 'secondary',
                                height: 'sm',
                                flex: 1,
                                margin: 'sm'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '👥 揪團去',
                                    data: `action=create_group&activity_id=${activity.id}`
                                },
                                style: 'primary',
                                height: 'sm',
                                flex: 1,
                                color: COLORS.secondary
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '✓ 加入行程',
                                    data: `action=adopt_activity&id=${activity.id}`
                                },
                                style: 'primary',
                                height: 'sm',
                                flex: 1,
                                margin: 'sm',
                                color: COLORS.primary
                            }
                        ],
                        margin: 'sm'
                    }
                ],
                paddingAll: '15px',
                spacing: 'sm'
            }
        }
    };
}

/**
 * ============================================
 * 探索分類選單
 * ============================================
 */
function buildExploreCategories() {
    const categories = [
        { key: 'nature', name: '自然踏青', icon: '🌿', desc: '步道、公園、農場' },
        { key: 'food', name: '美食探索', icon: '🍜', desc: '小吃、餐廳、市場' },
        { key: 'culture', name: '藝文展演', icon: '🎭', desc: '展覽、音樂、電影' },
        { key: 'learning', name: '學習成長', icon: '📚', desc: '課程、講座、體驗' },
        { key: 'religion', name: '宗教信仰', icon: '🙏', desc: '廟宇、教會、禪修' },
        { key: 'wellness', name: '養生保健', icon: '♨️', desc: '溫泉、按摩、運動' }
    ];

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
                    {
                        type: 'text',
                        text: '🔍 探索活動',
                        color: COLORS.white,
                        size: 'xl',
                        weight: 'bold'
                    },
                    {
                        type: 'text',
                        text: '選擇您感興趣的類別',
                        color: COLORS.light,
                        size: 'sm',
                        margin: 'sm'
                    }
                ],
                backgroundColor: COLORS.secondary,
                paddingAll: '20px'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: categories.map(cat => ({
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [{
                                type: 'text',
                                text: cat.icon,
                                size: 'xxl'
                            }],
                            width: '50px',
                            alignItems: 'center',
                            justifyContent: 'center'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: cat.name,
                                    size: 'md',
                                    weight: 'bold',
                                    color: COLORS.dark
                                },
                                {
                                    type: 'text',
                                    text: cat.desc,
                                    size: 'xs',
                                    color: COLORS.gray
                                }
                            ],
                            flex: 1,
                            justifyContent: 'center'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [{
                                type: 'text',
                                text: '›',
                                size: 'xl',
                                color: COLORS.gray
                            }],
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    ],
                    paddingAll: '15px',
                    backgroundColor: COLORS.white,
                    cornerRadius: 'lg',
                    margin: 'md',
                    action: {
                        type: 'postback',
                        label: cat.name,
                        data: `action=explore_category&category=${cat.key}`
                    }
                })),
                paddingAll: '15px',
                backgroundColor: COLORS.light
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'postback',
                            label: '📍 搜尋附近',
                            data: 'action=search_nearby'
                        },
                        style: 'primary',
                        color: COLORS.primary
                    }
                ],
                paddingAll: '15px'
            }
        }
    };
}

/**
 * ============================================
 * 天氣卡片
 * ============================================
 */
function buildWeatherCard(weather) {
    if (!weather) {
        return { type: 'text', text: '無法取得天氣資訊，請稍後再試' };
    }

    const weatherIcon = getWeatherIcon(weather.description);
    const aqiStatus = getAqiStatus(weather.aqi);

    return {
        type: 'flex',
        altText: `今日天氣：${weather.description}`,
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    {
                        type: 'text',
                        text: weatherIcon,
                        size: '4xl',
                        flex: 0
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: weather.city || '高雄市',
                                color: COLORS.white,
                                size: 'sm'
                            },
                            {
                                type: 'text',
                                text: weather.description || '晴天',
                                color: COLORS.white,
                                size: 'xl',
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: `${weather.temperature || 26}°C`,
                                color: COLORS.white,
                                size: 'xxl',
                                weight: 'bold'
                            }
                        ],
                        margin: 'lg'
                    }
                ],
                backgroundColor: '#4A90D9',
                paddingAll: '20px',
                alignItems: 'center'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            buildWeatherInfoBox('🌡️', '體感', `${weather.feelsLike || weather.temperature}°C`),
                            buildWeatherInfoBox('💧', '濕度', `${weather.humidity || 70}%`),
                            buildWeatherInfoBox('🌧️', '降雨', `${weather.rainProbability || 10}%`)
                        ],
                        spacing: 'md'
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: '空氣品質',
                                size: 'sm',
                                color: COLORS.gray
                            },
                            {
                                type: 'text',
                                text: `AQI ${weather.aqi || 50} ${aqiStatus.text}`,
                                size: 'sm',
                                color: aqiStatus.color,
                                weight: 'bold',
                                align: 'end'
                            }
                        ],
                        margin: 'lg'
                    },
                    weather.aqi > 100 ? {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [{
                            type: 'text',
                            text: '⚠️ 建議減少戶外活動',
                            size: 'sm',
                            color: COLORS.warning
                        }],
                        margin: 'md'
                    } : null
                ].filter(Boolean),
                paddingAll: '20px'
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'postback',
                            label: '查看適合的活動推薦',
                            data: 'action=daily_recommendation'
                        },
                        style: 'primary',
                        color: COLORS.primary
                    }
                ],
                paddingAll: '15px'
            }
        }
    };
}

function buildWeatherInfoBox(icon, label, value) {
    return {
        type: 'box',
        layout: 'vertical',
        contents: [
            {
                type: 'text',
                text: icon,
                size: 'lg',
                align: 'center'
            },
            {
                type: 'text',
                text: label,
                size: 'xs',
                color: COLORS.gray,
                align: 'center',
                margin: 'sm'
            },
            {
                type: 'text',
                text: value,
                size: 'sm',
                weight: 'bold',
                align: 'center'
            }
        ],
        flex: 1,
        alignItems: 'center'
    };
}

/**
 * ============================================
 * 空氣品質卡片
 * ============================================
 */
function buildAirQualityCard(airQuality) {
    if (!airQuality) {
        return { type: 'text', text: '無法取得空氣品質資訊，請稍後再試' };
    }

    const aqiStatus = getAqiStatus(airQuality.aqi);

    return {
        type: 'flex',
        altText: `空氣品質：${aqiStatus.text}`,
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🌬️ 空氣品質',
                        color: COLORS.white,
                        size: 'lg',
                        weight: 'bold'
                    },
                    {
                        type: 'text',
                        text: airQuality.city || '高雄市',
                        color: COLORS.light,
                        size: 'sm'
                    }
                ],
                backgroundColor: aqiStatus.bgColor,
                paddingAll: '20px'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'AQI',
                                        size: 'sm',
                                        color: COLORS.gray
                                    },
                                    {
                                        type: 'text',
                                        text: String(airQuality.aqi || 50),
                                        size: '3xl',
                                        weight: 'bold',
                                        color: aqiStatus.color
                                    },
                                    {
                                        type: 'text',
                                        text: aqiStatus.text,
                                        size: 'md',
                                        weight: 'bold',
                                        color: aqiStatus.color
                                    }
                                ],
                                flex: 1,
                                alignItems: 'center'
                            },
                            {
                                type: 'separator'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'PM2.5',
                                        size: 'sm',
                                        color: COLORS.gray
                                    },
                                    {
                                        type: 'text',
                                        text: `${airQuality.pm25 || 15}`,
                                        size: 'xl',
                                        weight: 'bold'
                                    },
                                    {
                                        type: 'text',
                                        text: 'μg/m³',
                                        size: 'xs',
                                        color: COLORS.gray
                                    }
                                ],
                                flex: 1,
                                alignItems: 'center'
                            }
                        ],
                        paddingAll: 'md'
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: aqiStatus.suggestion,
                                size: 'sm',
                                color: COLORS.dark,
                                wrap: true
                            }
                        ],
                        margin: 'lg'
                    }
                ],
                paddingAll: '20px'
            }
        }
    };
}

// ============================================
// 工具函數
// ============================================

function getTimeBasedGreeting() {
    const hour = moment().hour();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午安';
    return '晚安';
}

function getWeatherIcon(description) {
    if (!description) return '☀️';
    if (description.includes('雨')) return '🌧️';
    if (description.includes('雷')) return '⛈️';
    if (description.includes('陰') || description.includes('多雲')) return '☁️';
    if (description.includes('霧')) return '🌫️';
    return '☀️';
}

function getAqiStatus(aqi) {
    if (!aqi || aqi <= 50) return { text: '良好', color: COLORS.success, bgColor: '#27AE60', suggestion: '空氣品質良好，適合戶外活動！' };
    if (aqi <= 100) return { text: '普通', color: COLORS.warning, bgColor: '#F39C12', suggestion: '空氣品質尚可，一般人可正常戶外活動。' };
    if (aqi <= 150) return { text: '敏感族群不健康', color: '#E67E22', bgColor: '#E67E22', suggestion: '敏感族群應減少戶外活動，建議選擇室內活動。' };
    if (aqi <= 200) return { text: '不健康', color: COLORS.danger, bgColor: '#E74C3C', suggestion: '建議減少戶外活動，選擇室內活動為宜。' };
    return { text: '非常不健康', color: '#8E44AD', bgColor: '#8E44AD', suggestion: '請避免戶外活動，建議待在室內。' };
}

function formatDuration(minutes) {
    if (!minutes) return '約 1-2 小時';
    if (minutes < 60) return `約 ${minutes} 分鐘`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `約 ${hours} 小時`;
    return `約 ${hours} 小時 ${mins} 分`;
}

function formatCost(min, max) {
    if (!min && !max) return '免費';
    if (min === 0 && !max) return '免費';
    if (min === 0 && max === 0) return '免費';
    if (min === max) return `$${min}`;
    if (!max) return `$${min} 起`;
    return `$${min}-${max}`;
}

function getDifficultyText(level) {
    switch (level) {
        case 'easy': return '輕鬆';
        case 'moderate': return '適中';
        case 'challenging': return '挑戰';
        default: return '輕鬆';
    }
}

// 繼續匯出...
module.exports = {
    buildDailyRecommendations,
    buildActivityDetail,
    buildExploreCategories,
    buildWeatherCard,
    buildAirQualityCard,
    buildWeatherSummaryBubble,
    buildRecommendationBubble,
    // 以下函數將在第二部分定義
    buildQuickActions: () => ({ type: 'text', text: '快速操作選單建構中...' }),
    buildOnboardingStart: () => ({ type: 'text', text: 'Onboarding 建構中...' }),
    buildGroupList: () => ({ type: 'text', text: '揪團列表建構中...' }),
    buildCreateGroupStart: () => ({ type: 'text', text: '建立揪團建構中...' }),
    buildMySchedule: () => ({ type: 'text', text: '我的行程建構中...' }),
    buildWishlist: () => ({ type: 'text', text: '收藏清單建構中...' }),
    buildActivityHistory: () => ({ type: 'text', text: '歷史紀錄建構中...' }),
    buildSettingsMenu: () => ({ type: 'text', text: '設定選單建構中...' }),
    buildHealthMenu: () => ({ type: 'text', text: '健康選單建構中...' }),
    buildFamilyMenu: () => ({ type: 'text', text: '家人選單建構中...' }),
    buildCommunityList: () => ({ type: 'text', text: '社群列表建構中...' }),
    buildHelpMenu: () => ({ type: 'text', text: '幫助選單建構中...' }),
    buildPremiumInfo: () => ({ type: 'text', text: '會員資訊建構中...' }),
    buildRequestLocation: () => ({ type: 'text', text: '請分享您的位置' }),
    buildNearbyActivities: () => ({ type: 'text', text: '附近活動建構中...' }),
    buildGroupDetail: () => ({ type: 'text', text: '揪團詳情建構中...' }),
    buildJoinGroupResult: () => ({ type: 'text', text: '加入結果建構中...' }),
    buildMyGroups: () => ({ type: 'text', text: '我的揪團建構中...' }),
    buildActivityCompleted: () => ({ type: 'text', text: '活動完成！' }),
    buildCategoryActivities: () => ({ type: 'text', text: '分類活動建構中...' }),
    buildMoreRecommendations: () => ({ type: 'text', text: '更多推薦建構中...' }),
    buildNotificationSettings: () => ({ type: 'text', text: '通知設定建構中...' }),
    buildMedicationList: () => ({ type: 'text', text: '用藥列表建構中...' }),
    buildAppointmentList: () => ({ type: 'text', text: '回診列表建構中...' }),
    buildFamilyInvite: () => ({ type: 'text', text: '家人邀請建構中...' }),
    buildFamilyList: () => ({ type: 'text', text: '家人列表建構中...' }),
    buildFamilyPermissions: () => ({ type: 'text', text: '權限設定建構中...' }),
    buildCommunityDetail: () => ({ type: 'text', text: '社群詳情建構中...' }),
    buildSubscribePlans: () => ({ type: 'text', text: '訂閱方案建構中...' }),
    buildOnboardingStep1: () => ({ type: 'text', text: 'Step 1 建構中...' }),
    buildOnboardingStep2: () => ({ type: 'text', text: 'Step 2 建構中...' }),
    buildOnboardingStep3: () => ({ type: 'text', text: 'Step 3 建構中...' }),
    buildOnboardingStep4: () => ({ type: 'text', text: 'Step 4 建構中...' }),
    buildOnboardingComplete: () => ({ type: 'text', text: 'Onboarding 完成！' }),
    buildEditProfileStart: () => ({ type: 'text', text: '編輯資料建構中...' }),
    buildEditInterestsStart: () => ({ type: 'text', text: '編輯興趣建構中...' }),
    buildEditLocationStart: () => ({ type: 'text', text: '編輯位置建構中...' }),
    buildSetPushTimeStart: () => ({ type: 'text', text: '設定推播時間建構中...' }),
    buildAddMedicationStart: () => ({ type: 'text', text: '新增用藥建構中...' }),
    buildAddAppointmentStart: () => ({ type: 'text', text: '新增回診建構中...' }),
    COLORS,
    ICONS,
    CATEGORY_NAMES
};
