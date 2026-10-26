# Architecture Decision: SQLite-Based Data Normalization

**Date:** 2026-09-22  
**Status:** Planned (intentional slow implementation for learning)  
**Scope:** Hollywood Animal Calculator data layer  
**Learning Goal:** Deep understanding of SQLite, build automation, data normalization

## Context

The Hollywood Animal Calculator currently ships game data (tags, agencies, compatibility scores) as highly repetitive JSON. The same text values appear hundreds of times, creating unnecessary payload overhead and introducing manual maintenance burden.

Example of current redundancy:
```json
{
  "PROTAGONIST_SOLDIER": [3.0, 3.0, 2.0, 5.0, 5.0, 4.0],
  "PROTAGONIST_DETECTIVE": [4.0, 2.0, 3.0, 4.0, 5.0, 4.0],
  // ... massive duplication across 254+ tags
}
```

## Options Evaluated

### Option 1: SQLite in Browser (❌ Rejected)
- **Overhead:** 500KB–1MB WebAssembly
- **Why it loses:** Unnecessary for static data. Runtime query cost outweighs benefit.
- **Use case:** Only if data becomes dynamic per user.

### Option 2: Normalized JSON (✅ Viable, not chosen)
- **Trade-off:** Quick win, but keeps manual duplication
- **Why it loses:** Solves symptoms, not root cause. Still requires manual sync between source and export.

### Option 3: SQLite at Build-Time (✅✅ Chosen)
- **Zero runtime overhead** — pages serve pre-optimized JSON
- **Clean development** — relational DB enforces integrity
- **Automated workflow** — build step handles exports
- **Future-proof** — scales if data complexity grows

## The Decision

**Use Option 3: SQLite at build-time + automated GitHub Actions export**

### Why This Wins for Hollywood Animal

1. **Data Integrity**
   - SQLite schema prevents text duplication at source
   - Foreign keys enforce consistency
   - Easier to verify correctness (one query vs. grep)

2. **GitHub Pages Constraint as Feature**
   - Build runs locally or on CI
   - Pages only serves optimized, static JSON
   - Zero user-facing complexity

3. **Zero User Impact**
   - No WASM overhead
   - No latency penalties
   - Smaller bundle than runtime SQLite

## Implementation Plan (Intentionally Slow)

### Phase 1: Foundation & Learning (Week 1)
- [ ] Design SQLite schema for game data
  - `agencies` table (8 rows)
  - `tags` table (254+ rows, all categories)
  - `compatibility` table (tag_id, audience_id, score)
  - `matrix_metadata` (game version, last_verified_date)
- [ ] Study SQLite best practices for static data
  - Learn `.db` file format and query patterns
  - Understand schema design tradeoffs
  - Research normalization forms (1NF, 2NF, 3NF)

### Phase 2: Build Script Development (Week 2-3)
- [ ] Write Node.js build script with sqlite3 library
  - Query normalized data from `.db`
  - Export to JSON (or typed arrays for smaller size)
  - Compare pre/post file sizes
  - Add gzip compression
- [ ] Measure actual gains (MB saved, parse time improvement)
- [ ] Document the build process (README addition)

### Phase 3: Automation & Integration (Week 4)
- [ ] Set up GitHub Actions workflow
  - Trigger on commits to `data/` folder
  - Run build, validate output
  - Auto-commit optimized JSON
  - (Optional) Deploy directly to Pages
- [ ] Add local build command to npm scripts
- [ ] Create development guide for data updates

### Phase 4: Validation & Shipping (Week 5)
- [ ] Verify app works with normalized data unchanged
- [ ] Measure user-facing improvements (bundle size, load time)
- [ ] Update CLAUDE.md with data layer notes
- [ ] Commit to main

## Key Learning Objectives

1. **SQLite Fundamentals**
   - Schema design for relational game data
   - Query optimization for export operations
   - Understanding normalization tradeoffs

2. **Build Automation**
   - Node.js build scripts (fs, sqlite3)
   - GitHub Actions workflow design
   - Artifact generation and deployment

3. **Data Modeling**
   - Identifying entities (agencies, tags, matrices)
   - Designing primary/foreign keys
   - Balancing normalization vs. query simplicity

## Not In Scope (Yet)

- ❌ Runtime SQLite queries (keep static export model)
- ❌ Admin UI for data entry (schema is manually maintained)
- ❌ Differential updates (regenerate full export each time)
- ❌ Version control of `.db` file (keep source of truth in Git, `.db` is build artifact)

## Success Criteria

1. ✅ Build script successfully exports normalized JSON from SQLite
2. ✅ App works identically with new data format (zero visible changes)
3. ✅ File size reduced by 30%+ (from current redundancy)
4. ✅ GitHub Actions runs on data changes automatically
5. ✅ Build is repeatable and documented
6. ✅ Team member can update data by modifying SQLite, not JSON

## Next Steps

1. **Before starting:** Read SQLite docs on schema design for analytics/reporting (closest model)
2. **Start Phase 1:** Design schema on paper, get buy-in
3. **Iterate slowly:** Each phase is self-contained; can pause and learn deeper if needed
4. **Document as you go:** Build scripts should have comments explaining why, not just how

## References

- SQLite docs: https://www.sqlite.org/
- Node.js sqlite3: https://github.com/mapbox/node-sqlite3
- GitHub Actions: https://docs.github.com/en/actions
- Data normalization: https://en.wikipedia.org/wiki/Database_normalization

---

**Owner Note:** This decision was made intentionally as a learning project. The slow implementation timeline is by design — it's as much about understanding SQLite and build automation deeply as it is about solving the data repetition problem.
