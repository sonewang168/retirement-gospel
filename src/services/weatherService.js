/**
 * 天氣服務（完整版）
 * 使用 OpenWeatherMap API
 */
const axios = require('axios');
const logger = require('../utils/logger');

const API_KEY = process.env.OPENWEATHERMAP_API_KEY || '6158d1bcfb3b83b64b20ce1183e77e21';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 城市對應表（中文 -> 英文）
const cityMap = {
    // 台灣
    '台北': 'Taipei',
    '台北市': 'Taipei',
    '新北': 'New Taipei',
    '新北市': 'New Taipei',
    '桃園': 'Taoyuan',
    '桃園市': 'Taoyuan',
    '台中': 'Taichung',
    '台中市': 'Taichung',
    '台南': 'Tainan',
    '台南市': 'Tainan',
    '高雄': 'Kaohsiung',
    '高雄市': 'Kaohsiung',
    '新竹': 'Hsinchu',
    '新竹市': 'Hsinchu',
    '基隆': 'Keelung',
    '基隆市': 'Keelung',
    '嘉義': 'Chiayi',
    '嘉義市': 'Chiayi',
    '屏東': 'Pingtung',
    '屏東縣': 'Pingtung',
    '宜蘭': 'Yilan',
    '宜蘭縣': 'Yilan',
    '花蓮': 'Hualien',
    '花蓮縣': 'Hualien',
    '台東': 'Taitung',
    '台東縣': 'Taitung',
    '澎湖': 'Penghu',
    '金門': 'Kinmen',
    '馬祖': 'Matsu',
    
    // 日本
    '東京': 'Tokyo',
    '大阪': 'Osaka',
    '京都': 'Kyoto',
    '名古屋': 'Nagoya',
    '福岡': 'Fukuoka',
    '札幌': 'Sapporo',
    '沖繩': 'Okinawa',
    '那霸': 'Naha',
    '北海道': 'Sapporo',
    '橫濱': 'Yokohama',
    '神戶': 'Kobe',
    '奈良': 'Nara',
    '廣島': 'Hiroshima',
    '仙台': 'Sendai',
    '金澤': 'Kanazawa',
    '長崎': 'Nagasaki',
    '熊本': 'Kumamoto',
    '鹿兒島': 'Kagoshima',
    
    // 韓國
    '首爾': 'Seoul',
    '釜山': 'Busan',
    '濟州': 'Jeju',
    '濟州島': 'Jeju',
    '仁川': 'Incheon',
    '大邱': 'Daegu',
    
    // 東南亞
    '曼谷': 'Bangkok',
    '清邁': 'Chiang Mai',
    '普吉島': 'Phuket',
    '芭達雅': 'Pattaya',
    '新加坡': 'Singapore',
    '吉隆坡': 'Kuala Lumpur',
    '檳城': 'Penang',
    '峇里島': 'Bali',
    '雅加達': 'Jakarta',
    '河內': 'Hanoi',
    '胡志明市': 'Ho Chi Minh City',
    '峴港': 'Da Nang',
    '馬尼拉': 'Manila',
    '宿霧': 'Cebu',
    '長灘島': 'Boracay',
    '金邊': 'Phnom Penh',
    '暹粒': 'Siem Reap',
    '吳哥窟': 'Siem Reap',
    '仰光': 'Yangon',
    
    // 中國港澳
    '香港': 'Hong Kong',
    '澳門': 'Macau',
    '上海': 'Shanghai',
    '北京': 'Beijing',
    '廣州': 'Guangzhou',
    '深圳': 'Shenzhen',
    '杭州': 'Hangzhou',
    '成都': 'Chengdu',
    '西安': 'Xian',
    '廈門': 'Xiamen',
    
    // 歐洲
    '巴黎': 'Paris',
    '倫敦': 'London',
    '羅馬': 'Rome',
    '米蘭': 'Milan',
    '威尼斯': 'Venice',
    '佛羅倫斯': 'Florence',
    '巴塞隆納': 'Barcelona',
    '馬德里': 'Madrid',
    '阿姆斯特丹': 'Amsterdam',
    '布拉格': 'Prague',
    '維也納': 'Vienna',
    '慕尼黑': 'Munich',
    '柏林': 'Berlin',
    '法蘭克福': 'Frankfurt',
    '蘇黎世': 'Zurich',
    '日內瓦': 'Geneva',
    '雅典': 'Athens',
    '聖托里尼': 'Santorini',
    '伊斯坦堡': 'Istanbul',
    '里斯本': 'Lisbon',
    '布達佩斯': 'Budapest',
    '哥本哈根': 'Copenhagen',
    '斯德哥爾摩': 'Stockholm',
    '奧斯陸': 'Oslo',
    '赫爾辛基': 'Helsinki',
    '莫斯科': 'Moscow',
    
    // 美洲
    '紐約': 'New York',
    '洛杉磯': 'Los Angeles',
    '舊金山': 'San Francisco',
    '拉斯維加斯': 'Las Vegas',
    '芝加哥': 'Chicago',
    '西雅圖': 'Seattle',
    '邁阿密': 'Miami',
    '夏威夷': 'Honolulu',
    '溫哥華': 'Vancouver',
    '多倫多': 'Toronto',
    '墨西哥城': 'Mexico City',
    '坎昆': 'Cancun',
    
    // 大洋洲
    '雪梨': 'Sydney',
    '墨爾本': 'Melbourne',
    '布里斯本': 'Brisbane',
    '黃金海岸': 'Gold Coast',
    '奧克蘭': 'Auckland',
    '皇后鎮': 'Queenstown',
    
    // 其他
    '杜拜': 'Dubai',
    '開羅': 'Cairo',
    '馬爾地夫': 'Male',
    '帛琉': 'Koror',
    '關島': 'Guam'
};

