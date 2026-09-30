# Holiday Bonuses Extraction — Complete Data

**Source:** `Hollywood Animal_Data/StreamingAssets/Data/Configs/Holidays.json`  
**Status:** ✅ Complete extraction of all 6 holidays  
**Date Extracted:** 2026-09-22

---

## Overview

The game includes 6 major holidays that provide demographic-specific audience bonuses during movie releases. Each holiday has:
- **Date Type:** 0 = fixed date, 1 = Nth occurrence (e.g., 4th Thursday)
- **Audience Bonuses:** Per-demographic percentage boost, separated by type (0=base, 1=artistic, 2=commercial)

All bonuses apply equally across bonus types (base, artistic, commercial) for each demographic.

---

## Holiday 1: VALENTINE (February 14)

**Date Config:**
- Type: Fixed (dateType: 0)
- Month: February (2)
- Day: 14
- DayOfWeek: Ignored (0)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +7.0% | +7.0% | +7.0% | Low |
| **TF (Girls)** | +15.0% | +15.0% | +15.0% | **Highest** |
| **YM (Young Men)** | +12.0% | +12.0% | +12.0% | Medium |
| **YF (Young Women)** | +30.0% | +30.0% | +30.0% | **HIGHEST** |
| **AM (Adult Men)** | +15.0% | +15.0% | +15.0% | Medium |
| **AF (Adult Women)** | Not listed | Not listed | Not listed | None |

**Strategic Insight:** Valentine's Day heavily favors female audiences (YF +30%, TF +15%, AF missing). Adult Women not listed suggests the bonus applies selectively.

---

## Holiday 2: INDEPENDENCE_DAY (July 4)

**Date Config:**
- Type: Fixed (dateType: 0)
- Month: July (7)
- Day: 4
- DayOfWeek: Ignored (0)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +9.0% | +9.0% | +9.0% | Low |
| **YM (Young Men)** | +13.0% | +13.0% | +13.0% | Medium |
| **YF (Young Women)** | +5.0% | +5.0% | +5.0% | Low |
| **AM (Adult Men)** | +18.0% | +18.0% | +18.0% | **Highest** |
| **AF (Adult Women)** | +7.0% | +7.0% | +7.0% | Low |
| **TF (Girls)** | Not listed | Not listed | Not listed | None |

**Strategic Insight:** Independence Day is male-centric (AM +18%, YM +13%, TM +9%). Girls (TF) not listed. Minimal female presence except Adult Women (+7%).

---

## Holiday 3: THANKSGIVING (4th Thursday of November)

**Date Config:**
- Type: Nth Occurrence (dateType: 1)
- Month: November (11)
- DayOfWeek: 4 (Thursday)
- Day: 4 (4th occurrence)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +7.0% | +7.0% | +7.0% | Low |
| **TF (Girls)** | +7.0% | +7.0% | +7.0% | Low |
| **YM (Young Men)** | +15.0% | +15.0% | +15.0% | Medium |
| **YF (Young Women)** | +15.0% | +15.0% | +15.0% | Medium |
| **AM (Adult Men)** | +22.0% | +22.0% | +22.0% | **Highest** |
| **AF (Adult Women)** | +22.0% | +22.0% | +22.0% | **Highest** |

**Strategic Insight:** Thanksgiving is the most balanced holiday! Both adult demographics get +22% (highest across all holidays). Young audiences get +15%, children get +7%. Family-focused.

---

## Holiday 4: HALLOWEEN (October 31)

**Date Config:**
- Type: Fixed (dateType: 0)
- Month: October (10)
- Day: 31
- DayOfWeek: Ignored (0)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +22.0% | +22.0% | +22.0% | **Highest** |
| **TF (Girls)** | +22.0% | +22.0% | +22.0% | **Highest** |
| **YM (Young Men)** | +18.0% | +18.0% | +18.0% | Medium-High |
| **YF (Young Women)** | +18.0% | +18.0% | +18.0% | Medium-High |
| **AM (Adult Men)** | +15.0% | +15.0% | +15.0% | Medium |
| **AF (Adult Women)** | +15.0% | +15.0% | +15.0% | Medium |

**Strategic Insight:** Halloween is **YOUTH DOMINANT**. Children get +22% (tied highest across all holidays), young audiences get +18%. Adults get lower +15%. Perfect for youth-oriented content.

---

## Holiday 5: MEMORIAL_DAY (Last Monday of May)

