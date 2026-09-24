(function(global) {
    "use strict";

    let ageRoleData = null;

    const APPEAL_SCALE = {
        "-5.0": "Disastrous",
        "-4.0": "Very Bad",
        "-3.0": "Bad",
        "-2.0": "Slightly Bad",
        "-1.0": "Slightly Bad",
        "0.0": "Neutral",
        "1.0": "Slightly Good",
        "2.0": "Slightly Good",
        "3.0": "Good",
        "4.0": "Very Good",
        "5.0": "Excellent"
    };

    async function loadAgeRoleData() {
        if (ageRoleData) return ageRoleData;
        try {
            const response = await fetch('data/TagsToAgeCompatibilityData.json');
            ageRoleData = await response.json();
            return ageRoleData;
        } catch (error) {
            console.warn('Could not load age/role compatibility data:', error);
            return null;
        }
    }

    function getSelectedRoleInGenerator() {
        const protagonistSelect = document.querySelector(
            '#inputs-protagonist-generator .tag-selector'
        );
        const antagonistSelect = document.querySelector(
            '#inputs-antagonist-generator .tag-selector'
        );

        if (protagonistSelect && protagonistSelect.value) {
            return { type: 'Protagonist', id: protagonistSelect.value };
        }
        if (antagonistSelect && antagonistSelect.value) {
            return { type: 'Antagonist', id: antagonistSelect.value };
        }
        return null;
    }

    function buildAgeRoleTable(roleId, roleData) {
        const ageGroups = [
            { key: 'YOUNG', label: 'Young (18-39M / 18-34F)' },
            { key: 'MID', label: 'Mid (40-59M / 35-49F)' },
            { key: 'OLD', label: 'Old (60+M / 50+F)' }
        ];

        const genders = [
            { key: 'M', label: 'Male' },
            { key: 'F', label: 'Female' }
        ];

        let html = '<table class="age-role-appeal-table">';
        html += '<thead><tr><th>Age Group</th>';
        genders.forEach(g => {
            html += `<th>${g.label}</th>`;
        });
        html += '</tr></thead><tbody>';

        ageGroups.forEach(age => {
            html += `<tr><td class="age-group-label">${age.label}</td>`;
            genders.forEach(gender => {
                const dataKey = `${age.key}_${gender.key}`;
                const appeal = roleData[dataKey] || 0;
                const appealClass = getAppealClass(appeal);
                const appealLabel = getAppealLabel(appeal);
                html += `<td class="appeal-cell ${appealClass}" title="${appealLabel}">
                    <span class="appeal-value">${appeal.toFixed(1)}</span>
                </td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        return html;
    }

    function getAppealClass(appeal) {
        if (appeal >= 4.0) return 'appeal-excellent';
        if (appeal >= 3.0) return 'appeal-very-good';
        if (appeal >= 2.0) return 'appeal-good';
        if (appeal >= 1.0) return 'appeal-slightly-good';
        if (appeal >= -1.0) return 'appeal-neutral';
        if (appeal >= -2.0) return 'appeal-slightly-bad';
        if (appeal >= -3.0) return 'appeal-bad';
        if (appeal >= -4.0) return 'appeal-very-bad';
        return 'appeal-disastrous';
    }

    function getAppealLabel(appeal) {
        const key = appeal.toFixed(1);
        return APPEAL_SCALE[key] || 'Unknown';
    }

    function getTopAgeGenderCombination(roleData) {
        let topAppeal = -Infinity;
        let topAgeGender = '';

        for (const [key, value] of Object.entries(roleData)) {
            if (key.includes('_') && value > topAppeal) {
                topAppeal = value;
                topAgeGender = key;
            }
        }

        if (topAgeGender === '') return '';

        const [age, gender] = topAgeGender.split('_');
        const ageLabel = {
            YOUNG: 'Young',
            MID: 'Mid-aged',
            OLD: 'Older'
        }[age];

        const genderLabel = gender === 'M' ? 'Male' : 'Female';

        return `Peak appeal: ${genderLabel} ${ageLabel} audiences (${topAppeal.toFixed(1)})`;
    }

    async function updateAgeRoleBreakdown() {
        const data = await loadAgeRoleData();
        if (!data) {
            hideAgeRolePanel();
            return;
        }

        const selected = getSelectedRoleInGenerator();
        if (!selected) {
            hideAgeRolePanel();
            return;
        }

        const roleData = data[selected.id];
        if (!roleData) {
            hideAgeRolePanel();
            return;
        }

        showAgeRolePanel(selected, roleData);
    }

    function showAgeRolePanel(selected, roleData) {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (!panel) return;

        const roleLabel = document.getElementById('ageRoleSelectedRole');
        const tableContainer = document.getElementById('ageRoleTableContainer');
        const insight = document.getElementById('ageRoleInsight');

        if (roleLabel) {
            const tagData = GAME_DATA.tags[selected.id];
            const tagName = tagData ? tagData.name : selected.id;
            roleLabel.textContent = `Appeal by age group and gender for: ${tagName} (${selected.type})`;
        }

        if (tableContainer) {
            tableContainer.innerHTML = buildAgeRoleTable(selected.id, roleData);
        }

        if (insight) {
            insight.textContent = getTopAgeGenderCombination(roleData);
        }

        panel.classList.remove('hidden');
    }

    function hideAgeRolePanel() {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (panel) panel.classList.add('hidden');
    }

    function setupAgeRoleBreakdownListeners() {
        const protagonistContainer = document.getElementById('inputs-protagonist-generator');
        const antagonistContainer = document.getElementById('inputs-antagonist-generator');

        if (protagonistContainer) {
            protagonistContainer.addEventListener('change', () => {
                updateAgeRoleBreakdown();
            });
        }

        if (antagonistContainer) {
            antagonistContainer.addEventListener('change', () => {
                updateAgeRoleBreakdown();
            });
        }
    }

    global.HACAnalysisAgeRoleBreakdown = {
        setupAgeRoleBreakdownListeners,
        updateAgeRoleBreakdown,
        loadAgeRoleData
    };
})(globalThis);
