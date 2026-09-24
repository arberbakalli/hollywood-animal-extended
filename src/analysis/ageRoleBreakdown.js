// Age & Gender Appeal Panel Handler
// Create stub immediately so appShell.js doesn't error
if (!window.HACAnalysisAgeRoleBreakdown) {
    window.HACAnalysisAgeRoleBreakdown = {
        setupAgeRoleBreakdownListeners: () => {}
    };
}

// Roles with gender constraints (can only be one gender)
const GENDER_LOCKED_ROLES = {
    'PROTAGONIST_AMBITIOUS_WOMAN': 'F',
    'SUPPORTING_CHARACTER_FEMME_FATALE': 'F',
    'SUPPORTING_CHARACTER_DAMSEL_IN_DISTRESS': 'F',
    'SUPPORTING_CHARACTER_PATRIARCH': 'M'
};

// Populate with actual implementation
window.HACAnalysisAgeRoleBreakdown = (() => {
    'use strict';

    let ageRoleData = null;
    let genderSpecificData = null;
    const genderState = {}; // Track gender per role ID

    const ROLE_COLORS = {
        'protagonist': '#55EA83',
        'antagonist': '#A1B1FF',
        'supporting': '#8BEAFF'
    };

    const RATING_COLORS = {
        'Good': '#2d7a3d',
        'Neutral': '#666666',
        'Bad': '#8b3a3a'
    };

    const GENDER_BUTTON_COLORS = {
        'M': { border: '#5ba3d0', bg: 'rgba(91, 163, 208, 0.15)', text: '#5ba3d0' },
        'F': { border: '#d976a8', bg: 'rgba(217, 118, 168, 0.15)', text: '#d976a8' }
    };

    async function loadAgeRoleData() {
        if (ageRoleData && genderSpecificData) return { ageRoleData, genderSpecificData };
        try {
            const [basicRes, genderRes] = await Promise.all([
                fetch('data/age-role-compatibility.json'),
                fetch('data/TagsToAgeCompatibilityData.json')
            ]);
            ageRoleData = await basicRes.json();
            genderSpecificData = await genderRes.json();
            return { ageRoleData, genderSpecificData };
        } catch (error) {
            console.warn('Could not load age/role compatibility data:', error);
            return { ageRoleData: null, genderSpecificData: null };
        }
    }

    function getSelectedRoles() {
        const roles = [];

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

    function getValidGenders(roleId) {
        if (GENDER_LOCKED_ROLES[roleId]) {
            return [GENDER_LOCKED_ROLES[roleId]];
        }
        return ['M', 'F'];
    }

    function createGenderToggle(roleType, roleId) {
        const container = document.createElement('div');
        container.className = 'gender-toggle';
        container.style.cssText = 'display: flex; gap: 6px;';

        const validGenders = getValidGenders(roleId);
        const currentGender = genderState[roleId] || validGenders[0] || 'M';

        // If only one valid gender, set it as default and disable toggle
        const isLocked = validGenders.length === 1;
        if (isLocked) {
            genderState[roleId] = validGenders[0];
        }

        const maleBtn = document.createElement('button');
        maleBtn.innerHTML = '♂';
        maleBtn.className = `gender-btn ${currentGender === 'M' ? 'active' : ''}`;
        maleBtn.disabled = !validGenders.includes('M');

        const maleColors = GENDER_BUTTON_COLORS['M'];
        maleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'M' ? maleColors.border : '#555'};
            background: ${currentGender === 'M' ? maleColors.bg : 'transparent'};
            color: ${currentGender === 'M' ? maleColors.text : '#888'};
            border-radius: 3px;
            cursor: ${!validGenders.includes('M') ? 'not-allowed' : 'pointer'};
            opacity: ${!validGenders.includes('M') ? '0.3' : '1'};
            font-size: 14px;
            transition: all 0.2s;
        `;
        maleBtn.title = !validGenders.includes('M') ? 'This role is not available as male' : '';
        maleBtn.onclick = (e) => {
            e.stopPropagation();
            if (validGenders.includes('M')) {
                setGender(roleId, 'M');
                updateAgeRoleBreakdown();
            }
        };

        const femaleBtn = document.createElement('button');
        femaleBtn.innerHTML = '♀';
        femaleBtn.className = `gender-btn ${currentGender === 'F' ? 'active' : ''}`;
        femaleBtn.disabled = !validGenders.includes('F');

        const femaleColors = GENDER_BUTTON_COLORS['F'];
        femaleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'F' ? femaleColors.border : '#555'};
            background: ${currentGender === 'F' ? femaleColors.bg : 'transparent'};
            color: ${currentGender === 'F' ? femaleColors.text : '#888'};
            border-radius: 3px;
            cursor: ${!validGenders.includes('F') ? 'not-allowed' : 'pointer'};
            opacity: ${!validGenders.includes('F') ? '0.3' : '1'};
            font-size: 14px;
            transition: all 0.2s;
        `;
        femaleBtn.title = !validGenders.includes('F') ? 'This role is not available as female' : '';
        femaleBtn.onclick = (e) => {
            e.stopPropagation();
            if (validGenders.includes('F')) {
                setGender(roleId, 'F');
                updateAgeRoleBreakdown();
            }
        };

        container.appendChild(maleBtn);
        container.appendChild(femaleBtn);
        return container;
    }

    function setGender(roleId, gender) {
        genderState[roleId] = gender;
    }

    function getRatingValue(roleId, ageGroup, gender) {
        // Try to get gender-specific value first
        if (genderSpecificData && genderSpecificData[roleId]) {
            const key = `${ageGroup}_${gender}`;
            if (genderSpecificData[roleId][key] !== undefined) {
                // Convert numeric rating to text
                const value = genderSpecificData[roleId][key];
                if (value >= 3.5) return 'Good';
                if (value >= 2.5) return 'Neutral';
                return 'Bad';
            }
        }
        // Fallback to basic data
        if (ageRoleData) {
            const genderKey = roleId.includes('PROTAGONIST') ? 'protagonists' :
                            roleId.includes('ANTAGONIST') ? 'antagonists' : 'supportingCharacters';
            const roleData = ageRoleData[genderKey]?.[roleId];
            if (roleData && roleData[ageGroup]) {
                return roleData[ageGroup];
            }
        }
        return '—';
    }

    function buildAgeTable(roles, data) {
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
            const roleColor = ROLE_COLORS[roleType];
            const bgColor = ROLE_BG_COLORS[roleType];
            const borderColor = ROLE_BORDER_COLORS[roleType];
            const gender = genderState[role.id] || 'M';

            html += `<div style="display: flex; align-items: center; padding: 12px 15px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px; gap: 15px;">`;
            html += `<div style="flex: 0 0 120px; color: ${roleColor}; font-weight: 500;">${role.displayName}</div>`;

            ['YOUNG', 'MID', 'OLD'].forEach(ageGroup => {
                const rating = getRatingValue(role.id, ageGroup, gender);
                const ratingColor = RATING_COLORS[rating] || '#888';
                html += `<div style="flex: 1; text-align: center; color: ${ratingColor}; font-weight: 500; font-size: 14px;">${rating}</div>`;
            });

            html += `<div id="gender-toggle-${roleType}-${role.id}" style="flex: 0 0 auto; width: 60px; text-align: center;"></div>`;
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    async function updateAgeRoleBreakdown() {
        const data = await loadAgeRoleData();
        if (!data.ageRoleData) {
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
                toggleContainer.appendChild(createGenderToggle(role.type, role.id));
            }
        });
    }

    function hideAgeRolePanel() {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (panel) panel.style.display = 'none';
    }

    function setupAgeRoleBreakdownListeners() {
        updateAgeRoleBreakdown();

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('tag-selector')) {
                updateAgeRoleBreakdown();
            }
        });

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

        // Setup collapsible toggle
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

    return {
        setupAgeRoleBreakdownListeners,
        update: updateAgeRoleBreakdown,
        hidePanel: hideAgeRolePanel
    };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.HACAnalysisAgeRoleBreakdown?.setupAgeRoleBreakdownListeners) {
            window.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners();
        }
    });
} else {
    if (window.HACAnalysisAgeRoleBreakdown?.setupAgeRoleBreakdownListeners) {
        window.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners();
    }
}
