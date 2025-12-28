/**
 * ============================================
 * 天氣服務
 * 使用 OpenWeatherMap API（支援全球五大洲）
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 全球城市座標對照（五大洲主要城市）
const CITY_COORDS = {
    // ============================================
    // 亞洲 Asia
    // ============================================
    
    // 台灣 Taiwan
    '高雄市': { lat: 22.6273, lon: 120.3014, country: 'TW' },
    '台北市': { lat: 25.0330, lon: 121.5654, country: 'TW' },
    '臺北市': { lat: 25.0330, lon: 121.5654, country: 'TW' },
    '台中市': { lat: 24.1477, lon: 120.6736, country: 'TW' },
    '臺中市': { lat: 24.1477, lon: 120.6736, country: 'TW' },
    '台南市': { lat: 22.9998, lon: 120.2269, country: 'TW' },
    '臺南市': { lat: 22.9998, lon: 120.2269, country: 'TW' },
    '新北市': { lat: 25.0169, lon: 121.4628, country: 'TW' },
    '桃園市': { lat: 24.9936, lon: 121.3010, country: 'TW' },
    '新竹市': { lat: 24.8138, lon: 120.9675, country: 'TW' },
    '基隆市': { lat: 25.1276, lon: 121.7392, country: 'TW' },
    '嘉義市': { lat: 23.4801, lon: 120.4491, country: 'TW' },
    '花蓮縣': { lat: 23.9872, lon: 121.6016, country: 'TW' },
    '台東縣': { lat: 22.7583, lon: 121.1444, country: 'TW' },
    '臺東縣': { lat: 22.7583, lon: 121.1444, country: 'TW' },
    '屏東縣': { lat: 22.5519, lon: 120.5487, country: 'TW' },
    '宜蘭縣': { lat: 24.7021, lon: 121.7378, country: 'TW' },
    '南投縣': { lat: 23.9609, lon: 120.9718, country: 'TW' },
    '彰化縣': { lat: 24.0518, lon: 120.5161, country: 'TW' },
    '雲林縣': { lat: 23.7092, lon: 120.4313, country: 'TW' },
    '苗栗縣': { lat: 24.5602, lon: 120.8214, country: 'TW' },
    '新竹縣': { lat: 24.8387, lon: 121.0178, country: 'TW' },
    '嘉義縣': { lat: 23.4518, lon: 120.2555, country: 'TW' },
    '澎湖縣': { lat: 23.5711, lon: 119.5793, country: 'TW' },
    '金門縣': { lat: 24.4493, lon: 118.3767, country: 'TW' },
    '連江縣': { lat: 26.1505, lon: 119.9499, country: 'TW' },
    
    // 日本 Japan
    '東京': { lat: 35.6762, lon: 139.6503, country: 'JP' },
    '日本': { lat: 35.6762, lon: 139.6503, country: 'JP' },
    '京都': { lat: 35.0116, lon: 135.7681, country: 'JP' },
    '大阪': { lat: 34.6937, lon: 135.5023, country: 'JP' },
    '沖繩': { lat: 26.2124, lon: 127.6809, country: 'JP' },
    '北海道': { lat: 43.0642, lon: 141.3469, country: 'JP' },
    '札幌': { lat: 43.0618, lon: 141.3545, country: 'JP' },
    '福岡': { lat: 33.5904, lon: 130.4017, country: 'JP' },
    '名古屋': { lat: 35.1815, lon: 136.9066, country: 'JP' },
    '橫濱': { lat: 35.4437, lon: 139.6380, country: 'JP' },
    '神戶': { lat: 34.6901, lon: 135.1956, country: 'JP' },
    '奈良': { lat: 34.6851, lon: 135.8048, country: 'JP' },
    '廣島': { lat: 34.3853, lon: 132.4553, country: 'JP' },
    '仙台': { lat: 38.2682, lon: 140.8694, country: 'JP' },
    '長崎': { lat: 32.7503, lon: 129.8779, country: 'JP' },
    '熊本': { lat: 32.8032, lon: 130.7079, country: 'JP' },
    '金澤': { lat: 36.5613, lon: 136.6562, country: 'JP' },
    '富士山': { lat: 35.3606, lon: 138.7274, country: 'JP' },
    '輕井澤': { lat: 36.3482, lon: 138.5970, country: 'JP' },
    '箱根': { lat: 35.2324, lon: 139.1069, country: 'JP' },
    
    // 韓國 South Korea
    '首爾': { lat: 37.5665, lon: 126.9780, country: 'KR' },
    '韓國': { lat: 37.5665, lon: 126.9780, country: 'KR' },
    '釜山': { lat: 35.1796, lon: 129.0756, country: 'KR' },
    '濟州島': { lat: 33.4996, lon: 126.5312, country: 'KR' },
    '仁川': { lat: 37.4563, lon: 126.7052, country: 'KR' },
    '大邱': { lat: 35.8714, lon: 128.6014, country: 'KR' },
    '光州': { lat: 35.1595, lon: 126.8526, country: 'KR' },
    '慶州': { lat: 35.8562, lon: 129.2247, country: 'KR' },
    
    // 中國 China
    '北京': { lat: 39.9042, lon: 116.4074, country: 'CN' },
    '上海': { lat: 31.2304, lon: 121.4737, country: 'CN' },
    '香港': { lat: 22.3193, lon: 114.1694, country: 'HK' },
    '澳門': { lat: 22.1987, lon: 113.5439, country: 'MO' },
    '廣州': { lat: 23.1291, lon: 113.2644, country: 'CN' },
    '深圳': { lat: 22.5431, lon: 114.0579, country: 'CN' },
    '成都': { lat: 30.5728, lon: 104.0668, country: 'CN' },
    '杭州': { lat: 30.2741, lon: 120.1551, country: 'CN' },
    '西安': { lat: 34.3416, lon: 108.9398, country: 'CN' },
    '重慶': { lat: 29.4316, lon: 106.9123, country: 'CN' },
    '南京': { lat: 32.0603, lon: 118.7969, country: 'CN' },
    '蘇州': { lat: 31.2990, lon: 120.5853, country: 'CN' },
    '廈門': { lat: 24.4798, lon: 118.0894, country: 'CN' },
    '桂林': { lat: 25.2744, lon: 110.2990, country: 'CN' },
    '麗江': { lat: 26.8721, lon: 100.2299, country: 'CN' },
    '三亞': { lat: 18.2528, lon: 109.5119, country: 'CN' },
    
    // 東南亞 Southeast Asia
    '曼谷': { lat: 13.7563, lon: 100.5018, country: 'TH' },
    '泰國': { lat: 13.7563, lon: 100.5018, country: 'TH' },
    '清邁': { lat: 18.7883, lon: 98.9853, country: 'TH' },
    '普吉島': { lat: 7.9519, lon: 98.3381, country: 'TH' },
    '芭達雅': { lat: 12.9236, lon: 100.8825, country: 'TH' },
    '新加坡': { lat: 1.3521, lon: 103.8198, country: 'SG' },
    '吉隆坡': { lat: 3.1390, lon: 101.6869, country: 'MY' },
    '馬來西亞': { lat: 3.1390, lon: 101.6869, country: 'MY' },
    '檳城': { lat: 5.4164, lon: 100.3327, country: 'MY' },
    '蘭卡威': { lat: 6.3500, lon: 99.8000, country: 'MY' },
    '峇里島': { lat: -8.3405, lon: 115.0920, country: 'ID' },
    '印尼': { lat: -6.2088, lon: 106.8456, country: 'ID' },
    '雅加達': { lat: -6.2088, lon: 106.8456, country: 'ID' },
    '河內': { lat: 21.0285, lon: 105.8542, country: 'VN' },
    '越南': { lat: 21.0285, lon: 105.8542, country: 'VN' },
    '下龍灣': { lat: 20.9101, lon: 107.1839, country: 'VN' },
    '胡志明市': { lat: 10.8231, lon: 106.6297, country: 'VN' },
    '峴港': { lat: 16.0544, lon: 108.2022, country: 'VN' },
    '馬尼拉': { lat: 14.5995, lon: 120.9842, country: 'PH' },
    '菲律賓': { lat: 14.5995, lon: 120.9842, country: 'PH' },
    '宿霧': { lat: 10.3157, lon: 123.8854, country: 'PH' },
    '長灘島': { lat: 11.9674, lon: 121.9248, country: 'PH' },
    '金邊': { lat: 11.5564, lon: 104.9282, country: 'KH' },
    '柬埔寨': { lat: 11.5564, lon: 104.9282, country: 'KH' },
    '吳哥窟': { lat: 13.4125, lon: 103.8670, country: 'KH' },
    '仰光': { lat: 16.8661, lon: 96.1951, country: 'MM' },
    '緬甸': { lat: 16.8661, lon: 96.1951, country: 'MM' },
    '永珍': { lat: 17.9757, lon: 102.6331, country: 'LA' },
    '寮國': { lat: 17.9757, lon: 102.6331, country: 'LA' },
    '汶萊': { lat: 4.9031, lon: 114.9398, country: 'BN' },
    
    // 南亞 South Asia
    '印度': { lat: 28.6139, lon: 77.2090, country: 'IN' },
    '新德里': { lat: 28.6139, lon: 77.2090, country: 'IN' },
    '孟買': { lat: 19.0760, lon: 72.8777, country: 'IN' },
    '加爾各答': { lat: 22.5726, lon: 88.3639, country: 'IN' },
    '清奈': { lat: 13.0827, lon: 80.2707, country: 'IN' },
    '班加羅爾': { lat: 12.9716, lon: 77.5946, country: 'IN' },
    '泰姬瑪哈陵': { lat: 27.1751, lon: 78.0421, country: 'IN' },
    '斯里蘭卡': { lat: 6.9271, lon: 79.8612, country: 'LK' },
    '可倫坡': { lat: 6.9271, lon: 79.8612, country: 'LK' },
    '尼泊爾': { lat: 27.7172, lon: 85.3240, country: 'NP' },
    '加德滿都': { lat: 27.7172, lon: 85.3240, country: 'NP' },
    '馬爾地夫': { lat: 3.2028, lon: 73.2207, country: 'MV' },
    '馬累': { lat: 4.1755, lon: 73.5093, country: 'MV' },
    
    // 中東 Middle East
    '杜拜': { lat: 25.2048, lon: 55.2708, country: 'AE' },
    '阿布達比': { lat: 24.4539, lon: 54.3773, country: 'AE' },
    '阿聯酋': { lat: 25.2048, lon: 55.2708, country: 'AE' },
    '以色列': { lat: 31.7683, lon: 35.2137, country: 'IL' },
    '耶路撒冷': { lat: 31.7683, lon: 35.2137, country: 'IL' },
    '特拉維夫': { lat: 32.0853, lon: 34.7818, country: 'IL' },
    '土耳其': { lat: 41.0082, lon: 28.9784, country: 'TR' },
    '伊斯坦堡': { lat: 41.0082, lon: 28.9784, country: 'TR' },
    '安卡拉': { lat: 39.9334, lon: 32.8597, country: 'TR' },
    '卡達': { lat: 25.2854, lon: 51.5310, country: 'QA' },
    '多哈': { lat: 25.2854, lon: 51.5310, country: 'QA' },
    '約旦': { lat: 31.9454, lon: 35.9284, country: 'JO' },
    '安曼': { lat: 31.9454, lon: 35.9284, country: 'JO' },
    '佩特拉': { lat: 30.3285, lon: 35.4444, country: 'JO' },
    
    // ============================================
    // 歐洲 Europe
    // ============================================
    
    // 西歐 Western Europe
    '英國': { lat: 51.5074, lon: -0.1278, country: 'GB' },
    '倫敦': { lat: 51.5074, lon: -0.1278, country: 'GB' },
    '曼徹斯特': { lat: 53.4808, lon: -2.2426, country: 'GB' },
    '愛丁堡': { lat: 55.9533, lon: -3.1883, country: 'GB' },
    '利物浦': { lat: 53.4084, lon: -2.9916, country: 'GB' },
    '法國': { lat: 48.8566, lon: 2.3522, country: 'FR' },
    '巴黎': { lat: 48.8566, lon: 2.3522, country: 'FR' },
    '尼斯': { lat: 43.7102, lon: 7.2620, country: 'FR' },
    '里昂': { lat: 45.7640, lon: 4.8357, country: 'FR' },
    '馬賽': { lat: 43.2965, lon: 5.3698, country: 'FR' },
    '波爾多': { lat: 44.8378, lon: -0.5792, country: 'FR' },
    '普羅旺斯': { lat: 43.9298, lon: 4.8758, country: 'FR' },
    '德國': { lat: 52.5200, lon: 13.4050, country: 'DE' },
    '柏林': { lat: 52.5200, lon: 13.4050, country: 'DE' },
    '慕尼黑': { lat: 48.1351, lon: 11.5820, country: 'DE' },
    '法蘭克福': { lat: 50.1109, lon: 8.6821, country: 'DE' },
    '漢堡': { lat: 53.5511, lon: 9.9937, country: 'DE' },
    '科隆': { lat: 50.9375, lon: 6.9603, country: 'DE' },
    '荷蘭': { lat: 52.3676, lon: 4.9041, country: 'NL' },
    '阿姆斯特丹': { lat: 52.3676, lon: 4.9041, country: 'NL' },
    '比利時': { lat: 50.8503, lon: 4.3517, country: 'BE' },
    '布魯塞爾': { lat: 50.8503, lon: 4.3517, country: 'BE' },
    '瑞士': { lat: 46.9480, lon: 7.4474, country: 'CH' },
    '蘇黎世': { lat: 47.3769, lon: 8.5417, country: 'CH' },
    '日內瓦': { lat: 46.2044, lon: 6.1432, country: 'CH' },
    '盧森堡': { lat: 49.6116, lon: 6.1319, country: 'LU' },
    '奧地利': { lat: 48.2082, lon: 16.3738, country: 'AT' },
    '維也納': { lat: 48.2082, lon: 16.3738, country: 'AT' },
    '薩爾茨堡': { lat: 47.8095, lon: 13.0550, country: 'AT' },
    '愛爾蘭': { lat: 53.3498, lon: -6.2603, country: 'IE' },
    '都柏林': { lat: 53.3498, lon: -6.2603, country: 'IE' },
    
    // 南歐 Southern Europe
    '義大利': { lat: 41.9028, lon: 12.4964, country: 'IT' },
    '羅馬': { lat: 41.9028, lon: 12.4964, country: 'IT' },
    '米蘭': { lat: 45.4642, lon: 9.1900, country: 'IT' },
    '威尼斯': { lat: 45.4408, lon: 12.3155, country: 'IT' },
    '佛羅倫斯': { lat: 43.7696, lon: 11.2558, country: 'IT' },
    '拿坡里': { lat: 40.8518, lon: 14.2681, country: 'IT' },
    '西班牙': { lat: 40.4168, lon: -3.7038, country: 'ES' },
    '馬德里': { lat: 40.4168, lon: -3.7038, country: 'ES' },
    '巴塞隆納': { lat: 41.3851, lon: 2.1734, country: 'ES' },
    '塞維亞': { lat: 37.3891, lon: -5.9845, country: 'ES' },
    '瓦倫西亞': { lat: 39.4699, lon: -0.3763, country: 'ES' },
    '葡萄牙': { lat: 38.7223, lon: -9.1393, country: 'PT' },
    '里斯本': { lat: 38.7223, lon: -9.1393, country: 'PT' },
    '波多': { lat: 41.1579, lon: -8.6291, country: 'PT' },
    '希臘': { lat: 37.9838, lon: 23.7275, country: 'GR' },
    '雅典': { lat: 37.9838, lon: 23.7275, country: 'GR' },
    '聖托里尼': { lat: 36.3932, lon: 25.4615, country: 'GR' },
    '克羅埃西亞': { lat: 45.8150, lon: 15.9819, country: 'HR' },
    '杜布羅夫尼克': { lat: 42.6507, lon: 18.0944, country: 'HR' },
    '札格雷布': { lat: 45.8150, lon: 15.9819, country: 'HR' },
    '摩納哥': { lat: 43.7384, lon: 7.4246, country: 'MC' },
    '馬爾他': { lat: 35.8989, lon: 14.5146, country: 'MT' },
    
    // 北歐 Northern Europe
    '瑞典': { lat: 59.3293, lon: 18.0686, country: 'SE' },
    '斯德哥爾摩': { lat: 59.3293, lon: 18.0686, country: 'SE' },
    '挪威': { lat: 59.9139, lon: 10.7522, country: 'NO' },
    '奧斯陸': { lat: 59.9139, lon: 10.7522, country: 'NO' },
    '卑爾根': { lat: 60.3913, lon: 5.3221, country: 'NO' },
    '丹麥': { lat: 55.6761, lon: 12.5683, country: 'DK' },
    '哥本哈根': { lat: 55.6761, lon: 12.5683, country: 'DK' },
    '芬蘭': { lat: 60.1699, lon: 24.9384, country: 'FI' },
    '赫爾辛基': { lat: 60.1699, lon: 24.9384, country: 'FI' },
    '冰島': { lat: 64.1466, lon: -21.9426, country: 'IS' },
    '雷克雅維克': { lat: 64.1466, lon: -21.9426, country: 'IS' },
    
    // 東歐 Eastern Europe
    '俄羅斯': { lat: 55.7558, lon: 37.6173, country: 'RU' },
    '莫斯科': { lat: 55.7558, lon: 37.6173, country: 'RU' },
    '聖彼得堡': { lat: 59.9343, lon: 30.3351, country: 'RU' },
    '波蘭': { lat: 52.2297, lon: 21.0122, country: 'PL' },
    '華沙': { lat: 52.2297, lon: 21.0122, country: 'PL' },
    '克拉科夫': { lat: 50.0647, lon: 19.9450, country: 'PL' },
    '捷克': { lat: 50.0755, lon: 14.4378, country: 'CZ' },
    '布拉格': { lat: 50.0755, lon: 14.4378, country: 'CZ' },
    '匈牙利': { lat: 47.4979, lon: 19.0402, country: 'HU' },
    '布達佩斯': { lat: 47.4979, lon: 19.0402, country: 'HU' },
    '羅馬尼亞': { lat: 44.4268, lon: 26.1025, country: 'RO' },
    '布加勒斯特': { lat: 44.4268, lon: 26.1025, country: 'RO' },
    '保加利亞': { lat: 42.6977, lon: 23.3219, country: 'BG' },
    '索菲亞': { lat: 42.6977, lon: 23.3219, country: 'BG' },
    '烏克蘭': { lat: 50.4501, lon: 30.5234, country: 'UA' },
    '基輔': { lat: 50.4501, lon: 30.5234, country: 'UA' },
    
    // ============================================
    // 北美洲 North America
    // ============================================
    
    // 美國 USA
    '美國': { lat: 40.7128, lon: -74.0060, country: 'US' },
    '紐約': { lat: 40.7128, lon: -74.0060, country: 'US' },
    '洛杉磯': { lat: 34.0522, lon: -118.2437, country: 'US' },
    '舊金山': { lat: 37.7749, lon: -122.4194, country: 'US' },
    '拉斯維加斯': { lat: 36.1699, lon: -115.1398, country: 'US' },
    '芝加哥': { lat: 41.8781, lon: -87.6298, country: 'US' },
    '邁阿密': { lat: 25.7617, lon: -80.1918, country: 'US' },
    '華盛頓': { lat: 38.9072, lon: -77.0369, country: 'US' },
    '波士頓': { lat: 42.3601, lon: -71.0589, country: 'US' },
    '西雅圖': { lat: 47.6062, lon: -122.3321, country: 'US' },
    '休士頓': { lat: 29.7604, lon: -95.3698, country: 'US' },
    '達拉斯': { lat: 32.7767, lon: -96.7970, country: 'US' },
    '鳳凰城': { lat: 33.4484, lon: -112.0740, country: 'US' },
    '聖地牙哥': { lat: 32.7157, lon: -117.1611, country: 'US' },
    '奧蘭多': { lat: 28.5383, lon: -81.3792, country: 'US' },
    '夏威夷': { lat: 21.3069, lon: -157.8583, country: 'US' },
    '檀香山': { lat: 21.3069, lon: -157.8583, country: 'US' },
    '阿拉斯加': { lat: 61.2181, lon: -149.9003, country: 'US' },
    '大乡峽': { lat: 36.0544, lon: -112.1401, country: 'US' },
    '黃石公園': { lat: 44.4280, lon: -110.5885, country: 'US' },
    '尼加拉瀑布': { lat: 43.0962, lon: -79.0377, country: 'US' },
    
    // 加拿大 Canada
    '加拿大': { lat: 43.6532, lon: -79.3832, country: 'CA' },
    '多倫多': { lat: 43.6532, lon: -79.3832, country: 'CA' },
    '溫哥華': { lat: 49.2827, lon: -123.1207, country: 'CA' },
    '蒙特婁': { lat: 45.5017, lon: -73.5673, country: 'CA' },
    '魁北克': { lat: 46.8139, lon: -71.2080, country: 'CA' },
    '渥太華': { lat: 45.4215, lon: -75.6972, country: 'CA' },
    '卡加利': { lat: 51.0447, lon: -114.0719, country: 'CA' },
    '班夫': { lat: 51.1784, lon: -115.5708, country: 'CA' },
    
    // 墨西哥 Mexico
    '墨西哥': { lat: 19.4326, lon: -99.1332, country: 'MX' },
    '墨西哥城': { lat: 19.4326, lon: -99.1332, country: 'MX' },
    '坎昆': { lat: 21.1619, lon: -86.8515, country: 'MX' },
    '瓜達拉哈拉': { lat: 20.6597, lon: -103.3496, country: 'MX' },
    
    // 中美洲與加勒比海 Central America & Caribbean
    '古巴': { lat: 23.1136, lon: -82.3666, country: 'CU' },
    '哈瓦那': { lat: 23.1136, lon: -82.3666, country: 'CU' },
    '牙買加': { lat: 18.1096, lon: -77.2975, country: 'JM' },
    '巴哈馬': { lat: 25.0343, lon: -77.3963, country: 'BS' },
    '多明尼加': { lat: 18.4861, lon: -69.9312, country: 'DO' },
    '波多黎各': { lat: 18.4655, lon: -66.1057, country: 'PR' },
    '哥斯大黎加': { lat: 9.9281, lon: -84.0907, country: 'CR' },
    '巴拿馬': { lat: 8.9824, lon: -79.5199, country: 'PA' },
    
    // ============================================
    // 南美洲 South America
    // ============================================
    
    '巴西': { lat: -22.9068, lon: -43.1729, country: 'BR' },
    '里約熱內盧': { lat: -22.9068, lon: -43.1729, country: 'BR' },
    '聖保羅': { lat: -23.5505, lon: -46.6333, country: 'BR' },
    '阿根廷': { lat: -34.6037, lon: -58.3816, country: 'AR' },
    '布宜諾斯艾利斯': { lat: -34.6037, lon: -58.3816, country: 'AR' },
    '智利': { lat: -33.4489, lon: -70.6693, country: 'CL' },
    '聖地亞哥': { lat: -33.4489, lon: -70.6693, country: 'CL' },
    '秘魯': { lat: -12.0464, lon: -77.0428, country: 'PE' },
    '利馬': { lat: -12.0464, lon: -77.0428, country: 'PE' },
    '馬丘比丘': { lat: -13.1631, lon: -72.5450, country: 'PE' },
    '庫斯科': { lat: -13.5319, lon: -71.9675, country: 'PE' },
    '哥倫比亞': { lat: 4.7110, lon: -74.0721, country: 'CO' },
    '波哥大': { lat: 4.7110, lon: -74.0721, country: 'CO' },
    '厄瓜多': { lat: -0.1807, lon: -78.4678, country: 'EC' },
    '基多': { lat: -0.1807, lon: -78.4678, country: 'EC' },
    '加拉巴哥群島': { lat: -0.9538, lon: -90.9656, country: 'EC' },
    '委內瑞拉': { lat: 10.4806, lon: -66.9036, country: 'VE' },
    '卡拉卡斯': { lat: 10.4806, lon: -66.9036, country: 'VE' },
    '玻利維亞': { lat: -16.4897, lon: -68.1193, country: 'BO' },
    '烏拉圭': { lat: -34.9011, lon: -56.1645, country: 'UY' },
    '蒙特維多': { lat: -34.9011, lon: -56.1645, country: 'UY' },
    '巴拉圭': { lat: -25.2637, lon: -57.5759, country: 'PY' },
    
    // ============================================
    // 非洲 Africa
    // ============================================
    
    '埃及': { lat: 30.0444, lon: 31.2357, country: 'EG' },
    '開羅': { lat: 30.0444, lon: 31.2357, country: 'EG' },
    '金字塔': { lat: 29.9792, lon: 31.1342, country: 'EG' },
    '盧克索': { lat: 25.6872, lon: 32.6396, country: 'EG' },
    '南非': { lat: -33.9249, lon: 18.4241, country: 'ZA' },
    '開普敦': { lat: -33.9249, lon: 18.4241, country: 'ZA' },
    '約翰尼斯堡': { lat: -26.2041, lon: 28.0473, country: 'ZA' },
    '摩洛哥': { lat: 33.9716, lon: -6.8498, country: 'MA' },
    '馬拉喀什': { lat: 31.6295, lon: -7.9811, country: 'MA' },
    '卡薩布蘭加': { lat: 33.5731, lon: -7.5898, country: 'MA' },
    '肯亞': { lat: -1.2921, lon: 36.8219, country: 'KE' },
    '奈洛比': { lat: -1.2921, lon: 36.8219, country: 'KE' },
    '坦尚尼亞': { lat: -6.7924, lon: 39.2083, country: 'TZ' },
    '乞力馬扎羅山': { lat: -3.0674, lon: 37.3556, country: 'TZ' },
    '塞乞爾': { lat: -4.6796, lon: 55.4920, country: 'SC' },
    '模里西斯': { lat: -20.3484, lon: 57.5522, country: 'MU' },
    '突尼西亞': { lat: 36.8065, lon: 10.1815, country: 'TN' },
    '奈及利亞': { lat: 6.5244, lon: 3.3792, country: 'NG' },
    '拉哥斯': { lat: 6.5244, lon: 3.3792, country: 'NG' },
    '衣索比亞': { lat: 9.0320, lon: 38.7469, country: 'ET' },
    '迦納': { lat: 5.6037, lon: -0.1870, country: 'GH' },
    
    // ============================================
    // 大洋洲 Oceania
    // ============================================
    
    '澳洲': { lat: -33.8688, lon: 151.2093, country: 'AU' },
    '雪梨': { lat: -33.8688, lon: 151.2093, country: 'AU' },
    '墨爾本': { lat: -37.8136, lon: 144.9631, country: 'AU' },
    '布里斯本': { lat: -27.4698, lon: 153.0251, country: 'AU' },
    '乘恩斯': { lat: -16.9186, lon: 145.7781, country: 'AU' },
    '乘恩斯': { lat: -16.9186, lon: 145.7781, country: 'AU' },
    '凱恩斯': { lat: -16.9186, lon: 145.7781, country: 'AU' },
    '大堡礁': { lat: -18.2871, lon: 147.6992, country: 'AU' },
    '柏斯': { lat: -31.9505, lon: 115.8605, country: 'AU' },
    '阿德萊德': { lat: -34.9285, lon: 138.6007, country: 'AU' },
    '黃金海岸': { lat: -28.0167, lon: 153.4000, country: 'AU' },
    '塔斯馬尼亞': { lat: -42.8821, lon: 147.3272, country: 'AU' },
    '烏魯魯': { lat: -25.3444, lon: 131.0369, country: 'AU' },
    '紐西蘭': { lat: -36.8485, lon: 174.7633, country: 'NZ' },
    '奧克蘭': { lat: -36.8485, lon: 174.7633, country: 'NZ' },
    '乌威靈頓': { lat: -41.2866, lon: 174.7756, country: 'NZ' },
    '威靈頓': { lat: -41.2866, lon: 174.7756, country: 'NZ' },
    '乌皇后鎮': { lat: -45.0312, lon: 168.6626, country: 'NZ' },
    '皇后鎮': { lat: -45.0312, lon: 168.6626, country: 'NZ' },
    '斐濟': { lat: -18.1416, lon: 178.4419, country: 'FJ' },
    '大溪地': { lat: -17.6509, lon: -149.4260, country: 'PF' },
    '關島': { lat: 13.4443, lon: 144.7937, country: 'GU' },
    '帛琉': { lat: 7.5150, lon: 134.5825, country: 'PW' },
    '薩摩亞': { lat: -13.8333, lon: -171.7500, country: 'WS' },
    '東加': { lat: -21.1789, lon: -175.1982, country: 'TO' },
    '萬那杜': { lat: -17.7333, lon: 168.3273, country: 'VU' },
    '新喀里多尼亞': { lat: -22.2558, lon: 166.4505, country: 'NC' },
};

/**
 * 取得天氣預報
 */
