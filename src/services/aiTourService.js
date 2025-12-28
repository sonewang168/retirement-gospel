/**
 * ============================================
 * AI 行程生成服務
 * 支援 OpenAI GPT + Google Gemini 雙引擎
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 解析用戶輸入
 */
function parseUserInput(text) {
    const result = {
        country: null,
        days: null,
        budget: null,
        theme: null,
        preferences: []
    };

    // 解析國家
    const countryMap = {
        '日本': '日本', '東京': '日本', '大阪': '日本', '京都': '日本', '沖繩': '日本', '北海道': '日本',
        '韓國': '韓國', '首爾': '韓國', '釜山': '韓國', '濟州': '韓國',
        '泰國': '泰國', '曼谷': '泰國', '普吉': '泰國', '清邁': '泰國',
        '越南': '越南', '河內': '越南', '峴港': '越南', '胡志明': '越南',
        '新加坡': '新加坡',
        '馬來西亞': '馬來西亞', '吉隆坡': '馬來西亞',
        '印尼': '印尼', '峇里島': '印尼', '峇里': '印尼',
        '法國': '法國', '巴黎': '法國',
        '義大利': '義大利', '羅馬': '義大利', '威尼斯': '義大利',
        '英國': '英國', '倫敦': '英國',
        '德國': '德國', '柏林': '德國', '慕尼黑': '德國',
        '西班牙': '西班牙', '巴塞隆納': '西班牙', '馬德里': '西班牙',
        '美國': '美國', '紐約': '美國', '洛杉磯': '美國', '舊金山': '美國', '拉斯維加斯': '美國',
        '加拿大': '加拿大', '溫哥華': '加拿大', '多倫多': '加拿大',
        '澳洲': '澳洲', '雪梨': '澳洲', '墨爾本': '澳洲',
        '紐西蘭': '紐西蘭', '奧克蘭': '紐西蘭',
        '埃及': '埃及', '開羅': '埃及',
        '土耳其': '土耳其', '伊斯坦堡': '土耳其',
        '杜拜': '阿聯酋', '阿聯酋': '阿聯酋',
        '希臘': '希臘', '雅典': '希臘', '聖托里尼': '希臘',
        '瑞士': '瑞士',
        '捷克': '捷克', '布拉格': '捷克',
        '荷蘭': '荷蘭', '阿姆斯特丹': '荷蘭'
    };

    for (const [keyword, country] of Object.entries(countryMap)) {
        if (text.includes(keyword)) {
            result.country = country;
            break;
        }
    }

    // 解析天數
    const daysMatch = text.match(/(\d+)\s*[天日]/);
    if (daysMatch) {
        result.days = parseInt(daysMatch[1]);
    }
    // 中文數字
    const chineseDays = { '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    for (const [ch, num] of Object.entries(chineseDays)) {
        if (text.includes(`${ch}天`) || text.includes(`${ch}日`)) {
            result.days = num;
            break;
        }
    }

    // 解析預算
    const budgetMatch = text.match(/(\d+)\s*[萬万]/);
    if (budgetMatch) {
        result.budget = parseInt(budgetMatch[1]) * 10000;
    }
    const budgetMatch2 = text.match(/預算\s*(\d+)/);
    if (budgetMatch2) {
        result.budget = parseInt(budgetMatch2[1]);
        if (result.budget < 1000) result.budget *= 10000;
    }

    // 解析主題/偏好
    const themes = {
        '美食': '美食之旅',
        '購物': '購物血拼',
        '文化': '文化深度',
        '歷史': '歷史古蹟',
        '自然': '自然風景',
        '海邊': '海島度假',
        '海島': '海島度假',
        '親子': '親子同樂',
        '蜜月': '浪漫蜜月',
        '冒險': '冒險刺激',
        '放鬆': '放鬆療癒',
        'SPA': '放鬆療癒',
        '滑雪': '冬季滑雪',
        '賞櫻': '春季賞櫻',
        '賞楓': '秋季賞楓'
    };

    for (const [keyword, theme] of Object.entries(themes)) {
        if (text.includes(keyword)) {
            result.theme = theme;
            result.preferences.push(keyword);
        }
    }

    return result;
}

/**
 * 建立 AI Prompt
 */
