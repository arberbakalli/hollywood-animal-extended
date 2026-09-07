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
        setToneClass
    };
})(globalThis);
