// ==UserScript==
// @name         SuccessFactors Skip Video
// @namespace    https://github.com/successfactors-skip-video
// @version      0.1.0
// @description  Findet alle Video-/Audio-Elemente auf SuccessFactors-Seiten, auch dynamisch nachgeladene.
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

    function handle(media) {
        if (media.dataset.sfSkipHooked === '1') {
            return;
        }
        media.dataset.sfSkipHooked = '1';
        console.debug('[SF Skip Video] Medienelement gefunden:', media);
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
