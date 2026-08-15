// ==UserScript==
// @name         SuccessFactors Skip Video
// @namespace    https://github.com/successfactors-skip-video
// @version      1.2.0
// @description  Setzt bei allen Video-/Audio-Elementen die Abspielgeschwindigkeit auf 10 und springt ans Ende (Dauer - 1s). Manuell per Button oder Taste "S".
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
                }
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Fallback für Player, die Elemente ersetzen oder currentTime zurücksetzen.
    setInterval(() => {
        scan(document);
        addButton();
    }, 2000);
})();
