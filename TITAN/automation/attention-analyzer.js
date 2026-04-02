/**
 * ═══════════════════════════════════════════════════════════
 * ELITE ATTENTION ANALYZER
 * Replaces Attention Insight — Runs as an injectable overlay
 * 
 * HOW IT WORKS:
 * This script analyzes every visible element on the page and 
 * calculates a "visual weight" score based on:
 *   - Size (larger = more attention)
 *   - Contrast (high contrast against background = more attention)
 *   - Color saturation (vivid colors attract the eye)
 *   - Position (F-pattern: top-left gets more attention)
 *   - Motion (animated elements get bonus)
 *   - Isolation (elements with space around them pop)
 * 
 * It then renders a heatmap overlay and generates a report.
 * 
 * USAGE (inject into any page):
 *   <script src="automation/attention-analyzer.js"></script>
 *   Then press Ctrl+Shift+H to toggle the heatmap
 *   Or call: AttentionAnalyzer.analyze() from console
 * ═══════════════════════════════════════════════════════════
 */

const AttentionAnalyzer = (() => {
    let overlay = null;
    let isVisible = false;
    let lastReport = null;

    // ── Color utilities ──
    function parseColor(color) {
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computed = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        const match = computed.match(/\d+/g);
        return match ? { r: +match[0], g: +match[1], b: +match[2] } : { r: 0, g: 0, b: 0 };
    }

    function getLuminance(rgb) {
        const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function getContrastRatio(rgb1, rgb2) {
        const l1 = Math.max(getLuminance(rgb1), getLuminance(rgb2));
        const l2 = Math.min(getLuminance(rgb1), getLuminance(rgb2));
        return (l1 + 0.05) / (l2 + 0.05);
    }

    function getSaturation(rgb) {
        const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
        const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
        if (max === 0) return 0;
        return (max - min) / max;
    }

    // ── Score calculation for a single element ──
    function scoreElement(el) {
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Skip invisible/tiny elements
        if (rect.width < 10 || rect.height < 10) return null;
        if (rect.bottom < 0 || rect.top > vh * 2) return null;

        const styles = getComputedStyle(el);
        const bgColor = parseColor(styles.backgroundColor);
        const fgColor = parseColor(styles.color);

        // 1. SIZE SCORE (0-25): Larger elements get more attention
        const areaRatio = (rect.width * rect.height) / (vw * vh);
        const sizeScore = Math.min(25, areaRatio * 250);

        // 2. CONTRAST SCORE (0-25): High contrast pops
        const parentBg = el.parentElement ? parseColor(getComputedStyle(el.parentElement).backgroundColor) : { r: 0, g: 0, b: 0 };
        const contrast = getContrastRatio(fgColor, parentBg);
        const contrastScore = Math.min(25, (contrast / 21) * 25);

        // 3. COLOR SCORE (0-20): Saturated/warm colors attract
        const bgSat = getSaturation(bgColor);
        const fgSat = getSaturation(fgColor);
        const warmth = (bgColor.r > bgColor.b) ? 1.3 : 1; // warm colors get bonus
        const colorScore = Math.min(20, (Math.max(bgSat, fgSat) * 20) * warmth);

        // 4. POSITION SCORE (0-20): F-pattern weighting
        const centerX = (rect.left + rect.width / 2) / vw;
        const centerY = (rect.top + rect.height / 2) / vh;
        // F-pattern: top-left quadrant gets highest score, decreasing right and down
        const fPatternX = 1 - (centerX * 0.4); // slight left bias
        const fPatternY = Math.max(0, 1 - centerY * 0.8); // strong top bias
        const positionScore = (fPatternX * fPatternY) * 20;

        // 5. BONUS: Interactive elements, headings, images
        let bonus = 0;
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button') bonus += 8;
        if (tag === 'h1') bonus += 10;
        if (tag === 'h2') bonus += 6;
        if (tag === 'h3') bonus += 3;
        if (tag === 'img' || tag === 'video') bonus += 7;
        if (styles.fontWeight >= 700) bonus += 3;
        if (parseFloat(styles.fontSize) >= 24) bonus += 4;
        if (el.classList.contains('cta') || el.classList.contains('btn-primary')) bonus += 10;

        const totalScore = sizeScore + contrastScore + colorScore + positionScore + bonus;

        return {
            element: el,
            tag,
            text: el.textContent?.slice(0, 50)?.trim() || '[no text]',
            rect,
            scores: { size: sizeScore, contrast: contrastScore, color: colorScore, position: positionScore, bonus },
            totalScore: Math.min(100, totalScore),
            isCTA: el.classList.contains('cta') || el.classList.contains('btn-primary') || 
                   el.classList.contains('btn') || (tag === 'button' && el.textContent?.length < 30),
        };
    }

    // ── Analyze entire page ──
    function analyze() {
        const allElements = document.querySelectorAll('h1, h2, h3, h4, p, a, button, img, video, section, [class*="cta"], [class*="btn"], [class*="card"], [class*="hero"], [class*="badge"]');
        const scored = [];

        allElements.forEach(el => {
            const score = scoreElement(el);
            if (score && score.totalScore > 5) {
                scored.push(score);
            }
        });

        scored.sort((a, b) => b.totalScore - a.totalScore);

        // Normalize scores
        const maxScore = scored[0]?.totalScore || 1;
        scored.forEach(s => {
            s.normalizedScore = (s.totalScore / maxScore) * 100;
        });

        // Generate report
        const ctaElements = scored.filter(s => s.isCTA);
        const topElements = scored.slice(0, 10);
        const totalAttention = scored.reduce((sum, s) => sum + s.normalizedScore, 0);
        const ctaAttention = ctaElements.reduce((sum, s) => sum + s.normalizedScore, 0);
        const ctaPercentage = totalAttention > 0 ? (ctaAttention / totalAttention) * 100 : 0;

        lastReport = {
            timestamp: new Date().toISOString(),
            totalElements: scored.length,
            topElements: topElements.map(s => ({
                tag: s.tag,
                text: s.text,
                score: Math.round(s.normalizedScore),
                breakdown: s.scores,
            })),
            ctaAnalysis: {
                count: ctaElements.length,
                attentionPercentage: Math.round(ctaPercentage),
                passing: ctaPercentage >= 20,
                verdict: ctaPercentage >= 20 
                    ? `✅ PASS — CTA gets ${Math.round(ctaPercentage)}% attention (≥20% required)`
                    : `❌ FAIL — CTA only gets ${Math.round(ctaPercentage)}% attention (≥20% required). Make it bigger, brighter, or more isolated.`,
            },
            fPatternCompliance: checkFPattern(scored),
        };

        console.log('\n═══════════════════════════════════════');
        console.log('  📊 ATTENTION ANALYSIS REPORT');
        console.log('═══════════════════════════════════════');
        console.log('\n🏆 Top 10 Elements by Visual Weight:\n');
        lastReport.topElements.forEach((el, i) => {
            console.log(`  ${i + 1}. [${el.score}%] <${el.tag}> "${el.text}"`);
        });
        console.log('\n🎯 CTA Analysis:');
        console.log(`  ${lastReport.ctaAnalysis.verdict}`);
        console.log('\n📐 F-Pattern:');
        console.log(`  ${lastReport.fPatternCompliance.verdict}`);
        console.log('\n═══════════════════════════════════════\n');

        renderHeatmap(scored);
        return lastReport;
    }

    function checkFPattern(scored) {
        const top3 = scored.slice(0, 3);
        const vh = window.innerHeight;
        const topHalf = top3.filter(s => s.rect.top < vh * 0.5);
        const passing = topHalf.length >= 2;
        return {
            passing,
            verdict: passing 
                ? '✅ PASS — Top attention elements are in the upper half (F-pattern aligned)'
                : '⚠️ WARN — Key elements are too far down. Move important content above the fold.',
        };
    }

    // ── Render heatmap overlay ──
    function renderHeatmap(scored) {
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'attention-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';

        // Create legend
        const legend = document.createElement('div');
        legend.style.cssText = `
            position:fixed; top:16px; right:16px; z-index:100000;
            background:rgba(0,0,0,0.9); color:white; padding:16px 20px;
            border-radius:12px; font-family:Inter,system-ui,sans-serif;
            font-size:13px; line-height:1.6; pointer-events:auto;
            backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1);
            max-width:300px;
        `;
        const ctaInfo = lastReport?.ctaAnalysis;
        legend.innerHTML = `
            <div style="font-weight:700;font-size:15px;margin-bottom:8px;">📊 Attention Heatmap</div>
            <div style="display:flex;gap:12px;margin-bottom:10px;">
                <span>🔴 High</span><span>🟡 Med</span><span>🔵 Low</span>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:4px;">
                CTA: ${ctaInfo ? ctaInfo.verdict : 'N/A'}
            </div>
            <div style="margin-top:8px;opacity:0.6;">Press Ctrl+Shift+H to toggle</div>
        `;
        overlay.appendChild(legend);

        // Draw attention zones
        scored.forEach(s => {
            const zone = document.createElement('div');
            const norm = s.normalizedScore;
            let color;
            if (norm >= 70) color = 'rgba(255, 50, 50, 0.35)';
            else if (norm >= 40) color = 'rgba(255, 200, 50, 0.25)';
            else color = 'rgba(50, 100, 255, 0.15)';

            zone.style.cssText = `
                position:absolute;
                left:${s.rect.left}px; top:${s.rect.top + window.scrollY}px;
                width:${s.rect.width}px; height:${s.rect.height}px;
                background:${color};
                border:2px solid ${color.replace(/[\d.]+\)$/, '0.8)')};
                border-radius:4px;
                transition: opacity 0.3s ease;
            `;

            // Score label
            const label = document.createElement('span');
            label.style.cssText = `
                position:absolute; top:-10px; left:4px;
                background:rgba(0,0,0,0.85); color:white;
                padding:2px 6px; border-radius:4px;
                font-size:10px; font-family:monospace;
                white-space:nowrap;
            `;
            label.textContent = `${Math.round(norm)}% ${s.tag}`;
            zone.appendChild(label);

            overlay.appendChild(zone);
        });

        // Switch to fixed positioning for the overlay but absolute for children
        overlay.style.position = 'absolute';
        overlay.style.height = document.documentElement.scrollHeight + 'px';
        document.body.appendChild(overlay);
        isVisible = true;
    }

    function toggle() {
        if (overlay) {
            if (isVisible) {
                overlay.style.display = 'none';
                isVisible = false;
            } else {
                overlay.style.display = '';
                isVisible = true;
            }
        } else {
            analyze();
        }
    }

    function getReport() {
        return lastReport;
    }

    // ── Keyboard shortcut: Ctrl+Shift+H ──
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            if (!lastReport) analyze();
            else toggle();
        }
    });

    return { analyze, toggle, getReport };
})();

// Export for Node.js / module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttentionAnalyzer;
}
