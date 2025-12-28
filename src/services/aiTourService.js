/**
 * ============================================
 * AI 行程生成服務
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 啟動時打印
logger.info('=== AI Service Init ===');
logger.info('OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
logger.info('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
logger.info('GEMINI_API_KEY value:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 15) + '...' : 'EMPTY');

/**
 * 解析用戶輸入
 */
function parseUserInput(text) {
    const result = { country: null, days: null };

    const countryMap = {
        '日本': '日本', '東京': '日本', '大阪': '日本', '京都': '日本', '沖繩': '日本', '北海道': '日本',
        '韓國': '韓國', '首爾': '韓國', '釜山': '韓國', '濟州': '韓國',
        '泰國': '泰國', '曼谷': '泰國', '普吉': '泰國', '清邁': '泰國',
        '越南': '越南', '新加坡': '新加坡', '馬來西亞': '馬來西亞',
        '印尼': '印尼', '峇里島': '印尼',
        '法國': '法國', '巴黎': '法國',
        '義大利': '義大利', '美國': '美國', '澳洲': '澳洲'
    };

    for (const [keyword, country] of Object.entries(countryMap)) {
        if (text.includes(keyword)) {
            result.country = country;
            break;
        }
    }

    const daysMatch = text.match(/(\d+)\s*[天日]/);
    if (daysMatch) result.days = parseInt(daysMatch[1]);

    return result;
}

/**
 * 建立 Prompt
 */
function buildPrompt(parsed, userText) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;

    return `你是專業旅遊規劃師。請為台灣退休族群規劃 ${country} ${days} 天旅遊行程。

用戶需求：${userText}

請只回覆 JSON（不要任何其他文字）：
{"name":"${country}${days}日遊","country":"${country}","days":${days},"estimatedCost":{"min":30000,"max":50000},"highlights":["景點1","景點2","景點3"],"itinerary":[{"day":1,"title":"第一天","activities":["活動1","活動2"]}],"tips":["提醒1","提醒2"],"bestSeason":"全年"}`;
}

/**
 * 安全解析 JSON
 */
function safeParseJSON(content, source) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const tour = JSON.parse(jsonMatch[0]);
            tour.source = source;
            tour.id = source.toLowerCase() + '-' + Date.now();
            return tour;
        }
    } catch (e) {
        logger.error(`JSON parse error (${source}):`, e.message);
    }
    return null;
}

/**
 * OpenAI
 */
async function generateWithOpenAI(prompt) {
    if (!OPENAI_API_KEY) return null;

    try {
        logger.info('Calling OpenAI...');
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1500
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        const content = response.data.choices?.[0]?.message?.content;
        logger.info('OpenAI OK');
        return content ? safeParseJSON(content, 'ChatGPT') : null;
    } catch (error) {
        logger.error('OpenAI error:', error.message);
        return null;
    }
}

/**
 * Gemini
 */
async function generateWithGemini(prompt) {
    logger.info('=== Gemini Debug ===');
    logger.info('GEMINI_API_KEY check:', GEMINI_API_KEY ? 'EXISTS' : 'MISSING');
    
    if (!GEMINI_API_KEY) {
        logger.error('Gemini: No API key!');
        return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    logger.info('Gemini URL ready');

    try {
        logger.info('Calling Gemini...');
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        logger.info('Gemini response status:', response.status);
        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
            logger.info('Gemini OK');
            return safeParseJSON(content, 'Gemini');
        }
        logger.error('Gemini: No content');
        return null;
    } catch (error) {
        logger.error('=== Gemini Error Detail ===');
        logger.error('Message:', error.message);
        logger.error('Code:', error.code);
        if (error.response) {
            logger.error('Status:', error.response.status);
            logger.error('Data:', JSON.stringify(error.response.data));
        }
        return null;
    }
}

/**
 * 預設行程
 */
function buildDefaultTour(parsed) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;
    
    return {
        id: 'default-' + Date.now(),
        name: `${country}${days}日精選遊`,
        country, days,
        source: '系統推薦',
        estimatedCost: { min: 30000, max: 50000 },
        highlights: ['經典景點', '道地美食', '文化體驗'],
        itinerary: [
            { day: 1, title: '抵達', activities: ['機場', '飯店', '探索'] },
            { day: 2, title: '觀光', activities: ['景點', '美食', '購物'] },
            { day: 3, title: '體驗', activities: ['文化', '市場', '休閒'] },
            { day: 4, title: '自由', activities: ['購物', 'SPA', '美食'] },
            { day: 5, title: '返程', activities: ['打包', '機場'] }
        ].slice(0, days),
        tips: ['帶護照', '換匯', '下載地圖'],
        bestSeason: '全年'
    };
}

/**
 * 雙 AI 生成
 */
async function generateTourWithDualAI(userText) {
    const parsed = parseUserInput(userText);
    const prompt = buildPrompt(parsed, userText);

    logger.info('=== Generate Tour ===');
    logger.info('Country:', parsed.country, 'Days:', parsed.days);

    const [gptResult, geminiResult] = await Promise.all([
        generateWithOpenAI(prompt),
        generateWithGemini(prompt)
    ]);

    const results = [];
    if (gptResult) results.push(gptResult);
    if (geminiResult) results.push(geminiResult);

    logger.info('Results: GPT=' + !!gptResult + ', Gemini=' + !!geminiResult);

    if (results.length === 0) {
        results.push(buildDefaultTour(parsed));
    }

    return results;
}

module.exports = {
    parseUserInput,
    generateTourWithDualAI,
    generateWithOpenAI,
    generateWithGemini
};