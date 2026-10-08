#!/usr/bin/env python3
"""Grade an objective batch locally; preserve legacy answer maps and HTML exports."""
import hashlib
import json
import math
import sys
from pathlib import Path


def quiz_fingerprint(questions):
    encoded = json.dumps(questions, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def normalize_submission(questions, submissions):
    if not isinstance(submissions, dict):
        raise ValueError("Submission must be a JSON object.")
    if "answers" in submissions:
        if submissions.get("node_id") != questions.get("node_id"):
            raise ValueError("Submission node_id does not match this quiz.")
        if submissions.get("quiz_fingerprint") != quiz_fingerprint(questions):
            raise ValueError("Submission quiz version does not match. Do not record stale results.")
        submissions = submissions["answers"]
    if not isinstance(submissions, dict):
        raise ValueError("answers must be a JSON object.")
    unknown = set(submissions) - {q["id"] for q in questions["questions"]}
    if unknown:
        raise ValueError("Unknown question IDs: " + ", ".join(sorted(unknown)))
    return submissions


def grade(questions, answer_key, submissions):
    submissions = normalize_submission(questions, submissions)
    if answer_key.get("node_id") and answer_key["node_id"] != questions.get("node_id"):
        raise ValueError("Answer key node_id does not match.")
    if answer_key.get("quiz_fingerprint") and answer_key["quiz_fingerprint"] != quiz_fingerprint(questions):
        raise ValueError("Answer key quiz version does not match.")
    results = []
    for q in questions["questions"]:
        qid, typ = q["id"], q["type"]
        actual = submissions.get(qid)
        key = answer_key.get("answers", {}).get(qid)
        if typ not in ("single_choice", "multi_choice", "numeric"):
            results.append({"id": qid, "status": "manual_review", "answered": qid in submissions})
            continue
        if key is None:
            raise ValueError("Missing objective answer key: " + qid)
        expected = key["value"]
        correct = False
        try:
            if typ == "single_choice":
                correct = isinstance(actual, str) and actual.strip().upper() == str(expected).strip().upper()
            elif typ == "multi_choice":
                correct = (isinstance(actual, list) and all(isinstance(x, str) for x in actual)
                           and len(actual) == len({x.strip().upper() for x in actual})
                           and {x.strip().upper() for x in actual} == {str(x).strip().upper() for x in expected})
            elif actual is not None and not isinstance(actual, bool):
                value, target, tolerance = float(actual), float(expected), float(q.get("tolerance", 0))
                correct = (math.isfinite(value) and math.isfinite(target) and math.isfinite(tolerance)
                           and tolerance >= 0 and abs(value - target) <= tolerance)
        except (TypeError, ValueError, OverflowError):
            correct = False
        results.append({"id": qid, "status": "correct" if correct else ("unanswered" if qid not in submissions else "incorrect"), "explanation": key.get("explanation", "")})
    graded = [r for r in results if r["status"] != "manual_review"]
    score = sum(r["status"] == "correct" for r in graded)
    return {"node_id": questions.get("node_id"), "quiz_fingerprint": quiz_fingerprint(questions), "correct": score, "graded": len(graded), "score_percent": round(100 * score / len(graded), 1) if graded else None, "complete": all(q["id"] in submissions for q in questions["questions"]), "results": results}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 4:
        raise SystemExit("Usage: grade.py QUESTIONS.json ANSWERS.json SUBMISSIONS.json")
    try:
        questions, answers, submissions = [json.loads(Path(p).read_text(encoding="utf-8-sig")) for p in sys.argv[1:]]
        result = grade(questions, answers, submissions)
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(f"Cannot grade: {error}") from error
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
