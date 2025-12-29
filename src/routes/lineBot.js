/**
 * LINE Bot Webhook 路由
 */
const express = require('express');
const router = express.Router();
const { messagingApi, middleware } = require('@line/bot-sdk');

const logger = require('../utils/logger');
const lineBotController = require('../controllers/lineBotController');

const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

const client = new messagingApi.MessagingApiClient({
    channelAccessToken: config.channelAccessToken
});

router.post('/', async (req, res) => {
    try {
        const body = JSON.parse(req.body.toString());
        const events = body.events;

        if (!events || events.length === 0) {
            return res.status(200).send('OK');
        }

        for (const event of events) {
            logger.info('[LINE Event] User: ' + event.source.userId + ', Type: ' + event.type);

            try {
                switch (event.type) {
                    case 'message':
                        await handleMessageEvent(event);
                        break;
                    case 'postback':
                        await lineBotController.handlePostback(event, client);
                        break;
                    case 'follow':
                        await lineBotController.handleFollow(event, client);
                        break;
                    case 'unfollow':
                        await lineBotController.handleUnfollow(event, client);
                        break;
                    case 'join':
                        await lineBotController.handleJoin(event, client);
                        break;
                    case 'leave':
                        await lineBotController.handleLeave(event, client);
                        break;
                    case 'memberJoined':
                        await lineBotController.handleMemberJoined(event, client);
                        break;
                    case 'memberLeft':
                        await lineBotController.handleMemberLeft(event, client);
                        break;
                    case 'beacon':
                        await lineBotController.handleBeacon(event, client);
                        break;
                    case 'accountLink':
                        await lineBotController.handleAccountLink(event, client);
                        break;
                    default:
                        logger.info('Unhandled event type: ' + event.type);
                }
            } catch (eventError) {
                logger.error('Event handling error:', eventError);
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(200).send('OK');
    }
});

async function handleMessageEvent(event) {
    switch (event.message.type) {
        case 'text':
            await lineBotController.handleTextMessage(event, client);
            break;
        case 'image':
            await lineBotController.handleImageMessage(event, client);
            break;
        case 'video':
            await lineBotController.handleVideoMessage(event, client);
            break;
        case 'audio':
            await lineBotController.handleAudioMessage(event, client);
            break;
        case 'file':
            await lineBotController.handleFileMessage(event, client);
            break;
        case 'location':
            await lineBotController.handleLocationMessage(event, client);
            break;
        case 'sticker':
            await lineBotController.handleStickerMessage(event, client);
            break;
        default:
            logger.info('Unhandled message type: ' + event.message.type);
    }
}

module.exports = router;