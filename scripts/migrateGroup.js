/**
 * 揪團功能資料庫 Migration
 * 執行方式：node scripts/migrateGroup.js
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
        console.log('🚀 開始揪團功能資料庫 Migration...\n');

        // ========== 1. 建立/更新 groups 表 ==========
        console.log('📦 建立 groups 表...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                creator_id UUID NOT NULL,
                activity_id UUID,
                event_id UUID,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                event_date DATE NOT NULL,
                event_time VARCHAR(10),
                location VARCHAR(500),
                meeting_point VARCHAR(500),
                meeting_point_lat DECIMAL(10, 8),
                meeting_point_lng DECIMAL(11, 8),
                city VARCHAR(50),
                min_participants INTEGER DEFAULT 2,
                max_participants INTEGER DEFAULT 10,
                current_participants INTEGER DEFAULT 1,
                cost_per_person INTEGER DEFAULT 0,
                cost_split_method VARCHAR(20) DEFAULT 'pay_own',
                requirements TEXT,
                age_range VARCHAR(50),
                gender_preference VARCHAR(20) DEFAULT 'all',
                difficulty_level VARCHAR(20) DEFAULT 'easy',
                status VARCHAR(20) DEFAULT 'open',
                registration_deadline TIMESTAMP,
                tags TEXT[] DEFAULT '{}',
                image_url TEXT,
                is_public BOOLEAN DEFAULT true,
                cancel_reason TEXT,
                average_rating DECIMAL(2, 1) DEFAULT 0,
                total_ratings INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ groups 表建立完成\n');

        // ========== 2. 建立 group_members 表 ==========
        console.log('📦 建立 group_members 表...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS group_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL,
                user_id UUID NOT NULL,
                role VARCHAR(20) DEFAULT 'member',
                status VARCHAR(20) DEFAULT 'pending',
                message TEXT,
                joined_at TIMESTAMP,
                checked_in BOOLEAN DEFAULT false,
                check_in_time TIMESTAMP,
                check_in_photo_url TEXT,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                review TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, user_id)
            );
        `);
        console.log('✅ group_members 表建立完成\n');

        // ========== 3. 建立索引 ==========
        console.log('📦 建立索引...');
        
        var indexes = [
            'CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);',
            'CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);',
            'CREATE INDEX IF NOT EXISTS idx_groups_event_date ON groups(event_date);',
            'CREATE INDEX IF NOT EXISTS idx_groups_city ON groups(city);',
            'CREATE INDEX IF NOT EXISTS idx_groups_is_public ON groups(is_public);',
            'CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);',
            'CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);'
        ];

        for (var i = 0; i < indexes.length; i++) {
            try {
                await sequelize.query(indexes[i]);
            } catch (e) {
                // 忽略已存在的索引錯誤
            }
        }
        console.log('✅ 索引建立完成\n');

        // ========== 4. 檢查並新增缺少的欄位 ==========
        console.log('📦 檢查並新增缺少的欄位...');

        var newColumns = [
            { table: 'groups', name: 'meeting_point', type: 'VARCHAR(500)' },
            { table: 'groups', name: 'meeting_point_lat', type: 'DECIMAL(10, 8)' },
            { table: 'groups', name: 'meeting_point_lng', type: 'DECIMAL(11, 8)' },
            { table: 'groups', name: 'city', type: 'VARCHAR(50)' },
            { table: 'groups', name: 'cost_per_person', type: 'INTEGER DEFAULT 0' },
            { table: 'groups', name: 'cost_split_method', type: "VARCHAR(20) DEFAULT 'pay_own'" },
            { table: 'groups', name: 'requirements', type: 'TEXT' },
            { table: 'groups', name: 'age_range', type: 'VARCHAR(50)' },
            { table: 'groups', name: 'gender_preference', type: "VARCHAR(20) DEFAULT 'all'" },
            { table: 'groups', name: 'difficulty_level', type: "VARCHAR(20) DEFAULT 'easy'" },
            { table: 'groups', name: 'registration_deadline', type: 'TIMESTAMP' },
            { table: 'groups', name: 'tags', type: "TEXT[] DEFAULT '{}'" },
            { table: 'groups', name: 'image_url', type: 'TEXT' },
            { table: 'groups', name: 'is_public', type: 'BOOLEAN DEFAULT true' },
            { table: 'groups', name: 'cancel_reason', type: 'TEXT' },
            { table: 'groups', name: 'average_rating', type: 'DECIMAL(2, 1) DEFAULT 0' },
            { table: 'groups', name: 'total_ratings', type: 'INTEGER DEFAULT 0' },
            { table: 'groups', name: 'activity_id', type: 'UUID' },
            { table: 'groups', name: 'event_id', type: 'UUID' },
            { table: 'groups', name: 'min_participants', type: 'INTEGER DEFAULT 2' }
        ];

        for (var j = 0; j < newColumns.length; j++) {
            var col = newColumns[j];
            try {
                await sequelize.query(
                    'ALTER TABLE ' + col.table + ' ADD COLUMN IF NOT EXISTS ' + col.name + ' ' + col.type + ';'
                );
            } catch (e) {
                // 欄位可能已存在
            }
        }
        console.log('✅ 欄位檢查完成\n');

        // ========== 5. 建立外鍵（可選）==========
        console.log('📦 建立外鍵關聯...');
        try {
            await sequelize.query(`
                ALTER TABLE groups 
                ADD CONSTRAINT IF NOT EXISTS fk_groups_creator 
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('   外鍵可能已存在或 users 表不存在');
        }

        try {
            await sequelize.query(`
                ALTER TABLE group_members 
                ADD CONSTRAINT IF NOT EXISTS fk_group_members_group 
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('   外鍵可能已存在');
        }

        try {
            await sequelize.query(`
                ALTER TABLE group_members 
                ADD CONSTRAINT IF NOT EXISTS fk_group_members_user 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('   外鍵可能已存在');
        }
        console.log('✅ 外鍵建立完成\n');

        // ========== 完成 ==========
        console.log('════════════════════════════════════════');
        console.log('🎉 Migration 完成！');
        console.log('════════════════════════════════════════');
        console.log('');
        console.log('資料表：');
        console.log('  ✅ groups（揪團）');
        console.log('  ✅ group_members（揪團成員）');
        console.log('');
        console.log('下一步：');
        console.log('  1. 重新部署應用程式');
        console.log('  2. 在 LINE Bot 輸入「揪團」測試');
        console.log('');
        console.log('════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Migration 失敗:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
