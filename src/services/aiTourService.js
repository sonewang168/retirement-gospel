/**
 * AI 行程生成服務（擴充版）
 */
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * 解析用戶輸入
 */
function parseUserInput(text) {
    var result = { country: null, days: null };

    var countryMap = {
        // 東北亞
        '日本': '日本', '東京': '日本', '大阪': '日本', '京都': '日本', '沖繩': '日本', '北海道': '日本', '福岡': '日本', '名古屋': '日本', '橫濱': '日本', '神戶': '日本', '奈良': '日本', '廣島': '日本', '札幌': '日本', '長崎': '日本', '金澤': '日本', '輕井澤': '日本', '箱根': '日本', '富士山': '日本',
        '韓國': '韓國', '首爾': '韓國', '釜山': '韓國', '濟州': '韓國', '仁川': '韓國', '大邱': '韓國', '慶州': '韓國',
        
        // 東南亞
        '泰國': '泰國', '曼谷': '泰國', '普吉': '泰國', '清邁': '泰國', '芭達雅': '泰國', '蘇美島': '泰國', '華欣': '泰國',
        '越南': '越南', '河內': '越南', '胡志明': '越南', '峴港': '越南', '下龍灣': '越南', '會安': '越南', '芽莊': '越南',
        '新加坡': '新加坡', '獅城': '新加坡',
        '馬來西亞': '馬來西亞', '吉隆坡': '馬來西亞', '檳城': '馬來西亞', '蘭卡威': '馬來西亞', '沙巴': '馬來西亞', '馬六甲': '馬來西亞',
        '印尼': '印尼', '峇里島': '印尼', '峇里': '印尼', '雅加達': '印尼', '日惹': '印尼', '龍目島': '印尼',
        '菲律賓': '菲律賓', '長灘島': '菲律賓', '宿霧': '菲律賓', '馬尼拉': '菲律賓', '巴拉望': '菲律賓', '薄荷島': '菲律賓',
        '柬埔寨': '柬埔寨', '吳哥窟': '柬埔寨', '金邊': '柬埔寨', '暹粒': '柬埔寨',
        '寮國': '寮國', '永珍': '寮國', '龍坡邦': '寮國',
        '緬甸': '緬甸', '仰光': '緬甸', '蒲甘': '緬甸', '曼德勒': '緬甸',
        
        // 港澳中國
        '香港': '香港', '澳門': '澳門',
        '中國': '中國', '上海': '中國', '北京': '中國', '廣州': '中國', '深圳': '中國', '杭州': '中國', '成都': '中國', '西安': '中國', '桂林': '中國', '張家界': '中國', '九寨溝': '中國', '麗江': '中國', '廈門': '中國', '蘇州': '中國', '南京': '中國', '重慶': '中國', '青島': '中國', '哈爾濱': '中國', '西藏': '中國', '拉薩': '中國', '新疆': '中國',
        
        // 歐洲
        '法國': '法國', '巴黎': '法國', '普羅旺斯': '法國', '尼斯': '法國', '里昂': '法國',
        '義大利': '義大利', '羅馬': '義大利', '米蘭': '義大利', '威尼斯': '義大利', '佛羅倫斯': '義大利', '拿坡里': '義大利', '托斯卡尼': '義大利',
        '英國': '英國', '倫敦': '英國', '愛丁堡': '英國', '曼徹斯特': '英國', '牛津': '英國', '劍橋': '英國',
        '德國': '德國', '柏林': '德國', '慕尼黑': '德國', '法蘭克福': '德國', '海德堡': '德國', '新天鵝堡': '德國',
        '西班牙': '西班牙', '巴塞隆納': '西班牙', '馬德里': '西班牙', '塞維亞': '西班牙', '格拉納達': '西班牙',
        '瑞士': '瑞士', '蘇黎世': '瑞士', '日內瓦': '瑞士', '少女峰': '瑞士', '琉森': '瑞士', '因特拉肯': '瑞士',
        '荷蘭': '荷蘭', '阿姆斯特丹': '荷蘭', '鹿特丹': '荷蘭',
        '奧地利': '奧地利', '維也納': '奧地利', '薩爾茲堡': '奧地利', '哈修塔特': '奧地利',
        '捷克': '捷克', '布拉格': '捷克', 'CK小鎮': '捷克',
        '希臘': '希臘', '雅典': '希臘', '聖托里尼': '希臘', '米克諾斯': '希臘',
        '土耳其': '土耳其', '伊斯坦堡': '土耳其', '卡帕多奇亞': '土耳其', '棉堡': '土耳其',
        '葡萄牙': '葡萄牙', '里斯本': '葡萄牙', '波多': '葡萄牙',
        '比利時': '比利時', '布魯塞爾': '比利時', '布魯日': '比利時',
        '北歐': '北歐', '丹麥': '丹麥', '哥本哈根': '丹麥', '瑞典': '瑞典', '斯德哥爾摩': '瑞典', '挪威': '挪威', '奧斯陸': '挪威', '峽灣': '挪威', '芬蘭': '芬蘭', '赫爾辛基': '芬蘭', '冰島': '冰島', '雷克雅維克': '冰島',
        '克羅埃西亞': '克羅埃西亞', '杜布羅夫尼克': '克羅埃西亞',
        '匈牙利': '匈牙利', '布達佩斯': '匈牙利',
        '波蘭': '波蘭', '華沙': '波蘭', '克拉科夫': '波蘭',
        
        // 美洲
        '美國': '美國', '紐約': '美國', '洛杉磯': '美國', '舊金山': '美國', '拉斯維加斯': '美國', '夏威夷': '美國', '關島': '美國', '西雅圖': '美國', '芝加哥': '美國', '邁阿密': '美國', '波士頓': '美國', '華盛頓': '美國', '奧蘭多': '美國', '聖地牙哥': '美國', '黃石公園': '美國', '大峽谷': '美國', '阿拉斯加': '美國',
        '加拿大': '加拿大', '溫哥華': '加拿大', '多倫多': '加拿大', '蒙特婁': '加拿大', '魁北克': '加拿大', '班夫': '加拿大', '洛磯山脈': '加拿大',
        '墨西哥': '墨西哥', '坎昆': '墨西哥', '墨西哥城': '墨西哥',
        '古巴': '古巴', '哈瓦那': '古巴',
        '秘魯': '秘魯', '馬丘比丘': '秘魯', '利馬': '秘魯',
        '巴西': '巴西', '里約': '巴西', '聖保羅': '巴西',
        '阿根廷': '阿根廷', '布宜諾斯艾利斯': '阿根廷',
        '智利': '智利', '聖地牙哥': '智利', '復活節島': '智利',
        
        // 大洋洲
        '澳洲': '澳洲', '雪梨': '澳洲', '墨爾本': '澳洲', '黃金海岸': '澳洲', '凱恩斯': '澳洲', '大堡礁': '澳洲', '伯斯': '澳洲', '塔斯馬尼亞': '澳洲',
        '紐西蘭': '紐西蘭', '奧克蘭': '紐西蘭', '皇后鎮': '紐西蘭', '基督城': '紐西蘭', '羅托魯瓦': '紐西蘭', '米佛峽灣': '紐西蘭',
        '斐濟': '斐濟', '大溪地': '大溪地', '帛琉': '帛琉', '關島': '關島', '塞班島': '塞班島',
        
        // 中東非洲
        '埃及': '埃及', '開羅': '埃及', '金字塔': '埃及', '尼羅河': '埃及',
        '杜拜': '杜拜', '阿聯酋': '杜拜', '阿布達比': '杜拜',
        '以色列': '以色列', '耶路撒冷': '以色列', '特拉維夫': '以色列',
        '約旦': '約旦', '佩特拉': '約旦', '死海': '約旦',
        '摩洛哥': '摩洛哥', '馬拉喀什': '摩洛哥', '卡薩布蘭卡': '摩洛哥',
        '南非': '南非', '開普敦': '南非', '約翰尼斯堡': '南非',
        '肯亞': '肯亞', '乞力馬扎羅': '肯亞', '馬賽馬拉': '肯亞',
        '坦尚尼亞': '坦尚尼亞', '乞力馬札羅山': '坦尚尼亞', '乞力馬札羅': '坦尚尼亞',
        
        // 南亞
        '印度': '印度', '德里': '印度', '孟買': '印度', '泰姬瑪哈陵': '印度', '齋浦爾': '印度',
        '尼泊爾': '尼泊爾', '加德滿都': '尼泊爾', '聖母峰': '尼泊爾',
        '斯里蘭卡': '斯里蘭卡', '可倫坡': '斯里蘭卡',
        '馬爾地夫': '馬爾地夫', '不丹': '不丹'
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
        '要求：\n' +
        '1. 行程輕鬆適合60歲以上長輩\n' +
        '2. 每天2-3個真實景點（用真實地名）\n' +
        '3. 包含當地必吃美食\n' +
        '4. 預算用台幣計算\n\n' +
        '請只回覆以下 JSON 格式（不要加任何說明文字，不要多餘逗號）：\n' +
        '{"name":"行程名稱","country":"' + country + '","days":' + days + ',"estimatedCost":{"min":30000,"max":50000},"highlights":["景點1","景點2","景點3","景點4","景點5"],"itinerary":[{"day":1,"title":"第一天標題","activities":["活動1","活動2","活動3"]},{"day":2,"title":"第二天標題","activities":["活動1","活動2","活動3"]}],"tips":["提醒1","提醒2","提醒3"],"bestSeason":"最佳季節"}';
}

/**
 * 安全 JSON 解析
 */
function safeParseJSON(content, source) {
    try {
        var jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            logger.error(source + ': No JSON found');
            return null;
        }

        var jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*]/g, ']');
        jsonStr = jsonStr.replace(/,\s*}/g, '}');
        jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ');

        var tour = JSON.parse(jsonStr);
        tour.source = source;
        tour.id = source.toLowerCase().replace(/\s/g, '') + '-' + Date.now();
        return tour;

    } catch (e) {
        logger.error('JSON parse error (' + source + '): ' + e.message);
        
        try {
            var nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
            var countryMatch = content.match(/"country"\s*:\s*"([^"]+)"/);
            var daysMatch = content.match(/"days"\s*:\s*(\d+)/);
            
            if (nameMatch && countryMatch) {
                return {
                    id: source.toLowerCase().replace(/\s/g, '') + '-' + Date.now(),
                    source: source,
                    name: nameMatch[1],
                    country: countryMatch[1],
                    days: daysMatch ? parseInt(daysMatch[1]) : 5,
                    estimatedCost: { min: 30000, max: 50000 },
                    highlights: ['精彩景點', '道地美食', '文化體驗', '輕鬆行程', '難忘回憶'],
                    itinerary: [
                        { day: 1, title: '抵達', activities: ['機場接機', '飯店休息', '周邊探索'] },
                        { day: 2, title: '觀光', activities: ['熱門景點', '當地美食', '市區漫步'] },
                        { day: 3, title: '體驗', activities: ['文化體驗', '購物', '返程'] }
                    ],
                    tips: ['記得帶護照', '準備舒適鞋', '帶常用藥品'],
                    bestSeason: '全年皆宜'
                };
            }
        } catch (e2) {
            logger.error(source + ': Fallback parse failed');
        }
        
        return null;
    }
}

