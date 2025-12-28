/**
 * ============================================
 * AI 行程生成服務（加強版）
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
        '日本': '日本', '東京': '日本', '大阪': '日本', '京都': '日本', '沖繩': '日本', '北海道': '日本', '福岡': '日本', '名古屋': '日本', '橫濱': '日本', '神戶': '日本', '奈良': '日本', '廣島': '日本',
        '韓國': '韓國', '首爾': '韓國', '釜山': '韓國', '濟州': '韓國', '仁川': '韓國',
        '泰國': '泰國', '曼谷': '泰國', '普吉': '泰國', '清邁': '泰國', '芭達雅': '泰國',
        '越南': '越南', '河內': '越南', '胡志明': '越南', '峴港': '越南',
        '新加坡': '新加坡',
        '馬來西亞': '馬來西亞', '吉隆坡': '馬來西亞',
        '印尼': '印尼', '峇里島': '印尼', '峇里': '印尼', '雅加達': '印尼',
        '菲律賓': '菲律賓', '長灘島': '菲律賓', '宿霧': '菲律賓',
        '柬埔寨': '柬埔寨', '吳哥窟': '柬埔寨',
        '香港': '香港', '澳門': '澳門',
        '中國': '中國', '上海': '中國', '北京': '中國', '廣州': '中國', '深圳': '中國', '杭州': '中國', '成都': '中國', '西安': '中國', '桂林': '中國', '張家界': '中國',
        '法國': '法國', '巴黎': '法國',
        '義大利': '義大利', '羅馬': '義大利', '米蘭': '義大利', '威尼斯': '義大利', '佛羅倫斯': '義大利',
        '英國': '英國', '倫敦': '英國',
        '德國': '德國', '柏林': '德國', '慕尼黑': '德國',
        '西班牙': '西班牙', '巴塞隆納': '西班牙', '馬德里': '西班牙',
        '瑞士': '瑞士',
        '荷蘭': '荷蘭', '阿姆斯特丹': '荷蘭',
        '奧地利': '奧地利', '維也納': '奧地利',
        '捷克': '捷克', '布拉格': '捷克',
        '希臘': '希臘', '雅典': '希臘', '聖托里尼': '希臘',
        '土耳其': '土耳其', '伊斯坦堡': '土耳其',
        '美國': '美國', '紐約': '美國', '洛杉磯': '美國', '舊金山': '美國', '拉斯維加斯': '美國', '夏威夷': '美國', '關島': '美國',
        '加拿大': '加拿大', '溫哥華': '加拿大', '多倫多': '加拿大',
        '澳洲': '澳洲', '雪梨': '澳洲', '墨爾本': '澳洲',
        '紐西蘭': '紐西蘭', '奧克蘭': '紐西蘭',
        '埃及': '埃及',
        '杜拜': '杜拜', '阿聯酋': '杜拜',
        '馬爾地夫': '馬爾地夫'
    };

    for (var key in countryMap) {
        if (text.includes(key)) {
            result.country = countryMap[key];
            break;
        }
    }

    var daysMatch = text.match(/(\d+)\s*[天日]/);
    if (daysMatch) {
        result.days = parseInt(daysMatch[1]);
    }

    return result;
}

/**
 * 建立 Prompt
 */
function buildPrompt(parsed, userText) {
    var country = parsed.country || '日本';
    var days = parsed.days || 5;

    return '你是專業旅遊規劃師。請為台灣退休族群規劃 ' + country + ' ' + days + ' 天旅遊行程。\n\n' +
        '用戶需求：' + userText + '\n\n' +
        '要求：行程輕鬆適合長輩，包含真實景點名稱。\n\n' +
        '請只回覆以下 JSON 格式（不要加任何說明文字）：\n' +
        '{"name":"行程名稱","country":"' + country + '","days":' + days + ',"estimatedCost":{"min":30000,"max":50000},"highlights":["景點1","景點2","景點3","景點4","景點5"],"itinerary":[{"day":1,"title":"第一天標題","activities":["活動1","活動2","活動3"]},{"day":2,"title":"第二天標題","activities":["活動1","活動2","活動3"]}],"tips":["提醒1","提醒2","提醒3"],"bestSeason":"最佳季節"}';
}

