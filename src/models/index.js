/**
 * ============================================
 * 資料庫模型總管
 * ============================================
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 資料庫連線設定
const sequelize = new Sequelize(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'retirement_gospel',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: process.env.DATABASE_URL ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
});

// ============================================
// 用戶模型
// ============================================
const User = sequelize.define('User', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    lineUserId: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
        field: 'line_user_id'
    },
    displayName: {
        type: Sequelize.STRING(100),
        field: 'display_name'
    },
    pictureUrl: {
        type: Sequelize.TEXT,
        field: 'picture_url'
    },
    phone: {
        type: Sequelize.STRING(20)
    },
    email: {
        type: Sequelize.STRING(100)
    },
    birthDate: {
        type: Sequelize.DATEONLY,
        field: 'birth_date'
    },
    gender: {
        type: Sequelize.ENUM('male', 'female', 'other', 'prefer_not_to_say')
    },
    city: {
        type: Sequelize.STRING(20),
        defaultValue: '高雄市'
    },
    district: {
        type: Sequelize.STRING(20)
    },
    address: {
        type: Sequelize.TEXT
    },
    mobilityLevel: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
        field: 'mobility_level'
    },
    transportMode: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: ['public_transit'],
        field: 'transport_mode'
    },
    budgetMonthly: {
        type: Sequelize.INTEGER,
        defaultValue: 5000,
        field: 'budget_monthly'
    },
    budgetSingle: {
        type: Sequelize.INTEGER,
        defaultValue: 500,
        field: 'budget_single'
    },
    notificationEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'notification_enabled'
    },
    morningPushTime: {
        type: Sequelize.TIME,
        defaultValue: '07:30:00',
        field: 'morning_push_time'
    },
    eveningPushTime: {
        type: Sequelize.TIME,
        defaultValue: '18:00:00',
        field: 'evening_push_time'
    },
    languagePreference: {
        type: Sequelize.STRING(10),
        defaultValue: 'zh-TW',
        field: 'language_preference'
    },
    fontSizePreference: {
        type: Sequelize.ENUM('normal', 'large', 'extra_large'),
        defaultValue: 'large',
        field: 'font_size_preference'
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    isPremium: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_premium'
    },
    premiumExpiresAt: {
        type: Sequelize.DATE,
        field: 'premium_expires_at'
    },
    referralCode: {
        type: Sequelize.STRING(10),
        unique: true,
        field: 'referral_code'
    },
    referredBy: {
        type: Sequelize.UUID,
        field: 'referred_by'
    },
    lastActiveAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'last_active_at'
    },
    onboardingCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'onboarding_completed'
    },
    onboardingStep: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'onboarding_step'
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true
});

// ============================================
// 用戶健康資料模型
// ============================================
const UserHealth = sequelize.define('UserHealth', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    height: {
        type: Sequelize.FLOAT,
        comment: '身高(公分)'
    },
    weight: {
        type: Sequelize.FLOAT,
        comment: '體重(公斤)'
    },
    chronicConditions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        field: 'chronic_conditions',
        comment: '慢性病'
    },
    allergies: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: '過敏'
    },
    medications: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: '用藥紀錄'
    },
    mobilityAids: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        field: 'mobility_aids',
        comment: '輔助器具'
    },
    dietaryRestrictions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        field: 'dietary_restrictions',
        comment: '飲食限制'
    },
    emergencyContact: {
        type: Sequelize.JSONB,
        field: 'emergency_contact',
        comment: '緊急聯絡人'
    },
    primaryDoctor: {
        type: Sequelize.JSONB,
        field: 'primary_doctor',
        comment: '主治醫師'
    },
    insuranceInfo: {
        type: Sequelize.JSONB,
        field: 'insurance_info',
        comment: '保險資訊'
    },
    bloodType: {
        type: Sequelize.STRING(5),
        field: 'blood_type'
    },
    dailyStepsGoal: {
        type: Sequelize.INTEGER,
        defaultValue: 6000,
        field: 'daily_steps_goal'
    },
    wearableDeviceConnected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'wearable_device_connected'
    },
    wearableDeviceType: {
        type: Sequelize.STRING(50),
        field: 'wearable_device_type'
    }
}, {
    tableName: 'user_health',
    timestamps: true,
    underscored: true
});

// ============================================
// 用戶興趣偏好模型
// ============================================
const UserInterest = sequelize.define('UserInterest', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    category: {
        type: Sequelize.STRING(50),
        allowNull: false
    },
    subcategory: {
        type: Sequelize.STRING(50)
    },
    weight: {
        type: Sequelize.FLOAT,
        defaultValue: 1.0,
        comment: '興趣權重 0-2'
    },
    isExcluded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_excluded',
        comment: '排除此類別'
    }
}, {
    tableName: 'user_interests',
    timestamps: true,
    underscored: true
});

// ============================================
// 活動/景點模型
// ============================================
const Activity = sequelize.define('Activity', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(200),
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT
    },
    shortDescription: {
        type: Sequelize.STRING(200),
        field: 'short_description'
    },
    category: {
        type: Sequelize.ENUM('nature', 'food', 'culture', 'learning', 'religion', 'wellness', 'social', 'home'),
        allowNull: false
    },
    subcategory: {
        type: Sequelize.STRING(50)
    },
    city: {
        type: Sequelize.STRING(20),
        defaultValue: '高雄市'
    },
    district: {
        type: Sequelize.STRING(20)
    },
    address: {
        type: Sequelize.TEXT
    },
    latitude: {
        type: Sequelize.DECIMAL(10, 8)
    },
    longitude: {
        type: Sequelize.DECIMAL(11, 8)
    },
    difficultyLevel: {
        type: Sequelize.ENUM('easy', 'moderate', 'challenging'),
        defaultValue: 'easy',
        field: 'difficulty_level'
    },
    estimatedDuration: {
        type: Sequelize.INTEGER,
        comment: '預估時間(分鐘)',
        field: 'estimated_duration'
    },
    costMin: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'cost_min'
    },
    costMax: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'cost_max'
    },
    costDescription: {
        type: Sequelize.STRING(100),
        field: 'cost_description'
    },
    openingHours: {
        type: Sequelize.JSONB,
        field: 'opening_hours',
        comment: '營業時間'
    },
    contactPhone: {
        type: Sequelize.STRING(20),
        field: 'contact_phone'
    },
    website: {
        type: Sequelize.TEXT
    },
    isIndoor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_indoor'
    },
    isAccessible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_accessible',
        comment: '無障礙設施'
    },
    accessibilityInfo: {
        type: Sequelize.TEXT,
        field: 'accessibility_info'
    },
    parkingAvailable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'parking_available'
    },
    publicTransitInfo: {
        type: Sequelize.TEXT,
        field: 'public_transit_info'
    },
    bestWeather: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: ['sunny', 'cloudy'],
        field: 'best_weather'
    },
    bestSeason: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: ['spring', 'autumn'],
        field: 'best_season'
    },
    minAqiRequired: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'min_aqi_required',
        comment: 'AQI 需低於此值'
    },
    images: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        defaultValue: []
    },
    thumbnailUrl: {
        type: Sequelize.TEXT,
        field: 'thumbnail_url'
    },
    tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
    },
    rating: {
        type: Sequelize.DECIMAL(2, 1),
        defaultValue: 0
    },
    reviewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'review_count'
    },
    visitCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'visit_count'
    },
    isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_featured'
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    source: {
        type: Sequelize.STRING(50),
        comment: '資料來源'
    },
    sourceUrl: {
        type: Sequelize.TEXT,
        field: 'source_url'
    },
    lastVerifiedAt: {
        type: Sequelize.DATE,
        field: 'last_verified_at'
    }
}, {
    tableName: 'activities',
    timestamps: true,
    underscored: true
});

// ============================================
// 特別活動/時效性活動模型
// ============================================
const Event = sequelize.define('Event', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    activityId: {
        type: Sequelize.UUID,
        field: 'activity_id',
        references: {
            model: 'activities',
            key: 'id'
        }
    },
    title: {
        type: Sequelize.STRING(200),
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT
    },
    category: {
        type: Sequelize.STRING(50)
    },
    startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: Sequelize.DATE,
        field: 'end_date'
    },
    startTime: {
        type: Sequelize.TIME,
        field: 'start_time'
    },
    endTime: {
        type: Sequelize.TIME,
        field: 'end_time'
    },
    venue: {
        type: Sequelize.STRING(200)
    },
    address: {
        type: Sequelize.TEXT
    },
    city: {
        type: Sequelize.STRING(20)
    },
    district: {
        type: Sequelize.STRING(20)
    },
    latitude: {
        type: Sequelize.DECIMAL(10, 8)
    },
    longitude: {
        type: Sequelize.DECIMAL(11, 8)
    },
    ticketPrice: {
        type: Sequelize.STRING(100),
        field: 'ticket_price'
    },
    ticketUrl: {
        type: Sequelize.TEXT,
        field: 'ticket_url'
    },
    organizerName: {
        type: Sequelize.STRING(100),
        field: 'organizer_name'
    },
    organizerContact: {
        type: Sequelize.STRING(100),
        field: 'organizer_contact'
    },
    imageUrl: {
        type: Sequelize.TEXT,
        field: 'image_url'
    },
    maxParticipants: {
        type: Sequelize.INTEGER,
        field: 'max_participants'
    },
    currentParticipants: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'current_participants'
    },
    registrationDeadline: {
        type: Sequelize.DATE,
        field: 'registration_deadline'
    },
    isOnline: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_online'
    },
    onlineUrl: {
        type: Sequelize.TEXT,
        field: 'online_url'
    },
    tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
    },
    source: {
        type: Sequelize.STRING(50)
    },
    sourceUrl: {
        type: Sequelize.TEXT,
        field: 'source_url'
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'events',
    timestamps: true,
    underscored: true
});

// ============================================
// 推薦紀錄模型
// ============================================
const Recommendation = sequelize.define('Recommendation', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    activityId: {
        type: Sequelize.UUID,
        field: 'activity_id'
    },
    eventId: {
        type: Sequelize.UUID,
        field: 'event_id'
    },
    recommendedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'recommended_at'
    },
    recommendationType: {
        type: Sequelize.ENUM('morning_push', 'evening_push', 'on_demand', 'group', 'ai_generated'),
        field: 'recommendation_type'
    },
    score: {
        type: Sequelize.FLOAT,
        comment: '推薦分數 0-100'
    },
    scoreBreakdown: {
        type: Sequelize.JSONB,
        field: 'score_breakdown',
        comment: '分數細項'
    },
    weatherCondition: {
        type: Sequelize.JSONB,
        field: 'weather_condition'
    },
    aqiValue: {
        type: Sequelize.INTEGER,
        field: 'aqi_value'
    },
    aiGeneratedText: {
        type: Sequelize.TEXT,
        field: 'ai_generated_text'
    },
    userAction: {
        type: Sequelize.ENUM('pending', 'viewed', 'saved', 'adopted', 'dismissed', 'completed'),
        defaultValue: 'pending',
        field: 'user_action'
    },
    userActionAt: {
        type: Sequelize.DATE,
        field: 'user_action_at'
    },
    userRating: {
        type: Sequelize.INTEGER,
        field: 'user_rating',
        comment: '1-5 星評價'
    },
    userFeedback: {
        type: Sequelize.TEXT,
        field: 'user_feedback'
    }
}, {
    tableName: 'recommendations',
    timestamps: true,
    underscored: true
});

// ============================================
// 用戶活動紀錄模型
// ============================================
const UserActivity = sequelize.define('UserActivity', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    activityId: {
        type: Sequelize.UUID,
        field: 'activity_id'
    },
    eventId: {
        type: Sequelize.UUID,
        field: 'event_id'
    },
    status: {
        type: Sequelize.ENUM('wishlist', 'planned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'wishlist'
    },
    plannedDate: {
        type: Sequelize.DATE,
        field: 'planned_date'
    },
    completedDate: {
        type: Sequelize.DATE,
        field: 'completed_date'
    },
    rating: {
        type: Sequelize.INTEGER,
        comment: '1-5 星'
    },
    review: {
        type: Sequelize.TEXT
    },
    photos: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        defaultValue: []
    },
    actualDuration: {
        type: Sequelize.INTEGER,
        field: 'actual_duration',
        comment: '實際花費時間(分鐘)'
    },
    actualCost: {
        type: Sequelize.INTEGER,
        field: 'actual_cost'
    },
    companions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: '同行者'
    },
    notes: {
        type: Sequelize.TEXT,
        comment: '私人筆記'
    },
    isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_public'
    }
}, {
    tableName: 'user_activities',
    timestamps: true,
    underscored: true
});

// ============================================
// 揪團模型
// ============================================
const Group = sequelize.define('Group', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    creatorId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'creator_id'
    },
    activityId: {
        type: Sequelize.UUID,
        field: 'activity_id'
    },
    eventId: {
        type: Sequelize.UUID,
        field: 'event_id'
    },
    title: {
        type: Sequelize.STRING(200),
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT
    },
    eventDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'event_date'
    },
    eventTime: {
        type: Sequelize.TIME,
        field: 'event_time'
    },
    meetingPoint: {
        type: Sequelize.STRING(200),
        field: 'meeting_point'
    },
    meetingPointLat: {
        type: Sequelize.DECIMAL(10, 8),
        field: 'meeting_point_lat'
    },
    meetingPointLng: {
        type: Sequelize.DECIMAL(11, 8),
        field: 'meeting_point_lng'
    },
    minParticipants: {
        type: Sequelize.INTEGER,
        defaultValue: 2,
        field: 'min_participants'
    },
    maxParticipants: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        field: 'max_participants'
    },
    currentParticipants: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        field: 'current_participants'
    },
    costPerPerson: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'cost_per_person'
    },
    costSplitMethod: {
        type: Sequelize.ENUM('equal', 'pay_own', 'organizer_pays', 'custom'),
        defaultValue: 'pay_own',
        field: 'cost_split_method'
    },
    requirements: {
        type: Sequelize.TEXT,
        comment: '參加條件'
    },
    ageRange: {
        type: Sequelize.STRING(20),
        field: 'age_range'
    },
    genderPreference: {
        type: Sequelize.STRING(20),
        field: 'gender_preference'
    },
    difficultyLevel: {
        type: Sequelize.ENUM('easy', 'moderate', 'challenging'),
        defaultValue: 'easy',
        field: 'difficulty_level'
    },
    status: {
        type: Sequelize.ENUM('draft', 'open', 'full', 'confirmed', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'open'
    },
    registrationDeadline: {
        type: Sequelize.DATE,
        field: 'registration_deadline'
    },
    cancelReason: {
        type: Sequelize.TEXT,
        field: 'cancel_reason'
    },
    tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
    },
    imageUrl: {
        type: Sequelize.TEXT,
        field: 'image_url'
    },
    isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_public'
    },
    chatRoomId: {
        type: Sequelize.STRING(50),
        field: 'chat_room_id'
    }
}, {
    tableName: 'groups',
    timestamps: true,
    underscored: true
});

// ============================================
// 揪團成員模型
// ============================================
const GroupMember = sequelize.define('GroupMember', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    groupId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'group_id'
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    role: {
        type: Sequelize.ENUM('organizer', 'co_organizer', 'member'),
        defaultValue: 'member'
    },
    status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'withdrawn', 'kicked'),
        defaultValue: 'pending'
    },
    joinedAt: {
        type: Sequelize.DATE,
        field: 'joined_at'
    },
    message: {
        type: Sequelize.TEXT,
        comment: '加入申請訊息'
    },
    checkedIn: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'checked_in'
    },
    checkInTime: {
        type: Sequelize.DATE,
        field: 'check_in_time'
    },
    rating: {
        type: Sequelize.INTEGER,
        comment: '對此次揪團的評價'
    },
    review: {
        type: Sequelize.TEXT
    }
}, {
    tableName: 'group_members',
    timestamps: true,
    underscored: true
});

// ============================================
// 家人連結模型
// ============================================
const FamilyLink = sequelize.define('FamilyLink', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    parentUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'parent_user_id',
        comment: '長輩'
    },
    childUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'child_user_id',
        comment: '子女'
    },
    relationship: {
        type: Sequelize.ENUM('son', 'daughter', 'spouse', 'sibling', 'caregiver', 'friend', 'other'),
        defaultValue: 'other'
    },
    nickname: {
        type: Sequelize.STRING(50),
        comment: '暱稱'
    },
    status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'blocked'),
        defaultValue: 'pending'
    },
    inviteCode: {
        type: Sequelize.STRING(20),
        unique: true,
        field: 'invite_code'
    },
    permissions: {
        type: Sequelize.JSONB,
        defaultValue: {
            viewLocation: false,
            viewActivity: true,
            viewHealth: false,
            receiveAlerts: true,
            sendRecommendations: true
        }
    },
    linkedAt: {
        type: Sequelize.DATE,
        field: 'linked_at'
    },
    lastNotifiedAt: {
        type: Sequelize.DATE,
        field: 'last_notified_at'
    }
}, {
    tableName: 'family_links',
    timestamps: true,
    underscored: true
});

// ============================================
// 通知紀錄模型
// ============================================
const Notification = sequelize.define('Notification', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    type: {
        type: Sequelize.ENUM(
            'morning_recommendation', 
            'evening_summary', 
            'group_invite', 
            'group_update',
            'family_alert',
            'health_reminder',
            'medication_reminder',
            'appointment_reminder',
            'weather_alert',
            'system'
        ),
        allowNull: false
    },
    title: {
        type: Sequelize.STRING(200)
    },
    message: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    data: {
        type: Sequelize.JSONB,
        comment: '額外資料'
    },
    channel: {
        type: Sequelize.ENUM('line_push', 'line_message', 'email', 'sms'),
        defaultValue: 'line_push'
    },
    status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        defaultValue: 'pending'
    },
    sentAt: {
        type: Sequelize.DATE,
        field: 'sent_at'
    },
    readAt: {
        type: Sequelize.DATE,
        field: 'read_at'
    },
    errorMessage: {
        type: Sequelize.TEXT,
        field: 'error_message'
    },
    scheduledFor: {
        type: Sequelize.DATE,
        field: 'scheduled_for'
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
});

// ============================================
// 用藥提醒模型
// ============================================
const MedicationReminder = sequelize.define('MedicationReminder', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    medicationName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'medication_name'
    },
    dosage: {
        type: Sequelize.STRING(100),
        comment: '劑量'
    },
    frequency: {
        type: Sequelize.STRING(50),
        comment: '頻率'
    },
    reminderTimes: {
        type: Sequelize.ARRAY(Sequelize.TIME),
        field: 'reminder_times'
    },
    startDate: {
        type: Sequelize.DATEONLY,
        field: 'start_date'
    },
    endDate: {
        type: Sequelize.DATEONLY,
        field: 'end_date'
    },
    instructions: {
        type: Sequelize.TEXT,
        comment: '服用說明'
    },
    prescribedBy: {
        type: Sequelize.STRING(100),
        field: 'prescribed_by'
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    notifyFamily: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'notify_family'
    }
}, {
    tableName: 'medication_reminders',
    timestamps: true,
    underscored: true
});

// ============================================
// 回診提醒模型
// ============================================
const AppointmentReminder = sequelize.define('AppointmentReminder', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    hospitalName: {
        type: Sequelize.STRING(100),
        field: 'hospital_name'
    },
    department: {
        type: Sequelize.STRING(50)
    },
    doctorName: {
        type: Sequelize.STRING(50),
        field: 'doctor_name'
    },
    appointmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'appointment_date'
    },
    appointmentNumber: {
        type: Sequelize.STRING(20),
        field: 'appointment_number'
    },
    purpose: {
        type: Sequelize.TEXT
    },
    address: {
        type: Sequelize.TEXT
    },
    reminderDaysBefore: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        defaultValue: [1, 3],
        field: 'reminder_days_before'
    },
    reminderSent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'reminder_sent'
    },
    status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled', 'rescheduled'),
        defaultValue: 'scheduled'
    },
    notes: {
        type: Sequelize.TEXT
    },
    notifyFamily: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'notify_family'
    }
}, {
    tableName: 'appointment_reminders',
    timestamps: true,
    underscored: true
});

// ============================================
// 天氣快取模型
// ============================================
const WeatherCache = sequelize.define('WeatherCache', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    city: {
        type: Sequelize.STRING(20),
        allowNull: false
    },
    district: {
        type: Sequelize.STRING(20)
    },
    date: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    weatherData: {
        type: Sequelize.JSONB,
        field: 'weather_data'
    },
    temperature: {
        type: Sequelize.FLOAT
    },
    temperatureMin: {
        type: Sequelize.FLOAT,
        field: 'temperature_min'
    },
    temperatureMax: {
        type: Sequelize.FLOAT,
        field: 'temperature_max'
    },
    humidity: {
        type: Sequelize.INTEGER
    },
    rainProbability: {
        type: Sequelize.INTEGER,
        field: 'rain_probability'
    },
    weatherDescription: {
        type: Sequelize.STRING(50),
        field: 'weather_description'
    },
    weatherIcon: {
        type: Sequelize.STRING(20),
        field: 'weather_icon'
    },
    uvIndex: {
        type: Sequelize.INTEGER,
        field: 'uv_index'
    },
    aqi: {
        type: Sequelize.INTEGER
    },
    aqiStatus: {
        type: Sequelize.STRING(20),
        field: 'aqi_status'
    },
    pm25: {
        type: Sequelize.FLOAT
    },
    fetchedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'fetched_at'
    }
}, {
    tableName: 'weather_cache',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['city', 'district', 'date']
        }
    ]
});

// ============================================
// 同好社群模型
// ============================================
const Community = sequelize.define('Community', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT
    },
    category: {
        type: Sequelize.STRING(50)
    },
    imageUrl: {
        type: Sequelize.TEXT,
        field: 'image_url'
    },
    coverUrl: {
        type: Sequelize.TEXT,
        field: 'cover_url'
    },
    creatorId: {
        type: Sequelize.UUID,
        field: 'creator_id'
    },
    memberCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'member_count'
    },
    isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_public'
    },
    joinApprovalRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'join_approval_required'
    },
    rules: {
        type: Sequelize.TEXT
    },
    tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
    },
    city: {
        type: Sequelize.STRING(20)
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'communities',
    timestamps: true,
    underscored: true
});

// ============================================
// 社群成員模型
// ============================================
const CommunityMember = sequelize.define('CommunityMember', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    communityId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'community_id'
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id'
    },
    role: {
        type: Sequelize.ENUM('admin', 'moderator', 'member'),
        defaultValue: 'member'
    },
    status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'banned'),
        defaultValue: 'approved'
    },
    joinedAt: {
        type: Sequelize.DATE,
        field: 'joined_at'
    },
    notificationEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'notification_enabled'
    }
}, {
    tableName: 'community_members',
    timestamps: true,
    underscored: true
});

// ============================================
// 對話狀態模型 (追蹤用戶對話流程)
// ============================================
const ConversationState = sequelize.define('ConversationState', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        field: 'user_id'
    },
    currentFlow: {
        type: Sequelize.STRING(50),
        field: 'current_flow',
        comment: '目前對話流程'
    },
    currentStep: {
        type: Sequelize.STRING(50),
        field: 'current_step'
    },
    flowData: {
        type: Sequelize.JSONB,
        defaultValue: {},
        field: 'flow_data',
        comment: '流程暫存資料'
    },
    lastMessageAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'last_message_at'
    },
    expiresAt: {
        type: Sequelize.DATE,
        field: 'expires_at'
    }
}, {
    tableName: 'conversation_states',
    timestamps: true,
    underscored: true
});

// ============================================
// 使用統計模型
// ============================================
const UsageStats = sequelize.define('UsageStats', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: Sequelize.UUID,
        field: 'user_id'
    },
    date: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    eventType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'event_type'
    },
    eventData: {
        type: Sequelize.JSONB,
        field: 'event_data'
    },
    count: {
        type: Sequelize.INTEGER,
        defaultValue: 1
    }
}, {
    tableName: 'usage_stats',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['user_id', 'date', 'event_type']
        }
    ]
});

// ============================================
// 建立關聯
// ============================================

// User 關聯
User.hasOne(UserHealth, { foreignKey: 'userId', as: 'health' });
UserHealth.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserInterest, { foreignKey: 'userId', as: 'interests' });
UserInterest.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Recommendation, { foreignKey: 'userId' });
Recommendation.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserActivity, { foreignKey: 'userId' });
UserActivity.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Group, { foreignKey: 'creatorId', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

User.hasMany(GroupMember, { foreignKey: 'userId' });
GroupMember.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(MedicationReminder, { foreignKey: 'userId' });
MedicationReminder.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AppointmentReminder, { foreignKey: 'userId' });
AppointmentReminder.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(ConversationState, { foreignKey: 'userId' });
ConversationState.belongsTo(User, { foreignKey: 'userId' });

// Activity 關聯
Activity.hasMany(Event, { foreignKey: 'activityId' });
Event.belongsTo(Activity, { foreignKey: 'activityId' });

Activity.hasMany(Recommendation, { foreignKey: 'activityId' });
Recommendation.belongsTo(Activity, { foreignKey: 'activityId' });

Activity.hasMany(UserActivity, { foreignKey: 'activityId' });
UserActivity.belongsTo(Activity, { foreignKey: 'activityId' });

Activity.hasMany(Group, { foreignKey: 'activityId' });
Group.belongsTo(Activity, { foreignKey: 'activityId' });

// Event 關聯
Event.hasMany(Recommendation, { foreignKey: 'eventId' });
Recommendation.belongsTo(Event, { foreignKey: 'eventId' });

Event.hasMany(UserActivity, { foreignKey: 'eventId' });
UserActivity.belongsTo(Event, { foreignKey: 'eventId' });

Event.hasMany(Group, { foreignKey: 'eventId' });
Group.belongsTo(Event, { foreignKey: 'eventId' });

// Group 關聯
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

// Family 關聯
User.hasMany(FamilyLink, { foreignKey: 'parentUserId', as: 'familyAsParent' });
User.hasMany(FamilyLink, { foreignKey: 'childUserId', as: 'familyAsChild' });
FamilyLink.belongsTo(User, { foreignKey: 'parentUserId', as: 'parent' });
FamilyLink.belongsTo(User, { foreignKey: 'childUserId', as: 'child' });

// Community 關聯
Community.hasMany(CommunityMember, { foreignKey: 'communityId', as: 'members' });
CommunityMember.belongsTo(Community, { foreignKey: 'communityId' });
User.hasMany(CommunityMember, { foreignKey: 'userId' });
CommunityMember.belongsTo(User, { foreignKey: 'userId' });

// ============================================
// 資料庫初始化函數
// ============================================

async function initDatabase() {
    try {
        // 測試連線
        await sequelize.authenticate();
        logger.info('資料庫連線成功');

        // 同步模型 (開發環境使用 alter: true)
        const syncOptions = process.env.NODE_ENV === 'production' 
            ? {} 
            : { alter: true };
        
        await sequelize.sync(syncOptions);
        logger.info('資料庫模型同步完成');

        return true;
    } catch (error) {
        logger.error('資料庫初始化失敗:', error);
        throw error;
    }
}

// ============================================
// 匯出
// ============================================

module.exports = {
    sequelize,
    initDatabase,
    User,
    UserHealth,
    UserInterest,
    Activity,
    Event,
    Recommendation,
    UserActivity,
    Group,
    GroupMember,
    FamilyLink,
    Notification,
    MedicationReminder,
    AppointmentReminder,
    WeatherCache,
    Community,
    CommunityMember,
    ConversationState,
    UsageStats
};
