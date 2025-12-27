/**
 * ============================================
 * 快取服務
 * Redis 快取管理
 * ============================================
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let isConnected = false;

/**
 * 初始化快取連線
 */
async function initCache() {
    try {
        const redisUrl = process.env.REDIS_URL;
        
        if (redisUrl) {
            redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                lazyConnect: true
            });
        } else {
            redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });
        }

        // 連線事件
        redis.on('connect', () => {
            logger.info('Redis connected');
            isConnected = true;
        });

        redis.on('error', (error) => {
            logger.error('Redis error:', error.message);
            isConnected = false;
        });

        redis.on('close', () => {
            logger.warn('Redis connection closed');
            isConnected = false;
        });

        await redis.connect();
        
    } catch (error) {
        logger.warn('Redis initialization failed, using memory cache:', error.message);
        redis = null;
        isConnected = false;
    }
}

// 記憶體快取備用方案
const memoryCache = new Map();
const memoryCacheTTL = new Map();

/**
 * 設定快取
 */
async function set(key, value, ttlSeconds = 3600) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (redis && isConnected) {
            await redis.setex(key, ttlSeconds, stringValue);
        } else {
            // 使用記憶體快取
            memoryCache.set(key, stringValue);
            memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
        }

        return true;
    } catch (error) {
        logger.error('Cache set error:', error.message);
        return false;
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
            // 檢查記憶體快取是否過期
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
        logger.error('Cache get error:', error.message);
        return null;
    }
}

/**
 * 刪除快取
 */
async function del(key) {
    try {
        if (redis && isConnected) {
            await redis.del(key);
        } else {
            memoryCache.delete(key);
            memoryCacheTTL.delete(key);
        }
        return true;
    } catch (error) {
        logger.error('Cache delete error:', error.message);
        return false;
    }
}

/**
 * 批次刪除（使用 pattern）
 */
async function delByPattern(pattern) {
    try {
        if (redis && isConnected) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } else {
            // 記憶體快取的 pattern 刪除
            const regex = new RegExp(pattern.replace('*', '.*'));
            for (const key of memoryCache.keys()) {
                if (regex.test(key)) {
                    memoryCache.delete(key);
                    memoryCacheTTL.delete(key);
                }
            }
        }
        return true;
    } catch (error) {
        logger.error('Cache delete by pattern error:', error.message);
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
        } else {
            return memoryCache.has(key);
        }
    } catch (error) {
        logger.error('Cache exists error:', error.message);
        return false;
    }
}

/**
 * 設定快取過期時間
 */
async function expire(key, ttlSeconds) {
    try {
        if (redis && isConnected) {
            await redis.expire(key, ttlSeconds);
        } else {
            memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
        }
        return true;
    } catch (error) {
        logger.error('Cache expire error:', error.message);
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
        } else {
            const current = parseInt(memoryCache.get(key) || '0');
            memoryCache.set(key, String(current + 1));
            return current + 1;
        }
    } catch (error) {
        logger.error('Cache incr error:', error.message);
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
        } else {
            const expireTime = memoryCacheTTL.get(key);
            if (!expireTime) return -2;
            const remaining = Math.ceil((expireTime - Date.now()) / 1000);
            return remaining > 0 ? remaining : -2;
        }
    } catch (error) {
        logger.error('Cache TTL error:', error.message);
        return -1;
    }
}

/**
 * Hash 操作 - 設定欄位
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
        logger.error('Cache hset error:', error.message);
        return false;
    }
}

/**
 * Hash 操作 - 取得欄位
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
        logger.error('Cache hget error:', error.message);
        return null;
    }
}

/**
 * Hash 操作 - 取得所有欄位
 */
async function hgetall(key) {
    try {
        if (redis && isConnected) {
            const result = await redis.hgetall(key);
            // 嘗試解析每個值
            for (const field in result) {
                try {
                    result[field] = JSON.parse(result[field]);
                } catch {
                    // 保持原值
                }
            }
            return result;
        } else {
            return memoryCache.get(key) || {};
        }
    } catch (error) {
        logger.error('Cache hgetall error:', error.message);
        return {};
    }
}

/**
 * 清空所有快取
 */
async function flushAll() {
    try {
        if (redis && isConnected) {
            await redis.flushall();
        } else {
            memoryCache.clear();
            memoryCacheTTL.clear();
        }
        logger.info('Cache flushed');
        return true;
    } catch (error) {
        logger.error('Cache flush error:', error.message);
        return false;
    }
}

/**
 * 取得快取統計
 */
async function getStats() {
    try {
        if (redis && isConnected) {
            const info = await redis.info('stats');
            return {
                type: 'redis',
                connected: true,
                info: info
            };
        } else {
            return {
                type: 'memory',
                connected: false,
                size: memoryCache.size,
                keys: Array.from(memoryCache.keys())
            };
        }
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * 關閉連線
 */
async function close() {
    try {
        if (redis) {
            await redis.quit();
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error closing Redis:', error.message);
    }
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
