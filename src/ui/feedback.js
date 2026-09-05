(function(global) {
    "use strict";

    function showFeedbackMessage(elementId, message, tone = 'danger') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = `app-feedback app-feedback-${tone}`;
        element.classList.remove('hidden');
    }

    function clearFeedbackMessage(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = '';
        element.classList.add('hidden');
    }

    global.HACFeedback = {
        showFeedbackMessage,
        clearFeedbackMessage
    };
})(globalThis);