function buildPrompt(parsed, userText) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;
    const budget = parsed.budget ? `預算約 ${parsed.budget} 台幣` : '中等預算';
    const theme = parsed.theme || '綜合體驗';

    return `你是一位專業的旅遊規劃師，專門為台灣退休族群規劃出國旅遊行程。

用戶需求：${userText}

請規劃一個 ${country} ${days} 天的旅遊行程。

要求：
1. 考量退休族群體力，行程不要太趕
2. ${budget}
3. 主題偏向：${theme}
4. 包含當地必訪景點和美食
5. 提供實用小提醒

請用以下 JSON 格式回覆（只回覆 JSON，不要其他文字）：
{
    "name": "行程名稱",
    "country": "${country}",
    "days": ${days},
    "estimatedCost": {
        "min": 最低預算數字,
        "max": 最高預算數字
    },
    "highlights": ["亮點1", "亮點2", "亮點3", "亮點4", "亮點5"],
    "itinerary": [
        {
            "day": 1,
            "title": "第一天主題",
            "activities": ["活動1", "活動2", "活動3"]
        }
    ],
    "tips": ["小提醒1", "小提醒2", "小提醒3"],
    "bestSeason": "最佳旅遊季節"
}`;
}

/**
 * 呼叫 OpenAI GPT
 */
async function generateWithOpenAI(prompt) {
    try {
        if (!OPENAI_API_KEY) {
            logger.warn('OpenAI API key not configured');
            return null;
        }

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是專業的旅遊規劃師，專門服務台灣退休族群。請用繁體中文回覆。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const content = response.data.choices[0]?.message?.content;
        if (!content) return null;

        // 解析 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const tour = JSON.parse(jsonMatch[0]);
            tour.source = 'OpenAI GPT';
            tour.id = 'gpt-' + Date.now();
            return tour;
        }

        return null;

    } catch (error) {
        logger.error('OpenAI API error:', error.message);
        return null;
    }
}

/**
 * 呼叫 Google Gemini
 */
async function generateWithGemini(prompt) {
    try {
        if (!GEMINI_API_KEY) {
            logger.warn('Gemini API key not configured');
            return null;
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) return null;

        // 解析 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const tour = JSON.parse(jsonMatch[0]);
            tour.source = 'Google Gemini';
            tour.id = 'gemini-' + Date.now();
            return tour;
        }

        return null;

    } catch (error) {
        logger.error('Gemini API error:', error.message);
        return null;
    }
}

/**
 * 雙 AI 生成行程
 */
async function generateTourWithDualAI(userText) {
    const parsed = parseUserInput(userText);
    const prompt = buildPrompt(parsed, userText);

    logger.info('Generating tour with dual AI:', { parsed, userText });

    // 同時呼叫兩個 AI
    const [gptResult, geminiResult] = await Promise.all([
        generateWithOpenAI(prompt),
        generateWithGemini(prompt)
    ]);

    const results = [];
    if (gptResult) results.push(gptResult);
    if (geminiResult) results.push(geminiResult);

    // 如果都失敗，返回預設行程
    if (results.length === 0) {
        return [{
            id: 'default-' + Date.now(),
            name: `${parsed.country || '日本'}${parsed.days || 5}日精選遊`,
            country: parsed.country || '日本',
            days: parsed.days || 5,
            source: '系統推薦',
            estimatedCost: { min: 30000, max: 50000 },
            highlights: ['經典景點', '道地美食', '文化體驗', '購物血拼', '放鬆療癒'],
            itinerary: [
                { day: 1, title: '抵達目的地', activities: ['機場接機', '飯店休息', '周邊探索'] },
                { day: 2, title: '經典景點', activities: ['熱門景點', '當地美食', '文化體驗'] },
                { day: 3, title: '深度探索', activities: ['在地生活', '特色市場', '傳統工藝'] },
                { day: 4, title: '自由活動', activities: ['購物', '美食', '休閒'] },
                { day: 5, title: '返程', activities: ['整理行李', '機場送機'] }
            ].slice(0, parsed.days || 5),
            tips: ['記得帶護照', '換好當地貨幣', '下載離線地圖'],
            bestSeason: '全年皆宜'
        }];
    }

    return results;
}

/**
 * 單一 AI 生成（快速版）
 */
async function generateTourQuick(userText) {
    const parsed = parseUserInput(userText);
    const prompt = buildPrompt(parsed, userText);

    // 優先用 Gemini（較快）
    let result = await generateWithGemini(prompt);
    if (!result) {
        result = await generateWithOpenAI(prompt);
    }

    return result;
}

module.exports = {
    parseUserInput,
    generateTourWithDualAI,
    generateTourQuick,
    generateWithOpenAI,
    generateWithGemini
};