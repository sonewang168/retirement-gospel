/**
 * ============================================
 * AI 行程生成服務
 * 支援 OpenAI GPT + Google Gemini 雙引擎
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;

/**
 * 解析用戶輸入
 */
function parseUserInput(text) {
    const result = {
        country: null,
        days: null,
        budget: null,
        theme: null
    };

    const countryMap = {
        '日本': '日本', '東京': '日本', '大阪': '日本', '京都': '日本', '沖繩': '日本', '北海道': '日本',
        '韓國': '韓國', '首爾': '韓國', '釜山': '韓國', '濟州': '韓國',
        '泰國': '泰國', '曼谷': '泰國', '普吉': '泰國', '清邁': '泰國',
        '越南': '越南', '河內': '越南', '峴港': '越南',
        '新加坡': '新加坡',
        '馬來西亞': '馬來西亞',
        '印尼': '印尼', '峇里島': '印尼',
        '法國': '法國', '巴黎': '法國',
        '義大利': '義大利', '羅馬': '義大利',
        '美國': '美國', '紐約': '美國', '洛杉磯': '美國',
        '澳洲': '澳洲', '雪梨': '澳洲'
    };

    for (const [keyword, country] of Object.entries(countryMap)) {
        if (text.includes(keyword)) {
            result.country = country;
            break;
        }
    }

    const daysMatch = text.match(/(\d+)\s*[天日]/);
    if (daysMatch) {
        result.days = parseInt(daysMatch[1]);
    }

    return result;
}

/**
 * 建立 AI Prompt
 */
function buildPrompt(parsed, userText) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;

    return `你是專業旅遊規劃師。請為台灣退休族群規劃 ${country} ${days} 天旅遊行程。

用戶需求：${userText}

請用以下 JSON 格式回覆（只要 JSON，不要其他文字）：

{
  "name": "${country}${days}日精彩遊",
  "country": "${country}",
  "days": ${days},
  "estimatedCost": {"min": 30000, "max": 50000},
  "highlights": ["景點1", "景點2", "景點3", "景點4", "景點5"],
  "itinerary": [
    {"day": 1, "title": "抵達", "activities": ["活動1", "活動2"]},
    {"day": 2, "title": "觀光", "activities": ["活動1", "活動2"]},
    {"day": 3, "title": "體驗", "activities": ["活動1", "活動2"]},
    {"day": 4, "title": "購物", "activities": ["活動1", "活動2"]},
    {"day": 5, "title": "返程", "activities": ["活動1", "活動2"]}
  ],
  "tips": ["提醒1", "提醒2", "提醒3"],
  "bestSeason": "全年皆宜"
}`;
}

/**
 * 安全解析 JSON
 */
function safeParseJSON(content, source) {
    try {
        // 嘗試找出 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const tour = JSON.parse(jsonMatch[0]);
            tour.source = source;
            tour.id = source.toLowerCase().replace(/\s/g, '-') + '-' + Date.now();
            return tour;
        }
    } catch (e) {
        logger.error(`JSON parse error for ${source}:`, e.message);
    }
    return null;
}

/**
 * 呼叫 OpenAI GPT
 */
async function generateWithOpenAI(prompt) {
    if (!OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured');
        return null;
    }

    try {
        logger.info('Calling OpenAI API...');

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: prompt }
                ],
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
        logger.info('OpenAI raw response:', content?.substring(0, 200));
        
        if (content) {
            return safeParseJSON(content, 'ChatGPT');
        }
    } catch (error) {
        logger.error('OpenAI API error:', error.response?.data?.error?.message || error.message);
    }
    return null;
}

/**
 * 呼叫 Google Gemini
 */
