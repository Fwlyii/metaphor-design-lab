"""Auditable selection after generation, before image production.

This is an experimental modification, not the upstream selection policy.
Assessments are design judgments, not evaluation scores. Missing assessments or
insufficient valid strategy coverage stop selection instead of silently slicing.
"""
from __future__ import annotations

from collections import Counter
from itertools import product, combinations

STRATEGIES = ("替代", "合并", "适应", "修改", "重构", "颠倒")
RUBRIC = {
    "fit": "0–3: relevance to the supplied data fact, without invented causality",
    "visible": "0–3: a recognizable concrete object or drawable scene",
    "mapping": "0–3: support for the two supplied fields as separate visual encodings",
}


def prepare_pool(rows, assessments):
    """Deduplicate nouns while preserving all strategy and source memberships."""
    pool = {}
    for row in rows:
        key = row["keyword"].strip().lower()
        if key not in assessments:
            raise ValueError(f"Missing assessment: {key}")
        a = assessments[key]
        for metric in RUBRIC:
            if type(a.get(metric)) is not int or not 0 <= a[metric] <= 3:
                raise ValueError(f"Invalid {metric} assessment: {key}")
        if not a.get("reason") or not a.get("family"):
            raise ValueError(f"Missing rationale/family: {key}")
        c = pool.setdefault(key, {"keyword": key, "strategies": [], "origins": [],
                                  "assessment": dict(a), "raw_records": []})
        if row.get("strategy") and row["strategy"] not in c["strategies"]:
            c["strategies"].append(row["strategy"])
        if row["origin"] not in c["origins"]:
            c["origins"].append(row["origin"])
        c["raw_records"].append(dict(row))
    for c in pool.values():
        c["strategies"].sort(key=STRATEGIES.index)
        c["origins"].sort()
        a = c["assessment"]
        c["eligible"] = bool(a.get("valid_noun", True)) and all(a[k] >= 2 for k in RUBRIC)
        c["quality_priority"] = sum(a[k] for k in RUBRIC)
        c["raw_records"].sort(key=lambda r: (r.get("strategy", ""), r["origin"]))
    return sorted(pool.values(), key=lambda c: c["keyword"])


def _utility(candidates):
    counts = Counter(c["assessment"]["family"] for c in candidates)
    repeats = sum(max(0, n - 1) for n in counts.values())
    return sum(c["quality_priority"] for c in candidates) - 2.0 * repeats


def select_candidates(rows, assessments, blind_count=4):
    """Choose one distinct noun per strategy plus distinct Blind candidates.

    Exhaustively search the small supplied pools (six nouns per strategy).
    The explicit candidate-count configuration is 6 Guided + blind_count;
    there is no early prefix truncation, and no theme-generated replacement.
    Joint selection reserves Blind slots and prevents cross-source duplicates.
    """
    if type(blind_count) is not int or blind_count < 0:
        raise ValueError("blind_count must be a nonnegative integer")
    pool = prepare_pool(rows, assessments)
    groups = [[c for c in pool if c["eligible"] and s in c["strategies"]]
              for s in STRATEGIES]
    missing = [s for s, group in zip(STRATEGIES, groups) if not group]
    if missing:
        raise ValueError(f"No eligible candidate for strategies: {missing}")
    blind = [c for c in pool if c["eligible"] and "blind_fallback" in c["origins"]]
    if len(blind) < blind_count:
        raise ValueError(f"Only {len(blind)} eligible Blind candidates; need {blind_count}")
    best, best_utility, best_key = None, float("-inf"), None
    for guided in product(*groups):
        used = {c["keyword"] for c in guided}
        if len(used) != len(STRATEGIES):
            continue
        remaining = [c for c in blind if c["keyword"] not in used]
        for selected_blind in combinations(remaining, blind_count):
            combo = guided + selected_blind
            utility = _utility(combo)
            key = tuple(c["keyword"] for c in combo)
            if utility > best_utility or (utility == best_utility and (best_key is None or key < best_key)):
                best, best_utility, best_key = combo, utility, key
    if best is None:
        raise ValueError("Cannot satisfy strategy coverage, Blind quota and noun uniqueness together")
    selected = []
    for index, c in enumerate(best):
        selected.append({**c, "selected_origin": "guided" if index < 6 else "blind_fallback",
                         "selected_strategy": STRATEGIES[index] if index < 6 else None,
                         "image_status": "not_generated_for_revised_selection"})
    return {
        "policy": "strategy_coverage_quality_diversity",
        "method_change": True,
        "assessment_author": "current Codex conversation; selection judgments, not independent evaluation",
        "rubric": RUBRIC,
        "quality_threshold": "each criterion >= 2/3 and valid_noun",
        "selection_objective": "sum of three design-judgment priorities minus 2.0 per repeated visual family; lexical tie-break",
        "guided_per_strategy": 1, "blind_count": blind_count,
        "total_selected": len(selected), "unique_pool_size": len(pool),
        "theme_filling": False, "utility_for_selection_only": best_utility,
        "all_candidates": pool, "selected": selected,
        "full_chain_rerun": False, "new_images_generated": 0,
    }
