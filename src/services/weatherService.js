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
    '台北': 'Taipei', '台北市': 'Taipei',
    '新北': 'New Taipei', '新北市': 'New Taipei',
    '桃園': 'Taoyuan', '桃園市': 'Taoyuan',
    '台中': 'Taichung', '台中市': 'Taichung',
    '台南': 'Tainan', '台南市': 'Tainan',
    '高雄': 'Kaohsiung', '高雄市': 'Kaohsiung',
    '新竹': 'Hsinchu', '新竹市': 'Hsinchu',
    '基隆': 'Keelung', '基隆市': 'Keelung',
    '嘉義': 'Chiayi', '嘉義市': 'Chiayi',
    '屏東': 'Pingtung', '屏東縣': 'Pingtung',
    '宜蘭': 'Yilan', '宜蘭縣': 'Yilan',
    '花蓮': 'Hualien', '花蓮縣': 'Hualien',
    '台東': 'Taitung', '台東縣': 'Taitung',
    '澎湖': 'Penghu', '金門': 'Kinmen', '馬祖': 'Matsu',
    '彰化': 'Changhua', '彰化縣': 'Changhua',
    '南投': 'Nantou', '南投縣': 'Nantou',
    '雲林': 'Yunlin', '雲林縣': 'Yunlin',
    '苗栗': 'Miaoli', '苗栗縣': 'Miaoli',
    
    // 日本
    '東京': 'Tokyo', '大阪': 'Osaka', '京都': 'Kyoto',
    '名古屋': 'Nagoya', '福岡': 'Fukuoka', '札幌': 'Sapporo',
    '沖繩': 'Okinawa', '那霸': 'Naha', '北海道': 'Sapporo',
    '橫濱': 'Yokohama', '神戶': 'Kobe', '奈良': 'Nara',
    '廣島': 'Hiroshima', '仙台': 'Sendai', '金澤': 'Kanazawa',
    '長崎': 'Nagasaki', '熊本': 'Kumamoto', '鹿兒島': 'Kagoshima',
    '箱根': 'Hakone', '輕井澤': 'Karuizawa', '日光': 'Nikko',
    
    // 韓國
    '首爾': 'Seoul', '釜山': 'Busan', '濟州': 'Jeju', '濟州島': 'Jeju',
    '仁川': 'Incheon', '大邱': 'Daegu',
    
    // 東南亞
    '曼谷': 'Bangkok', '清邁': 'Chiang Mai', '普吉島': 'Phuket',
    '芭達雅': 'Pattaya', '新加坡': 'Singapore',
    '吉隆坡': 'Kuala Lumpur', '檳城': 'Penang',
    '峇里島': 'Bali', '雅加達': 'Jakarta',
    '河內': 'Hanoi', '胡志明市': 'Ho Chi Minh City', '峴港': 'Da Nang',
    '馬尼拉': 'Manila', '宿霧': 'Cebu', '長灘島': 'Boracay',
    '金邊': 'Phnom Penh', '暹粒': 'Siem Reap', '吳哥窟': 'Siem Reap',
    '仰光': 'Yangon', '永珍': 'Vientiane',
    
    // 中國港澳
    '香港': 'Hong Kong', '澳門': 'Macau',
    '上海': 'Shanghai', '北京': 'Beijing',
    '廣州': 'Guangzhou', '深圳': 'Shenzhen',
    '杭州': 'Hangzhou', '成都': 'Chengdu',
    '西安': 'Xian', '廈門': 'Xiamen',
    '蘇州': 'Suzhou', '南京': 'Nanjing',
    
    // 歐洲
    '巴黎': 'Paris', '倫敦': 'London', '羅馬': 'Rome',
    '米蘭': 'Milan', '威尼斯': 'Venice', '佛羅倫斯': 'Florence',
    '巴塞隆納': 'Barcelona', '馬德里': 'Madrid',
    '阿姆斯特丹': 'Amsterdam', '布拉格': 'Prague',
    '維也納': 'Vienna', '慕尼黑': 'Munich',
    '柏林': 'Berlin', '法蘭克福': 'Frankfurt',
    '蘇黎世': 'Zurich', '日內瓦': 'Geneva',
    '雅典': 'Athens', '聖托里尼': 'Santorini',
    '伊斯坦堡': 'Istanbul', '里斯本': 'Lisbon',
    '布達佩斯': 'Budapest', '哥本哈根': 'Copenhagen',
    '斯德哥爾摩': 'Stockholm', '奧斯陸': 'Oslo',
    '赫爾辛基': 'Helsinki', '莫斯科': 'Moscow',
    
    // 美洲
    '紐約': 'New York', '洛杉磯': 'Los Angeles',
    '舊金山': 'San Francisco', '拉斯維加斯': 'Las Vegas',
    '芝加哥': 'Chicago', '西雅圖': 'Seattle',
    '邁阿密': 'Miami', '夏威夷': 'Honolulu',
    '溫哥華': 'Vancouver', '多倫多': 'Toronto',
    '墨西哥城': 'Mexico City', '坎昆': 'Cancun',
    
    // 大洋洲
    '雪梨': 'Sydney', '墨爾本': 'Melbourne',
    '布里斯本': 'Brisbane', '黃金海岸': 'Gold Coast',
    '奧克蘭': 'Auckland', '皇后鎮': 'Queenstown',
    
    // 其他
    '杜拜': 'Dubai', '開羅': 'Cairo',
    '馬爾地夫': 'Male', '帛琉': 'Koror', '關島': 'Guam'
};

