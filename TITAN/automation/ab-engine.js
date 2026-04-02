/**
 * ═══════════════════════════════════════════════════════════
 * ELITE A/B TESTING ENGINE
 * Replaces VWO — Lightweight client-side split testing
 * 
 * HOW IT WORKS:
 * 1. Define experiments with variant functions
 * 2. Engine randomly assigns visitors to variants (sticky via localStorage)
 * 3. Track conversions with simple API calls
 * 4. View results dashboard with Ctrl+Shift+A
 * 
 * USAGE:
 *   <script src="automation/ab-engine.js"></script>
 *   <script>
 *     // Define an experiment
 *     ABEngine.experiment('hero-headline', {
 *       control: () => {
 *         document.querySelector('h1').textContent = 'Build Faster';
 *       },
 *       variant_b: () => {
 *         document.querySelector('h1').textContent = 'Stop Wasting Hours Building Slow Sites';
 *       },
 *     });
 * 
 *     // Track conversion (call on CTA click, form submit, etc.)
 *     document.querySelector('.cta').addEventListener('click', () => {
 *       ABEngine.convert('hero-headline');
 *     });
 *   </script>
 * ═══════════════════════════════════════════════════════════
 */

const ABEngine = (() => {
    const STORAGE_KEY = 'elite_ab_data';
    let experiments = {};
    let dashboardEl = null;

    // ── Storage ──
    function getData() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // ── Core: Define Experiment ──
    function experiment(name, variants, options = {}) {
        const data = getData();
        const variantKeys = Object.keys(variants);

        if (variantKeys.length < 2) {
            console.warn(`[ABEngine] Experiment "${name}" needs at least 2 variants.`);
            return;
        }

        // Initialize experiment data if not exists
        if (!data[name]) {
            data[name] = {
                created: new Date().toISOString(),
                variants: {},
                assignedVariant: null,
            };
            variantKeys.forEach(key => {
                data[name].variants[key] = { views: 0, conversions: 0 };
            });
        }

        // Assign variant (sticky per visitor)
        let assigned = data[name].assignedVariant;
        if (!assigned || !variants[assigned]) {
            // Weighted random assignment (equal by default)
            const weights = options.weights || variantKeys.map(() => 1 / variantKeys.length);
            const rand = Math.random();
            let cumulative = 0;
            for (let i = 0; i < variantKeys.length; i++) {
                cumulative += weights[i];
                if (rand <= cumulative) {
                    assigned = variantKeys[i];
                    break;
                }
            }
            assigned = assigned || variantKeys[0];
            data[name].assignedVariant = assigned;
        }

        // Record view
        data[name].variants[assigned].views++;
        saveData(data);

        // Execute the assigned variant
        try {
            variants[assigned]();
        } catch (err) {
            console.error(`[ABEngine] Error in "${name}" variant "${assigned}":`, err);
        }

        // Store reference
        experiments[name] = { variants: variantKeys, assigned };

        console.log(`[ABEngine] 🧪 "${name}" → Running variant: "${assigned}"`);
        return assigned;
    }

    // ── Track Conversion ──
    function convert(experimentName, value = 1) {
        const data = getData();
        if (!data[experimentName]) {
            console.warn(`[ABEngine] No experiment found: "${experimentName}"`);
            return;
        }

        const assigned = data[experimentName].assignedVariant;
        if (assigned && data[experimentName].variants[assigned]) {
            data[experimentName].variants[assigned].conversions += value;
            saveData(data);
            console.log(`[ABEngine] ✅ Conversion recorded for "${experimentName}" → "${assigned}"`);
        }
    }

    // ── Get Results ──
    function getResults(experimentName) {
        const data = getData();
        if (experimentName) return data[experimentName] || null;
        return data;
    }

    // ── Calculate Stats ──
    function calcStats(experimentData) {
        const stats = {};
        let bestVariant = null;
        let bestRate = -1;

        Object.entries(experimentData.variants).forEach(([key, val]) => {
            const rate = val.views > 0 ? (val.conversions / val.views) * 100 : 0;
            stats[key] = {
                views: val.views,
                conversions: val.conversions,
                conversionRate: rate.toFixed(2) + '%',
            };
            if (rate > bestRate) {
                bestRate = rate;
                bestVariant = key;
            }
        });

        stats._winner = bestVariant;
        stats._winnerRate = bestRate;
        stats._isSignificant = Object.values(experimentData.variants).every(v => v.views >= 30);
        return stats;
    }

    // ── Dashboard (Ctrl+Shift+A) ──
    function showDashboard() {
        if (dashboardEl) {
            dashboardEl.remove();
            dashboardEl = null;
            return;
        }

        const data = getData();
        const experimentNames = Object.keys(data);

        dashboardEl = document.createElement('div');
        dashboardEl.id = 'ab-dashboard';
        dashboardEl.style.cssText = `
            position:fixed; inset:0; z-index:100001;
            background:rgba(0,0,0,0.92);
            backdrop-filter:blur(20px);
            display:flex; align-items:center; justify-content:center;
            font-family:Inter,system-ui,sans-serif; color:white;
            overflow-y:auto; padding:40px;
        `;

        let html = `
            <div style="max-width:700px;width:100%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
                    <h2 style="font-size:24px;font-weight:800;">🧪 A/B Testing Dashboard</h2>
                    <button onclick="this.closest('#ab-dashboard').remove()" 
                        style="background:rgba(255,255,255,0.1);border:none;color:white;
                        padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;">
                        ✕ Close
                    </button>
                </div>
        `;

        if (experimentNames.length === 0) {
            html += `<p style="opacity:0.5;">No experiments running yet.</p>`;
        }

        experimentNames.forEach(name => {
            const exp = data[name];
            const stats = calcStats(exp);
            const isActive = experiments[name];

            html += `
                <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                    border-radius:16px;padding:24px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h3 style="font-size:18px;font-weight:700;">${name}</h3>
                        <span style="font-size:12px;opacity:0.5;padding:4px 12px;
                            background:rgba(255,255,255,0.06);border-radius:20px;">
                            ${isActive ? '🟢 Active' : '⏸ Inactive'} · Assigned: ${exp.assignedVariant || 'none'}
                        </span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <thead>
                            <tr style="text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">
                                <th style="padding:8px 0;">Variant</th>
                                <th>Views</th>
                                <th>Conversions</th>
                                <th>Rate</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            Object.entries(stats).forEach(([key, val]) => {
                if (key.startsWith('_')) return;
                const isWinner = key === stats._winner && stats._isSignificant;
                html += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:10px 0;font-weight:600;">${key}</td>
                        <td>${val.views}</td>
                        <td>${val.conversions}</td>
                        <td style="font-weight:700;color:${isWinner ? '#4ade80' : 'inherit'}">
                            ${val.conversionRate}
                        </td>
                        <td>${isWinner ? '👑 Winner' : (stats._isSignificant ? '' : '⏳ Need 30+ views')}</td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        });

        html += `
                <div style="text-align:center;margin-top:20px;">
                    <button onclick="localStorage.removeItem('${STORAGE_KEY}');this.closest('#ab-dashboard').remove();"
                        style="background:rgba(255,50,50,0.2);border:1px solid rgba(255,50,50,0.3);
                        color:#ff6b6b;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:13px;">
                        🗑 Reset All Experiments
                    </button>
                </div>
            </div>
        `;

        dashboardEl.innerHTML = html;
        document.body.appendChild(dashboardEl);
    }

    // ── Reset ──
    function reset(experimentName) {
        const data = getData();
        if (experimentName) {
            delete data[experimentName];
        } else {
            localStorage.removeItem(STORAGE_KEY);
            experiments = {};
            console.log('[ABEngine] All experiments reset.');
            return;
        }
        saveData(data);
        console.log(`[ABEngine] Experiment "${experimentName}" reset.`);
    }

    // ── Keyboard shortcut: Ctrl+Shift+A ──
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            showDashboard();
        }
    });

    // ── Public API ──
    return {
        experiment,
        convert,
        getResults,
        reset,
        showDashboard,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ABEngine;
}