/**
 * 超強 JSON 解析（處理各種錯誤）
 */
function safeParseJSON(content, source) {
    try {
        // 找出 JSON 部分
        var jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            logger.error(source + ': No JSON found');
            return null;
        }

        var jsonStr = jsonMatch[0];

        // 修復常見錯誤
        // 1. 移除多餘逗號
        jsonStr = jsonStr.replace(/,\s*]/g, ']');
        jsonStr = jsonStr.replace(/,\s*}/g, '}');
        
        // 2. 修復缺少逗號（在 ] 或 } 後面接 " 時）
        jsonStr = jsonStr.replace(/](\s*)"/, '],$1"');
        jsonStr = jsonStr.replace(/}(\s*)"/, '},$1"');
        
        // 3. 移除換行和多餘空白
        jsonStr = jsonStr.replace(/\n/g, ' ');
        jsonStr = jsonStr.replace(/\r/g, ' ');
        jsonStr = jsonStr.replace(/\t/g, ' ');
        
        // 4. 修復數字後面直接接引號
        jsonStr = jsonStr.replace(/(\d)(\s*)"/, '$1,$2"');

        // 嘗試解析
        var tour = JSON.parse(jsonStr);
        tour.source = source;
        tour.id = source.toLowerCase().replace(/\s/g, '') + '-' + Date.now();
        return tour;

    } catch (e) {
        logger.error('JSON parse error (' + source + '): ' + e.message);
        
        // 最後嘗試：手動建構
        try {
            var nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
            var countryMatch = content.match(/"country"\s*:\s*"([^"]+)"/);
            var daysMatch = content.match(/"days"\s*:\s*(\d+)/);
            
            if (nameMatch && countryMatch) {
                logger.info(source + ': Using fallback parse');
                return {
                    id: source.toLowerCase().replace(/\s/g, '') + '-' + Date.now(),
                    source: source,
                    name: nameMatch[1],
                    country: countryMatch[1],
                    days: daysMatch ? parseInt(daysMatch[1]) : 5,
                    estimatedCost: { min: 30000, max: 50000 },
                    highlights: extractArray(content, 'highlights'),
                    itinerary: extractItinerary(content),
                    tips: extractArray(content, 'tips'),
                    bestSeason: '全年皆宜'
                };
            }
        } catch (e2) {
            logger.error(source + ': Fallback parse also failed');
        }
        
        return null;
    }
}

/**
 * 提取陣列
 */
function extractArray(content, fieldName) {
    var regex = new RegExp('"' + fieldName + '"\\s*:\\s*\\[([^\\]]+)\\]');
    var match = content.match(regex);
    if (match) {
        var items = match[1].match(/"([^"]+)"/g);
        if (items) {
            return items.map(function(item) {
                return item.replace(/"/g, '');
            });
        }
    }
    return ['精彩景點', '道地美食', '文化體驗'];
}

/**
 * 提取行程
 */
function extractItinerary(content) {
    var result = [];
    var dayRegex = /"day"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"/g;
    var match;
    while ((match = dayRegex.exec(content)) !== null) {
        result.push({
            day: parseInt(match[1]),
            title: match[2],
            activities: ['觀光', '美食', '購物']
        });
    }
    if (result.length === 0) {
        result = [
            { day: 1, title: '抵達', activities: ['機場', '飯店', '探索'] },
            { day: 2, title: '觀光', activities: ['景點', '美食', '購物'] },
            { day: 3, title: '體驗', activities: ['文化', '市場', '休閒'] }
        ];
    }
    return result;
}

/**
 * OpenAI GPT
 */
