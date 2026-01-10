/**
 * Google Places API 服務
 * 用於搜尋景點並新增到想去清單
 */
const axios = require('axios');
const logger = require('../utils/logger');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * 搜尋景點
 * @param {string} query - 搜尋關鍵字
 * @param {string} region - 地區偏好（預設台灣）
 * @returns {Array} 景點列表
 */
async function searchPlaces(query, region = 'tw') {
    try {
        logger.info('搜尋景點: ' + query);
        
        // 使用 Text Search API
        var response = await axios.get(PLACES_API_URL + '/textsearch/json', {
            params: {
                query: query,
                language: 'zh-TW',
                region: region,
                key: GOOGLE_API_KEY
            }
        });

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            logger.error('Places API 錯誤: ' + response.data.status);
            return [];
        }

        var results = response.data.results || [];
        logger.info('找到 ' + results.length + ' 個景點');

        // 整理結果（最多 5 個）
        return results.slice(0, 5).map(function(place) {
            return {
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address || '',
                rating: place.rating || 0,
                userRatingsTotal: place.user_ratings_total || 0,
                lat: place.geometry?.location?.lat || 0,
                lng: place.geometry?.location?.lng || 0,
                types: place.types || [],
                photo: place.photos && place.photos.length > 0 
                    ? getPhotoUrl(place.photos[0].photo_reference) 
                    : null
            };
        });

    } catch (error) {
        logger.error('搜尋景點錯誤:', error.message);
        return [];
    }
}

/**
 * 取得景點詳細資訊
 * @param {string} placeId - Google Place ID
 * @returns {Object} 景點詳細資訊
 */
async function getPlaceDetails(placeId) {
    try {
        logger.info('取得景點詳情: ' + placeId);
        
        var response = await axios.get(PLACES_API_URL + '/details/json', {
            params: {
                place_id: placeId,
                language: 'zh-TW',
                fields: 'name,formatted_address,geometry,rating,user_ratings_total,opening_hours,formatted_phone_number,website,photos,types',
                key: GOOGLE_API_KEY
            }
        });

        if (response.data.status !== 'OK') {
            logger.error('Place Details API 錯誤: ' + response.data.status);
            return null;
        }

        var place = response.data.result;
        return {
            placeId: placeId,
            name: place.name,
            address: place.formatted_address || '',
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
            rating: place.rating || 0,
            userRatingsTotal: place.user_ratings_total || 0,
            phone: place.formatted_phone_number || '',
            website: place.website || '',
            openNow: place.opening_hours?.open_now,
            weekdayText: place.opening_hours?.weekday_text || [],
            photo: place.photos && place.photos.length > 0 
                ? getPhotoUrl(place.photos[0].photo_reference) 
                : null,
            types: place.types || []
        };

    } catch (error) {
        logger.error('取得景點詳情錯誤:', error.message);
        return null;
    }
}

/**
 * 取得照片 URL
 */
function getPhotoUrl(photoReference, maxWidth = 400) {
    if (!photoReference) return null;
    return PLACES_API_URL + '/photo?maxwidth=' + maxWidth + 
           '&photo_reference=' + photoReference + 
           '&key=' + GOOGLE_API_KEY;
}

/**
 * 取得景點類型中文名稱
 */
function getTypeLabel(types) {
    var typeMap = {
        'tourist_attraction': '觀光景點',
        'park': '公園',
        'museum': '博物館',
        'restaurant': '餐廳',
        'cafe': '咖啡廳',
        'lodging': '住宿',
        'shopping_mall': '購物中心',
        'temple': '寺廟',
        'church': '教堂',
        'natural_feature': '自然景觀',
        'point_of_interest': '景點',
        'establishment': '場所',
        'amusement_park': '遊樂園',
        'aquarium': '水族館',
        'art_gallery': '美術館',
        'zoo': '動物園',
        'campground': '露營地',
        'rv_park': '露營車營地'
    };

    for (var i = 0; i < types.length; i++) {
        if (typeMap[types[i]]) {
            return typeMap[types[i]];
        }
    }
    return '景點';
}

module.exports = {
    searchPlaces: searchPlaces,
    getPlaceDetails: getPlaceDetails,
    getPhotoUrl: getPhotoUrl,
    getTypeLabel: getTypeLabel
};