async function generateWithGemini(prompt) {
    logger.info('ENV GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    logger.info('All env keys:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('OPENAI')));
    if (!GEMINI_API_KEY) {
        logger.warn('Gemini API key not configured');
        return null;
    }

    try {
        logger.info('Calling Gemini API with key:', GEMINI_API_KEY.substring(0, 10) + '...');

        // 嘗試 v1beta 端點
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        logger.info('Gemini URL:', url.replace(GEMINI_API_KEY, 'HIDDEN'));

        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        logger.info('Gemini response status:', response.status);

        if (response.data.error) {
            logger.error('Gemini API returned error:', response.data.error);
            return null;
        }

        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
            logger.info('Gemini raw response:', content.substring(0, 200));
            return safeParseJSON(content, 'Gemini');
        } else {
            logger.error('Gemini no content:', JSON.stringify(response.data).substring(0, 500));
        }
    } catch (error) {
        logger.error('Gemini full error:', error.toString());
        if (error.response) {
            logger.error('Gemini status:', error.response.status);
            logger.error('Gemini data:', JSON.stringify(error.response.data).substring(0, 500));
        }
        if (error.code) {
            logger.error('Gemini error code:', error.code);
        }
    }
    return null;
}
/**
 * 建立預設行程
 */
function buildDefaultTour(parsed) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;
    
    const defaultItineraries = {
        '日本': [
            { day: 1, title: '抵達東京', activities: ['成田機場', '新宿逛街', '居酒屋晚餐'] },
            { day: 2, title: '東京經典', activities: ['淺草寺', '晴空塔', '秋葉原'] },
            { day: 3, title: '文化體驗', activities: ['明治神宮', '原宿', '表參道'] },
            { day: 4, title: '購物日', activities: ['銀座', '台場', '東京鐵塔夜景'] },
            { day: 5, title: '返程', activities: ['築地市場', '機場'] }
        ],
        '韓國': [
            { day: 1, title: '抵達首爾', activities: ['仁川機場', '明洞', '烤肉晚餐'] },
            { day: 2, title: '古宮巡禮', activities: ['景福宮', '北村韓屋村', '三清洞'] },
            { day: 3, title: '江南時尚', activities: ['COEX Mall', '狎鷗亭', 'N首爾塔'] },
            { day: 4, title: '購物日', activities: ['東大門', '弘大商圈', '汗蒸幕'] },
            { day: 5, title: '返程', activities: ['仁寺洞', '機場'] }
        ],
        '泰國': [
            { day: 1, title: '抵達曼谷', activities: ['素萬那普機場', '考山路', '按摩'] },
            { day: 2, title: '皇宮古蹟', activities: ['大皇宮', '玉佛寺', '臥佛寺'] },
            { day: 3, title: '水上市場', activities: ['丹嫩莎朵水上市場', '下午茶', 'SPA'] },
            { day: 4, title: '購物日', activities: ['洽圖洽市集', '暹羅百麗宮', '夜市'] },
            { day: 5, title: '返程', activities: ['最後購物', '機場'] }
        ]
    };

    const itinerary = defaultItineraries[country] || defaultItineraries['日本'];

    return {
        id: 'default-' + Date.now(),
        name: `${country}${days}日精選遊`,
        country: country,
        days: days,
        source: '系統推薦',
        estimatedCost: { min: 30000, max: 50000 },
        highlights: ['經典景點', '道地美食', '文化體驗', '購物血拼', '放鬆療癒'],
        itinerary: itinerary.slice(0, days),
        tips: ['記得帶護照', '換好當地貨幣', '下載離線地圖'],
        bestSeason: '全年皆宜'
    };
}

/**
 * 雙 AI 生成行程
 */
async function generateTourWithDualAI(userText) {
    const parsed = parseUserInput(userText);
    const prompt = buildPrompt(parsed, userText);

    logger.info('Generating tour:', { country: parsed.country, days: parsed.days });

    // 同時呼叫兩個 AI
    const [gptResult, geminiResult] = await Promise.all([
        generateWithOpenAI(prompt),
        generateWithGemini(prompt)
    ]);

    const results = [];
    if (gptResult) results.push(gptResult);
    if (geminiResult) results.push(geminiResult);

    logger.info(`AI results: GPT=${!!gptResult}, Gemini=${!!geminiResult}`);

    // 如果都失敗，返回預設行程
    if (results.length === 0) {
        logger.info('Using default tour');
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