// 天氣描述翻譯
const weatherTranslation = {
    'clear sky': '晴朗',
    'few clouds': '少雲',
    'scattered clouds': '多雲',
    'broken clouds': '多雲時陰',
    'overcast clouds': '陰天',
    'shower rain': '陣雨',
    'rain': '下雨',
    'light rain': '小雨',
    'moderate rain': '中雨',
    'heavy intensity rain': '大雨',
    'very heavy rain': '豪雨',
    'extreme rain': '暴雨',
    'freezing rain': '凍雨',
    'light intensity shower rain': '小陣雨',
    'heavy intensity shower rain': '大陣雨',
    'ragged shower rain': '不規則陣雨',
    'thunderstorm': '雷雨',
    'thunderstorm with light rain': '雷陣雨',
    'thunderstorm with rain': '雷雨',
    'thunderstorm with heavy rain': '大雷雨',
    'light thunderstorm': '輕微雷雨',
    'heavy thunderstorm': '強烈雷雨',
    'ragged thunderstorm': '不規則雷雨',
    'thunderstorm with light drizzle': '雷陣雨',
    'thunderstorm with drizzle': '雷陣雨',
    'thunderstorm with heavy drizzle': '大雷陣雨',
    'snow': '下雪',
    'light snow': '小雪',
    'heavy snow': '大雪',
    'sleet': '雨夾雪',
    'light shower sleet': '小雨夾雪',
    'shower sleet': '雨夾雪',
    'light rain and snow': '小雨夾雪',
    'rain and snow': '雨夾雪',
    'light shower snow': '小陣雪',
    'shower snow': '陣雪',
    'heavy shower snow': '大陣雪',
    'mist': '薄霧',
    'smoke': '煙霧',
    'haze': '霾',
    'sand/dust whirls': '沙塵漩渦',
    'fog': '濃霧',
    'sand': '沙塵',
    'dust': '塵土',
    'volcanic ash': '火山灰',
    'squalls': '狂風',
    'tornado': '龍捲風',
    'drizzle': '毛毛雨',
    'light intensity drizzle': '小毛毛雨',
    'heavy intensity drizzle': '大毛毛雨',
    'light intensity drizzle rain': '小毛毛雨',
    'drizzle rain': '毛毛雨',
    'heavy intensity drizzle rain': '大毛毛雨',
    'shower rain and drizzle': '陣雨夾毛毛雨',
    'heavy shower rain and drizzle': '大陣雨夾毛毛雨',
    'shower drizzle': '陣性毛毛雨'
};

function translateWeather(description) {
    if (!description) return '未知';
    var lower = description.toLowerCase();
    
    // 精確匹配
    if (weatherTranslation[lower]) {
        return weatherTranslation[lower];
    }
    
    // 部分匹配
    for (var key in weatherTranslation) {
        if (lower.includes(key) || key.includes(lower)) {
            return weatherTranslation[key];
        }
    }
    
    return description;
}

