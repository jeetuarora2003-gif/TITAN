/* ═══════════════════════════════════════════════════════════════
   TITAN V4 — Ambient Lux JS (Rotor Studio Inspired)
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    window.addEventListener('load', init);

    function init() {
        initLenis();
        initPreloader();
    }

    /* ── Lenis Smooth Scroll ── */
    let lenis;
    function initLenis() {
        if (typeof Lenis === 'undefined') return;
        lenis = new Lenis({
            duration: 1.5, // Slightly slower for that heavy luxury feel
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
        });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        }
    }

    /* ── Preloader (Bar Fill instead of number) ── */
    function initPreloader() {
        const preloader = document.getElementById('preloader');
        const fill = document.getElementById('preloader-fill');
        if (!preloader || !fill || typeof gsap === 'undefined') {
            if (preloader) preloader.style.display = 'none';
            initGSAP();
            return;
        }

        gsap.to(fill, {
            scaleX: 1,
            duration: 1.8,
            ease: 'power3.inOut',
            onComplete: () => {
                // Initialize GSAP here so elements are set to initial state BEFORE they are revealed
                initGSAP();
                
                gsap.to(preloader, {
                    yPercent: -100, // Slide up like a mechanical shutter
                    duration: 1.4,
                    ease: 'power3.inOut',
                    onComplete: () => {
                        preloader.style.display = 'none';
                    }
                });
            }
        });
    }

    function initGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        gsap.registerPlugin(ScrollTrigger);

        heroAnimations();
        ambientGlows();
        manifestoReveal();
        collectionReveal();
        legacyCounters();

        // Navbar Scroll Reveal
        ScrollTrigger.create({
            trigger: '.hero',
            start: 'bottom 80%', // Triggers when the bottom of hero reaches 80% down the screen
            onEnter: () => document.querySelector('.nav').classList.add('scrolled'),
            onLeaveBack: () => document.querySelector('.nav').classList.remove('scrolled')
        });
    }

    /* ── Hero: Fluid Split Entrance + Parallax + Ring ── */
    function heroAnimations() {
        // Create the timeline
        const tl = gsap.timeline();

        // Delay the start of the hero animation slightly so the preloader is halfway up
        // 1. Watch Entrance
        tl.fromTo('#hero-watch', 
            { opacity: 0, y: 60, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 2.2, ease: 'power3.out' },
            0.8 
        )
        // 3. Text Entrance
        .fromTo('.hero-headline .line-inner', 
            { y: 150 },
            { y: 0, duration: 1.6, stagger: 0.1, ease: 'power4.out' },
            1.0 
        );

        // 4. The Fluid Split (Starts simultaneously with settling entrance)
        if (window.innerWidth >= 900) {
            tl.to('#hero-watch-wrap', {
                x: '-20vw',
                scale: 0.9,
                duration: 2.4,
                ease: 'power3.inOut'
            }, 1.2)
            .to('#hero-content', {
                x: '20vw',
                scale: 0.85,
                duration: 2.4,
                ease: 'power3.inOut'
            }, 1.2)
            .fromTo('.hero-ring',
                { opacity: 0, scale: 0.8 },
                { opacity: 0.1, scale: 1, duration: 2.4, ease: 'power2.out' },
                1.2
            );
        } else {
            // Mobile Vertical Split (Watch goes up, Text goes down)
            tl.to('#hero-watch-wrap', {
                y: '-18vh',
                scale: 0.9,
                duration: 2.4,
                ease: 'power3.inOut'
            }, 1.2)
            .to('#hero-content', {
                y: '16vh',
                duration: 2.4,
                ease: 'power3.inOut'
            }, 1.2)
            .fromTo('.hero-ring',
                { opacity: 0, scale: 0.8 },
                { opacity: 0.25, scale: 1, duration: 2.4, ease: 'power2.out' },
                1.2
            );
        }

        // 5. Final UI elements
        tl.fromTo(['.hero-eyebrow', '.hero-sub', '.hero-foot'],
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'power2.out' },
            2.2 // Settles at the end of the sequence
        );

        // Continuous float for watch
        gsap.to('#hero-watch', {
            y: -15,
            rotation: 1,
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
        });

        // Mouse Parallax for hero
        const heroWrap = document.getElementById('hero-watch-wrap');
        const watch = document.getElementById('hero-watch');
        const ring = document.getElementById('hero-ring');
        
        if (window.innerWidth > 1024 && heroWrap) {
            heroWrap.addEventListener('mousemove', (e) => {
                const x = (e.clientX / window.innerWidth - 0.5) * 2;
                const y = (e.clientY / window.innerHeight - 0.5) * 2;
                
                gsap.to(watch, { x: x * 20, y: y * 20, rotationY: x * 5, rotationX: -y * 5, duration: 1.5, ease: 'power2.out' });
                gsap.to(ring, { x: x * -15, y: y * -15, duration: 1.5, ease: 'power2.out' });
            });
            heroWrap.addEventListener('mouseleave', () => {
                gsap.to([watch, ring], { x: 0, y: 0, rotationY: 0, rotationX: 0, duration: 1.5, ease: 'power2.out' });
            });
        }

        // Scroll Parallax (Fades out hero on scroll)
        gsap.to(['#hero-watch-wrap', '#hero-content'], {
            yPercent: 40,
            opacity: 0,
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    /* ── Ambient Glows (Rotor Style) ── */
    function ambientGlows() {
        // Fade glows in and out as you scroll past them
        document.querySelectorAll('.ambient-glow').forEach(glow => {
            gsap.fromTo(glow, 
                { opacity: 0, scale: 0.8 },
                { 
                    opacity: 1, scale: 1, 
                    scrollTrigger: {
                        trigger: glow.parentElement,
                        start: 'top 60%',
                        end: 'bottom 40%',
                        toggleActions: 'play reverse play reverse'
                    }
                }
            );
        });

        // specific parallax for hero aurora
        gsap.to('#hero-aurora', {
            yPercent: 30, scale: 1.2, opacity: 0.5,
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    /* ── Manifesto Reveal ── */
    function manifestoReveal() {
        const el = document.getElementById('manifesto-text');
        if (!el) return;
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
        
        gsap.to(el.querySelectorAll('.word'), {
            scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 40%', scrub: 0.5 },
            opacity: 1, stagger: 0.05, ease: 'none'
        });
    }

    /* ── Collection Reveals ── */
    function collectionReveal() {
        document.querySelectorAll('.collection-panel').forEach(panel => {
            const img = panel.querySelector('.panel-img');
            const content = panel.querySelector('.panel-content');
            
            // Image reveal
            gsap.fromTo(img, 
                { opacity: 0, filter: 'blur(10px)', scale: 0.95 },
                { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.5, ease: 'power3.out', 
                  scrollTrigger: { trigger: panel, start: 'top 75%' } }
            );

            // Content slide up
            gsap.fromTo(content,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: 'power3.out',
                  scrollTrigger: { trigger: panel, start: 'top 70%' } }
            );
        });

        // Add universal reveal for all section headings (fixes the empty space glitch)
        document.querySelectorAll('.section-heading .line-inner, .finale-heading .line-inner').forEach(line => {
            gsap.to(line, {
                y: 0,
                duration: 1.4,
                ease: 'power4.out',
                scrollTrigger: { trigger: line.closest('section, header'), start: 'top 85%' }
            });
        });

        // Reveal craft cards and voice cards as they enter viewport
        gsap.utils.toArray('.craft-grid, .voices-grid').forEach(grid => {
            const cards = grid.querySelectorAll('.craft-card, .voice-card');
            gsap.fromTo(cards, 
                { opacity: 0, y: 30 }, 
                { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power3.out',
                  scrollTrigger: { trigger: grid, start: 'top 85%' }
                }
            );
        });
        
        // Also reveal finale content elements
        gsap.fromTo('.finale-sub, .finale-ctas', 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 1, delay: 0.4, stagger: 0.2, ease: 'power2.out',
              scrollTrigger: { trigger: '.finale', start: 'top 70%' }
            }
        );
    }

    /* ── Legacy Counters ── */
    function legacyCounters() {
        document.querySelectorAll('.legacy-num').forEach(num => {
            const target = parseInt(num.dataset.target, 10);
            ScrollTrigger.create({
                trigger: num, start: 'top 85%', once: true,
                onEnter: () => {
                    const obj = { val: 0 };
                    gsap.to(obj, {
                        val: target, duration: 2, ease: 'power2.out',
                        onUpdate: () => num.textContent = Math.floor(obj.val),
                        onComplete: () => num.textContent = target
                    });
                }
            });
        });
    }

})();
