/**
 * ============================================
 * 種子資料腳本
 * 初始化活動資料庫
 * ============================================
 */

require('dotenv').config();
const { sequelize, Activity, Event, Community } = require('../src/models');

// 高雄市活動種子資料
const kaohsiungActivities = [
    // 自然踏青
    {
        name: '壽山動物園',
        description: '台灣第一座公立動物園，園區內有多種珍稀動物，是親子同遊的好去處。園區設有無障礙步道，適合長者悠閒漫步。',
        shortDescription: '高雄最美的動物園，適合全家同遊',
        category: 'nature',
        subcategory: '動物園',
        city: '高雄市',
        district: '鼓山區',
        address: '高雄市鼓山區萬壽路350號',
        latitude: 22.6366,
        longitude: 120.2746,
        difficultyLevel: 'easy',
        estimatedDuration: 180,
        costMin: 40,
        costMax: 40,
        costDescription: '全票40元，敬老票免費',
        openingHours: {
            monday: 'closed',
            tuesday: '09:00-17:00',
            wednesday: '09:00-17:00',
            thursday: '09:00-17:00',
            friday: '09:00-17:00',
            saturday: '09:00-17:00',
            sunday: '09:00-17:00'
        },
        contactPhone: '07-5215187',
        website: 'https://zoo.kcg.gov.tw',
        isIndoor: false,
        isAccessible: true,
        accessibilityInfo: '園區設有無障礙步道及電梯',
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至壽山站，轉乘56號公車',
        bestWeather: ['sunny', 'cloudy'],
        bestSeason: ['spring', 'autumn', 'winter'],
        minAqiRequired: 150,
        thumbnailUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400',
        tags: ['親子', '動物', '戶外', '無障礙'],
        rating: 4.5,
        reviewCount: 1250,
        isFeatured: true
    },
    {
        name: '蓮池潭',
        description: '高雄著名的觀光景點，以龍虎塔聞名。環湖步道平坦好走，清晨傍晚時分散步最宜人。',
        shortDescription: '龍虎塔經典景點，環湖散步好去處',
        category: 'nature',
        subcategory: '公園',
        city: '高雄市',
        district: '左營區',
        address: '高雄市左營區翠華路1435號',
        latitude: 22.6819,
        longitude: 120.2942,
        difficultyLevel: 'easy',
        estimatedDuration: 120,
        costMin: 0,
        costMax: 0,
        costDescription: '免費參觀',
        isIndoor: false,
        isAccessible: true,
        accessibilityInfo: '環湖步道平坦',
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至左營站或生態園區站',
        bestWeather: ['sunny', 'cloudy'],
        bestSeason: ['spring', 'autumn', 'winter'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1598449356475-b9f71db7d847?w=400',
        tags: ['散步', '攝影', '免費', '經典景點'],
        rating: 4.6,
        reviewCount: 3200,
        isFeatured: true
    },
    {
        name: '旗津海岸公園',
        description: '搭渡輪到旗津，漫步海邊聽濤聲。海產街美食眾多，騎單車環島更是愜意。',
        shortDescription: '搭渡輪遊旗津，海鮮美食一級棒',
        category: 'nature',
        subcategory: '海濱',
        city: '高雄市',
        district: '旗津區',
        address: '高雄市旗津區旗津三路990號',
        latitude: 22.6103,
        longitude: 120.2648,
        difficultyLevel: 'easy',
        estimatedDuration: 240,
        costMin: 30,
        costMax: 300,
        costDescription: '渡輪費用約30元，餐飲自理',
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭捷運至西子灣站，步行至鼓山渡輪站',
        bestWeather: ['sunny', 'cloudy'],
        bestSeason: ['spring', 'autumn'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
        tags: ['海邊', '美食', '渡輪', '單車'],
        rating: 4.4,
        reviewCount: 2800
    },
    {
        name: '澄清湖',
        description: '高雄最大的人工湖，有「台灣西湖」美譽。園區廣大，環湖步道適合悠閒散步。',
        shortDescription: '台灣西湖之美，環湖步道休閒好去處',
        category: 'nature',
        subcategory: '湖泊',
        city: '高雄市',
        district: '鳥松區',
        address: '高雄市鳥松區大埤路32號',
        latitude: 22.6667,
        longitude: 120.3667,
        difficultyLevel: 'easy',
        estimatedDuration: 150,
        costMin: 0,
        costMax: 100,
        costDescription: '入園免費，部分設施收費',
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘60、70號公車',
        bestWeather: ['sunny', 'cloudy'],
        tags: ['散步', '湖景', '攝影'],
        rating: 4.3,
        reviewCount: 1500
    },

    // 美食探索
    {
        name: '六合夜市',
        description: '高雄最知名的觀光夜市，從傍晚營業到深夜。各式小吃琳瑯滿目，是體驗在地美食的好地方。',
        shortDescription: '高雄經典夜市，小吃天堂',
        category: 'food',
        subcategory: '夜市',
        city: '高雄市',
        district: '新興區',
        address: '高雄市新興區六合二路',
        latitude: 22.6318,
        longitude: 120.2996,
        difficultyLevel: 'easy',
        estimatedDuration: 120,
        costMin: 100,
        costMax: 500,
        costDescription: '小吃費用自理',
        openingHours: {
            monday: '17:00-24:00',
            tuesday: '17:00-24:00',
            wednesday: '17:00-24:00',
            thursday: '17:00-24:00',
            friday: '17:00-24:00',
            saturday: '17:00-24:00',
            sunday: '17:00-24:00'
        },
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: false,
        publicTransitInfo: '搭乘捷運至美麗島站',
        bestWeather: ['sunny', 'cloudy'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        tags: ['夜市', '小吃', '美食', '夜生活'],
        rating: 4.2,
        reviewCount: 5600,
        isFeatured: true
    },
    {
        name: '瑞豐夜市',
        description: '在地人最愛的夜市，攤位種類多元，價格實惠。每週二、四、五、六、日營業。',
        shortDescription: '在地人最愛，平價美食天堂',
        category: 'food',
        subcategory: '夜市',
        city: '高雄市',
        district: '左營區',
        address: '高雄市左營區裕誠路',
        latitude: 22.6658,
        longitude: 120.3003,
        difficultyLevel: 'easy',
        estimatedDuration: 120,
        costMin: 100,
        costMax: 400,
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至巨蛋站',
        tags: ['夜市', '小吃', '平價'],
        rating: 4.4,
        reviewCount: 4200
    },
    {
        name: '駁二藝術特區',
        description: '舊港口倉庫群改建的藝術園區，有展覽、文創小店、美食餐廳。週末常有市集活動。',
        shortDescription: '文青必訪，藝術與美食兼備',
        category: 'culture',
        subcategory: '藝術園區',
        city: '高雄市',
        district: '鹽埕區',
        address: '高雄市鹽埕區大勇路1號',
        latitude: 22.6208,
        longitude: 120.2819,
        difficultyLevel: 'easy',
        estimatedDuration: 180,
        costMin: 0,
        costMax: 300,
        costDescription: '戶外免費，部分展覽收費',
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至鹽埕埔站或西子灣站',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
        tags: ['藝術', '文創', '展覽', '咖啡'],
        rating: 4.5,
        reviewCount: 3800,
        isFeatured: true
    },

    // 藝文展演
    {
        name: '衛武營國家藝術文化中心',
        description: '世界最大單一屋頂綜合劇院，建築造型獨特。除了欣賞表演，戶外廣場也是休閒好去處。',
        shortDescription: '世界級藝術殿堂，建築本身就是藝術品',
        category: 'culture',
        subcategory: '劇院',
        city: '高雄市',
        district: '鳳山區',
        address: '高雄市鳳山區三多一路1號',
        latitude: 22.6228,
        longitude: 120.3428,
        difficultyLevel: 'easy',
        estimatedDuration: 180,
        costMin: 0,
        costMax: 2000,
        costDescription: '參觀免費，表演票價依節目而定',
        isIndoor: true,
        isAccessible: true,
        accessibilityInfo: '全區無障礙設施完善',
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至衛武營站',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400',
        tags: ['藝術', '表演', '建築', '音樂'],
        rating: 4.7,
        reviewCount: 2100,
        isFeatured: true
    },
    {
        name: '高雄市立美術館',
        description: '南台灣最重要的美術館之一，定期有各類藝術展覽。園區綠意盎然，適合散步。',
        shortDescription: '藝術薰陶好去處，園區散步也很棒',
        category: 'culture',
        subcategory: '美術館',
        city: '高雄市',
        district: '鼓山區',
        address: '高雄市鼓山區美術館路80號',
        latitude: 22.6558,
        longitude: 120.2864,
        difficultyLevel: 'easy',
        estimatedDuration: 150,
        costMin: 0,
        costMax: 200,
        costDescription: '常設展免費，特展另計',
        isIndoor: true,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至美術館站',
        tags: ['藝術', '展覽', '美術館'],
        rating: 4.4,
        reviewCount: 1800
    },

    // 宗教信仰
    {
        name: '佛光山',
        description: '台灣最大的佛教道場之一，建築宏偉莊嚴。可參觀佛陀紀念館，欣賞宗教藝術之美。',
        shortDescription: '心靈淨化好去處，建築藝術也值得一看',
        category: 'religion',
        subcategory: '佛教',
        city: '高雄市',
        district: '大樹區',
        address: '高雄市大樹區統嶺里興田路153號',
        latitude: 22.7547,
        longitude: 120.4453,
        difficultyLevel: 'easy',
        estimatedDuration: 240,
        costMin: 0,
        costMax: 0,
        costDescription: '免費參觀',
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '可搭乘義大客運或高雄客運',
        thumbnailUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
        tags: ['佛教', '心靈', '建築', '免費'],
        rating: 4.6,
        reviewCount: 4500,
        isFeatured: true
    },
    {
        name: '三鳳宮',
        description: '高雄最知名的媽祖廟之一，香火鼎盛。農曆三月媽祖聖誕時更是熱鬧非凡。',
        shortDescription: '香火鼎盛的媽祖廟，在地信仰中心',
        category: 'religion',
        subcategory: '道教',
        city: '高雄市',
        district: '三民區',
        address: '高雄市三民區河北二路134號',
        latitude: 22.6418,
        longitude: 120.3018,
        difficultyLevel: 'easy',
        estimatedDuration: 60,
        costMin: 0,
        costMax: 0,
        isIndoor: true,
        isAccessible: true,
        parkingAvailable: false,
        publicTransitInfo: '搭乘捷運至三多商圈站',
        tags: ['媽祖', '廟宇', '在地信仰'],
        rating: 4.3,
        reviewCount: 1200
    },

    // 養生保健
    {
        name: '寶來溫泉',
        description: '六龜區著名的溫泉區，泉質優良。有多家溫泉旅館可選擇，冬天泡湯最舒服。',
        shortDescription: '山中溫泉秘境，養生泡湯好選擇',
        category: 'wellness',
        subcategory: '溫泉',
        city: '高雄市',
        district: '六龜區',
        address: '高雄市六龜區寶來里',
        latitude: 23.1033,
        longitude: 120.7017,
        difficultyLevel: 'easy',
        estimatedDuration: 180,
        costMin: 300,
        costMax: 1500,
        costDescription: '大眾池約300-500元',
        isIndoor: true,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '建議自行開車前往',
        bestSeason: ['autumn', 'winter'],
        thumbnailUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
        tags: ['溫泉', '養生', '放鬆'],
        rating: 4.5,
        reviewCount: 980
    },
    {
        name: '中央公園',
        description: '位於市中心的大型公園，有生態池、步道、運動設施。清晨很多長者在此運動。',
        shortDescription: '市中心的綠洲，晨運散步好去處',
        category: 'wellness',
        subcategory: '公園',
        city: '高雄市',
        district: '前鎮區',
        address: '高雄市前鎮區中山二路',
        latitude: 22.6158,
        longitude: 120.3028,
        difficultyLevel: 'easy',
        estimatedDuration: 60,
        costMin: 0,
        costMax: 0,
        isIndoor: false,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至中央公園站',
        tags: ['運動', '散步', '免費', '晨運'],
        rating: 4.2,
        reviewCount: 2200
    },

    // 學習成長
    {
        name: '高雄市立圖書館總館',
        description: '綠建築圖書館，館藏豐富，有多元學習空間。頂樓露台可眺望高雄港美景。',
        shortDescription: '美麗的綠建築圖書館，閱讀與美景兼得',
        category: 'learning',
        subcategory: '圖書館',
        city: '高雄市',
        district: '前鎮區',
        address: '高雄市前鎮區新光路61號',
        latitude: 22.6117,
        longitude: 120.3025,
        difficultyLevel: 'easy',
        estimatedDuration: 120,
        costMin: 0,
        costMax: 0,
        costDescription: '免費入館',
        openingHours: {
            monday: 'closed',
            tuesday: '10:00-22:00',
            wednesday: '10:00-22:00',
            thursday: '10:00-22:00',
            friday: '10:00-22:00',
            saturday: '10:00-22:00',
            sunday: '10:00-22:00'
        },
        isIndoor: true,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至三多商圈站',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400',
        tags: ['閱讀', '圖書館', '免費', '建築'],
        rating: 4.6,
        reviewCount: 1600
    },
    {
        name: '國立科學工藝博物館',
        description: '互動式科學博物館，有各種科學展覽和體驗設施。適合親子同遊，也有銀髮族活動。',
        shortDescription: '科學探索樂園，老少咸宜',
        category: 'learning',
        subcategory: '博物館',
        city: '高雄市',
        district: '三民區',
        address: '高雄市三民區九如一路720號',
        latitude: 22.6403,
        longitude: 120.3222,
        difficultyLevel: 'easy',
        estimatedDuration: 180,
        costMin: 0,
        costMax: 100,
        costDescription: '65歲以上免費',
        isIndoor: true,
        isAccessible: true,
        parkingAvailable: true,
        publicTransitInfo: '搭乘捷運至後驛站',
        tags: ['科學', '博物館', '互動', '親子'],
        rating: 4.3,
        reviewCount: 2400
    }
];

// 社群種子資料
const communities = [
    {
        name: '高雄攝影同好會',
        description: '喜歡攝影的朋友一起出遊拍照，分享作品，交流技巧。',
        category: 'photography',
        imageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200',
        memberCount: 156,
        tags: ['攝影', '旅遊', '藝術'],
        city: '高雄市'
    },
    {
        name: '健走樂活社',
        description: '每週安排健走行程，強健體魄，結交朋友。',
        category: 'walking',
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200',
        memberCount: 89,
        tags: ['健走', '運動', '健康'],
        city: '高雄市'
    },
    {
        name: '美食探險隊',
        description: '一起探索各地美食，從夜市小吃到私房餐廳。',
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200',
        memberCount: 234,
        tags: ['美食', '探店', '聚餐'],
        city: '高雄市'
    },
    {
        name: '桌遊同樂會',
        description: '週末一起玩桌遊，動動腦，聯繫感情。',
        category: 'games',
        imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=200',
        memberCount: 67,
        tags: ['桌遊', '益智', '社交'],
        city: '高雄市'
    },
    {
        name: '書友讀書會',
        description: '每月選書共讀，分享心得，增廣見聞。',
        category: 'reading',
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200',
        memberCount: 45,
        tags: ['閱讀', '學習', '討論'],
        city: '高雄市'
    }
];

// 執行種子
async function seedDatabase() {
    try {
        console.log('正在連接資料庫...');
        await sequelize.authenticate();
        console.log('資料庫連接成功');

        // 同步模型
        await sequelize.sync({ force: false });

        // 檢查是否已有資料
        const existingCount = await Activity.count();
        if (existingCount > 0) {
            console.log(`資料庫已有 ${existingCount} 筆活動資料`);
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question('是否要重新插入資料？(y/n) ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'y') {
                console.log('取消操作');
                process.exit(0);
            }
        }

        // 插入活動資料
        console.log('正在插入活動資料...');
        for (const activity of kaohsiungActivities) {
            await Activity.upsert(activity);
            console.log(`  ✓ ${activity.name}`);
        }
        console.log(`共插入 ${kaohsiungActivities.length} 筆活動資料`);

        // 插入社群資料
        console.log('正在插入社群資料...');
        for (const community of communities) {
            await Community.upsert(community);
            console.log(`  ✓ ${community.name}`);
        }
        console.log(`共插入 ${communities.length} 筆社群資料`);

        console.log('\n✅ 種子資料插入完成！');
        process.exit(0);

    } catch (error) {
        console.error('種子資料插入失敗:', error);
        process.exit(1);
    }
}

// 執行
seedDatabase();
