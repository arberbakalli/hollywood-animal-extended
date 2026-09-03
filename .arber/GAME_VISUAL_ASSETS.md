# Hollywood Animal Game - Visual Assets & Brand Identity

## Executive Summary

The game's visual identity can be extracted from:
1. **Portraits bundle** - Contains Colman Graves' character image + other character portraits
2. **Icons bundle** - Contains category icons and UI elements
3. **Posters bundle** - May have color scheme examples for different genres
4. **Assembly-CSharp.dll** - Code for UI color rendering logic (needs decompilation/analysis)

---

## Asset Locations & Files

### Base Path
```
C:\Program Files (x86)\Steam\steamapps\common\Hollywood Animal\Hollywood Animal_Data\StreamingAssets\AssetBundles\
```

### Critical Bundles

#### 1. **portraits** (40.5 MB)
**Contains:** Character portraits, including Colman Graves  
**Reference:** "NEWS_GRAVES_PHOTO" in Assembly-CSharp.dll  
**How to Extract:**
```bash
# Asset bundles are Unity serialized format (binary)
# Requires Unity asset bundle extractor or similar tool
# Popular tools: AssetStudio, UABE (Unity Asset Bundle Extractor)
```
**Expected Content:**
- Graves' character portrait/headshot (likely 256x256 or 512x512)
- Name: "COLEMAN_GRAVES" or similar variant

#### 2. **icons** (27.3 MB)
**Contains:** UI icons for script categories (Genre, Setting, Protagonist, etc.)  
**Expected Icons:**
```
- ActionIcon.png / ActionIcon.sprite
- ComedyIcon.png
- DramaIcon.png
- FantasyKingdomIcon.png
- ModernAmericanCityIcon.png
- ProagonistCowboyIcon.png
- AntagonistBanditIcon.png
- [and so on for ~250+ tags]
```

#### 3. **postersettings** (9.98 MB)
**Contains:** Movie poster visual settings, color schemes by genre  
**May Include:** Genre-specific color palettes, visual themes

#### 4. **readymadeposters** (285 MB)
**Contains:** Pre-generated movie posters showing genre/theme color combos  
**Useful For:** Extracting real-world color schemes used in-game

#### 5. **scripts** (5.87 MB)
**Contains:** Script-related UI elements, verdict displays

---

## Extracting Assets: Step-by-Step

### Prerequisite
Install **AssetStudio** (free, open-source):
```
https://github.com/Perfare/AssetStudio/releases
```

### Extract Graves' Portrait
```
1. Open AssetStudio
2. File → Open → Navigate to:
   C:\Program Files (x86)\Steam\steamapps\common\Hollywood Animal\Hollywood Animal_Data\StreamingAssets\AssetBundles\portraits
3. Load the bundle
4. Search for: "Graves" or "COLEMAN" or "NEWS_GRAVES"
5. Right-click → Export Texture
6. Save as PNG
```

### Extract Category Icons
```
1. Open AssetStudio
2. File → Open → icons bundle
3. Search for: "ACTION", "COMEDY", "GENRE", "PROTAGONIST", etc.
4. Export all matching sprites as PNG
5. Save to: hollywood-calculator/assets/icons/[category]/
```

### Extract Color Schemes
```
1. Open postersettings or readymadeposters bundle
2. Look for any ColorScheme, ThemeData, or GradientData objects
3. If UI prefabs exist, they may contain color definitions:
   - Canvas color: Main background
   - Button colors: Interactive elements
   - Text colors: Labels, headers
4. Document: Format as CSS custom properties
```

---

## Expected Color Palette (Estimated from Game Design)

Based on typical game UI patterns, expect:

```css
/* Primary Colors (by Category) */
--color-genre: #FF6B35 or #E84C3D (Action-oriented red/orange)
--color-setting: #4ECDC4 or #6DB3D8 (Environment-oriented teal/blue)
--color-protagonist: #95E1D3 or #A8E6CF (Character-oriented green/mint)
--color-antagonist: #AA4C49 or #6C464F (Dark/antagonistic brown/maroon)
--color-supporting: #F38181 or #FFB4B4 (Supporting-oriented pink/light red)
--color-theme: #FFEAA7 or #FFD93D (Thematic-oriented yellow/gold)
--color-finale: #DDA15E or #BC6C25 (Finale-oriented brown/warm)

/* Verdict Colors */
--color-verdict-successful: #2ECC71 or #27AE60 (Green for 4.0+)
--color-verdict-common: #F39C12 or #E67E22 (Orange for 3.5+)
--color-verdict-unsuccessful: #E74C3C or #C0392B (Red for <3.0)

/* Neutral Colors */
--color-bg-primary: #1A1A1A or #2C3E50 (Dark background)
--color-bg-secondary: #34495E or #2D3E50 (Lighter background)
--color-text-primary: #FFFFFF or #ECF0F1 (Light text)
--color-text-secondary: #BDC3C7 or #95A5A6 (Dimmed text)
```

