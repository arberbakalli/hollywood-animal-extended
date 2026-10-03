import { test, expect, openHollywood } from '../fixtures/base.js';

// Measures rendered colors, including color-mix and transparent ancestor layers.
// This protects readability without pinning any particular palette hex value.
async function textContrast(locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = color => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).map(value => value / 255);
    };
    const blend = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
    const ancestors = [];
    for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
    let background = [1, 1, 1];
    for (const node of ancestors) background = blend(rgba(getComputedStyle(node).backgroundColor), background);
    const foreground = blend(rgba(getComputedStyle(element).color), background);
    const luminance = rgb => rgb.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

async function categoryBorderMatchesPalette(locator) {
  return locator.evaluate(element => {
    const group = element.closest('.category-group');
    if (!group) return false;
    const probe = document.createElement('span');
    probe.style.color = 'var(--category-color)';
    group.appendChild(probe);
    const paletteColor = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(element).borderTopColor === paletteColor;
  });
}

async function selectorTextMatchesPalette(locator) {
  return locator.evaluate(element => {
    const group = element.closest('.category-group');
    if (!group) return false;
    const probe = document.createElement('span');
    probe.style.color = 'var(--category-color)';
    group.appendChild(probe);
    const paletteColor = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(element).color === paletteColor;
  });
}

async function categoryOptionsMatchPalette(locator) {
  return locator.evaluate(element => {
    const group = element.closest('.category-group');
    if (!group) return false;
    const probe = document.createElement('span');
    probe.style.color = 'var(--category-color)';
    group.appendChild(probe);
    const paletteColor = getComputedStyle(probe).color;
    probe.remove();
    return Array.from(element.querySelectorAll('option:not(:first-child)')).every(option =>
      getComputedStyle(option).color === paletteColor
    );
  });
}

async function genreSelectorMatchesSelectedPalette(locator) {
  return locator.evaluate(element => {
    if (!element.dataset.genre) return false;
    const probe = document.createElement('span');
    probe.dataset.genre = element.dataset.genre;
    probe.style.color = 'var(--tag-color)';
    document.body.appendChild(probe);
    const paletteColor = getComputedStyle(probe).color;
    probe.remove();
    const style = getComputedStyle(element);
    return style.color === paletteColor && style.borderTopColor === paletteColor;
  });
}

async function genreOptionsMatchPalette(locator) {
  return locator.evaluate(element => Array.from(element.querySelectorAll('option[class*="genre-"]')).every(option => {
    const probe = document.createElement('span');
    probe.className = option.className;
    probe.style.color = 'var(--tag-color)';
    document.body.appendChild(probe);
    const paletteColor = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(option).color === paletteColor;
  }));
}

for (const width of [390, 1280]) {
  test(`TC21-000001 ${width}px: genre text remains readable and stable when a dropdown gains focus`, async ({ steps, page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openHollywood(steps);
    const select = page.locator('#inputs-genre-generator select.tag-selector');
    expect(await categoryBorderMatchesPalette(select), `genre placeholder border uses category palette at ${width}px`).toBe(true);
    await select.focus();
    const genres = await select.locator('option[value]:not([value=""])').evaluateAll(options => options.map(option => option.value));
    expect(genres).toHaveLength(11);
    expect(await genreOptionsMatchPalette(select), `genre options use documented palette at ${width}px`).toBe(true);
    for (const genre of genres) {
      await select.selectOption(genre);
      await select.blur();
      const restingColor = await select.evaluate(node => getComputedStyle(node).color);
      expect(await genreSelectorMatchesSelectedPalette(select), `${genre} selected text and border use documented palette at ${width}px`).toBe(true);
      await select.focus();
      await expect(select).toHaveCSS('color', restingColor);
      const remove = select.locator('..').locator('.remove-btn');
      const [selectBox, removeBox] = await Promise.all([select.boundingBox(), remove.boundingBox()]);
      expect(removeBox.x).toBeGreaterThanOrEqual(selectBox.x + selectBox.width);
      expect(removeBox.x + removeBox.width).toBeLessThanOrEqual(width);
    }
    for (const category of ['setting', 'protagonist', 'antagonist', 'supporting-character', 'theme-event', 'finale']) {
      const picker = page.locator(`#inputs-${category}-generator select.tag-selector`);
      expect(await categoryBorderMatchesPalette(picker), `${category} placeholder border uses category palette`).toBe(true);
      expect(await textContrast(picker), `${category} placeholder contrast`).toBeGreaterThanOrEqual(4.5);
      await picker.focus();
      expect(await categoryOptionsMatchPalette(picker), `${category} options use category palette`).toBe(true);
      await picker.selectOption({ index: 1 });
      expect(await selectorTextMatchesPalette(picker), `${category} selected text uses category palette`).toBe(true);
    }
    await select.selectOption('DRAMA');
    await page.screenshot({ path: testInfo.outputPath(`genre-${width}.png`), fullPage: true });
  });

  test(`TC21-000002 ${width}px: genre suggestions remain readable across all Best Matches views`, async ({ steps, page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openHollywood(steps);
    await page.locator('#tab-evaluate-button').click();
    const genre = page.locator('#inputs-genre-graves select.tag-selector');
    await genre.focus();
    await genre.selectOption('COMEDY');
    const setting = page.locator('#inputs-setting-graves select.tag-selector');
    await setting.focus();
    await setting.selectOption('WILD_WEST');
    await page.locator('#gravesBestCategoryFilter').selectOption('Genre');
    await page.locator('#gravesBestScoreFilter').selectOption('0');
    await page.locator('#generateBestMatchesButton').click();
    for (const mode of ['additions', 'swaps', 'pairwise']) {
      await page.locator(`#graves-best-mode-${mode}`).click();
      const chips = page.locator('#gravesBestMatchesList .best-match-tag');
      expect(await chips.count()).toBeGreaterThan(0);
      for (const chip of await chips.all()) {
        expect(await textContrast(chip), `${mode} ${await chip.textContent()} suggestion contrast`).toBeGreaterThanOrEqual(4.5);
        const box = await chip.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
    await page.locator('#graves-best-matches-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`pairwise-${width}.png`) });
  });
}