// 天氣描述翻譯
const weatherTranslation = {
    'clear sky': '晴朗',
    'few clouds': '少雲',
    'scattered clouds': '多雲',
    'broken clouds': '陰天',
    'overcast clouds': '陰天',
    'shower rain': '陣雨',
    'rain': '下雨',
    'light rain': '小雨',
    'moderate rain': '中雨',
    'heavy intensity rain': '大雨',
    'thunderstorm': '雷雨',
    'snow': '下雪',
    'light snow': '小雪',
    'mist': '薄霧',
    'fog': '濃霧',
    'haze': '霾',
    'dust': '沙塵',
    'smoke': '煙霧',
    'drizzle': '毛毛雨',
    'light intensity drizzle': '小毛毛雨'
};

function translateWeather(description) {
    var lower = description.toLowerCase();
    for (var key in weatherTranslation) {
        if (lower.includes(key)) {
            return weatherTranslation[key];
        }
    }
    return description;
}

function getWeatherEmoji(description, icon) {
    var lower = description.toLowerCase();
    if (lower.includes('clear') || lower.includes('sunny')) return '☀️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('mist') || lower.includes('fog')) return '🌫️';
    if (icon && icon.includes('n')) return '🌙';
    return '🌤️';
}

function getUVLevel(uvi) {
    if (uvi <= 2) return { level: '低', color: '#27AE60', advice: '可安心外出' };
    if (uvi <= 5) return { level: '中等', color: '#F39C12', advice: '建議戴帽子' };
    if (uvi <= 7) return { level: '高', color: '#E67E22', advice: '需防曬措施' };
    if (uvi <= 10) return { level: '很高', color: '#E74C3C', advice: '避免曝曬' };
    return { level: '危險', color: '#9B59B6', advice: '盡量待室內' };
}

function getAQILevel(aqi) {
    if (aqi <= 50) return { level: '優良', color: '#27AE60', advice: '適合戶外活動' };
    if (aqi <= 100) return { level: '普通', color: '#F39C12', advice: '敏感族群注意' };
    if (aqi <= 150) return { level: '對敏感族群不健康', color: '#E67E22', advice: '減少戶外活動' };
    if (aqi <= 200) return { level: '不健康', color: '#E74C3C', advice: '避免戶外活動' };
    return { level: '非常不健康', color: '#9B59B6', advice: '待在室內' };
}

function getActivityAdvice(temp, humidity, description) {
    var lower = description.toLowerCase();
    var advice = [];
    
    if (lower.includes('rain') || lower.includes('thunder')) {
        advice.push('🌂 記得帶傘');
        advice.push('🏠 適合室內活動');
    } else if (lower.includes('clear') || lower.includes('sunny')) {
        if (temp > 30) {
            advice.push('🧴 注意防曬');
            advice.push('💧 多補充水分');
            advice.push('🌅 建議早晚出遊');
        } else if (temp > 20) {
            advice.push('🚶 適合戶外散步');
            advice.push('🌳 公園野餐好天氣');
        } else {
            advice.push('🧥 建議多穿一件');
            advice.push('☕ 適合泡湯行程');
        }
    } else if (lower.includes('cloud')) {
        advice.push('👍 適合戶外活動');
        advice.push('📸 拍照光線柔和');
    }
    
    if (humidity > 80) {
        advice.push('💦 濕度高，注意悶熱');
    }
    
    if (temp < 15) {
        advice.push('🧣 天冷記得保暖');
    }
    
    return advice.length > 0 ? advice : ['😊 天氣宜人，適合出遊'];
}