**Date Config:**
- Type: Nth Occurrence (dateType: 1)
- Month: May (5)
- DayOfWeek: 1 (Monday)
- Day: 5 (5th occurrence = last Monday)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +9.0% | +9.0% | +9.0% | Low |
| **YM (Young Men)** | +16.0% | +16.0% | +16.0% | Medium |
| **YF (Young Women)** | +5.0% | +5.0% | +5.0% | Low |
| **AM (Adult Men)** | +18.0% | +18.0% | +18.0% | **Highest** |
| **AF (Adult Women)** | +7.0% | +7.0% | +7.0% | Low |
| **TF (Girls)** | Not listed | Not listed | Not listed | None |

**Strategic Insight:** Memorial Day is male-focused like Independence Day (AM +18%, YM +16%, TM +9%). Girls (TF) absent. Patriotic theme appeals to male audiences.

---

## Holiday 6: CHRISTMAS (December 25)

**Date Config:**
- Type: Fixed (dateType: 0)
- Month: December (12)
- Day: 25
- DayOfWeek: Ignored (0)

**Audience Bonuses:**
| Demographic | Base | Artistic | Commercial | Max Impact |
|-------------|------|----------|------------|-----------|
| **TM (Boys)** | +15.0% | +15.0% | +15.0% | Medium |
| **TF (Girls)** | +15.0% | +15.0% | +15.0% | Medium |
| **YM (Young Men)** | +15.0% | +15.0% | +15.0% | Medium |
| **YF (Young Women)** | +15.0% | +15.0% | +15.0% | Medium |
| **AM (Adult Men)** | +10.0% | +10.0% | +10.0% | Low |
| **AF (Adult Women)** | +10.0% | +10.0% | +10.0% | Low |

**Strategic Insight:** Christmas is **PERFECTLY BALANCED FOR YOUTH**. All 4 young/child demographics get uniform +15%, adults get +10%. Universal holiday appeal, slight youth preference.

---

## Summary: Holiday Audience Profiles

| Holiday | Peak Demographic | Peak Bonus | Profile |
|---------|------------------|-----------|---------|
| **VALENTINE** | YF (Young Women) | +30% | Female, romantic/youth |
| **INDEPENDENCE_DAY** | AM (Adult Men) | +18% | Male, patriotic/adult |
| **THANKSGIVING** | AM/AF (Adults) | +22% | Balanced/family-focused |
| **HALLOWEEN** | TM/TF (Children) | +22% | Youth/spooky content |
| **MEMORIAL_DAY** | AM (Adult Men) | +18% | Male, patriotic/adult |
| **CHRISTMAS** | YM/YF/TM/TF (All Youth) | +15% | Universal/balanced |

---

## Implementation Notes for Calculator

### Type Values Clarification
The bonus data uses format: `"DEMOGRAPHIC|TYPE": "BONUS_VALUE"`
- **Type 0** = Base Bonus (default audience interest)
- **Type 1** = Artistic Score Bonus (when movie has high artistic appeal)
- **Type 2** = Commercial Score Bonus (when movie has high commercial appeal)

**Current Observation:** All three types have identical bonus percentages per demographic. This suggests:
- Bonuses are applied uniformly regardless of movie quality type
- OR The type field is a placeholder for future variation
- Recommend: Treat all three as identical for v1 implementation

### Storage Format Recommendation

```json
{
  "VALENTINE": {
    "date": "2025-02-14",
    "dateType": "FIXED",
    "audiences": {
      "TM": 0.07,
      "TF": 0.15,
      "YM": 0.12,
      "YF": 0.30,
      "AM": 0.15
      // AF omitted = 0.00
    }
  },
  // ... other holidays
}
```

### Application Logic
1. Check if movie release date falls on holiday
2. Look up audience bonus percentages
3. Apply bonus to base audience distribution: `adjusted = base * (1 + bonus)`
4. Use adjusted distribution for viewership calculations

---

## Missing Data / Questions for Testing

- [ ] Do bonuses stack with other modifiers (Striking Image, Boutique effect)?
- [ ] Are bonuses applied to ALL movies released on that date, or only if specifically scheduled?
- [ ] What happens if a movie is released on multiple holiday weeks (e.g., Dec 20-25)?
- [ ] Does AF (Adult Women) truly get 0% for Valentine's, or is it omitted by error?
- [ ] Bonuses appear across base/art/commercial equally - confirm no variation needed

---

## Related Game Files

- **Source File:** `Holidays.json` (44 KB)
- **Related:** `AudienceGroups.json` (demographics), `Buildings.json` (infrastructure), `Perks.json` (unlocks)
- **Integration Point:** Calculator's viewership distribution tab

