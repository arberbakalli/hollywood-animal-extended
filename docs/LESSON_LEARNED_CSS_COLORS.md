# Lesson Learned: CSS Color System Pitfall

**Time Lost**: 1 hour 45 minutes  
**Date**: 2026-09-24

## The Problem

Attempted to apply **genre colors to HTML select element fields** using CSS variables and JavaScript, but the text color never displayed—it remained white or showed unwanted fallback colors.

## Root Cause

Native HTML `<select>` elements have **browser-level limitations** on styling the selected text. Specifically:

1. **CSS `!important` flags override inline styles**: When CSS has `color: var(--category-color) !important;`, inline JavaScript `select.style.color = value` gets overridden, even with `setProperty('color', value, 'important')` in some browsers.

2. **Native select styling is restricted**: Browser vendors prevent predictable styling of the selected-value text in `<select>` elements for security/UX reasons. The `<option>` elements inside can be colored, but the displayed field text is hard to control.

3. **Fallback colors hide the real problem**: When a CSS variable is undefined, the fallback masks the issue—the user sees blue-gray or white, making it look like a code bug instead of a browser limitation.

## Why It Was Hard to Debug

- The **dropdown options showed colors correctly** (CSS working on `<option>` elements)
- The **selected field text stayed white** (CSS `!important` blocking inline styles)
- **Browser DevTools showed the inline style was applied**, but the browser ignored it
- No console errors—browser silently dropped the style

This created a contradiction: "The code looks right, the CSS is there, but it doesn't work."

## Solution

For **dynamic per-item styling** on native selects:

1. **Option 1 (Current)**: Accept browser limitation on `<select>` field text color. Style the `<option>` elements and borders instead. User can infer selected genre from the colored border + dropdown display.

2. **Option 2 (Better UX)**: Replace `<select>` with a custom dropdown component (e.g., Combobox with divs) that gives full control over styling.

3. **Option 3 (Workaround)**: Use a hidden select + custom styled trigger button that mirrors the select's value and applies the color.

## Implementation Checklist

✅ Genre dropdown options: Colored correctly  
✅ Genre borders: Colored correctly  
✅ Genre selected field text: White (browser limitation accepted)  
✅ Clear color on deselect: Working (prevents fallback green)  

## For Future Color Work

**Before spending time on native select styling:**

1. Test in browser DevTools: does `element.style.color = "red"` work?
2. If yes in DevTools but no in code → check for CSS `!important` overrides
3. If no in DevTools → it's a browser limitation, not a code bug
4. Document the limitation and move on

**Never assume**:
- CSS variables are set (they might be undefined)
- Inline styles override CSS (not if `!important` is used)
- Native form elements style the same as divs (they don't)

---

**Takeaway**: Browser limitations ≠ code bugs. Verify in DevTools first, read MDN docs on `<select>` styling constraints, then decide if the limitation is acceptable or if UX redesign is needed.
