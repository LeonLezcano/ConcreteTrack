# Graph Report - c:\Users\Regondi Calidad\Desktop\QM\ConcreteTrack  (2026-11-17)

## Corpus Check
- Corpus is ~15,833 words - fits in a single context window. You may not need a graph.

## Summary
- 165 nodes · 347 edges · 10 communities (6 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 8

## God Nodes (most connected - your core abstractions)
1. `runAllTests()` - 38 edges
2. `ConcreteTrackApp` - 35 edges
3. `ConcreteTrackCacheService` - 25 edges
4. `keywords` - 10 edges
5. `Formatters` - 9 edges
6. `Sanitizer` - 9 edges
7. `CylinderCompressionLabEngine` - 7 edges
8. `CryptoSeal` - 7 edges
9. `scripts` - 6 edges
10. `BatchHydrationWindowEngine` - 6 edges

## Surprising Connections (you probably didn't know these)
- `runAllTests()` --calls--> `test()`  [EXTRACTED]
  tests/run_tests.js → tests/run_tests.js  _Bridges community 0 → community 2_

## Import Cycles
- None detected.

## Communities (10 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (21): ACTIVE_TAB_CLASSES, INACTIVE_TAB_CLASSES, INITIAL_DEMO_DATA, BatchHydrationWindowEngine, CIRSOC_LIMITS, HYDRATION_STATES, CYLINDER_DIMENSIONS, SLUMP_CLASSES (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (3): CylinderCompressionLabEngine, ConcreteTrackCacheService, runAllTests()

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): author, description, keywords, license, name, scripts, compliance:audit, security:full (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

## Knowledge Gaps
- **41 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `scope` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ConcreteTrackApp` connect `Community 1` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `runAllTests()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `ConcreteTrackCacheService` connect `Community 2` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `name`, `short_name`, `description` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07804878048780488 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._