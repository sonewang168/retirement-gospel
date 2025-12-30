/**
 * 清除打卡紀錄
 * 執行方式：node scripts/clearCheckins.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
});

async function clearCheckins() {
    try {
        console.log('連接資料庫...');
        await sequelize.authenticate();
        console.log('✅ 連線成功\n');

        // 清除所有打卡紀錄
        var [results] = await sequelize.query(`
            UPDATE user_wishlists 
            SET is_visited = false, 
                visited_at = NULL, 
                check_in_photo_url = NULL
            RETURNING id;
        `);

        console.log('✅ 已清除 ' + results.length + ' 筆打卡紀錄');
        console.log('\n現在可以重新測試打卡功能了！');

    } catch (error) {
        console.error('❌ 錯誤:', error.message);
    } finally {
        await sequelize.close();
    }
}

clearCheckins();