/**
 * OpenAI GPT
 */
async function generateWithOpenAI(prompt) {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

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
                headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );
        var content = response.data.choices?.[0]?.message?.content;
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
    if (!apiKey) return null;

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    try {
        logger.info('Calling Gemini 2.0 Flash...');
        var response = await axios.post(url, {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
        
        logger.info('Gemini status: ' + response.status);
        var content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
            logger.info('Gemini OK');
            return safeParseJSON(content, 'Gemini');
        }
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
    
    return {
        id: 'default-' + Date.now(),
        name: country + '精彩' + days + '日遊',
        country: country,
        days: days,
        source: '系統推薦',
        estimatedCost: { min: 30000, max: 50000 },
        highlights: ['熱門景點', '道地美食', '文化體驗', '輕鬆行程', '難忘回憶'],
        itinerary: [
            { day: 1, title: '抵達' + country, activities: ['機場抵達', '飯店check-in', '周邊探索'] },
            { day: 2, title: '經典觀光', activities: ['著名景點', '當地美食', '市區漫步'] },
            { day: 3, title: '深度體驗', activities: ['文化體驗', '特色購物', '悠閒午茶'] }
        ],
        tips: ['記得帶護照', '準備舒適鞋', '帶常用藥品'],
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

    var tours = [];
    if (results[0]) tours.push(results[0]);
    if (results[1]) tours.push(results[1]);

    logger.info('Results: GPT=' + !!results[0] + ', Gemini=' + !!results[1]);

    if (tours.length === 0) {
        tours.push(buildDefaultTour(parsed));
    }

    return tours;
}

module.exports = {
    parseUserInput: parseUserInput,
    generateTourWithDualAI: generateTourWithDualAI
};