// ==UserScript==
// @name         SuccessFactors Skip Video
// @namespace    https://github.com/successfactors-skip-video
// @version      1.3.0
// @description  Setzt bei Video/Audio sowie SVG-/Canvas-basierten Animationen die Wiedergabe auf schnell und springt nahe ans Ende. Manuell per Button oder Taste "S".
// @author       -
// @match        *://*.successfactors.com/*
// @match        *://*.successfactors.eu/*
// @match        *://*.sapsf.com/*
// @match        *://*.sapsf.eu/*
// @run-at       document-idle
// @all-frames   true
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PLAYBACK_RATE = 10;
    const END_OFFSET = 1;
    const END_OFFSET_MS = END_OFFSET * 1000;

    function skip(media) {
        try {
            try {
                if (media.playbackRate !== PLAYBACK_RATE) {
                    media.playbackRate = PLAYBACK_RATE;
                }
            } catch (err) {
                console.warn('[SF Skip Video] Abspielgeschwindigkeit konnte nicht gesetzt werden:', err);
            }

            const duration = media.duration;
            if (!Number.isFinite(duration) || duration <= 0) {
                return;
            }

            const target = Math.max(0, duration - END_OFFSET);
            if (media.currentTime < target) {
                media.currentTime = target;
            }
        } catch (err) {
            console.warn('[SF Skip Video] Aktion fehlgeschlagen:', err);
        }
    }

    function handle(media) {
        if (media.dataset.sfSkipHooked === '1') {
            skip(media);
            return;
        }
        media.dataset.sfSkipHooked = '1';

        // Metadaten werden oft erst nach dem Einfügen ins DOM geladen.
        media.addEventListener('loadedmetadata', () => skip(media));
        media.addEventListener('durationchange', () => skip(media));
        media.addEventListener('play', () => skip(media));
        media.addEventListener('ratechange', () => {
            if (media.playbackRate !== PLAYBACK_RATE) {
                media.playbackRate = PLAYBACK_RATE;
            }
        });

        skip(media);
    }

    function scan(root) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }
        root.querySelectorAll('video, audio').forEach(handle);
    }

    function parseTimeMs(value) {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const num = Number.parseFloat(trimmed);
        if (!Number.isFinite(num)) {
            return null;
        }
        if (trimmed.endsWith('ms')) {
            return num;
        }
        if (trimmed.endsWith('s')) {
            return num * 1000;
        }
        return num * 1000;
    }

    function skipWebAnimation(animation) {
        try {
            if (animation.playbackRate !== PLAYBACK_RATE) {
                animation.playbackRate = PLAYBACK_RATE;
            }

            if (!animation.effect || typeof animation.effect.getComputedTiming !== 'function') {
                return;
            }

            const timing = animation.effect.getComputedTiming();
            const endTime = timing ? timing.endTime : null;
            if (!Number.isFinite(endTime) || endTime <= 0) {
                return;
            }

            const target = Math.max(0, endTime - END_OFFSET_MS);
            if (typeof animation.currentTime === 'number') {
                if (animation.currentTime < target) {
                    animation.currentTime = target;
                }
            } else {
                animation.currentTime = target;
            }
        } catch (err) {
            console.warn('[SF Skip Video] Web-Animation konnte nicht geskippt werden:', err);
        }
    }

    function skipWebAnimations(scope) {
        try {
            const target = scope && typeof scope.getAnimations === 'function' ? scope : document;
            target.getAnimations({ subtree: true }).forEach(skipWebAnimation);
        } catch (err) {
            console.warn('[SF Skip Video] Auslesen von Web-Animationen fehlgeschlagen:', err);
        }
    }

    function skipSvgSmil(root) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }

        const animations = root.querySelectorAll('svg animate, svg animateTransform, svg animateMotion, svg set');
        let maxDurationMs = 0;

        animations.forEach((anim) => {
            try {
                if (typeof anim.getSimpleDuration === 'function') {
                    const durationSec = anim.getSimpleDuration();
                    if (Number.isFinite(durationSec) && durationSec > 0) {
                        maxDurationMs = Math.max(maxDurationMs, durationSec * 1000);
                        return;
                    }
                }
            } catch (err) {
                // Ignore unsupported getSimpleDuration implementations.
            }

            const durAttr = anim.getAttribute('dur');
            const durMs = parseTimeMs(durAttr);
            if (Number.isFinite(durMs) && durMs > 0) {
                maxDurationMs = Math.max(maxDurationMs, durMs);
            }
        });

        if (maxDurationMs <= 0) {
            return;
        }

        const targetSec = Math.max(0, (maxDurationMs - END_OFFSET_MS) / 1000);
        root.querySelectorAll('svg').forEach((svg) => {
            try {
                if (typeof svg.setCurrentTime === 'function') {
                    svg.setCurrentTime(targetSec);
                }
            } catch (err) {
                console.warn('[SF Skip Video] SVG-Sprung fehlgeschlagen:', err);
            }
        });
    }

    function skipLottie() {
        try {
            const lottie = window.lottie || window.bodymovin;
            if (!lottie || typeof lottie.getRegisteredAnimations !== 'function') {
                return;
            }

            const registered = lottie.getRegisteredAnimations();
            if (!Array.isArray(registered)) {
                return;
            }

            registered.forEach((anim) => {
                try {
                    if (typeof anim.setSpeed === 'function') {
                        anim.setSpeed(PLAYBACK_RATE);
                    }
                    const totalFrames = anim.totalFrames;
                    if (Number.isFinite(totalFrames) && totalFrames > 1 && typeof anim.goToAndStop === 'function') {
                        anim.goToAndStop(totalFrames - 1, true);
                    }
                } catch (err) {
                    console.warn('[SF Skip Video] Lottie-Sprung fehlgeschlagen:', err);
                }
            });
        } catch (err) {
            console.warn('[SF Skip Video] Lottie-Erkennung fehlgeschlagen:', err);
        }
    }

    function skipSvgAndCanvas(root) {
        skipWebAnimations(document);
        skipSvgSmil(root || document);
        skipLottie();
    }

    const MESSAGE = 'sf-skip-video:run';

    function runInFrames(win) {
        for (let i = 0; i < win.frames.length; i++) {
            try {
                win.frames[i].postMessage(MESSAGE, '*');
            } catch (err) {
                // Cross-Origin-Frames ignorieren.
            }
        }
    }

    function runSkip() {
        scan(document);
        skipSvgAndCanvas(document);
        runInFrames(window);
    }

    window.addEventListener('message', (event) => {
        if (event.data === MESSAGE) {
            runSkip();
        }
    });

    function isTypingTarget(target) {
        if (!target) {
            return false;
        }
        if (target.isContentEditable) {
            return true;
        }
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 's' && event.key !== 'S') {
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        if (isTypingTarget(event.target)) {
            return;
        }
        event.preventDefault();
        runSkip();
    }, true);

    function addButton() {
        if (window.top !== window.self || document.getElementById('sf-skip-video-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'sf-skip-video-btn';
        button.type = 'button';
        button.textContent = 'Skip Video (S)';
        button.style.cssText = [
            'position:fixed',
            'bottom:20px',
            'right:20px',
            'z-index:2147483647',
            'padding:10px 16px',
            'font:600 13px/1.2 system-ui, sans-serif',
            'color:#fff',
            'background:#0a6ed1',
            'border:none',
            'border-radius:6px',
            'box-shadow:0 2px 8px rgba(0,0,0,.3)',
            'cursor:pointer'
        ].join(';');

        button.addEventListener('click', (event) => {
            event.preventDefault();
            runSkip();
        });

        document.body.appendChild(button);
    }

    if (document.body) {
        addButton();
    } else {
        document.addEventListener('DOMContentLoaded', addButton, { once: true });
    }

    scan(document);
    skipSvgAndCanvas(document);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }
                const tag = node.tagName;
                if (tag === 'VIDEO' || tag === 'AUDIO') {
                    handle(node);
                } else {
                    scan(node);
                    skipSvgAndCanvas(node);
                }
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Fallback für Player, die Elemente ersetzen oder currentTime zurücksetzen.
    setInterval(() => {
        scan(document);
        skipSvgAndCanvas(document);
        addButton();
    }, 2000);
})();
