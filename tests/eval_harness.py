"""
Evaluation Harness
==================
Runs the golden test set (tests/testQueries.json) against the live backend
and measures:
  - Retrieval accuracy  (correct policy_id in citations)
  - Citation coverage   (% answers with at least one citation)
  - RBAC enforcement    (role-blocked queries return no results)
  - Refusal precision   (out-of-scope queries correctly refused)
  - Latency p50 / p95

Usage:
  cd rag-backend
  python ../tests/eval_harness.py

  # Or against a specific backend URL:
  python ../tests/eval_harness.py --url http://localhost:8000

  # Save JSON report:
  python ../tests/eval_harness.py --output eval_report.json
"""

import argparse
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

try:
    import httpx
except ImportError:
    print("ERROR: httpx not installed. Run: pip install httpx")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

TEST_FILE  = Path(__file__).parent / "testQueries.json"
DEFAULT_URL = "http://localhost:8000"

# ── Colours (terminal) ────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def _c(text: str, colour: str) -> str:
    return f"{colour}{text}{RESET}"


# ── Runner ────────────────────────────────────────────────────────────────────

def run_query(client: httpx.Client, base_url: str, query: str, user_role: str) -> Dict:
    payload = {"query": query, "user_role": user_role}
    t0 = time.perf_counter()
    try:
        r = client.post(f"{base_url}/api/query", json=payload, timeout=30.0)
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        if r.status_code == 200:
            data = r.json()
            data["_latency_ms"] = latency_ms
            return data
        return {"success": False, "citations": [], "_latency_ms": latency_ms,
                "_http_status": r.status_code, "message": r.text[:200]}
    except Exception as e:
        return {"success": False, "citations": [], "_latency_ms": 0, "message": str(e)}