async function getCompleteWeatherInfo(cityName) {
    try {
        var englishCity = cityMap[cityName] || cityName;
        
        // 取得目前天氣
        var currentUrl = BASE_URL + '/weather?q=' + encodeURIComponent(englishCity) + '&appid=' + API_KEY + '&units=metric&lang=zh_tw';
        var currentRes = await axios.get(currentUrl, { timeout: 10000 });
        var current = currentRes.data;
        
        // 取得 5 天預報
        var forecastUrl = BASE_URL + '/forecast?q=' + encodeURIComponent(englishCity) + '&appid=' + API_KEY + '&units=metric&lang=zh_tw';
        var forecastRes = await axios.get(forecastUrl, { timeout: 10000 });
        var forecastData = forecastRes.data;
        
        var description = current.weather[0].description;
        var translatedDesc = translateWeather(description);
        var emoji = getWeatherEmoji(description, current.weather[0].icon);
        var temp = Math.round(current.main.temp);
        var feelsLike = Math.round(current.main.feels_like);
        var humidity = current.main.humidity;
        var windSpeed = current.wind.speed;
        var visibility = current.visibility ? Math.round(current.visibility / 1000) : null;
        var pressure = current.main.pressure;
        var clouds = current.clouds ? current.clouds.all : 0;
        
        // 日出日落
        var sunrise = current.sys.sunrise ? new Date(current.sys.sunrise * 1000) : null;
        var sunset = current.sys.sunset ? new Date(current.sys.sunset * 1000) : null;
        var sunriseStr = sunrise ? (sunrise.getHours().toString().padStart(2, '0') + ':' + sunrise.getMinutes().toString().padStart(2, '0')) : '--';
        var sunsetStr = sunset ? (sunset.getHours().toString().padStart(2, '0') + ':' + sunset.getMinutes().toString().padStart(2, '0')) : '--';
        
        // 處理預報資料（取每天中午的預報）
        var dailyForecasts = [];
        var processedDates = {};
        
        for (var i = 0; i < forecastData.list.length; i++) {
            var item = forecastData.list[i];
            var date = new Date(item.dt * 1000);
            var dateKey = date.toDateString();
            var hour = date.getHours();
            
            // 取每天 12:00 的預報，或當天第一筆
            if (!processedDates[dateKey] || (hour >= 11 && hour <= 14)) {
                processedDates[dateKey] = {
                    date: date,
                    dayName: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
                    temp: Math.round(item.main.temp),
                    tempMin: Math.round(item.main.temp_min),
                    tempMax: Math.round(item.main.temp_max),
                    description: translateWeather(item.weather[0].description),
                    emoji: getWeatherEmoji(item.weather[0].description, item.weather[0].icon),
                    humidity: item.main.humidity,
                    pop: Math.round((item.pop || 0) * 100) // 降雨機率
                };
            }
        }
        
        // 轉換為陣列，最多取 5 天
        for (var key in processedDates) {
            dailyForecasts.push(processedDates[key]);
        }
        dailyForecasts = dailyForecasts.slice(0, 5);
        
        // 活動建議
        var activityAdvice = getActivityAdvice(temp, humidity, description);
        
        return {
            city: cityName,
            englishCity: englishCity,
            temp: temp,
            feelsLike: feelsLike,
            tempMin: Math.round(current.main.temp_min),
            tempMax: Math.round(current.main.temp_max),
            humidity: humidity,
            description: translatedDesc,
            emoji: emoji,
            windSpeed: windSpeed,
            windDeg: current.wind.deg,
            visibility: visibility,
            pressure: pressure,
            clouds: clouds,
            sunrise: sunriseStr,
            sunset: sunsetStr,
            forecast: dailyForecasts,
            advice: activityAdvice,
            updateTime: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        };
        
    } catch (error) {
        logger.error('Weather API error:', error.message);
        return {
            city: cityName,
            temp: '--',
            feelsLike: '--',
            humidity: '--',
            description: '無法取得天氣資訊',
            emoji: '❓',
            windSpeed: '--',
            advice: ['請稍後再試'],
            error: true
        };
    }
}

function getSupportedCities() {
    return Object.keys(cityMap);
}

module.exports = {
    getCompleteWeatherInfo: getCompleteWeatherInfo,
    getSupportedCities: getSupportedCities,
    translateWeather: translateWeather,
    getWeatherEmoji: getWeatherEmoji,
    getUVLevel: getUVLevel,
    getAQILevel: getAQILevel
};