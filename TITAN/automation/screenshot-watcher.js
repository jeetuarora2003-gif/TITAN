/**
 * ═══════════════════════════════════════════════════════════
 * ELITE SCREENSHOT WATCHER
 * Auto-captures full-page screenshots on file save
 * 
 * Requires: npm install chokidar puppeteer
 * Run:      node automation/screenshot-watcher.js
 * ═══════════════════════════════════════════════════════════
 */

const chokidar = require('chokidar');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(process.cwd(), 'screenshots');
const WATCH_PATTERNS = ['**/*.html', '**/*.css', '**/*.js'];
const IGNORE_PATTERNS = [
    '**/node_modules/**', 
    '**/screenshots/**', 
    '**/automation/**',
    '**/.agents/**',
];

// Viewports to capture
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet',  width: 768,  height: 1024 },
    { name: 'mobile',  width: 375,  height: 812 },
];

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('╔══════════════════════════════════════════════╗');
console.log('║  📸 Elite Screenshot Watcher                ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  Target:     ${URL.padEnd(31)}║`);
console.log(`║  Output:     ./screenshots/                 ║`);
console.log(`║  Viewports:  Desktop, Tablet, Mobile        ║`);
console.log('╚══════════════════════════════════════════════╝');

let isCapturing = false;

const watcher = chokidar.watch(WATCH_PATTERNS, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    cwd: process.cwd(),
});

async function captureScreenshots() {
    if (isCapturing) return;
    isCapturing = true;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    console.log(`\n⏳ [${timestamp}] Capturing screenshots...`);

    try {
        const browser = await puppeteer.launch({ headless: 'new' });

        for (const viewport of VIEWPORTS) {
            const page = await browser.newPage();
            await page.setViewport({ width: viewport.width, height: viewport.height });

            // Wait for dev server reload
            await new Promise(r => setTimeout(r, 800));

            await page.goto(URL, { waitUntil: 'networkidle2', timeout: 10000 });

            // Wait for GSAP animations to complete
            await new Promise(r => setTimeout(r, 2000));

            const filename = `${timestamp}_${viewport.name}.png`;
            const filepath = path.join(OUTPUT_DIR, filename);

            await page.screenshot({ path: filepath, fullPage: true });
            console.log(`  ✅ ${viewport.name} (${viewport.width}x${viewport.height}) → ${filename}`);

            await page.close();
        }

        await browser.close();
        console.log(`\n📂 Screenshots saved to ./screenshots/`);
        console.log(`📊 To analyze: inject attention-analyzer.js and press Ctrl+Shift+H`);
    } catch (err) {
        console.error(`\n❌ Capture failed: ${err.message}`);
        console.error(`   Is your dev server running at ${URL}?`);
    }

    // Debounce
    setTimeout(() => { isCapturing = false; }, 3000);
}

watcher.on('change', (filePath) => {
    console.log(`\n📝 Changed: ${filePath}`);
    captureScreenshots();
});

console.log('\n👁️  Watching for file changes... (save any .html/.css/.js to trigger)\n');
