/**
 * AI 行程規劃服務（完整版）
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

    buildPrompt(destination, days, isDomestic) {
        if (isDomestic) {
            return '請為退休族規劃一個台灣「' + destination + '」' + days + '天的輕鬆旅遊行程。\n\n' +
                '要求：\n' +
                '1. 行程節奏要輕鬆，適合50-70歲退休族\n' +
                '2. 每天景點不超過3-4個\n' +
                '3. 包含在地美食推薦\n' +
                '4. 住宿建議（舒適、交通便利）\n' +
                '5. 預估每人花費（台幣）\n' +
                '6. 交通方式建議\n' +
                '7. 注意事項\n\n' +
                '請用繁體中文回答，用清楚易讀的條列方式呈現，不要用JSON格式。';
        } else {
            return '請為退休族規劃一個「' + destination + '」' + days + '天的輕鬆旅遊行程。\n\n' +
                '要求：\n' +
                '1. 行程節奏要輕鬆，適合50-70歲退休族\n' +
                '2. 每天景點不超過3-4個\n' +
                '3. 包含當地美食推薦\n' +
                '4. 住宿建議（舒適、交通便利）\n' +
                '5. 預估每人花費（包含機票、住宿、餐飲、交通、門票）\n' +
                '6. 注意事項與小提醒\n' +
                '7. 最佳旅遊季節\n\n' +
                '請用繁體中文回答，用清楚易讀的條列方式呈現，不要用JSON格式。';
        }
    }

    async generateWithChatGPT(destination, days, isDomestic) {
        if (!this.openaiKey) {
            throw new Error('未設定 OpenAI API Key');
        }

        var prompt = this.buildPrompt(destination, days, isDomestic);

        try {
            var response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '你是一位專業的退休族旅遊規劃師，擅長規劃輕鬆、舒適、安全的行程。請直接提供行程內容，不要使用JSON格式。' },
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

            return { success: true, content: content, provider: 'ChatGPT' };
        } catch (error) {
            logger.error('ChatGPT 錯誤:', error.message);
            throw error;
        }
    }

    async generateWithGemini(destination, days, isDomestic) {
        if (!this.geminiKey) {
            throw new Error('未設定 Gemini API Key');
        }

        var prompt = this.buildPrompt(destination, days, isDomestic);

        try {
            var response = await axios.post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.geminiKey,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
                },
                { timeout: 60000 }
            );

            var content = response.data.candidates[0].content.parts[0].text;
            logger.info('Gemini 生成成功');

            return { success: true, content: content, provider: 'Gemini' };
        } catch (error) {
            logger.error('Gemini 錯誤:', error.message);
            throw error;
        }
    }

    async generateTour(userId, destination, days, isDomestic) {
        var result = null;

        if (this.openaiKey) {
            try {
                result = await this.generateWithChatGPT(destination, days, isDomestic);
            } catch (e) {
                logger.warn('ChatGPT 失敗，嘗試 Gemini:', e.message);
            }
        }

        if (!result && this.geminiKey) {
            try {
                result = await this.generateWithGemini(destination, days, isDomestic);
            } catch (e) {
                logger.error('Gemini 也失敗:', e.message);
            }
        }

        if (!result) {
            return { success: false, message: '抱歉，AI 服務暫時無法使用，請稍後再試 🙏' };
        }

        try {
            var tour = await TourPlan.create({
                userId: userId,
                name: destination + days + '天輕旅行',
                country: isDomestic ? '台灣-' + destination : destination,
                days: days,
                content: result.content,
                aiProvider: result.provider,
                highlights: [],
                tips: []
            });

            return { success: true, tour: tour, content: result.content, provider: result.provider };
        } catch (dbError) {
            logger.error('儲存行程錯誤:', dbError.message);
            return { success: true, content: result.content, provider: result.provider };
        }
    }

    formatTourMessage(result, destination, days) {
        if (!result.success) {
            return result.message;
        }

        var message = '🌍 ' + destination + ' ' + days + '天輕旅行\n';
        message += '━━━━━━━━━━━━━━━\n\n';
        message += result.content;
        message += '\n\n━━━━━━━━━━━━━━━\n';
        message += '🤖 由 ' + result.provider + ' 規劃\n';
        message += '💾 已儲存，輸入「我的行程」查看';

        if (message.length > 4800) {
            message = message.substring(0, 4800) + '\n\n...(內容過長已截斷)';
        }

        return message;
    }
}

module.exports = new AITourService();