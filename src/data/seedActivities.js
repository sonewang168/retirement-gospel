/**
 * 種子活動資料（全台灣版）
 */

const allActivities = [
    // ============================================
    // 台北市
    // ============================================
    { name: '台北101觀景台', category: 'culture', city: '台北市', district: '信義區', address: '台北市信義區信義路五段7號', description: '台灣最高建築，360度俯瞰台北市景，夜景絕美', rating: 4.8, costMin: 600, costMax: 600, suggestedDuration: 120, isActive: true },
    { name: '故宮博物院', category: 'culture', city: '台北市', district: '士林區', address: '台北市士林區至善路二段221號', description: '世界四大博物館之一，收藏中華文化珍貴文物', rating: 4.9, costMin: 350, costMax: 350, suggestedDuration: 180, isActive: true },
    { name: '龍山寺', category: 'religion', city: '台北市', district: '萬華區', address: '台北市萬華區廣州街211號', description: '台北最古老寺廟，香火鼎盛，建築精美', rating: 4.7, costMin: 0, costMax: 0, suggestedDuration: 60, isActive: true },
    { name: '象山步道', category: 'nature', city: '台北市', district: '信義區', address: '台北市信義區象山步道', description: '輕鬆登山步道，可眺望101與台北市景', rating: 4.6, costMin: 0, costMax: 0, suggestedDuration: 90, isActive: true },
    { name: '士林夜市', category: 'food', city: '台北市', district: '士林區', address: '台北市士林區基河路101號', description: '台北最大夜市，美食小吃應有盡有', rating: 4.5, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },
    { name: '北投溫泉', category: 'entertainment', city: '台北市', district: '北投區', address: '台北市北投區中山路', description: '台灣著名溫泉區，日式風情濃厚', rating: 4.7, costMin: 200, costMax: 1500, suggestedDuration: 180, isActive: true },

    // ============================================
    // 新北市
    // ============================================
    { name: '九份老街', category: 'culture', city: '新北市', district: '瑞芳區', address: '新北市瑞芳區基山街', description: '懷舊山城老街，神隱少女取景地，夜景迷人', rating: 4.7, costMin: 0, costMax: 300, suggestedDuration: 180, isActive: true },
    { name: '野柳地質公園', category: 'nature', city: '新北市', district: '萬里區', address: '新北市萬里區野柳里港東路167-1號', description: '世界級地質景觀，女王頭聞名國際', rating: 4.6, costMin: 80, costMax: 80, suggestedDuration: 120, isActive: true },
    { name: '淡水老街', category: 'food', city: '新北市', district: '淡水區', address: '新北市淡水區中正路', description: '河岸老街風光，阿給魚丸必吃美食', rating: 4.5, costMin: 50, costMax: 300, suggestedDuration: 150, isActive: true },
    { name: '十分瀑布', category: 'nature', city: '新北市', district: '平溪區', address: '新北市平溪區南山里乾坑路10號', description: '台灣尼加拉瓜瀑布，壯觀水幕', rating: 4.5, costMin: 0, costMax: 0, suggestedDuration: 90, isActive: true },
    { name: '烏來溫泉', category: 'entertainment', city: '新北市', district: '烏來區', address: '新北市烏來區烏來街', description: '原住民風情溫泉區，台車體驗', rating: 4.4, costMin: 200, costMax: 1000, suggestedDuration: 180, isActive: true },

    // ============================================
    // 台中市
    // ============================================
    { name: '高美濕地', category: 'nature', city: '台中市', district: '清水區', address: '台中市清水區大甲溪出海口', description: '台灣最美夕陽，生態豐富的濕地', rating: 4.8, costMin: 0, costMax: 0, suggestedDuration: 120, isActive: true },
    { name: '宮原眼科', category: 'food', city: '台中市', district: '中區', address: '台中市中區中山路20號', description: '日式建築改造冰淇淋店，網紅打卡點', rating: 4.6, costMin: 100, costMax: 300, suggestedDuration: 60, isActive: true },
    { name: '彩虹眷村', category: 'culture', city: '台中市', district: '南屯區', address: '台中市南屯區春安路56巷', description: '彩繪藝術村，繽紛色彩拍照聖地', rating: 4.5, costMin: 0, costMax: 0, suggestedDuration: 60, isActive: true },
    { name: '逢甲夜市', category: 'food', city: '台中市', district: '西屯區', address: '台中市西屯區文華路', description: '中部最大夜市，創意小吃發源地', rating: 4.5, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },
    { name: '國立自然科學博物館', category: 'culture', city: '台中市', district: '北區', address: '台中市北區館前路1號', description: '台灣最大科學博物館，適合親子同遊', rating: 4.7, costMin: 100, costMax: 100, suggestedDuration: 180, isActive: true },
    { name: '勤美誠品綠園道', category: 'entertainment', city: '台中市', district: '西區', address: '台中市西區公益路68號', description: '文青必訪，藝術市集與綠意空間', rating: 4.4, costMin: 0, costMax: 500, suggestedDuration: 120, isActive: true },

    // ============================================
    // 台南市
    // ============================================
    { name: '赤崁樓', category: 'culture', city: '台南市', district: '中西區', address: '台南市中西區民族路二段212號', description: '荷蘭時期古蹟，台南必訪歷史景點', rating: 4.6, costMin: 50, costMax: 50, suggestedDuration: 60, isActive: true },
    { name: '安平古堡', category: 'culture', city: '台南市', district: '安平區', address: '台南市安平區國勝路82號', description: '台灣第一座城堡，見證400年歷史', rating: 4.5, costMin: 50, costMax: 50, suggestedDuration: 90, isActive: true },
    { name: '神農街', category: 'culture', city: '台南市', district: '中西區', address: '台南市中西區神農街', description: '古色古香老街，文創小店林立', rating: 4.4, costMin: 0, costMax: 200, suggestedDuration: 90, isActive: true },
    { name: '台南孔廟', category: 'religion', city: '台南市', district: '中西區', address: '台南市中西區南門路2號', description: '全台首學，台灣第一座孔廟', rating: 4.5, costMin: 25, costMax: 25, suggestedDuration: 60, isActive: true },
    { name: '國華街美食', category: 'food', city: '台南市', district: '中西區', address: '台南市中西區國華街三段', description: '台南小吃一條街，在地人推薦美食', rating: 4.7, costMin: 50, costMax: 300, suggestedDuration: 120, isActive: true },
    { name: '奇美博物館', category: 'culture', city: '台南市', district: '仁德區', address: '台南市仁德區文華路二段66號', description: '歐風宮殿建築，收藏豐富藝術品', rating: 4.8, costMin: 200, costMax: 200, suggestedDuration: 240, isActive: true },
    { name: '四草綠色隧道', category: 'nature', city: '台南市', district: '安南區', address: '台南市安南區大眾路360號', description: '台版亞馬遜河，竹筏遊紅樹林', rating: 4.6, costMin: 200, costMax: 200, suggestedDuration: 90, isActive: true },
    { name: '花園夜市', category: 'food', city: '台南市', district: '北區', address: '台南市北區海安路三段', description: '南部最大夜市，只有四、六、日營業', rating: 4.5, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },

    // ============================================
    // 高雄市
    // ============================================
    { name: '駁二藝術特區', category: 'culture', city: '高雄市', district: '鹽埕區', address: '高雄市鹽埕區大勇路1號', description: '文創藝術園區，展覽與市集', rating: 4.6, costMin: 0, costMax: 200, suggestedDuration: 180, isActive: true },
    { name: '旗津海岸', category: 'nature', city: '高雄市', district: '旗津區', address: '高雄市旗津區旗津三路', description: '渡輪踩風、海鮮、沙灘', rating: 4.5, costMin: 0, costMax: 500, suggestedDuration: 240, isActive: true },
    { name: '六合夜市', category: 'food', city: '高雄市', district: '新興區', address: '高雄市新興區六合二路', description: '高雄最著名夜市，觀光客必訪', rating: 4.3, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },
    { name: '蓮池潭', category: 'religion', city: '高雄市', district: '左營區', address: '高雄市左營區蓮潭路', description: '龍虎塔、春秋閣，高雄經典地標', rating: 4.5, costMin: 0, costMax: 0, suggestedDuration: 90, isActive: true },
    { name: '佛光山', category: 'religion', city: '高雄市', district: '大樹區', address: '高雄市大樹區興田里興田路153號', description: '台灣最大佛教道場，佛陀紀念館', rating: 4.8, costMin: 0, costMax: 0, suggestedDuration: 240, isActive: true },
    { name: '瑞豐夜市', category: 'food', city: '高雄市', district: '左營區', address: '高雄市左營區裕誠路', description: '在地人推薦夜市，美食選擇多', rating: 4.4, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },
    { name: '壽山動物園', category: 'entertainment', city: '高雄市', district: '鼓山區', address: '高雄市鼓山區萬壽路350號', description: '全新改建，空中步道觀察動物', rating: 4.5, costMin: 40, costMax: 40, suggestedDuration: 180, isActive: true },
    { name: '美麗島站', category: 'culture', city: '高雄市', district: '新興區', address: '高雄市新興區中山一路', description: '世界最美地鐵站，光之穹頂', rating: 4.7, costMin: 0, costMax: 0, suggestedDuration: 30, isActive: true },

    // ============================================
    // 桃園市
    // ============================================
    { name: 'Xpark水族館', category: 'entertainment', city: '桃園市', district: '中壢區', address: '桃園市中壢區春德路105號', description: '日本橫濱八景島團隊打造，沉浸式水族館', rating: 4.5, costMin: 550, costMax: 550, suggestedDuration: 180, isActive: true },
    { name: '大溪老街', category: 'culture', city: '桃園市', district: '大溪區', address: '桃園市大溪區和平路', description: '巴洛克式老街建築，豆干聞名', rating: 4.4, costMin: 0, costMax: 300, suggestedDuration: 120, isActive: true },
    { name: '拉拉山', category: 'nature', city: '桃園市', district: '復興區', address: '桃園市復興區華陵里', description: '神木群、水蜜桃產地、避暑勝地', rating: 4.6, costMin: 0, costMax: 100, suggestedDuration: 300, isActive: true },

    // ============================================
    // 新竹市/縣
    // ============================================
    { name: '新竹城隍廟', category: 'religion', city: '新竹市', district: '北區', address: '新竹市北區中山路75號', description: '百年古蹟，周邊小吃美食多', rating: 4.4, costMin: 0, costMax: 200, suggestedDuration: 90, isActive: true },
    { name: '內灣老街', category: 'culture', city: '新竹縣', district: '橫山鄉', address: '新竹縣橫山鄉內灣村', description: '懷舊車站老街，野薑花粽必吃', rating: 4.3, costMin: 0, costMax: 300, suggestedDuration: 150, isActive: true },
    { name: '司馬庫斯', category: 'nature', city: '新竹縣', district: '尖石鄉', address: '新竹縣尖石鄉玉峰村司馬庫斯', description: '上帝的部落，巨木群步道', rating: 4.9, costMin: 0, costMax: 100, suggestedDuration: 480, isActive: true },

    // ============================================
    // 苗栗縣
    // ============================================
    { name: '勝興車站', category: 'culture', city: '苗栗縣', district: '三義鄉', address: '苗栗縣三義鄉勝興村', description: '台灣最高鐵路車站，龍騰斷橋', rating: 4.4, costMin: 0, costMax: 200, suggestedDuration: 120, isActive: true },
    { name: '南庄老街', category: 'culture', city: '苗栗縣', district: '南庄鄉', address: '苗栗縣南庄鄉中正路', description: '桂花巷、洗衫坑，客家風情', rating: 4.3, costMin: 0, costMax: 300, suggestedDuration: 150, isActive: true },

    // ============================================
    // 彰化縣
    // ============================================
    { name: '鹿港老街', category: 'culture', city: '彰化縣', district: '鹿港鎮', address: '彰化縣鹿港鎮埔頭街', description: '三百年古蹟老街，傳統工藝', rating: 4.5, costMin: 0, costMax: 300, suggestedDuration: 180, isActive: true },
    { name: '彰化大佛', category: 'religion', city: '彰化縣', district: '彰化市', address: '彰化縣彰化市溫泉路31號', description: '八卦山大佛，彰化地標', rating: 4.3, costMin: 0, costMax: 0, suggestedDuration: 60, isActive: true },

    // ============================================
    // 南投縣
    // ============================================
    { name: '日月潭', category: 'nature', city: '南投縣', district: '魚池鄉', address: '南投縣魚池鄉中山路', description: '台灣最美湖泊，單車環湖必遊', rating: 4.8, costMin: 0, costMax: 500, suggestedDuration: 360, isActive: true },
    { name: '清境農場', category: 'nature', city: '南投縣', district: '仁愛鄉', address: '南投縣仁愛鄉大同村仁和路170號', description: '高山農場，綿羊秀、青青草原', rating: 4.6, costMin: 200, costMax: 200, suggestedDuration: 300, isActive: true },
    { name: '溪頭自然教育園區', category: 'nature', city: '南投縣', district: '鹿谷鄉', address: '南投縣鹿谷鄉森林巷9號', description: '森林浴、妖怪村，避暑勝地', rating: 4.5, costMin: 200, costMax: 200, suggestedDuration: 300, isActive: true },

    // ============================================
    // 嘉義市/縣
    // ============================================
    { name: '阿里山森林遊樂區', category: 'nature', city: '嘉義縣', district: '阿里山鄉', address: '嘉義縣阿里山鄉中正村59號', description: '日出、雲海、神木、小火車', rating: 4.8, costMin: 300, costMax: 300, suggestedDuration: 480, isActive: true },
    { name: '嘉義文化路夜市', category: 'food', city: '嘉義市', district: '東區', address: '嘉義市東區文化路', description: '火雞肉飯、砂鍋魚頭發源地', rating: 4.5, costMin: 50, costMax: 300, suggestedDuration: 120, isActive: true },

    // ============================================
    // 屏東縣
    // ============================================
    { name: '墾丁國家公園', category: 'nature', city: '屏東縣', district: '恆春鎮', address: '屏東縣恆春鎮墾丁路', description: '台灣最南端，陽光沙灘海洋', rating: 4.7, costMin: 0, costMax: 500, suggestedDuration: 480, isActive: true },
    { name: '屏東海生館', category: 'entertainment', city: '屏東縣', district: '車城鄉', address: '屏東縣車城鄉後灣村後灣路2號', description: '亞洲最大水族館，夜宿海生館', rating: 4.8, costMin: 450, costMax: 450, suggestedDuration: 300, isActive: true },

    // ============================================
    // 宜蘭縣
    // ============================================
    { name: '礁溪溫泉', category: 'entertainment', city: '宜蘭縣', district: '礁溪鄉', address: '宜蘭縣礁溪鄉溫泉路', description: '平地溫泉，泡湯美食一日遊', rating: 4.6, costMin: 150, costMax: 1000, suggestedDuration: 180, isActive: true },
    { name: '羅東夜市', category: 'food', city: '宜蘭縣', district: '羅東鎮', address: '宜蘭縣羅東鎮興東路', description: '宜蘭必逛夜市，羊肉湯、卜肉', rating: 4.5, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },
    { name: '太平山森林遊樂區', category: 'nature', city: '宜蘭縣', district: '大同鄉', address: '宜蘭縣大同鄉太平巷58-1號', description: '蹦蹦車、翠峰湖、見晴步道', rating: 4.7, costMin: 200, costMax: 200, suggestedDuration: 360, isActive: true },

    // ============================================
    // 花蓮縣
    // ============================================
    { name: '太魯閣國家公園', category: 'nature', city: '花蓮縣', district: '秀林鄉', address: '花蓮縣秀林鄉富世村富世291號', description: '鬼斧神工峽谷地形，世界級景觀', rating: 4.9, costMin: 0, costMax: 200, suggestedDuration: 360, isActive: true },
    { name: '七星潭', category: 'nature', city: '花蓮縣', district: '新城鄉', address: '花蓮縣新城鄉七星街', description: '礫石海灘，眺望太平洋', rating: 4.6, costMin: 0, costMax: 0, suggestedDuration: 90, isActive: true },
    { name: '花蓮東大門夜市', category: 'food', city: '花蓮縣', district: '花蓮市', address: '花蓮縣花蓮市中山路', description: '原住民風味美食，炸彈蔥油餅', rating: 4.4, costMin: 100, costMax: 500, suggestedDuration: 120, isActive: true },

    // ============================================
    // 台東縣
    // ============================================
    { name: '伯朗大道', category: 'nature', city: '台東縣', district: '池上鄉', address: '台東縣池上鄉伯朗大道', description: '金城武樹，稻田美景', rating: 4.7, costMin: 0, costMax: 200, suggestedDuration: 120, isActive: true },
    { name: '三仙台', category: 'nature', city: '台東縣', district: '成功鎮', address: '台東縣成功鎮三仙里基翬路', description: '八拱跨海步橋，迎接第一道曙光', rating: 4.6, costMin: 0, costMax: 0, suggestedDuration: 120, isActive: true },
    { name: '知本溫泉', category: 'entertainment', city: '台東縣', district: '卑南鄉', address: '台東縣卑南鄉溫泉村', description: '東台灣著名溫泉，森林浴', rating: 4.5, costMin: 200, costMax: 1500, suggestedDuration: 180, isActive: true }
];

module.exports = { allActivities };