/**
 * ============================================
 * Rich Menu 服務
 * LINE Rich Menu 管理
 * ============================================
 */

const logger = require('../utils/logger');

// Rich Menu 配置
const RICH_MENU_CONFIG = {
    default: {
        size: {
            width: 2500,
            height: 1686
        },
        selected: true,
        name: '退休福音主選單',
        chatBarText: '功能選單',
        areas: [
            {
                bounds: { x: 0, y: 0, width: 833, height: 843 },
                action: {
                    type: 'postback',
                    label: '今日推薦',
                    data: 'action=daily_recommendation',
                    displayText: '今日推薦'
                }
            },
            {
                bounds: { x: 833, y: 0, width: 834, height: 843 },
                action: {
                    type: 'postback',
                    label: '找活動',
                    data: 'action=explore_category',
                    displayText: '找活動'
                }
            },
            {
                bounds: { x: 1667, y: 0, width: 833, height: 843 },
                action: {
                    type: 'postback',
                    label: '揪團',
                    data: 'action=view_groups',
                    displayText: '揪團'
                }
            },
            {
                bounds: { x: 0, y: 843, width: 833, height: 843 },
                action: {
                    type: 'postback',
                    label: '我的行程',
                    data: 'action=my_schedule',
                    displayText: '我的行程'
                }
            },
            {
                bounds: { x: 833, y: 843, width: 834, height: 843 },
                action: {
                    type: 'postback',
                    label: '健康',
                    data: 'action=health_menu',
                    displayText: '健康管理'
                }
            },
            {
                bounds: { x: 1667, y: 843, width: 833, height: 843 },
                action: {
                    type: 'postback',
                    label: '設定',
                    data: 'action=settings',
                    displayText: '設定'
                }
            }
        ]
    }
};

/**
 * 建立 Rich Menu
 */
async function createRichMenu(client, menuType = 'default') {
    try {
        const config = RICH_MENU_CONFIG[menuType];
        
        if (!config) {
            throw new Error(`Unknown menu type: ${menuType}`);
        }

        // 建立 Rich Menu
        const richMenuId = await client.createRichMenu(config);
        logger.info(`Rich Menu created: ${richMenuId}`);

        return richMenuId;

    } catch (error) {
        logger.error('Error creating rich menu:', error);
        throw error;
    }
}

/**
 * 上傳 Rich Menu 圖片
 */
async function uploadRichMenuImage(client, richMenuId, imageBuffer) {
    try {
        await client.setRichMenuImage(richMenuId, imageBuffer, 'image/png');
        logger.info(`Rich Menu image uploaded for: ${richMenuId}`);
    } catch (error) {
        logger.error('Error uploading rich menu image:', error);
        throw error;
    }
}

/**
 * 設定預設 Rich Menu
 */
async function setDefaultRichMenu(client, richMenuId) {
    try {
        await client.setDefaultRichMenu(richMenuId);
        logger.info(`Default Rich Menu set: ${richMenuId}`);
    } catch (error) {
        logger.error('Error setting default rich menu:', error);
        throw error;
    }
}

/**
 * 為用戶設定 Rich Menu
 */
async function setDefaultMenu(client, userId) {
    try {
        // 取得預設 Rich Menu
        const defaultMenuId = await client.getDefaultRichMenuId();
        
        if (defaultMenuId) {
            await client.linkRichMenuToUser(userId, defaultMenuId);
            logger.info(`Rich Menu linked to user: ${userId}`);
        }
    } catch (error) {
        logger.error('Error setting user rich menu:', error);
        // 不拋出錯誤，允許繼續執行
    }
}

/**
 * 為用戶解除 Rich Menu
 */
async function unlinkRichMenu(client, userId) {
    try {
        await client.unlinkRichMenuFromUser(userId);
        logger.info(`Rich Menu unlinked from user: ${userId}`);
    } catch (error) {
        logger.error('Error unlinking rich menu:', error);
    }
}

/**
 * 取得所有 Rich Menu
 */
async function getRichMenuList(client) {
    try {
        const response = await client.getRichMenuList();
        return response.richmenus || [];
    } catch (error) {
        logger.error('Error getting rich menu list:', error);
        return [];
    }
}

/**
 * 刪除 Rich Menu
 */
async function deleteRichMenu(client, richMenuId) {
    try {
        await client.deleteRichMenu(richMenuId);
        logger.info(`Rich Menu deleted: ${richMenuId}`);
    } catch (error) {
        logger.error('Error deleting rich menu:', error);
        throw error;
    }
}

/**
 * 初始化 Rich Menu (部署時使用)
 */
async function initializeRichMenu(client) {
    try {
        // 檢查是否已有預設選單
        const existingMenuId = await client.getDefaultRichMenuId().catch(() => null);
        
        if (existingMenuId) {
            logger.info(`Default Rich Menu already exists: ${existingMenuId}`);
            return existingMenuId;
        }

        // 建立新選單
        const richMenuId = await createRichMenu(client, 'default');

        // 這裡應該上傳圖片，但需要實際的圖片檔案
        // await uploadRichMenuImage(client, richMenuId, imageBuffer);

        // 設為預設
        await setDefaultRichMenu(client, richMenuId);

        return richMenuId;

    } catch (error) {
        logger.error('Error initializing rich menu:', error);
        throw error;
    }
}

module.exports = {
    createRichMenu,
    uploadRichMenuImage,
    setDefaultRichMenu,
    setDefaultMenu,
    unlinkRichMenu,
    getRichMenuList,
    deleteRichMenu,
    initializeRichMenu,
    RICH_MENU_CONFIG
};
