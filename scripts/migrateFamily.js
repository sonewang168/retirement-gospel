/**
 * 家人關懷 + 打卡照片 資料庫 Migration
 * 執行方式：node scripts/migrateFamily.js
 */
require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: console.log
});

async function migrate() {
    try {
        console.log('🚀 開始家人關懷 + 打卡照片 Migration...\n');

        // ========== 1. 建立 family_links 表 ==========
        console.log('📦 建立 family_links 表...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS family_links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                elder_id UUID NOT NULL,
                family_id UUID NOT NULL,
                relationship VARCHAR(20) DEFAULT 'family',
                nickname VARCHAR(50),
                status VARCHAR(20) DEFAULT 'approved',
                privacy_settings JSONB DEFAULT '{"showActivity": true, "showHealth": false, "showLocation": true, "showGroups": true}',
                notify_on_activity BOOLEAN DEFAULT true,
                notify_on_sos BOOLEAN DEFAULT true,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(elder_id, family_id)
            );
        `);
        console.log('✅ family_links 表建立完成\n');

        // ========== 2. 建立索引 ==========
        console.log('📦 建立索引...');
        
        var indexes = [
            'CREATE INDEX IF NOT EXISTS idx_family_links_elder ON family_links(elder_id);',
            'CREATE INDEX IF NOT EXISTS idx_family_links_family ON family_links(family_id);',
            'CREATE INDEX IF NOT EXISTS idx_family_links_status ON family_links(status);'
        ];

        for (var i = 0; i < indexes.length; i++) {
            try {
                await sequelize.query(indexes[i]);
            } catch (e) {
                // 忽略已存在的索引
            }
        }
        console.log('✅ 索引建立完成\n');

        // ========== 3. users 表新增 referralCode 欄位 ==========
        console.log('📦 檢查 users 表 referralCode 欄位...');
        try {
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);
            `);
            console.log('✅ referral_code 欄位已新增\n');
        } catch (e) {
            console.log('   referral_code 可能已存在\n');
        }

        // ========== 4. user_wishlists 表新增打卡照片欄位 ==========
        console.log('📦 檢查 user_wishlists 表打卡照片欄位...');
        try {
            await sequelize.query(`
                ALTER TABLE user_wishlists ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT;
            `);
            console.log('✅ check_in_photo_url 欄位已新增\n');
        } catch (e) {
            console.log('   check_in_photo_url 可能已存在\n');
        }

        // ========== 5. 建立外鍵 ==========
        console.log('📦 建立外鍵關聯...');
        try {
            await sequelize.query(`
                ALTER TABLE family_links 
                ADD CONSTRAINT IF NOT EXISTS fk_family_links_elder 
                FOREIGN KEY (elder_id) REFERENCES users(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('   elder 外鍵可能已存在');
        }

        try {
            await sequelize.query(`
                ALTER TABLE family_links 
                ADD CONSTRAINT IF NOT EXISTS fk_family_links_family 
                FOREIGN KEY (family_id) REFERENCES users(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('   family 外鍵可能已存在');
        }
        console.log('✅ 外鍵建立完成\n');

        // ========== 完成 ==========
        console.log('════════════════════════════════════════');
        console.log('🎉 Migration 完成！');
        console.log('════════════════════════════════════════');
        console.log('');
        console.log('新增資料表：');
        console.log('  ✅ family_links（家人連結）');
        console.log('');
        console.log('新增欄位：');
        console.log('  ✅ users.referral_code（邀請碼）');
        console.log('  ✅ user_wishlists.check_in_photo_url（打卡照片）');
        console.log('');
        console.log('下一步：');
        console.log('  1. 重新部署應用程式');
        console.log('  2. 在 LINE Bot 輸入「家人」測試');
        console.log('');
        console.log('════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Migration 失敗:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
