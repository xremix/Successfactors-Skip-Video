// ==UserScript==
// @name         SuccessFactors Skip Video
// @namespace    https://github.com/successfactors-skip-video
// @version      1.0.0
// @description  Setzt bei allen Video-/Audio-Elementen die Abspielgeschwindigkeit auf 10 und springt ans Ende (Dauer - 1s).
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
            if (media.playbackRate !== PLAYBACK_RATE) {
                media.playbackRate = PLAYBACK_RATE;
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
    setInterval(() => scan(document), 2000);
})();
