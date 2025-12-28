/**
 * ============================================
 * 快取服務
 * Redis 快取管理（可關閉）
 * ============================================
 */

const logger = require('../utils/logger');

let redis = null;
let isConnected = false;

// 記憶體快取
const memoryCache = new Map();
const memoryCacheTTL = new Map();

/**
 * 初始化快取連線
 */
async function initCache() {
    // 檢查是否禁用 Redis
    if (process.env.REDIS_ENABLED === 'false') {
        logger.info('Redis disabled, using memory cache only');
        return;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        logger.info('No REDIS_URL configured, using memory cache only');
        return;
    }

    try {
        const Redis = require('ioredis');
        
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            lazyConnect: true,
            reconnectOnError: () => false
        });

        redis.on('connect', () => {
            logger.info('Redis connected');
            isConnected = true;
        });

        redis.on('error', () => {
            isConnected = false;
        });

        redis.on('close', () => {
            isConnected = false;
        });

        await redis.connect();
        
    } catch (error) {
        logger.info('Using memory cache (Redis not available)');
        redis = null;
        isConnected = false;
    }
}

/**
 * 設定快取
 */
async function set(key, value, ttlSeconds = 3600) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (redis && isConnected) {
            await redis.setex(key, ttlSeconds, stringValue);
        } else {
            memoryCache.set(key, stringValue);
            memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
        }

        return true;
    } catch (error) {
        memoryCache.set(key, typeof value === 'string' ? value : JSON.stringify(value));
        memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
        return true;
    }
}

/**
 * 取得快取
 */
async function get(key) {
    try {
        let value;

        if (redis && isConnected) {
            value = await redis.get(key);
        } else {
            const ttl = memoryCacheTTL.get(key);
            if (ttl && Date.now() > ttl) {
                memoryCache.delete(key);
                memoryCacheTTL.delete(key);
                return null;
            }
            value = memoryCache.get(key);
        }

        if (!value) return null;

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        return memoryCache.get(key) || null;
    }
}

/**
 * 刪除快取
 */
async function del(key) {
    try {
        if (redis && isConnected) {
            await redis.del(key);
        }
        memoryCache.delete(key);
        memoryCacheTTL.delete(key);
        return true;
    } catch (error) {
        memoryCache.delete(key);
        memoryCacheTTL.delete(key);
        return true;
    }
}

/**
 * 批次刪除
 */
async function delByPattern(pattern) {
    try {
        if (redis && isConnected) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
        
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of memoryCache.keys()) {
            if (regex.test(key)) {
                memoryCache.delete(key);
                memoryCacheTTL.delete(key);
            }
        }
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 檢查快取是否存在
 */
async function exists(key) {
    try {
        if (redis && isConnected) {
            return await redis.exists(key) === 1;
        }
        return memoryCache.has(key);
    } catch (error) {
        return memoryCache.has(key);
    }
}

/**
 * 設定過期時間
 */
async function expire(key, ttlSeconds) {
    try {
        if (redis && isConnected) {
            await redis.expire(key, ttlSeconds);
        }
        memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 遞增計數器
 */
async function incr(key) {
    try {
        if (redis && isConnected) {
            return await redis.incr(key);
        }
        const current = parseInt(memoryCache.get(key) || '0');
        memoryCache.set(key, String(current + 1));
        return current + 1;
    } catch (error) {
        return 0;
    }
}

/**
 * 取得剩餘 TTL
 */
async function ttl(key) {
    try {
        if (redis && isConnected) {
            return await redis.ttl(key);
        }
        const expireTime = memoryCacheTTL.get(key);
        if (!expireTime) return -2;
        const remaining = Math.ceil((expireTime - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    } catch (error) {
        return -1;
    }
}

/**
 * Hash 設定
 */
async function hset(key, field, value) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (redis && isConnected) {
            await redis.hset(key, field, stringValue);
        } else {
            const hash = memoryCache.get(key) || {};
            hash[field] = stringValue;
            memoryCache.set(key, hash);
        }
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Hash 取得
 */
async function hget(key, field) {
    try {
        let value;
        
        if (redis && isConnected) {
            value = await redis.hget(key, field);
        } else {
            const hash = memoryCache.get(key) || {};
            value = hash[field];
        }

        if (!value) return null;
        
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        return null;
    }
}

/**
 * Hash 取得全部
 */
async function hgetall(key) {
    try {
        if (redis && isConnected) {
            const result = await redis.hgetall(key);
            for (const field in result) {
                try {
                    result[field] = JSON.parse(result[field]);
                } catch {}
            }
            return result;
        }
        return memoryCache.get(key) || {};
    } catch (error) {
        return {};
    }
}

/**
 * 清空快取
 */
async function flushAll() {
    try {
        if (redis && isConnected) {
            await redis.flushall();
        }
        memoryCache.clear();
        memoryCacheTTL.clear();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 取得統計
 */
async function getStats() {
    return {
        type: redis && isConnected ? 'redis' : 'memory',
        connected: isConnected,
        size: memoryCache.size
    };
}

/**
 * 關閉連線
 */
async function close() {
    try {
        if (redis) {
            await redis.quit();
        }
    } catch (error) {}
}

module.exports = {
    initCache,
    set,
    get,
    del,
    delByPattern,
    exists,
    expire,
    incr,
    ttl,
    hset,
    hget,
    hgetall,
    flushAll,
    getStats,
    close
};