async function generateWithOpenAI(prompt) {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.warn('OpenAI: No API key');
        return null;
    }

    try {
        logger.info('Calling OpenAI...');
        var response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是旅遊規劃師。只回覆JSON格式，不要任何其他文字。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
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
        var content = response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content;
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
    var apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.warn('Gemini: No API key');
        return null;
    }

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    try {
        logger.info('Calling Gemini 2.0 Flash...');
        var response = await axios.post(url, {
            contents: [{ 
                role: 'user',
                parts: [{ text: prompt }] 
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000
            }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        logger.info('Gemini status: ' + response.status);
        var content = response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0] && response.data.candidates[0].content.parts[0].text;
        
        if (content) {
            logger.info('Gemini OK');
            return safeParseJSON(content, 'Gemini');
        }
        logger.error('Gemini: No content');
        return null;
    } catch (error) {
        logger.error('Gemini error: ' + error.message);
        return null;
    }
}

/**
 * 預設行程
 */
function buildDefaultTour(parsed) {
    var country = parsed.country || '日本';
    var days = parsed.days || 5;
    
    var defaultTours = {
        '日本': {
            name: '東京經典' + days + '日遊',
            highlights: ['淺草寺雷門', '東京晴空塔', '新宿歌舞伎町', '原宿竹下通', '築地市場'],
            itinerary: [
                { day: 1, title: '抵達東京', activities: ['成田機場', '新宿check-in', '逛街購物'] },
                { day: 2, title: '淺草文化', activities: ['淺草寺', '仲見世商店街', '晴空塔'] },
                { day: 3, title: '原宿潮流', activities: ['明治神宮', '竹下通', '表參道'] },
                { day: 4, title: '築地美食', activities: ['築地市場', '銀座', '東京鐵塔'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場免稅店', '返台'] }
            ],
            tips: ['買Suica卡', '帶舒適鞋', '便利商店ATM領日幣'],
            cost: { min: 35000, max: 55000 }
        },
        '韓國': {
            name: '首爾精彩' + days + '日遊',
            highlights: ['景福宮', '北村韓屋村', '明洞', 'N首爾塔', '東大門'],
            itinerary: [
                { day: 1, title: '抵達首爾', activities: ['仁川機場', '明洞逛街', '烤肉晚餐'] },
                { day: 2, title: '古宮巡禮', activities: ['景福宮穿韓服', '北村韓屋村', '三清洞'] },
                { day: 3, title: '購物天堂', activities: ['東大門', '弘大商圈', '汗蒸幕'] },
                { day: 4, title: '浪漫首爾', activities: ['梨花女大', 'N首爾塔', '清溪川'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場免稅店', '返台'] }
            ],
            tips: ['T-money卡', '明洞換錢所匯率好', '帶轉接頭'],
            cost: { min: 25000, max: 40000 }
        },
        '泰國': {
            name: '曼谷悠閒' + days + '日遊',
            highlights: ['大皇宮', '臥佛寺', '洽圖洽市集', '考山路', '河濱夜市'],
            itinerary: [
                { day: 1, title: '抵達曼谷', activities: ['素萬那普機場', '考山路', '按摩'] },
                { day: 2, title: '皇宮巡禮', activities: ['大皇宮', '臥佛寺', '湄南河遊船'] },
                { day: 3, title: '市集血拼', activities: ['洽圖洽市集', '暹羅百麗宮', '夜市'] },
                { day: 4, title: '悠閒SPA', activities: ['高級SPA', '下午茶', '天台酒吧'] },
                { day: 5, title: '返程', activities: ['酒店退房', '機場購物', '返台'] }
            ],
            tips: ['進寺廟穿長褲', '記得殺價', '注意小費'],
            cost: { min: 20000, max: 35000 }
        }
    };

    var tourData = defaultTours[country] || defaultTours['日本'];
    
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
    var parsed = parseUserInput(userText);
    var prompt = buildPrompt(parsed, userText);

    logger.info('=== Generate Tour ===');
    logger.info('Country: ' + parsed.country + ', Days: ' + parsed.days);

    var results = await Promise.all([
        generateWithOpenAI(prompt),
        generateWithGemini(prompt)
    ]);

    var gptResult = results[0];
    var geminiResult = results[1];

    var tours = [];
    if (gptResult) tours.push(gptResult);
    if (geminiResult) tours.push(geminiResult);

    logger.info('Results: GPT=' + !!gptResult + ', Gemini=' + !!geminiResult);

    if (tours.length === 0) {
        tours.push(buildDefaultTour(parsed));
    }

    return tours;
}

module.exports = {
    parseUserInput: parseUserInput,
    generateTourWithDualAI: generateTourWithDualAI,
    generateWithOpenAI: generateWithOpenAI,
    generateWithGemini: generateWithGemini
};