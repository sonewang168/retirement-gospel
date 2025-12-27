/**
 * ============================================
 * LINE Webhook 路由
 * ============================================
 */

const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const logger = require('../utils/logger');
const lineBotController = require('../controllers/lineBotController');

// LINE SDK 設定
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// 建立 LINE Client
const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// Webhook 驗證端點
router.get('/', (req, res) => {
    res.status(200).send('LINE Webhook is ready');
});

// Webhook 接收端點
router.post('/', line.middleware(lineConfig), async (req, res) => {
    try {
        const events = req.body.events;
        
        if (!events || events.length === 0) {
            return res.status(200).send('OK');
        }

        // 處理所有事件
        const results = await Promise.all(
            events.map(event => handleEvent(event, client))
        );

        res.status(200).json(results);
    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * 事件處理分發器
 */
async function handleEvent(event, client) {
    logger.logLineEvent(event);

    try {
        switch (event.type) {
            case 'message':
                return await handleMessageEvent(event, client);
            
            case 'follow':
                return await lineBotController.handleFollow(event, client);
            
            case 'unfollow':
                return await lineBotController.handleUnfollow(event, client);
            
            case 'join':
                return await lineBotController.handleJoin(event, client);
            
            case 'leave':
                return await lineBotController.handleLeave(event, client);
            
            case 'postback':
                return await lineBotController.handlePostback(event, client);
            
            case 'beacon':
                return await lineBotController.handleBeacon(event, client);
            
            case 'accountLink':
                return await lineBotController.handleAccountLink(event, client);
            
            case 'memberJoined':
                return await lineBotController.handleMemberJoined(event, client);
            
            case 'memberLeft':
                return await lineBotController.handleMemberLeft(event, client);
            
            default:
                logger.info(`Unhandled event type: ${event.type}`);
                return null;
        }
    } catch (error) {
        logger.error(`Error handling ${event.type} event:`, error);
        
        // 發送錯誤訊息給用戶
        if (event.replyToken) {
            try {
                await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: [{
                        type: 'text',
                        text: '抱歉，系統暫時發生問題，請稍後再試 🙏'
                    }]
                });
            } catch (replyError) {
                logger.error('Error sending error message:', replyError);
            }
        }
        
        return null;
    }
}

/**
 * 訊息事件處理
 */
async function handleMessageEvent(event, client) {
    const messageType = event.message.type;

    switch (messageType) {
        case 'text':
            return await lineBotController.handleTextMessage(event, client);
        
        case 'image':
            return await lineBotController.handleImageMessage(event, client);
        
        case 'video':
            return await lineBotController.handleVideoMessage(event, client);
        
        case 'audio':
            return await lineBotController.handleAudioMessage(event, client);
        
        case 'file':
            return await lineBotController.handleFileMessage(event, client);
        
        case 'location':
            return await lineBotController.handleLocationMessage(event, client);
        
        case 'sticker':
            return await lineBotController.handleStickerMessage(event, client);
        
        default:
            logger.info(`Unhandled message type: ${messageType}`);
            return null;
    }
}

module.exports = router;
