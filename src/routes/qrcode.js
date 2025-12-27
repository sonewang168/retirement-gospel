/**
 * ============================================
 * QR Code 路由
 * 產生 LINE Bot 加入 QR Code
 * ============================================
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// LINE 官方帳號連結
const LINE_BOT_URL = process.env.LINE_BOT_URL || 'https://line.me/R/ti/p/@retirement-gospel';
const LINE_ADD_FRIEND_URL = process.env.LINE_ADD_FRIEND_URL || 'https://lin.ee/xxxxxxx';

/**
 * 取得基本 QR Code (PNG)
 * GET /qrcode
 */
router.get('/', async (req, res) => {
    try {
        const url = LINE_ADD_FRIEND_URL;
        const size = parseInt(req.query.size) || 300;
        
        const qrCodeBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            width: size,
            margin: 2,
            color: {
                dark: '#00B900', // LINE 綠色
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(qrCodeBuffer);

    } catch (error) {
        logger.error('Error generating QR code:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

/**
 * 取得帶 Logo 的 QR Code
 * GET /qrcode/logo
 */
router.get('/logo', async (req, res) => {
    try {
        const url = LINE_ADD_FRIEND_URL;
        const size = parseInt(req.query.size) || 400;
        
        // 產生基本 QR Code
        const qrCodeBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            width: size,
            margin: 3,
            color: {
                dark: '#00B900',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H' // 高容錯率，可容納 Logo
        });

        // 建立 Logo (使用 SVG 動態產生)
        const logoSize = Math.floor(size * 0.25);
        const logoSvg = `
            <svg width="${logoSize}" height="${logoSize}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${logoSize/2}" cy="${logoSize/2}" r="${logoSize/2}" fill="white"/>
                <circle cx="${logoSize/2}" cy="${logoSize/2}" r="${logoSize/2 - 4}" fill="#00B900"/>
                <text x="${logoSize/2}" y="${logoSize/2 + 8}" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="${logoSize * 0.35}" 
                      font-weight="bold" 
                      fill="white">福</text>
            </svg>
        `;

        const logoBuffer = await sharp(Buffer.from(logoSvg))
            .png()
            .toBuffer();

        // 合成 QR Code 和 Logo
        const compositeImage = await sharp(qrCodeBuffer)
            .composite([{
                input: logoBuffer,
                gravity: 'center'
            }])
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(compositeImage);

    } catch (error) {
        logger.error('Error generating QR code with logo:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

/**
 * 取得精美海報版 QR Code
 * GET /qrcode/poster
 */
router.get('/poster', async (req, res) => {
    try {
        const url = LINE_ADD_FRIEND_URL;
        const width = parseInt(req.query.width) || 600;
        const height = parseInt(req.query.height) || 800;
        const qrSize = Math.floor(width * 0.6);
        
        // 產生 QR Code
        const qrCodeBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            width: qrSize,
            margin: 2,
            color: {
                dark: '#2C3E50',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        // 建立海報背景 SVG
        const posterSvg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#E74C3C;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#C0392B;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#E74C3C;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
                    </filter>
                </defs>
                
                <!-- 背景 -->
                <rect width="100%" height="100%" fill="url(#bgGrad)"/>
                
                <!-- 裝飾圓形 -->
                <circle cx="50" cy="50" r="100" fill="rgba(255,255,255,0.1)"/>
                <circle cx="${width-30}" cy="${height-80}" r="150" fill="rgba(255,255,255,0.1)"/>
                
                <!-- 標題區 -->
                <text x="${width/2}" y="80" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="48" 
                      font-weight="bold" 
                      fill="white">🌅 退休福音</text>
                      
                <text x="${width/2}" y="120" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="20" 
                      fill="rgba(255,255,255,0.9)">智慧生活規劃助手</text>
                
                <!-- QR Code 白色背景 -->
                <rect x="${(width-qrSize-40)/2}" y="160" 
                      width="${qrSize+40}" height="${qrSize+40}" 
                      rx="20" ry="20" 
                      fill="white" 
                      filter="url(#shadow)"/>
                
                <!-- 說明文字 -->
                <text x="${width/2}" y="${160+qrSize+80}" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="24" 
                      font-weight="bold" 
                      fill="white">📱 掃描加入好友</text>
                      
                <text x="${width/2}" y="${160+qrSize+115}" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="16" 
                      fill="rgba(255,255,255,0.9)">每天為您推薦最適合的活動</text>
                
                <!-- 功能特點 -->
                <text x="${width/2}" y="${height-100}" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="14" 
                      fill="rgba(255,255,255,0.8)">✨ 今日推薦 | 👥 揪團出遊 | ❤️ 健康關懷</text>
                
                <!-- 底部 -->
                <text x="${width/2}" y="${height-30}" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="12" 
                      fill="rgba(255,255,255,0.6)">retirement-gospel.com</text>
            </svg>
        `;

        // 合成海報
        const posterBuffer = await sharp(Buffer.from(posterSvg))
            .png()
            .toBuffer();

        const compositeImage = await sharp(posterBuffer)
            .composite([{
                input: qrCodeBuffer,
                left: Math.floor((width - qrSize) / 2),
                top: 180
            }])
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(compositeImage);

    } catch (error) {
        logger.error('Error generating poster:', error);
        res.status(500).json({ error: '無法產生海報' });
    }
});

/**
 * 取得 SVG 格式 QR Code
 * GET /qrcode/svg
 */
router.get('/svg', async (req, res) => {
    try {
        const url = LINE_ADD_FRIEND_URL;
        
        const svgString = await QRCode.toString(url, {
            type: 'svg',
            margin: 2,
            color: {
                dark: '#00B900',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(svgString);

    } catch (error) {
        logger.error('Error generating SVG QR code:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

/**
 * 取得 Data URL 格式
 * GET /qrcode/dataurl
 */
router.get('/dataurl', async (req, res) => {
    try {
        const url = LINE_ADD_FRIEND_URL;
        
        const dataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#00B900',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.json({ dataUrl });

    } catch (error) {
        logger.error('Error generating data URL:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

/**
 * QR Code 下載頁面
 * GET /qrcode/download
 */
router.get('/download', async (req, res) => {
    try {
        res.render('qrcode-download', {
            title: '下載 QR Code - 退休福音',
            baseUrl: process.env.BASE_URL || 'http://localhost:3000'
        });
    } catch (error) {
        logger.error('Error rendering download page:', error);
        res.status(500).send('頁面載入失敗');
    }
});

/**
 * 家人邀請 QR Code
 * GET /qrcode/family/:inviteCode
 */
router.get('/family/:inviteCode', async (req, res) => {
    try {
        const { inviteCode } = req.params;
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/liff/family-link?code=${inviteCode}`;
        
        const qrCodeBuffer = await QRCode.toBuffer(inviteUrl, {
            type: 'png',
            width: 300,
            margin: 2,
            color: {
                dark: '#9C27B0', // 紫色 for 家人
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.set('Content-Type', 'image/png');
        res.send(qrCodeBuffer);

    } catch (error) {
        logger.error('Error generating family invite QR:', error);
        res.status(500).json({ error: '無法產生邀請碼' });
    }
});

/**
 * 揪團分享 QR Code
 * GET /qrcode/group/:groupId
 */
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const groupUrl = `${baseUrl}/liff/group/${groupId}`;
        
        const qrCodeBuffer = await QRCode.toBuffer(groupUrl, {
            type: 'png',
            width: 300,
            margin: 2,
            color: {
                dark: '#3498DB', // 藍色 for 揪團
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.set('Content-Type', 'image/png');
        res.send(qrCodeBuffer);

    } catch (error) {
        logger.error('Error generating group QR:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

/**
 * 活動分享 QR Code
 * GET /qrcode/activity/:activityId
 */
router.get('/activity/:activityId', async (req, res) => {
    try {
        const { activityId } = req.params;
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const activityUrl = `${baseUrl}/liff/activity/${activityId}`;
        
        const qrCodeBuffer = await QRCode.toBuffer(activityUrl, {
            type: 'png',
            width: 300,
            margin: 2,
            color: {
                dark: '#E74C3C', // 紅色 for 活動
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        res.set('Content-Type', 'image/png');
        res.send(qrCodeBuffer);

    } catch (error) {
        logger.error('Error generating activity QR:', error);
        res.status(500).json({ error: '無法產生 QR Code' });
    }
});

module.exports = router;