---

## Graves' Verdict Display System

### From Game Analysis:

**Verdict Thresholds:**
- **4.0+ Average Compatibility** → "Graves' Approved" (Green badge)
- **3.5-3.99 Average Compatibility** → "Graves' Neutral" (Yellow/Orange badge)
- **Below 3.0** → "Graves' Rejected" (Red badge)

**Expected Display Elements:**
1. **Graves' Portrait** - Small circular/square headshot (40x40 or 64x64px)
2. **Verdict Badge** - Icon + text (e.g., "✓ Approved" or "✗ Rejected")
3. **Score Display** - "4.3 / 5.0" numerical readout
4. **Comment Box** - Optional narrative feedback (from game's dialogue system)

**Typical UI Layout:**
```
┌─────────────────────────────────┐
│  [Graves Portrait] COLMAN GRAVES │
│  ✓ Approved · 4.3 / 5.0          │
│                                  │
│  "A compelling tale. Your script  │
│   demonstrates strong narrative   │
│   synergy."                        │
└─────────────────────────────────┘
```

---

## Implementation Guide for Calculator UI

### Option 1: Match Game Visual Exactly
1. Extract assets from bundles using AssetStudio
2. Optimize images for web (TinyPNG, etc.)
3. Convert to WebP format for performance
4. Embed in calculator HTML/CSS

### Option 2: Recreate in CSS/HTML
If asset extraction is difficult, recreate Graves' verdict using:
1. **CSS Flexbox** for badge layout
2. **SVG Avatar** for Graves' portrait (stylized/minimalist)
3. **Color variables** matching extracted palette
4. **Font matching** - Use similar serif/sans-serif to game

### Option 3: Hybrid Approach (Recommended)
1. Extract Graves' actual portrait (most distinctive element)
2. Use CSS-based icons for categories (easier than extracting 250+ sprites)
3. Use CSS-defined colors (extract hex from game, then adjust for web accessibility)

---

## Tools Needed

| Tool | Purpose | Download |
|------|---------|----------|
| **AssetStudio** | Extract assets from Unity bundles | https://github.com/Perfare/AssetStudio |
| **TinyPNG** | Compress extracted images | https://tinypng.com |
| **ColorHexa** | Analyze extracted colors | https://www.colorhexa.com |
| **FontIdentifier** | Match game fonts | https://www.fontface.ninja |
| **ColorSnatch** | Screenshot color picker | Browser extension |

---

## What We Still Need to Find

1. ✅ Graves' portrait → **portraits bundle**
2. ✅ Category icons → **icons bundle**  
3. ⏳ Color scheme → Extract from postersettings/readymadeposters
4. ⏳ Verdict display logic → Assembly-CSharp.dll decompilation
5. ⏳ Fonts used → Game UI analysis (likely Inter, Roboto, or similar)
6. ⏳ Animation effects → Verdict animations (fade-in, highlight effects)

---

## Quick Reference: Asset Bundle Names

```
portraits           - Character images (Graves!)
icons              - UI category icons
postersettings     - Visual theme data by genre
readymadeposters   - Example movie posters (color reference)
scripts            - Script-related UI
adspatterns        - Advertisement patterns (may have color schemes)
buildings          - Building UI (background colors)
```

---

## File Paths (For Quick Access)

```
Game Path:  C:\Program Files (x86)\Steam\steamapps\common\Hollywood Animal
Bundles:    \Hollywood Animal_Data\StreamingAssets\AssetBundles\
Data:       \Hollywood Animal_Data\StreamingAssets\Data\Configs\
```

**After extraction, save to:**
```
hollywood/assets/
  ├── images/
  │   ├── graves-portrait.png
  │   ├── graves-portrait.webp
  │   └── verdict-badges/
  ├── icons/
  │   ├── genre/
  │   ├── setting/
  │   └── ... (category folders)
  └── colors.css (extracted color variables)
```

---

## Next Steps

1. **Download AssetStudio** and extract Graves' portrait
2. **Export icon bundle** and sort by category
3. **Screenshot color schemes** from postersettings
4. **Create color palette file** (CSS custom properties)
5. **Update calculator header** with Graves badge
6. **Style exclusion UI** with game category colors

---

**Generated:** September 3, 2026  
**Status:** Ready for asset extraction and visual implementation  
**Estimated Time to Visual Parity:** 2-4 hours (asset extraction + optimization + CSS integration)
