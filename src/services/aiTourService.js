/**
 * ============================================
 * AI 行程生成服務（修正版）
 * ============================================
 */

const axios = require('axios');
const logger = require('../utils/logger');

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
 * 建立 Prompt（改進版，要求真實內容）
 */
function buildPrompt(parsed, userText) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;

    return `你是專業旅遊規劃師，專門服務台灣退休族群。

請為以下需求規劃詳細行程：
目的地：${country}
天數：${days} 天
用戶需求：${userText}

要求：
1. 行程要輕鬆，適合60歲以上長輩
2. 每天安排2-3個真實景點（用真實地名）
3. 包含當地必吃美食推薦
4. 預算以台幣計算

請回覆 JSON 格式（只要JSON，不要其他文字，注意不要有多餘逗號）：
{
  "name": "有創意的行程名稱",
  "country": "${country}",
  "days": ${days},
  "estimatedCost": {"min": 預算下限, "max": 預算上限},
  "highlights": ["真實景點1", "真實景點2", "真實景點3", "真實景點4", "真實景點5"],
  "itinerary": [
    {"day": 1, "title": "主題標題", "activities": ["具體活動含地點", "具體活動含地點", "具體活動含地點"]}
  ],
  "tips": ["實用建議1", "實用建議2", "實用建議3"],
  "bestSeason": "最佳旅遊月份"
}`;
}

/**
 * 安全解析 JSON（處理多餘逗號）
 */
function safeParseJSON(content, source) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            let jsonStr = jsonMatch[0];
            // 移除多餘的逗號（常見 AI 錯誤）
            jsonStr = jsonStr.replace(/,\s*]/g, ']');
            jsonStr = jsonStr.replace(/,\s*}/g, '}');
            
            const tour = JSON.parse(jsonStr);
            tour.source = source;
            tour.id = source.toLowerCase() + '-' + Date.now();
            return tour;
        }
    } catch (e) {
        logger.error('JSON parse error (' + source + '): ' + e.message);
    }
    return null;
}

/**
 * OpenAI GPT
 */
async function generateWithOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.warn('OpenAI: No API key');
        return null;
    }

    try {
        logger.info('Calling OpenAI GPT-3.5...');
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是專業旅遊規劃師，請用繁體中文回覆，提供真實詳細的旅遊資訊。回覆純JSON格式，不要markdown。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        const content = response.data.choices?.[0]?.message?.content;
        logger.info('OpenAI OK');
        return content ? safeParseJSON(content, 'ChatGPT') : null;
    } catch (error) {
        logger.error('OpenAI error: ' + error.message);
        return null;
    }
}

/**
 * Google Gemini 2.0 Flash
 */
async function generateWithGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.warn('Gemini: No API key');
        return null;
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    try {
        logger.info('Calling Gemini 2.0 Flash...');
        const response = await axios.post(url, {
            contents: [{ 
                role: 'user',
                parts: [{ text: prompt }] 
            }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 2000
            }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        logger.info('Gemini status: ' + response.status);
        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
            logger.info('Gemini OK');
            return safeParseJSON(content, 'Gemini');
        }
        logger.error('Gemini: No content');
        return null;
    } catch (error) {
        logger.error('Gemini error: ' + error.message);
        if (error.response) {
            logger.error('Gemini status: ' + error.response.status);
            logger.error('Gemini data: ' + JSON.stringify(error.response.data));
        }
        return null;
    }
}

/**
 * 預設行程（真實內容）
 */
function buildDefaultTour(parsed) {
    const country = parsed.country || '日本';
    const days = parsed.days || 5;
    
    const defaultTours = {
        '日本': {
            name: '東京經典' + days + '日遊',
            highlights: ['淺草寺雷門', '東京晴空塔', '新宿歌舞伎町', '原宿竹下通', '築地市場'],
            itinerary: [
                { day: 1, title: '抵達東京', activities: ['成田機場抵達', '酒店check-in', '新宿逛街購物'] },
                { day: 2, title: '淺草文化日', activities: ['淺草寺參拜', '仲見世商店街', '晴空塔觀景'] },
                { day: 3, title: '原宿潮流日', activities: ['明治神宮', '竹下通逛街', '表參道咖啡廳'] },
                { day: 4, title: '築地美食日', activities: ['築地市場早餐', '銀座購物', '東京鐵塔夜景'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場免稅店', '搭機返台'] }
            ],
            tips: ['買Suica卡搭車方便', '記得帶舒適步行鞋', '便利商店ATM可領日幣'],
            cost: { min: 35000, max: 55000 }
        },
        '韓國': {
            name: '首爾精彩' + days + '日遊',
            highlights: ['景福宮', '北村韓屋村', '明洞購物街', 'N首爾塔', '東大門'],
            itinerary: [
                { day: 1, title: '抵達首爾', activities: ['仁川機場抵達', '明洞逛街', '韓式烤肉晚餐'] },
                { day: 2, title: '古宮巡禮', activities: ['景福宮穿韓服', '北村韓屋村', '三清洞咖啡廳'] },
                { day: 3, title: '購物天堂', activities: ['東大門批發', '弘大商圈', '汗蒸幕體驗'] },
                { day: 4, title: '浪漫首爾', activities: ['梨花女大', 'N首爾塔', '清溪川夜景'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場免稅店', '搭機返台'] }
            ],
            tips: ['T-money卡搭車方便', '明洞換錢所匯率好', '記得帶轉接頭'],
            cost: { min: 25000, max: 40000 }
        },
        '泰國': {
            name: '曼谷悠閒' + days + '日遊',
            highlights: ['大皇宮', '臥佛寺', '洽圖洽市集', '考山路', '河濱夜市'],
            itinerary: [
                { day: 1, title: '抵達曼谷', activities: ['素萬那普機場', '考山路', '泰式按摩'] },
                { day: 2, title: '皇宮巡禮', activities: ['大皇宮參觀', '臥佛寺', '湄南河遊船'] },
                { day: 3, title: '市集血拼', activities: ['洽圖洽週末市集', '暹羅百麗宮', '河濱夜市'] },
                { day: 4, title: '悠閒SPA日', activities: ['高級SPA體驗', '下午茶', '天台酒吧夜景'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場購物', '搭機返台'] }
            ],
            tips: ['進寺廟要穿長褲', '記得殺價', '小費文化要注意'],
            cost: { min: 20000, max: 35000 }
        }
    };

    const tourData = defaultTours[country] || defaultTours['日本'];
    
    return {
        id: 'default-' + Date.now(),
        name: tourData.name,
        country: country,
        days: days,
        source: '系統推薦',
        estimatedCost: tourData.cost,
        highlights: tourData.highlights,
        itinerary: tourData.itinerary.slice(0, days),
        tips: tourData.tips,
        bestSeason: '全年皆宜'
    };
}

/**
 * 雙 AI 生成
 */
async function generateTourWithDualAI(userText) {
    const parsed = parseUserInput(userText);
    const prompt = buildPrompt(parsed, userText);

    logger.info('=== Generate Tour ===');
    logger.info('Country: ' + parsed.country + ', Days: ' + parsed.days);

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