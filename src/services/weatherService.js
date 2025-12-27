/**
 * ============================================
 * 天氣服務
 * 整合中央氣象署和環保署 API
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

// API 設定
const CWA_API_KEY = process.env.CWA_API_KEY;
const CWA_BASE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

// 城市對照表 (API 用的名稱)
const CITY_MAP = {
    '台北市': '臺北市',
    '台中市': '臺中市',
    '台南市': '臺南市',
    '高雄市': '高雄市',
    '新北市': '新北市',
    '桃園市': '桃園市',
    '基隆市': '基隆市',
    '新竹市': '新竹市',
    '新竹縣': '新竹縣',
    '苗栗縣': '苗栗縣',
    '彰化縣': '彰化縣',
    '南投縣': '南投縣',
    '雲林縣': '雲林縣',
    '嘉義市': '嘉義市',
    '嘉義縣': '嘉義縣',
    '屏東縣': '屏東縣',
    '宜蘭縣': '宜蘭縣',
    '花蓮縣': '花蓮縣',
    '台東縣': '臺東縣',
    '澎湖縣': '澎湖縣',
    '金門縣': '金門縣',
    '連江縣': '連江縣'
};

/**
 * 取得天氣預報
 */
async function fetchWeather(city, district) {
    try {
        const cityName = CITY_MAP[city] || city;
        
        // 一般天氣預報
        const forecastUrl = `${CWA_BASE_URL}/F-C0032-001`;
        
        const response = await axios.get(forecastUrl, {
            params: {
                Authorization: CWA_API_KEY,
                locationName: cityName,
                format: 'JSON'
            },
            timeout: 10000
        });

        const data = response.data;
        
        if (!data.success || !data.records?.location?.[0]) {
            logger.warn('Weather API returned no data');
            return getDefaultWeather(city);
        }

        const location = data.records.location[0];
        const weatherElements = {};

        // 解析天氣元素
        location.weatherElement.forEach(element => {
            const timeData = element.time[0]; // 取最近的時段
            weatherElements[element.elementName] = {
                value: timeData.parameter.parameterName,
                unit: timeData.parameter.parameterUnit
            };
        });

        return {
            city,
            district,
            description: weatherElements.Wx?.value || '多雲',
            temperature: parseFloat(weatherElements.T?.value) || 26,
            temperatureMin: parseFloat(weatherElements.MinT?.value) || 22,
            temperatureMax: parseFloat(weatherElements.MaxT?.value) || 30,
            humidity: parseInt(weatherElements.RH?.value) || 70,
            rainProbability: parseInt(weatherElements.PoP?.value) || 20,
            comfort: weatherElements.CI?.value || '舒適',
            fetchedAt: new Date()
        };

    } catch (error) {
        logger.error('Error fetching weather:', error.message);
        return getDefaultWeather(city);
    }
}

/**
 * 取得空氣品質資訊
 */
async function fetchAirQuality(city) {
    try {
        const cityName = CITY_MAP[city] || city;
        
        // 環保署空品 API
        const aqiUrl = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
        
        const response = await axios.get(aqiUrl, {
            params: {
                api_key: process.env.EPA_API_KEY || 'YOUR_EPA_API_KEY',
                format: 'json',
                county: cityName
            },
            timeout: 10000
        });

        const records = response.data?.records || [];
        
        if (records.length === 0) {
            logger.warn('Air quality API returned no data');
            return getDefaultAirQuality(city);
        }

        // 計算城市平均
        let totalAqi = 0;
        let totalPm25 = 0;
        let count = 0;

        records.forEach(record => {
            if (record.aqi && record.aqi !== '-') {
                totalAqi += parseInt(record.aqi);
                totalPm25 += parseFloat(record['pm2.5'] || 0);
                count++;
            }
        });

        const avgAqi = count > 0 ? Math.round(totalAqi / count) : 50;
        const avgPm25 = count > 0 ? Math.round(totalPm25 / count) : 15;

        return {
            city,
            aqi: avgAqi,
            aqiStatus: getAqiStatusText(avgAqi),
            pm25: avgPm25,
            pm10: null,
            o3: null,
            primaryPollutant: records[0]?.pollutant || null,
            publishTime: records[0]?.publishtime || new Date(),
            stations: records.slice(0, 3).map(r => ({
                name: r.sitename,
                aqi: parseInt(r.aqi) || 0,
                status: r.status
            })),
            fetchedAt: new Date()
        };

    } catch (error) {
        logger.error('Error fetching air quality:', error.message);
        return getDefaultAirQuality(city);
    }
}

/**
 * 取得紫外線指數
 */
async function fetchUVIndex(city) {
    try {
        const uvUrl = `${CWA_BASE_URL}/O-A0005-001`;
        
        const response = await axios.get(uvUrl, {
            params: {
                Authorization: CWA_API_KEY,
                format: 'JSON'
            },
            timeout: 10000
        });

        const records = response.data?.records?.weatherElement?.location || [];
        const cityData = records.find(r => r.locationName.includes(CITY_MAP[city] || city));

        if (cityData) {
            const uvIndex = parseFloat(cityData.value) || 0;
            return {
                city,
                uvIndex,
                level: getUVLevel(uvIndex),
                suggestion: getUVSuggestion(uvIndex)
            };
        }

        return { city, uvIndex: 5, level: '中量級', suggestion: '建議塗抹防曬' };

    } catch (error) {
        logger.error('Error fetching UV index:', error.message);
        return { city, uvIndex: 5, level: '中量級', suggestion: '建議塗抹防曬' };
    }
}

/**
 * 預設天氣資料
 */
function getDefaultWeather(city) {
    return {
        city,
        description: '多雲時晴',
        temperature: 26,
        temperatureMin: 22,
        temperatureMax: 30,
        humidity: 70,
        rainProbability: 20,
        comfort: '舒適',
        isDefault: true
    };
}

/**
 * 預設空品資料
 */
function getDefaultAirQuality(city) {
    return {
        city,
        aqi: 50,
        aqiStatus: '良好',
        pm25: 15,
        isDefault: true
    };
}

/**
 * AQI 狀態文字
 */
function getAqiStatusText(aqi) {
    if (aqi <= 50) return '良好';
    if (aqi <= 100) return '普通';
    if (aqi <= 150) return '對敏感族群不健康';
    if (aqi <= 200) return '對所有族群不健康';
    if (aqi <= 300) return '非常不健康';
    return '危害';
}

/**
 * 紫外線等級
 */
function getUVLevel(uvIndex) {
    if (uvIndex <= 2) return '低量級';
    if (uvIndex <= 5) return '中量級';
    if (uvIndex <= 7) return '高量級';
    if (uvIndex <= 10) return '過量級';
    return '危險級';
}

/**
 * 紫外線建議
 */
function getUVSuggestion(uvIndex) {
    if (uvIndex <= 2) return '可安心外出';
    if (uvIndex <= 5) return '建議塗抹防曬乳';
    if (uvIndex <= 7) return '避免在中午外出，塗抹防曬乳';
    if (uvIndex <= 10) return '避免外出，必要時需防護措施';
    return '盡量待在室內';
}

/**
 * 取得完整天氣資訊（含空品、UV）
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

module.exports = {
    fetchWeather,
    fetchAirQuality,
    fetchUVIndex,
    getCompleteWeatherInfo
};
