/**
 * ImgBB 圖片上傳服務
 */
const axios = require('axios');
const logger = require('../utils/logger');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

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

        var response = await axios.post(IMGBB_UPLOAD_URL, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000
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
            return { success: false, error: '上傳失敗' };
        }

    } catch (error) {
        logger.error('ImgBB upload error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 從 LINE 取得圖片並上傳到 ImgBB
 */
async function uploadFromLine(client, messageId, name) {
    try {
        var stream = await client.getMessageContent(messageId);
        var chunks = [];
        for await (var chunk of stream) {
            chunks.push(chunk);
        }
        var buffer = Buffer.concat(chunks);
        var result = await uploadImage(buffer, name || 'checkin_' + messageId);
        return result;
    } catch (error) {
        logger.error('Upload from LINE error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    uploadImage: uploadImage,
    uploadFromLine: uploadFromLine
};
