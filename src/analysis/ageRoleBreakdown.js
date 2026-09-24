// Age & Gender Appeal Panel Handler
// Create stub immediately so appShell.js doesn't error
if (!window.HACAnalysisAgeRoleBreakdown) {
    window.HACAnalysisAgeRoleBreakdown = {
        setupAgeRoleBreakdownListeners: () => {}
    };
}

// Populate with actual implementation
window.HACAnalysisAgeRoleBreakdown = (() => {
    'use strict';

    let ageRoleData = null;
    const genderState = { protagonist: 'M', antagonist: 'M', supporting: 'M' };

    const ROLE_COLORS = {
        'protagonist': '#55EA83',
        'antagonist': '#A1B1FF',
        'supporting': '#8BEAFF'
    };

    const RATING_COLORS = {
        'Good': '#2d7a3d',      // Dark green
        'Neutral': '#666666',   // Dark gray
        'Bad': '#8b3a3a'        // Dark red
    };

    const GENDER_BUTTON_COLORS = {
        'M': { border: '#5ba3d0', bg: 'rgba(91, 163, 208, 0.15)', text: '#5ba3d0' },
        'F': { border: '#d976a8', bg: 'rgba(217, 118, 168, 0.15)', text: '#d976a8' }
    };

    async function loadAgeRoleData() {
        if (ageRoleData) return ageRoleData;
        try {
            const response = await fetch('data/age-role-compatibility.json');
            ageRoleData = await response.json();
            return ageRoleData;
        } catch (error) {
            console.warn('Could not load age/role compatibility data:', error);
            return null;
        }
    }

    function getSelectedRoles() {
        const roles = [];

        // Protagonist
        const protagonistSelect = document.querySelector(
            '#inputs-protagonist-generator .tag-selector:not([value=""])'
        );
        if (protagonistSelect && protagonistSelect.value) {
            roles.push({
                type: 'protagonist',
                id: protagonistSelect.value,
                displayName: protagonistSelect.options[protagonistSelect.selectedIndex].text
            });
        }

        // Antagonist
        const antagonistSelect = document.querySelector(
            '#inputs-antagonist-generator .tag-selector:not([value=""])'
        );
        if (antagonistSelect && antagonistSelect.value) {
            roles.push({
                type: 'antagonist',
                id: antagonistSelect.value,
                displayName: antagonistSelect.options[antagonistSelect.selectedIndex].text
            });
        }

        // Supporting Characters
        const supportingSelects = document.querySelectorAll(
            '#inputs-supporting-character-generator .tag-selector'
        );
        supportingSelects.forEach(select => {
            if (select.value) {
                const normalizedId = select.value.replace('SUPPORTINGCHARACTER_', 'SUPPORTING_CHARACTER_');
                roles.push({
                    type: 'supporting',
                    id: normalizedId,
                    displayName: select.options[select.selectedIndex].text
                });
            }
        });

        return roles;
    }

    function createGenderToggle(roleType) {
        const container = document.createElement('div');
        container.className = 'gender-toggle';
        container.style.cssText = 'display: flex; gap: 6px;';

        const currentGender = genderState[roleType] || 'M';

        // Male button
        const maleBtn = document.createElement('button');
        maleBtn.innerHTML = '♂';
        maleBtn.className = `gender-btn ${currentGender === 'M' ? 'active' : ''}`;
        const maleColors = GENDER_BUTTON_COLORS['M'];
        maleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'M' ? maleColors.border : '#555'};
            background: ${currentGender === 'M' ? maleColors.bg : 'transparent'};
            color: ${currentGender === 'M' ? maleColors.text : '#888'};
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        maleBtn.onclick = (e) => {
            e.stopPropagation();
            setGender(roleType, 'M');
            updateAgeRoleBreakdown();
        };

        // Female button
        const femaleBtn = document.createElement('button');
        femaleBtn.innerHTML = '♀';
        femaleBtn.className = `gender-btn ${currentGender === 'F' ? 'active' : ''}`;
        const femaleColors = GENDER_BUTTON_COLORS['F'];
        femaleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'F' ? femaleColors.border : '#555'};
            background: ${currentGender === 'F' ? femaleColors.bg : 'transparent'};
            color: ${currentGender === 'F' ? femaleColors.text : '#888'};
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        femaleBtn.onclick = (e) => {
            e.stopPropagation();
            setGender(roleType, 'F');
            updateAgeRoleBreakdown();
        };

        container.appendChild(maleBtn);
        container.appendChild(femaleBtn);
        return container;
    }

    function setGender(roleType, gender) {
        genderState[roleType] = gender;
    }

    function buildAgeTable(roles, ageGroups) {
        if (roles.length === 0) {
            return '<p style="color: #999; text-align: center; padding: 20px;">Select at least one role to see age appeal</p>';
        }

        const ROLE_BG_COLORS = {
            'protagonist': 'rgba(80, 128, 88, 0.3)',
            'antagonist': 'rgba(88, 64, 144, 0.3)',
            'supporting': 'rgba(88, 128, 152, 0.3)'
        };

        const ROLE_BORDER_COLORS = {
            'protagonist': '#508058',
            'antagonist': '#584090',
            'supporting': '#588098'
        };

        let html = '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">';

        // Header row
        html += '<div style="display: flex; align-items: center; padding: 10px 15px; gap: 15px; border-bottom: 1px solid #444; margin-bottom: 5px;">';
        html += '<div style="flex: 0 0 120px; color: #999; font-weight: 600; font-size: 12px;">Role</div>';
        html += '<div style="flex: 1; text-align: center; color: #999; font-weight: 600; font-size: 12px;">Young</div>';
        html += '<div style="flex: 1; text-align: center; color: #999; font-weight: 600; font-size: 12px;">Mid</div>';
        html += '<div style="flex: 1; text-align: center; color: #999; font-weight: 600; font-size: 12px;">Old</div>';
        html += '<div style="flex: 0 0 auto; color: #999; font-weight: 600; font-size: 12px; width: 60px; text-align: center;">Gender</div>';
        html += '</div>';

        roles.forEach(role => {
            const roleType = role.type;
            const genderKey = `${roleType === 'protagonist' ? 'protagonists' : roleType === 'antagonist' ? 'antagonists' : 'supportingCharacters'}`;
            const roleData = ageGroups[genderKey]?.[role.id];

            if (roleData) {
                const roleColor = ROLE_COLORS[roleType];
                const bgColor = ROLE_BG_COLORS[roleType];
                const borderColor = ROLE_BORDER_COLORS[roleType];

                html += `<div style="display: flex; align-items: center; padding: 12px 15px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px; gap: 15px;">`;
                html += `<div style="flex: 0 0 120px; color: ${roleColor}; font-weight: 500;">${role.displayName}</div>`;

                ['YOUNG', 'MID', 'OLD'].forEach(ageGroup => {
                    const rating = roleData[ageGroup];
                    const ratingText = rating || '—';
                    const ratingColor = RATING_COLORS[rating] || '#888';
                    html += `<div style="flex: 1; text-align: center; color: ${ratingColor}; font-weight: 500; font-size: 14px;">${ratingText}</div>`;
                });

                html += `<div id="gender-toggle-${roleType}-${role.id}" style="flex: 0 0 auto; width: 60px; text-align: center;"></div>`;
                html += '</div>';
            }
        });

        html += '</div>';
        return html;
    }

    async function updateAgeRoleBreakdown() {
        const data = await loadAgeRoleData();
        if (!data) {
            hideAgeRolePanel();
            return;
        }

        const roles = getSelectedRoles();
        if (roles.length === 0) {
            hideAgeRolePanel();
            return;
        }

        showAgeRolePanel(roles, data);
    }

    function showAgeRolePanel(roles, data) {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (!panel) return;

        panel.style.display = 'flex';

        const contentDiv = document.getElementById('age-role-content');
        if (!contentDiv) return;

        let headerHtml = '<p style="margin: 0 0 15px 0; color: #999; font-size: 14px;">Select gender to view age appeal ratings:</p>';
        const tableHtml = buildAgeTable(roles, data);

        contentDiv.innerHTML = headerHtml + tableHtml;

        // Setup gender toggles
        roles.forEach(role => {
            const toggleContainer = document.getElementById(`gender-toggle-${role.type}-${role.id}`);
            if (toggleContainer) {
                toggleContainer.appendChild(createGenderToggle(role.type));
            }
        });
    }

    function hideAgeRolePanel() {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (panel) panel.style.display = 'none';
    }

    function setupAgeRoleBreakdownListeners() {
        // Initialize gender state
        genderState['protagonist'] = 'M';
        genderState['antagonist'] = 'M';
        genderState['supporting'] = 'M';

        updateAgeRoleBreakdown();

        // Listen for role changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('tag-selector')) {
                updateAgeRoleBreakdown();
            }
        });

        // Listen for role additions/removals
        const observer = new MutationObserver(() => {
            updateAgeRoleBreakdown();
        });

        const lockedContent = document.getElementById('locked-content');
        const excludedContent = document.getElementById('excluded-content');

        if (lockedContent) {
            observer.observe(lockedContent, { childList: true, subtree: true });
        }
        if (excludedContent) {
            observer.observe(excludedContent, { childList: true, subtree: true });
        }

        // Setup collapsible toggle for Age & Gender Appeal panel
        const ageToggle = document.querySelector('#toggleAgeRoleBreakdownButton');
        const ageContent = document.getElementById('age-role-content');
        if (ageToggle && ageContent) {
            const chevron = ageToggle.querySelector('.chevron');
            ageToggle.addEventListener('click', function() {
                const isHidden = ageContent.classList.contains('hidden');
                ageContent.classList.toggle('hidden');
                ageContent.hidden = !isHidden;
                if (chevron) {
                    chevron.classList.toggle('rotate-90');
                }
                this.setAttribute('aria-expanded', String(isHidden));
            });
        }
    }

    // Return public API
    return {
        setupAgeRoleBreakdownListeners,
        update: updateAgeRoleBreakdown,
        hidePanel: hideAgeRolePanel
    };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.HACAnalysisAgeRoleBreakdown) {
            window.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners();
        }
    });
} else {
    if (window.HACAnalysisAgeRoleBreakdown) {
        window.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners();
    }
}
