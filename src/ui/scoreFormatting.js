(function(global) {
    "use strict";

    function updateSliderTrack(slider, colorOverride = null) {
        const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        const isArt = slider.classList.contains('art-slider');
        // Default logic
        let color = isArt ? '#a0a0ff' : '#d4af37';
        if (colorOverride) color = colorOverride;

        slider.style.setProperty('--slider-fill-color', color);
        slider.style.setProperty('--slider-fill-percent', `${value}%`);
    }

    function updatePercentSliderTrack(slider) {
        const value = slider.value;
        const color = '#d4af37';
        slider.style.setProperty('--slider-fill-color', color);
        slider.style.setProperty('--slider-fill-percent', `${value}%`);
    }

    function formatScore(num) {
        if (Math.abs(num) < 0.005) return "0";
        return (num > 0 ? "+" : "") + num.toFixed(2);
    }

    function formatSimpleScore(num) {
        if (Math.abs(num) < 0.005) return "0";
        return (num > 0 ? "+" : "") + parseFloat(num.toFixed(2));
    }

    // Movie scores carry one decimal, since 0.1 is reachable, but an exact zero
    // reads as "0" rather than "0.0" — matching formatScore/formatSimpleScore above.
    function formatMovieScore(num) {
        if (Math.abs(num) < 0.05) return "0";
        return num.toFixed(1);
    }

    // A movie score runs 0.0 to 10.0 (GAME_RULES.md section 1). The slider
    // stops there, but the number box accepts any value, and the planners read
    // the box: 12 gave a week 1 of 24,000 (audit 2026-09-30). Every reader goes
    // through this.
    function readMovieScoreInput(id) {
        const value = parseFloat(document.getElementById(id)?.value);
        if (!Number.isFinite(value)) return 0;
        return Math.min(10, Math.max(0, value));
    }

    function setToneClass(element, tone) {
        element.classList.remove('tone-success', 'tone-danger', 'tone-neutral', 'tone-accent', 'tone-art');
        element.classList.add(`tone-${tone}`);
    }

    global.HACScoreFormatting = {
        updateSliderTrack,
        updatePercentSliderTrack,
        formatScore,
        formatSimpleScore,
        formatMovieScore,
        readMovieScoreInput,
        setToneClass
    };
})(globalThis);