function getWeatherEmoji(description, icon) {
    if (!description) return '🌤️';
    var lower = description.toLowerCase();
    
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return '🌧️';
    if (lower.includes('snow') || lower.includes('sleet')) return '❄️';
    if (lower.includes('mist') || lower.includes('fog') || lower.includes('haze')) return '🌫️';
    if (lower.includes('clear')) {
        if (icon && icon.includes('n')) return '🌙';
        return '☀️';
    }
    if (lower.includes('cloud')) {
        if (lower.includes('few') || lower.includes('scattered')) return '⛅';
        return '☁️';
    }
    if (lower.includes('tornado') || lower.includes('squall')) return '🌪️';
    if (lower.includes('dust') || lower.includes('sand')) return '🏜️';
    
    if (icon) {
        if (icon.includes('n')) return '🌙';
    }
    
    return '🌤️';
}

function getWindDirection(deg) {
    if (deg === undefined || deg === null) return '';
    var directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
    var index = Math.round(deg / 45) % 8;
    return directions[index];
}

function getActivityAdvice(temp, humidity, description, windSpeed) {
    var advice = [];
    var lower = (description || '').toLowerCase();
    
    // 天氣狀況建議
    if (lower.includes('thunder')) {
        advice.push('⚡ 雷雨天氣，請待在室內');
        advice.push('🏠 適合在家看電影');
    } else if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
        advice.push('🌂 記得帶傘出門');
        advice.push('🏛️ 適合室內景點（博物館、百貨）');
    } else if (lower.includes('snow')) {
        advice.push('🧥 注意保暖，穿防滑鞋');
        advice.push('⛷️ 賞雪好時機');
    } else if (lower.includes('fog') || lower.includes('mist')) {
        advice.push('🚗 開車注意能見度');
        advice.push('☕ 適合咖啡廳放鬆');
    } else if (lower.includes('clear') || lower.includes('sunny')) {
        if (temp > 32) {
            advice.push('🧴 防曬要做好（SPF50+）');
            advice.push('💧 每小時補充 200ml 水');
            advice.push('🌅 建議早上 6-9 點或下午 4 點後出遊');
        } else if (temp > 28) {
            advice.push('🧴 記得防曬');
            advice.push('🎒 帶水壺補充水分');
            advice.push('🌳 適合公園、湖邊等有遮蔭處');
        } else if (temp > 20) {
            advice.push('👍 完美出遊天氣！');
            advice.push('🚶 適合戶外健行散步');
            advice.push('📸 拍照光線很好');
        } else if (temp > 15) {
            advice.push('🧥 建議帶薄外套');
            advice.push('🍵 溫泉、泡茶好選擇');
        } else {
            advice.push('🧣 天冷請注意保暖');
            advice.push('♨️ 推薦泡湯行程');
        }
    } else if (lower.includes('cloud')) {
        advice.push('👍 適合戶外活動');
        advice.push('📷 陰天拍照光線柔和');
        if (temp < 20) {
            advice.push('🧥 雲多稍涼，帶件外套');
        }
    }
    
    // 濕度建議
    if (humidity > 85) {
        advice.push('💦 濕度很高，可能悶熱');
    } else if (humidity < 40) {
        advice.push('💧 空氣乾燥，多喝水');
    }
    
    // 風速建議
    if (windSpeed > 10) {
        advice.push('🌬️ 風大，注意帽子圍巾');
    } else if (windSpeed > 7) {
        advice.push('🍃 微風涼爽，適合戶外');
    }
    
    return advice.length > 0 ? advice.slice(0, 4) : ['😊 天氣宜人，適合出遊！'];
}

