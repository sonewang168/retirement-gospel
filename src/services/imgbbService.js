/**
 * ImgBB 圖片上傳服務
 */
const axios = require('axios');
const logger = require('../utils/logger');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
const LINE_CONTENT_URL = 'https://api-data.line.me/v2/bot/message';

/**
 * 上傳圖片到 ImgBB
 */
async function uploadImage(imageData, name) {
    try {
        if (!IMGBB_API_KEY) {
            logger.error('IMGBB_API_KEY not configured');
            return { success: false, error: 'API Key 未設定' };
        }

        var base64Image;
        if (Buffer.isBuffer(imageData)) {
            base64Image = imageData.toString('base64');
            logger.info('Image buffer size: ' + imageData.length + ' bytes');
        } else if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
                base64Image = imageData.split(',')[1];
            } else {
                base64Image = imageData;
            }
        } else {
            return { success: false, error: '無效的圖片格式' };
        }

        var formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);
        if (name) {
            formData.append('name', name);
        }

        logger.info('Uploading to ImgBB...');
        var response = await axios.post(IMGBB_UPLOAD_URL, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 60000
        });

        if (response.data && response.data.success) {
            logger.info('Image uploaded to ImgBB: ' + response.data.data.url);
            return {
                success: true,
                url: response.data.data.url,
                displayUrl: response.data.data.display_url,
                thumbnail: response.data.data.thumb ? response.data.data.thumb.url : null,
                deleteUrl: response.data.data.delete_url
            };
        } else {
            logger.error('ImgBB response error:', JSON.stringify(response.data));
            return { success: false, error: '上傳失敗' };
        }

    } catch (error) {
        logger.error('ImgBB upload error:', error.message || error);
        return { success: false, error: error.message || '上傳錯誤' };
    }
}

/**
 * 從 LINE 取得圖片並上傳到 ImgBB（使用 axios 直接呼叫）
 */
async function uploadFromLine(client, messageId, name) {
    try {
        logger.info('Getting image from LINE, messageId: ' + messageId);
        
        var channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!channelAccessToken) {
            logger.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
            return { success: false, error: 'LINE Token 未設定' };
        }

        // 直接用 axios 從 LINE API 取得圖片
        var response = await axios.get(
            LINE_CONTENT_URL + '/' + messageId + '/content',
            {
                headers: {
                    'Authorization': 'Bearer ' + channelAccessToken
                },
                responseType: 'arraybuffer',
                timeout: 30000
            }
        );

        var buffer = Buffer.from(response.data);
        logger.info('Got image from LINE, size: ' + buffer.length + ' bytes');

        if (buffer.length === 0) {
            return { success: false, error: '圖片內容為空' };
        }

        // 上傳到 ImgBB
        var result = await uploadImage(buffer, name || 'checkin_' + messageId);
        return result;

    } catch (error) {
        logger.error('Upload from LINE error:', error.message || JSON.stringify(error));
        if (error.response) {
            logger.error('LINE API response status:', error.response.status);
        }
        return { success: false, error: error.message || '取得圖片失敗' };
    }
}

module.exports = {
    uploadImage: uploadImage,
    uploadFromLine: uploadFromLine
};
