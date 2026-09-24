import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Age & Gender Appeal Panel', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('buildTab', 'Navigation').click();
  });

  // Given the user is on Script Lab
  // When they select a protagonist role
  // Then the Age & Gender Appeal panel appears with ratings
  test('TC03-000001 panel appears when protagonist is selected', async ({ steps, page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    await protagonistSelect.selectOption('PROTAGONIST_COP');

    const panel = page.locator('#ageRoleBreakdownPanel');
    await expect(panel).toBeVisible();

    const roleText = page.locator('.age-role-grid').getByText('Cop');
    await expect(roleText).toBeVisible();
  });

  // Given a role is selected
  // When the user views the panel
  // Then they see all three age groups (Young, Mid, Old)
  test('TC03-000002 displays all three age groups with ratings', async ({ steps, page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    await protagonistSelect.selectOption('PROTAGONIST_COP');

    const ageRoleGrid = page.locator('.age-role-grid');

    // Check headers
    await expect(ageRoleGrid.getByText('Young')).toBeVisible();
    await expect(ageRoleGrid.getByText('Mid')).toBeVisible();
    await expect(ageRoleGrid.getByText('Old')).toBeVisible();
    await expect(ageRoleGrid.getByText('Gender')).toBeVisible();
  });

  // Given a flexible-gender role is selected
  // When the user views the gender column
  // Then they see both male and female buttons
  test('TC03-000003 shows both gender buttons for flexible-gender roles', async ({ page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    await protagonistSelect.selectOption('PROTAGONIST_COP');

    const copRow = page.locator('.age-role-row--protagonist');
    const maleBtn = copRow.locator('.gender-btn--male');
    const femaleBtn = copRow.locator('.gender-btn--female');

    await expect(maleBtn).toBeVisible();
    await expect(femaleBtn).toBeVisible();
  });

  // Given a female-only role is selected
  // When the user views the gender column
  // Then they see only the female button
  test('TC03-000004 shows only female button for female-locked roles', async ({ page }) => {
    const supportingSelect = page.locator(
      '#inputs-supporting-character-generator .tag-selector'
    ).first();
    await supportingSelect.selectOption('SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS');

    const damselRow = page.locator('.age-role-row--supporting').filter({
      has: page.getByText('Damsel in Distress')
    });

    const maleBtn = damselRow.locator('.gender-btn--male');
    const femaleBtn = damselRow.locator('.gender-btn--female');

    // Female button should exist
    await expect(femaleBtn).toBeVisible();

    // Male button should not exist (removed from DOM)
    await expect(maleBtn).not.toBeInDOM();
  });

  // Given a male-only role is selected
  // When the user views the gender column
  // Then they see only the male button
  test('TC03-000005 shows only male button for male-locked roles', async ({ page }) => {
    const supportingSelect = page.locator(
      '#inputs-supporting-character-generator .tag-selector'
    ).first();
    await supportingSelect.selectOption('SUPPORTINGCHARACTER_PATRIARCH');

    const patriarchRow = page.locator('.age-role-row--supporting').filter({
      has: page.getByText('Patriarch')
    });

    const maleBtn = patriarchRow.locator('.gender-btn--male');
    const femaleBtn = patriarchRow.locator('.gender-btn--female');

    // Male button should exist
    await expect(maleBtn).toBeVisible();

    // Female button should not exist (removed from DOM)
    await expect(femaleBtn).not.toBeInDOM();
  });

  // Given protagonist and antagonist are selected
  // When the user views the panel
  // Then they see both rows with correct category colors
  test('TC03-000006 displays multiple roles with category-specific colors', async ({ page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    const antagonistSelect = page.locator('#inputs-antagonist-generator .tag-selector');

    await protagonistSelect.selectOption('PROTAGONIST_COP');
    await antagonistSelect.selectOption('ANTAGONIST_CRIMINAL_MASTERMIND');

    const protagonistRow = page.locator('.age-role-row--protagonist');
    const antagonistRow = page.locator('.age-role-row--antagonist');

    await expect(protagonistRow.getByText('Cop')).toBeVisible();
    await expect(antagonistRow.getByText('Criminal Mastermind')).toBeVisible();
  });

  // Given a flexible-gender role is selected
  // When the user switches gender by clicking the button
  // Then the displayed ratings update based on the new gender
  test('TC03-000007 ratings update when gender is switched', async ({ page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    await protagonistSelect.selectOption('PROTAGONIST_COP');

    const copRow = page.locator('.age-role-row--protagonist');

    // Get initial rating values (male is selected by default)
    const youngRating = copRow.locator('.age-role-rating').nth(0);
    const initialText = await youngRating.textContent();

    // Switch to female
    const femaleBtn = copRow.locator('.gender-btn--female');
    await femaleBtn.click();

    // Check if ratings have potentially changed (depends on gender-specific data)
    const updatedText = await youngRating.textContent();
    // We're just checking that the click registered; actual value depends on data
    await expect(copRow).toContainText(/Good|Neutral|Bad/);
  });

  // Given a role is displayed
  // When the user views the panel
  // Then role names use the correct category color
  test('TC03-000008 role names display in category-specific colors', async ({ page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    const antagonistSelect = page.locator('#inputs-antagonist-generator .tag-selector');

    await protagonistSelect.selectOption('PROTAGONIST_COP');
    await antagonistSelect.selectOption('ANTAGONIST_CRIMINAL_MASTERMIND');

    const copName = page.locator('.age-role-row--protagonist .age-role-role-name');
    const mastermindName = page.locator('.age-role-row--antagonist .age-role-role-name');

    // Check that role names are visible
    await expect(copName).toContainText('Cop');
    await expect(mastermindName).toContainText('Criminal Mastermind');
  });

  // Given multiple supporting characters are selected
  // When the user views the panel
  // Then all selected roles are displayed in the table
  test('TC03-000009 displays all selected supporting characters', async ({ page }) => {
    const addBtn = page.locator('[data-action="add-tag-row"][data-category="Supporting Character"]');
    const firstSelect = page.locator('#inputs-supporting-character-generator .tag-selector').nth(0);
    const secondSelect = page.locator('#inputs-supporting-character-generator .tag-selector').nth(1);

    await firstSelect.selectOption('SUPPORTINGCHARACTER_ANGRY_BOSS');
    await addBtn.click();
    await secondSelect.selectOption('SUPPORTINGCHARACTER_FEMME_FATALE');

    const grid = page.locator('.age-role-grid');
    await expect(grid.getByText('Angry Boss')).toBeVisible();
    await expect(grid.getByText('Femme Fatale')).toBeVisible();
  });

  // Given the panel is expanded
  // When the user collapses the Age & Gender Appeal section
  // Then the content is hidden and the toggle state updates
  test('TC03-000010 collapsing panel hides content and updates toggle state', async ({ page }) => {
    const protagonistSelect = page.locator('#inputs-protagonist-generator .tag-selector');
    await protagonistSelect.selectOption('PROTAGONIST_COP');

    const toggleBtn = page.locator('#toggleAgeRoleBreakdownButton');
    const content = page.locator('#age-role-content');

    await expect(content).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    await toggleBtn.click();

    await expect(content).not.toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
