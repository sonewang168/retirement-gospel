/**
 * AI 行程規劃服務（雙AI + Gemini 2.0 Flash）
 */
const axios = require('axios');
const logger = require('../utils/logger');
const { TourPlan } = require('../models');

class AITourService {
    constructor() {
        this.openaiKey = process.env.OPENAI_API_KEY;
        this.geminiKey = process.env.GEMINI_API_KEY;
    }

    parseTravelRequest(text) {
        var domesticCities = ['台北', '新北', '桃園', '台中', '台南', '高雄', '基隆', '新竹', '嘉義', '宜蘭', '花蓮', '台東', '屏東', '南投', '彰化', '雲林', '苗栗', '澎湖', '金門', '馬祖', '墾丁', '日月潭', '阿里山', '清境', '太魯閣', '九份', '淡水', '礁溪', '鹿港', '安平', '旗津'];
        
        var daysMatch = text.match(/(\d+)\s*(天|日|days?)/i);
        var days = daysMatch ? parseInt(daysMatch[1]) : null;
        
        var isDomestic = false;
        var destination = null;
        
        for (var i = 0; i < domesticCities.length; i++) {
            if (text.includes(domesticCities[i])) {
                isDomestic = true;
                destination = domesticCities[i];
                break;
            }
        }
        
        var destinations = [
            { pattern: /日本|東京|大阪|京都|北海道|沖繩|福岡|名古屋|奈良|神戶|箱根/i, name: '日本' },
            { pattern: /韓國|首爾|釜山|濟州/i, name: '韓國' },
            { pattern: /泰國|曼谷|清邁|普吉|芭達雅/i, name: '泰國' },
            { pattern: /越南|河內|胡志明|峴港|下龍灣/i, name: '越南' },
            { pattern: /新加坡/i, name: '新加坡' },
            { pattern: /馬來西亞|吉隆坡|檳城|沙巴/i, name: '馬來西亞' },
            { pattern: /香港/i, name: '香港' },
            { pattern: /澳門/i, name: '澳門' },
            { pattern: /中國|上海|北京|廣州|深圳|杭州|成都|西安|桂林|張家界/i, name: '中國' },
            { pattern: /美國|紐約|洛杉磯|舊金山|拉斯維加斯|夏威夷|西雅圖/i, name: '美國' },
            { pattern: /加拿大|溫哥華|多倫多/i, name: '加拿大' },
            { pattern: /英國|倫敦/i, name: '英國' },
            { pattern: /法國|巴黎|普羅旺斯/i, name: '法國' },
            { pattern: /義大利|羅馬|米蘭|威尼斯|佛羅倫斯/i, name: '義大利' },
            { pattern: /西班牙|巴塞隆納|馬德里/i, name: '西班牙' },
            { pattern: /德國|柏林|慕尼黑/i, name: '德國' },
            { pattern: /荷蘭|阿姆斯特丹/i, name: '荷蘭' },
            { pattern: /瑞士/i, name: '瑞士' },
            { pattern: /奧地利|維也納/i, name: '奧地利' },
            { pattern: /捷克|布拉格/i, name: '捷克' },
            { pattern: /土耳其|伊斯坦堡/i, name: '土耳其' },
            { pattern: /澳洲|雪梨|墨爾本/i, name: '澳洲' },
            { pattern: /紐西蘭/i, name: '紐西蘭' },
            { pattern: /歐洲/i, name: '歐洲' }
        ];

        if (!isDomestic) {
            for (var j = 0; j < destinations.length; j++) {
                if (destinations[j].pattern.test(text)) {
                    destination = destinations[j].name;
                    break;
                }
            }
        }

        if (destination && days) {
            return { destination: destination, days: days, isDomestic: isDomestic };
        }
        return null;
    }

    buildPrompt(destination, days, isDomestic, provider) {
        var basePrompt = isDomestic
            ? '請為退休族規劃一個台灣「' + destination + '」' + days + '天的輕鬆旅遊行程。'
            : '請為退休族規劃一個「' + destination + '」' + days + '天的輕鬆旅遊行程。';

        return basePrompt + '\n\n' +
            '請用以下JSON格式回答（不要有其他文字）：\n' +
            '{\n' +
            '  "name": "行程名稱",\n' +
            '  "country": "' + (isDomestic ? '台灣-' + destination : destination) + '",\n' +
            '  "days": ' + days + ',\n' +
            '  "estimatedCost": { "min": 最低預算, "max": 最高預算 },\n' +
            '  "highlights": ["亮點1", "亮點2", "亮點3"],\n' +
            '  "itinerary": [\n' +
            '    { "day": 1, "title": "第一天主題", "activities": ["活動1", "活動2", "活動3"] }\n' +
            '  ],\n' +
            '  "tips": ["注意事項1", "注意事項2"]\n' +
            '}\n\n' +
            '要求：\n' +
            '1. 行程輕鬆，適合50-70歲退休族\n' +
            '2. 每天景點不超過3-4個\n' +
            '3. 預算用' + (isDomestic ? '台幣' : '台幣，含機票住宿') + '\n' +
            '4. 只回傳JSON，不要其他文字';
    }

    async generateWithChatGPT(destination, days, isDomestic) {
        if (!this.openaiKey) {
            logger.warn('未設定 OpenAI API Key');
            return null;
        }

        var prompt = this.buildPrompt(destination, days, isDomestic, 'ChatGPT');

        try {
            var response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是專業旅遊規劃師，只用JSON格式回答。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': 'Bearer ' + this.openaiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            var content = response.data.choices[0].message.content;
            logger.info('ChatGPT 生成成功');

            var jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var tour = JSON.parse(jsonMatch[0]);
                tour.source = 'ChatGPT';
                return tour