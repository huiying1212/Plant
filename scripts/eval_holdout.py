"""Compare base model vs. fine-tuned model on the holdout set.

For every stage-level segment in ``data/sft_holdout.jsonl`` this script:

1. Picks one or two prediction points: turns where the therapist (assistant)
   had just finished speaking but we can simulate "what comes next" by cutting
   before a ground-truth assistant reply.
2. Asks both the base model (``gpt-4.1-2025-04-14``) and the fine-tuned model
   for a continuation at that point.
3. Writes a side-by-side Markdown report to ``data/eval_report.md`` with the
   ground truth + both generations and a couple of light metrics (length,
   question marks, 2-4 sentence rule compliance).
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "plant-therapy-app" / ".env.local"
HOLDOUT_FILE = ROOT / "data" / "sft_holdout.jsonl"
RESULT_FILE = ROOT / "data" / "ft_result.json"
REPORT_FILE = ROOT / "data" / "eval_report.md"

BASE_MODEL_DEFAULT = "gpt-4.1-2025-04-14"


def load_api_key() -> str:
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("REACT_APP_OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("No API key found.")


def sentences(text: str) -> int:
    text = text.strip()
    if not text:
        return 0
    parts = re.split(r"[。！？!?…]+|\n+", text)
    parts = [p for p in parts if p.strip()]
    return len(parts)


def metrics(text: str) -> dict:
    return {
        "chars": len(text),
        "sentences_approx": sentences(text),
        "questions": text.count("?") + text.count("？"),
    }


def choose_prediction_points(messages):
    """Pick indices of assistant turns (other than the first opening) to
    predict. Skip the very first assistant turn because the FT model is meant
    to generate continuations, not openings. We keep up to two points per
    segment: one early, one mid.
    """

    asst_indices = [i for i, m in enumerate(messages) if m["role"] == "assistant"]
    if len(asst_indices) < 2:
        return []

    candidate_points = asst_indices[1:]  # skip the opening assistant
    if len(candidate_points) <= 2:
        return candidate_points
    early = candidate_points[0]
    mid = candidate_points[len(candidate_points) // 2]
    points = [early, mid] if early != mid else [early]
    return points


def generate(client, model: str, messages, temperature: float = 0.7, max_tokens: int = 400):
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content


def make_client(api_key: str):
    try:
        import httpx  # type: ignore
        from openai import OpenAI  # type: ignore
    except ImportError as exc:
        raise SystemExit("openai package not available. Run `pip install --upgrade openai`.") from exc
    return OpenAI(api_key=api_key, http_client=httpx.Client(trust_env=False, timeout=120))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default=BASE_MODEL_DEFAULT)
    parser.add_argument("--ft-model", help="Fine-tuned model id. Defaults to data/ft_result.json:fine_tuned_model")
    parser.add_argument("--max-cases", type=int, default=20, help="Cap total comparison cases")
    args = parser.parse_args()

    if not HOLDOUT_FILE.exists():
        raise SystemExit(f"Holdout file missing: {HOLDOUT_FILE}")

    ft_model = args.ft_model
    if not ft_model:
        if not RESULT_FILE.exists():
            raise SystemExit(
                "Fine-tuned model id not provided and data/ft_result.json not found."
            )
        ft_info = json.loads(RESULT_FILE.read_text(encoding="utf-8"))
        ft_model = ft_info.get("fine_tuned_model")
        if not ft_model:
            raise SystemExit("data/ft_result.json does not contain a fine_tuned_model id")

    print(f"Base model: {args.base_model}")
    print(f"FT model:   {ft_model}")

    client = make_client(load_api_key())

    cases = []
    with HOLDOUT_FILE.open("r", encoding="utf-8") as fp:
        for line in fp:
            record = json.loads(line)
            for seg in record["segments"]:
                for idx in choose_prediction_points(seg["messages"]):
                    cases.append(
                        {
                            "src_idx": record["src_idx"],
                            "lang": record["lang"],
                            "stage": seg["stage"],
                            "prefix": seg["messages"][:idx],
                            "target": seg["messages"][idx]["content"],
                        }
                    )

    cases = cases[: args.max_cases]
    print(f"Evaluating on {len(cases)} comparison cases ...\n")

    report_lines = [
        f"# Tree-of-Life SFT holdout eval",
        "",
        f"- Base model: `{args.base_model}`",
        f"- FT model: `{ft_model}`",
        f"- Cases: {len(cases)}",
        "",
    ]

    base_scores = {"chars": 0, "sentences": 0, "in_range": 0, "questions": 0}
    ft_scores = {"chars": 0, "sentences": 0, "in_range": 0, "questions": 0}

    for i, case in enumerate(cases, start=1):
        print(f"[{i}/{len(cases)}] src={case['src_idx']} lang={case['lang']} stage={case['stage']}")
        try:
            base_out = generate(client, args.base_model, case["prefix"])
        except Exception as exc:
            base_out = f"<error: {exc}>"
        try:
            ft_out = generate(client, ft_model, case["prefix"])
        except Exception as exc:
            ft_out = f"<error: {exc}>"

        base_m = metrics(base_out)
        ft_m = metrics(ft_out)
        ref_m = metrics(case["target"])

        def record(totals, m):
            totals["chars"] += m["chars"]
            totals["sentences"] += m["sentences_approx"]
            totals["questions"] += m["questions"]
            if 1 <= m["sentences_approx"] <= 4:
                totals["in_range"] += 1

        record(base_scores, base_m)
        record(ft_scores, ft_m)

        last_user = next(
            (m["content"] for m in reversed(case["prefix"]) if m["role"] == "user"),
            "(no prior user turn)",
        )
        report_lines.extend(
            [
                f"## Case {i} — src={case['src_idx']}, lang={case['lang']}, stage={case['stage']}",
                "",
                f"**Last user turn:**",
                "",
                f"> {last_user}",
                "",
                "### Ground truth (from training data)",
                "",
                case["target"],
                "",
                f"_metrics: {ref_m}_",
                "",
                "### Base model response",
                "",
                base_out,
                "",
                f"_metrics: {base_m}_",
                "",
                "### Fine-tuned model response",
                "",
                ft_out,
                "",
                f"_metrics: {ft_m}_",
                "",
                "---",
                "",
            ]
        )

    n = max(1, len(cases))
    summary = {
        "cases": len(cases),
        "avg_chars_base": base_scores["chars"] / n,
        "avg_chars_ft": ft_scores["chars"] / n,
        "avg_sentences_base": base_scores["sentences"] / n,
        "avg_sentences_ft": ft_scores["sentences"] / n,
        "in_range_2_4_base": base_scores["in_range"],
        "in_range_2_4_ft": ft_scores["in_range"],
        "avg_questions_base": base_scores["questions"] / n,
        "avg_questions_ft": ft_scores["questions"] / n,
    }

    report_lines.insert(
        6,
        "## Aggregate metrics\n\n" + "\n".join(f"- **{k}**: {v}" for k, v in summary.items()) + "\n",
    )

    REPORT_FILE.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"\nWrote report to {REPORT_FILE}")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
