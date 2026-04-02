/**
 * ═══════════════════════════════════════════════════════════
 * ELITE PERSONALIZATION ENGINE
 * Replaces Mutiny — Real-time visitor-based content swapping
 * 
 * HOW IT WORKS:
 * Detects visitor signals (time of day, device, referrer,
 * return visitor, scroll depth, geo-hint) and personalizes
 * content in real-time. Zero dependencies, localStorage-based.
 * 
 * USAGE:
 *   <script src="automation/personalization-engine.js"></script>
 *   <script>
 *     PersonalizationEngine.rule('hero-headline', {
 *       // Show different headline for returning visitors
 *       condition: (visitor) => visitor.isReturning,
 *       apply: () => {
 *         document.querySelector('h1').textContent = 'Welcome back — ready to continue?';
 *       }
 *     });
 *
 *     PersonalizationEngine.rule('cta-urgency', {
 *       // Show urgency for visitors who've been on page > 30s
 *       condition: (visitor) => visitor.timeOnPage > 30,
 *       apply: () => {
 *         document.querySelector('.cta-subtext').textContent = 
 *           'Only 3 spots left today';
 *       }
 *     });
 *
 *     PersonalizationEngine.init();
 *   </script>
 * ═══════════════════════════════════════════════════════════
 */

const PersonalizationEngine = (() => {
    const STORAGE_KEY = 'elite_personalization';
    const rules = [];
    let visitor = {};
    let initialized = false;

    // ── Detect visitor signals ──
    function detectVisitor() {
        const stored = getStoredData();
        const now = new Date();
        const hour = now.getHours();

        visitor = {
            // Time context
            timeOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
            hour,
            dayOfWeek: now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase(),
            isWeekend: [0, 6].includes(now.getDay()),

            // Device context
            isMobile: window.innerWidth < 768,
            isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
            isDesktop: window.innerWidth >= 1024,
            isTouchDevice: 'ontouchstart' in window,
            screenWidth: window.innerWidth,

            // Referrer context
            referrer: document.referrer,
            isFromGoogle: document.referrer.includes('google'),
            isFromSocial: /facebook|twitter|instagram|linkedin|tiktok/i.test(document.referrer),
            isDirect: !document.referrer,

            // Return visitor
            isReturning: stored.visitCount > 1,
            visitCount: stored.visitCount,
            firstVisit: stored.firstVisit,
            lastVisit: stored.lastVisit,
            totalPageViews: stored.totalPageViews,

            // UTM parameters
            utm: parseUTM(),

            // Engagement (updated dynamically)
            timeOnPage: 0,
            scrollDepth: 0,
            interactionCount: 0,

            // Geo hint (from timezone)
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
        };

        // Update stored data
        stored.visitCount = (stored.visitCount || 0) + 1;
        stored.totalPageViews = (stored.totalPageViews || 0) + 1;
        if (!stored.firstVisit) stored.firstVisit = now.toISOString();
        stored.lastVisit = now.toISOString();
        saveStoredData(stored);

        return visitor;
    }

    function parseUTM() {
        const params = new URLSearchParams(window.location.search);
        return {
            source: params.get('utm_source') || null,
            medium: params.get('utm_medium') || null,
            campaign: params.get('utm_campaign') || null,
            content: params.get('utm_content') || null,
        };
    }

    // ── Storage ──
    function getStoredData() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
        catch { return {}; }
    }
    function saveStoredData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // ── Track engagement ──
    function trackEngagement() {
        const startTime = Date.now();

        // Time on page
        setInterval(() => {
            visitor.timeOnPage = Math.floor((Date.now() - startTime) / 1000);
            evaluateDynamicRules();
        }, 5000);

        // Scroll depth
        window.addEventListener('scroll', () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            visitor.scrollDepth = docHeight > 0 ? Math.round((window.scrollY / docHeight) * 100) : 0;
        }, { passive: true });

        // Interaction counting
        document.addEventListener('click', () => { visitor.interactionCount++; });
    }

    // ── Rule management ──
    function rule(name, config) {
        rules.push({
            name,
            condition: config.condition,
            apply: config.apply,
            priority: config.priority || 0,
            once: config.once !== false, // Default: run only once
            dynamic: config.dynamic || false, // Re-evaluate over time
            applied: false,
        });
    }

    function evaluateRules() {
        const sorted = [...rules].sort((a, b) => b.priority - a.priority);
        sorted.forEach(r => {
            if (r.applied && r.once) return;
            if (r.dynamic) return; // Dynamic rules run in trackEngagement
            try {
                if (r.condition(visitor)) {
                    r.apply(visitor);
                    r.applied = true;
                    console.log(`[Personalization] ✅ Applied rule: "${r.name}"`);
                }
            } catch (err) {
                console.error(`[Personalization] ❌ Rule "${r.name}" failed:`, err);
            }
        });
    }

    function evaluateDynamicRules() {
        rules.filter(r => r.dynamic && !r.applied).forEach(r => {
            try {
                if (r.condition(visitor)) {
                    r.apply(visitor);
                    r.applied = true;
                    console.log(`[Personalization] ✅ Dynamic rule triggered: "${r.name}"`);
                }
            } catch (err) {
                console.error(`[Personalization] ❌ Dynamic rule "${r.name}" failed:`, err);
            }
        });
    }

    // ── Initialization ──
    function init() {
        if (initialized) return;
        initialized = true;

        detectVisitor();
        trackEngagement();

        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(evaluateRules, 100);
            });
        } else {
            setTimeout(evaluateRules, 100);
        }

        console.log('[Personalization] 🎯 Engine initialized.');
        console.log('[Personalization] Visitor profile:', {
            timeOfDay: visitor.timeOfDay,
            device: visitor.isMobile ? 'mobile' : visitor.isTablet ? 'tablet' : 'desktop',
            returning: visitor.isReturning,
            visits: visitor.visitCount,
            referrer: visitor.referrer || 'direct',
        });
    }

    // ── Preset Rules (Common Patterns) ──
    const presets = {
        // Greet returning visitors differently
        returningVisitor: (selector, newText) => rule('returning-visitor', {
            condition: (v) => v.isReturning,
            apply: () => { 
                const el = document.querySelector(selector);
                if (el) el.textContent = newText;
            },
        }),

        // Time-of-day greeting
        timeGreeting: (selector) => rule('time-greeting', {
            condition: () => true,
            apply: (v) => {
                const el = document.querySelector(selector);
                if (!el) return;
                const greetings = {
                    morning: 'Good morning',
                    afternoon: 'Good afternoon',
                    evening: 'Good evening',
                    night: 'Working late?',
                };
                el.textContent = greetings[v.timeOfDay] || 'Welcome';
            },
        }),

        // Show urgency after X seconds
        urgencyAfter: (seconds, selector, text) => rule('urgency-timer', {
            condition: (v) => v.timeOnPage >= seconds,
            apply: () => {
                const el = document.querySelector(selector);
                if (el) {
                    el.textContent = text;
                    el.style.display = 'block';
                }
            },
            dynamic: true,
        }),

        // Mobile-specific CTA text
        mobileCTA: (selector, mobileText) => rule('mobile-cta', {
            condition: (v) => v.isMobile,
            apply: () => {
                const el = document.querySelector(selector);
                if (el) el.textContent = mobileText;
            },
        }),

        // UTM-based headline
        utmHeadline: (selector, utmSource, text) => rule(`utm-${utmSource}`, {
            condition: (v) => v.utm.source === utmSource,
            apply: () => {
                const el = document.querySelector(selector);
                if (el) el.textContent = text;
            },
        }),
    };

    function getVisitor() { return { ...visitor }; }

    return { rule, init, presets, getVisitor };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalizationEngine;
}