def evaluate(base_url: str, output_path: Optional[str] = None) -> None:
    if not TEST_FILE.exists():
        print(f"ERROR: Test file not found: {TEST_FILE}")
        sys.exit(1)

    with open(TEST_FILE, encoding="utf-8") as f:
        data = json.load(f)

    queries         = data["testQueries"]
    target_metrics  = data.get("targetMetrics", {})

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  ComplianceAI Evaluation Harness{RESET}")
    print(f"  Backend: {base_url}")
    print(f"  Tests:   {len(queries)}")
    print(f"{'='*60}{RESET}\n")

    results = []
    latencies: List[float] = []

    # ── Check backend health first ────────────────────────────────────────
    try:
        r = httpx.get(f"{base_url}/health", timeout=5)
        health = r.json()
        print(f"Backend health: {_c('OK', GREEN)} — "
              f"{health.get('policies_indexed', '?')} policies, "
              f"{health.get('collection_size', '?')} chunks\n")
    except Exception as e:
        print(f"{_c('ERROR', RED)}: Cannot reach backend at {base_url}: {e}")
        sys.exit(1)

    with httpx.Client() as client:
        for q in queries:
            qid      = q["id"]
            category = q["category"]
            query    = q["query"]
            role     = q["userRole"]
            expected_pid  = q.get("expectedPolicyId")
            should_succeed = q.get("shouldSucceed", True)

            response = run_query(client, base_url, query, role)
            latency  = response.get("_latency_ms", 0)
            latencies.append(latency)

            actual_success = response.get("success", False)
            citations      = response.get("citations", [])
            cited_pids     = [c.get("policy_id", "") for c in citations]
            answer         = response.get("answer", "") or ""

            # ── Scoring ───────────────────────────────────────────────────

            # 1. Correctness: did we get (or correctly refuse) the expected policy?
            if not should_succeed:
                # Expect failure / refusal
                correct = not actual_success or len(citations) == 0
                citation_correct = True   # no citation expected
            else:
                correct = actual_success
                citation_correct = (expected_pid is None) or (expected_pid in cited_pids)

            # 2. Citation coverage: successful answers should have citations
            has_citation = len(citations) > 0

            # 3. RBAC: rbac_violation tests should have no citations for the blocked policy
            rbac_pass = True
            if category == "rbac_violation":
                rbac_pass = expected_pid not in cited_pids

            passed = correct and citation_correct and rbac_pass

            icon = _c("✓", GREEN) if passed else _c("✗", RED)
            cat_colour = CYAN if "rbac" in category else YELLOW if "out_of_scope" in category else ""

            print(f"  {icon}  [{qid}] {_c(category, cat_colour)}")
            print(f"       Q: {query[:72]}{'…' if len(query)>72 else ''}")
            print(f"       Role: {role}  |  Latency: {latency}ms")
            print(f"       Expected policy: {expected_pid or '(none)'}  |  "
                  f"Got citations: {cited_pids or '(none)'}")
            if not passed:
                if not correct:
                    print(f"       {_c('FAIL', RED)}: success={actual_success}, expected shouldSucceed={should_succeed}")
                if not citation_correct:
                    print(f"       {_c('FAIL', RED)}: expected policy {expected_pid} not in citations {cited_pids}")
                if not rbac_pass:
                    print(f"       {_c('FAIL', RED)}: RBAC violation — blocked policy appeared in results")
            print()

            results.append({
                "id":               qid,
                "category":         category,
                "query":            query,
                "role":             role,
                "passed":           passed,
                "correct":          correct,
                "citation_correct": citation_correct,
                "rbac_pass":        rbac_pass,
                "has_citation":     has_citation,
                "latency_ms":       latency,
                "cited_pids":       cited_pids,
                "answer_len":       len(answer),
                "confidence":       response.get("confidence", 0),
            })

    # ── Aggregate metrics ─────────────────────────────────────────────────────

    total          = len(results)
    passed_count   = sum(1 for r in results if r["passed"])
    citation_hits  = sum(1 for r in results if r["has_citation"] and r.get("correct"))
    citation_denom = sum(1 for r in results if r.get("correct") and r.get("id") in
                        [q["id"] for q in queries if q.get("shouldSucceed")])
    rbac_tests     = [r for r in results if r["category"] in ("rbac_violation", "rbac_success")]
    rbac_pass_rate = sum(1 for r in rbac_tests if r["rbac_pass"]) / max(len(rbac_tests), 1)

    lat_sorted     = sorted(latencies)
    p50            = statistics.median(lat_sorted) if lat_sorted else 0
    p95            = lat_sorted[int(len(lat_sorted) * 0.95)] if lat_sorted else 0

    retrieval_acc  = passed_count / total
    cit_coverage   = citation_hits / max(citation_denom, 1)

    print(f"{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  Results: {passed_count}/{total} passed ({retrieval_acc:.0%}){RESET}")
    print(f"{'='*60}{RESET}")

    metrics = {
        "retrieval_accuracy": round(retrieval_acc, 3),
        "citation_coverage":  round(cit_coverage, 3),
        "rbac_enforcement":   round(rbac_pass_rate, 3),
        "latency_p50_ms":     round(p50, 1),
        "latency_p95_ms":     round(p95, 1),
        "passed":             passed_count,
        "total":              total,
    }

    print(f"\n  Metric                  Actual    Target")
    print(f"  {'─'*42}")

    def _row(label, actual, target=None, is_ms=False):
        unit = "ms" if is_ms else ""
        a_str = f"{actual:.0%}" if not is_ms else f"{actual:.0f}ms"
        t_str = f"{target:.0%}" if target and not is_ms else (f"<500ms" if is_ms else "—")
        ok = (actual >= target) if target and not is_ms else True
        colour = GREEN if ok else RED
        print(f"  {label:<24} {_c(a_str, colour):<18} {t_str}")

    _row("Retrieval Accuracy",  retrieval_acc,  target_metrics.get("retrievalAccuracy"))
    _row("Citation Coverage",   cit_coverage,   target_metrics.get("citationCoverage"))
    _row("RBAC Enforcement",    rbac_pass_rate, target_metrics.get("rbacEnforcement"))
    _row("Latency p50",         p50, is_ms=True)
    _row("Latency p95",         p95, is_ms=True)
    print()

    if output_path:
        report = {
            "backend_url":    base_url,
            "run_at":         time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metrics":        metrics,
            "target_metrics": target_metrics,
            "results":        results,
        }
        Path(output_path).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"  Report saved → {output_path}")

    # Exit code: 0 if all passed, 1 otherwise
    sys.exit(0 if passed_count == total else 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ComplianceAI Evaluation Harness")
    parser.add_argument("--url",    default=DEFAULT_URL, help="Backend base URL")
    parser.add_argument("--output", default=None,        help="Save JSON report to file")
    args = parser.parse_args()
    evaluate(args.url, args.output)