async function getCompleteWeatherInfo(cityName) {
    try {
        var englishCity = cityMap[cityName] || cityName;
        
        logger.info('Fetching weather for: ' + cityName + ' (' + englishCity + ')');
        
        // 取得目前天氣
        var currentUrl = BASE_URL + '/weather?q=' + encodeURIComponent(englishCity) + '&appid=' + API_KEY + '&units=metric';
        var currentRes = await axios.get(currentUrl, { timeout: 10000 });
        var current = currentRes.data;
        
        // 取得 5 天預報
        var forecastUrl = BASE_URL + '/forecast?q=' + encodeURIComponent(englishCity) + '&appid=' + API_KEY + '&units=metric';
        var forecastRes = await axios.get(forecastUrl, { timeout: 10000 });
        var forecastData = forecastRes.data;
        
        var description = current.weather[0].description;
        var translatedDesc = translateWeather(description);
        var emoji = getWeatherEmoji(description, current.weather[0].icon);
        var temp = Math.round(current.main.temp);
        var feelsLike = Math.round(current.main.feels_like);
        var humidity = current.main.humidity;
        var windSpeed = Math.round(current.wind.speed * 10) / 10;
        var windDeg = current.wind.deg;
        var windDir = getWindDirection(windDeg);
        var visibility = current.visibility ? Math.round(current.visibility / 1000) : null;
        var pressure = current.main.pressure;
        var clouds = current.clouds ? current.clouds.all : 0;
        
        // 日出日落（轉換為當地時間）
        var timezoneOffset = current.timezone || 0;
        var sunrise = current.sys.sunrise ? new Date((current.sys.sunrise + timezoneOffset) * 1000) : null;
        var sunset = current.sys.sunset ? new Date((current.sys.sunset + timezoneOffset) * 1000) : null;
        
        var sunriseStr = sunrise ? 
            (sunrise.getUTCHours().toString().padStart(2, '0') + ':' + sunrise.getUTCMinutes().toString().padStart(2, '0')) : '--';
        var sunsetStr = sunset ? 
            (sunset.getUTCHours().toString().padStart(2, '0') + ':' + sunset.getUTCMinutes().toString().padStart(2, '0')) : '--';
        
        // 處理預報資料（取每天中午 12:00 的預報）
        var dailyForecasts = [];
        var processedDates = {};
        var today = new Date().toDateString();
        
        for (var i = 0; i < forecastData.list.length; i++) {
            var item = forecastData.list[i];
            var date = new Date(item.dt * 1000);
            var dateKey = date.toDateString();
            var hour = date.getHours();
            
            // 跳過今天
            if (dateKey === today) continue;
            
            // 取每天 11:00-14:00 的預報
            if (!processedDates[dateKey] && hour >= 11 && hour <= 14) {
                processedDates[dateKey] = {
                    date: date,
                    dayName: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
                    dateStr: (date.getMonth() + 1) + '/' + date.getDate(),
                    temp: Math.round(item.main.temp),
                    tempMin: Math.round(item.main.temp_min),
                    tempMax: Math.round(item.main.temp_max),
                    description: translateWeather(item.weather[0].description),
                    emoji: getWeatherEmoji(item.weather[0].description, item.weather[0].icon),
                    humidity: item.main.humidity,
                    pop: Math.round((item.pop || 0) * 100),
                    windSpeed: Math.round(item.wind.speed * 10) / 10
                };
            }
        }
        
        // 轉換為陣列
        for (var key in processedDates) {
            dailyForecasts.push(processedDates[key]);
        }
        dailyForecasts = dailyForecasts.slice(0, 4);
        
        // 活動建議
        var activityAdvice = getActivityAdvice(temp, humidity, description, windSpeed);
        
        logger.info('Weather fetched successfully for ' + cityName);
        
        return {
            city: cityName,
            englishCity: englishCity,
            country: current.sys.country,
            temp: temp,
            feelsLike: feelsLike,
            tempMin: Math.round(current.main.temp_min),
            tempMax: Math.round(current.main.temp_max),
            humidity: humidity,
            description: translatedDesc,
            emoji: emoji,
            icon: current.weather[0].icon,
            windSpeed: windSpeed,
            windDeg: windDeg,
            windDir: windDir,
            visibility: visibility,
            pressure: pressure,
            clouds: clouds,
            sunrise: sunriseStr,
            sunset: sunsetStr,
            forecast: dailyForecasts,
            advice: activityAdvice,
            updateTime: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            timezone: timezoneOffset
        };
        
    } catch (error) {
        logger.error('Weather API error for ' + cityName + ':', error.message);
        
        if (error.response && error.response.status === 404) {
            return {
                city: cityName,
                error: true,
                errorMessage: '找不到「' + cityName + '」的天氣資料\n\n試試其他城市名稱，例如：\n東京、大阪、首爾、曼谷、新加坡'
            };
        }
        
        return {
            city: cityName,
            temp: '--',
            feelsLike: '--',
            humidity: '--',
            description: '無法取得天氣資訊',
            emoji: '❓',
            windSpeed: '--',
            advice: ['請稍後再試'],
            error: true,
            errorMessage: '天氣服務暫時無法使用，請稍後再試'
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
    getWindDirection: getWindDirection,
    getActivityAdvice: getActivityAdvice
};