async function fetchWeather(city, district) {
    try {
        if (!OPENWEATHER_API_KEY) {
            logger.warn('OpenWeather API key not configured');
            return getDefaultWeather(city);
        }

        let url;
        const coords = CITY_COORDS[city];
        
        if (coords) {
            url = `${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;
        } else {
            url = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;
        }

        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;

        let rainProbability = 0;
        try {
            const forecastUrl = coords 
                ? `${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw&cnt=8`
                : `${OPENWEATHER_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw&cnt=8`;
            
            const forecastRes = await axios.get(forecastUrl, { timeout: 10000 });
            if (forecastRes.data.list && forecastRes.data.list.length > 0) {
                const pops = forecastRes.data.list.map(item => (item.pop || 0) * 100);
                rainProbability = Math.round(pops.reduce((a, b) => a + b, 0) / pops.length);
            }
        } catch (e) {
            logger.warn('Failed to fetch forecast:', e.message);
        }

        return {
            city,
            district,
            description: data.weather[0]?.description || '晴天',
            icon: data.weather[0]?.icon,
            temperature: Math.round(data.main.temp),
            temperatureMin: Math.round(data.main.temp_min),
            temperatureMax: Math.round(data.main.temp_max),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            rainProbability,
            windSpeed: data.wind?.speed || 0,
            cloudiness: data.clouds?.all || 0,
            country: data.sys.country,
            fetchedAt: new Date()
        };

    } catch (error) {
        logger.error('Error fetching weather:', error.message);
        return getDefaultWeather(city);
    }
}

/**
 * 取得空氣品質
 */
async function fetchAirQuality(city) {
    try {
        if (!OPENWEATHER_API_KEY) {
            return getDefaultAirQuality(city);
        }

        const coords = CITY_COORDS[city];
        if (!coords) {
            return getDefaultAirQuality(city);
        }

        const url = `${OPENWEATHER_BASE_URL}/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}`;
        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;

        if (!data.list || data.list.length === 0) {
            return getDefaultAirQuality(city);
        }

        const airData = data.list[0];
        const aqi = airData.main.aqi;
        const components = airData.components;
        const aqiMap = { 1: 25, 2: 50, 3: 100, 4: 150, 5: 200 };
        const standardAqi = aqiMap[aqi] || 50;

        return {
            city,
            aqi: standardAqi,
            aqiStatus: getAqiStatusText(standardAqi),
            pm25: Math.round(components.pm2_5) || 0,
            pm10: Math.round(components.pm10) || 0,
            fetchedAt: new Date()
        };

    } catch (error) {
        logger.error('Error fetching air quality:', error.message);
        return getDefaultAirQuality(city);
    }
}

/**
 * 取得紫外線指數（估算）
 */
async function fetchUVIndex(city) {
    const coords = CITY_COORDS[city];
    if (!coords) {
        return { city, uvIndex: 5, level: '中量級', suggestion: '建議塗抹防曬' };
    }

    const lat = Math.abs(coords.lat);
    const month = new Date().getMonth() + 1;
    
    let baseUV = 10 - (lat / 10);
    if (month >= 11 || month <= 2) baseUV *= 0.7;
    if (month >= 5 && month <= 8) baseUV *= 1.2;
    
    const uvIndex = Math.min(11, Math.max(1, Math.round(baseUV)));

    return {
        city,
        uvIndex,
        level: getUVLevel(uvIndex),
        suggestion: getUVSuggestion(uvIndex)
    };
}

function getDefaultWeather(city) {
    return {
        city,
        description: '多雲時晴',
        temperature: 26,
        temperatureMin: 22,
        temperatureMax: 30,
        feelsLike: 28,
        humidity: 70,
        rainProbability: 20,
        isDefault: true
    };
}

function getDefaultAirQuality(city) {
    return {
        city,
        aqi: 50,
        aqiStatus: '良好',
        pm25: 15,
        isDefault: true
    };
}

function getAqiStatusText(aqi) {
    if (aqi <= 50) return '良好';
    if (aqi <= 100) return '普通';
    if (aqi <= 150) return '對敏感族群不健康';
    if (aqi <= 200) return '對所有族群不健康';
    return '非常不健康';
}

function getUVLevel(uvIndex) {
    if (uvIndex <= 2) return '低量級';
    if (uvIndex <= 5) return '中量級';
    if (uvIndex <= 7) return '高量級';
    if (uvIndex <= 10) return '過量級';
    return '危險級';
}

function getUVSuggestion(uvIndex) {
    if (uvIndex <= 2) return '可安心外出';
    if (uvIndex <= 5) return '建議塗抹防曬乳';
    if (uvIndex <= 7) return '避免在中午外出';
    if (uvIndex <= 10) return '避免外出，需防護措施';
    return '盡量待在室內';
}

/**
 * 取得完整天氣資訊
 */
async function getCompleteWeatherInfo(city, district) {
    try {
        const [weather, airQuality, uvIndex] = await Promise.all([
            fetchWeather(city, district),
            fetchAirQuality(city),
            fetchUVIndex(city)
        ]);

        return {
            ...weather,
            aqi: airQuality.aqi,
            aqiStatus: airQuality.aqiStatus,
            pm25: airQuality.pm25,
            uvIndex: uvIndex.uvIndex,
            uvLevel: uvIndex.level,
            uvSuggestion: uvIndex.suggestion
        };

    } catch (error) {
        logger.error('Error getting complete weather info:', error);
        return {
            ...getDefaultWeather(city),
            ...getDefaultAirQuality(city)
        };
    }
}

/**
 * 取得支援的城市列表
 */
function getSupportedCities() {
    return Object.keys(CITY_COORDS);
}

module.exports = {
    fetchWeather,
    fetchAirQuality,
    fetchUVIndex,
    getCompleteWeatherInfo,
    getSupportedCities,
    CITY_COORDS
};