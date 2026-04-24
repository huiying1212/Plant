"""Upload training data and create a supervised fine-tuning job.

Usage:
    python scripts/run_sft.py                # upload + create job + poll until done
    python scripts/run_sft.py --resume JOB_ID  # just poll an existing job

Reads the API key from plant-therapy-app/.env.local
(REACT_APP_OPENAI_API_KEY). Writes the final state to data/ft_result.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "plant-therapy-app" / ".env.local"
TRAIN_FILE = ROOT / "data" / "sft_train.jsonl"
RESULT_FILE = ROOT / "data" / "ft_result.json"

DEFAULT_MODEL = "gpt-4.1-2025-04-14"
DEFAULT_SUFFIX = "tree-of-life"


def load_api_key() -> str:
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("#") or not line:
                continue
            if line.startswith("REACT_APP_OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError(
        f"No API key found. Set OPENAI_API_KEY env var or add REACT_APP_OPENAI_API_KEY to {ENV_FILE}"
    )


def import_openai():
    try:
        import httpx  # type: ignore
        from openai import OpenAI  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            "openai package not available. Run `pip install --upgrade openai`."
        ) from exc
    return OpenAI, httpx


def make_client(api_key: str):
    OpenAI, httpx = import_openai()
    # trust_env=False prevents httpx from picking up the Windows system proxy
    # (ProxyServer=127.0.0.1:7890) that is set but not actually running.
    return OpenAI(api_key=api_key, http_client=httpx.Client(trust_env=False, timeout=600))


def upload_training_file(client, path: Path):
    print(f"Uploading {path} ...")
    with path.open("rb") as fp:
        uploaded = client.files.create(file=fp, purpose="fine-tune")
    print(f"  File id: {uploaded.id} (bytes={uploaded.bytes})")
    return uploaded


def wait_for_file_ready(client, file_id: str, timeout: int = 180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        info = client.files.retrieve(file_id)
        status = getattr(info, "status", None)
        print(f"  File status: {status}")
        if status == "processed":
            return info
        if status in {"error", "failed"}:
            raise RuntimeError(f"File upload failed: {info}")
        time.sleep(5)
    raise TimeoutError("Timed out waiting for file to be processed")


def create_job(client, training_file_id: str, model: str, suffix: str):
    print(f"Creating fine-tuning job on {model} (suffix={suffix}) ...")
    job = client.fine_tuning.jobs.create(
        training_file=training_file_id,
        model=model,
        suffix=suffix,
    )
    print(f"  Job id: {job.id}")
    return job


def poll_job(client, job_id: str, poll_interval: int = 30):
    printed_events = set()
    last_status = None
    while True:
        job = client.fine_tuning.jobs.retrieve(job_id)
        if job.status != last_status:
            print(f"[{time.strftime('%H:%M:%S')}] status={job.status}")
            last_status = job.status

        try:
            events = client.fine_tuning.jobs.list_events(fine_tuning_job_id=job_id, limit=20)
            for ev in reversed(events.data):
                if ev.id in printed_events:
                    continue
                printed_events.add(ev.id)
                msg = getattr(ev, "message", "")
                level = getattr(ev, "level", "")
                print(f"  [{level}] {msg}")
        except Exception as exc:  # pragma: no cover - network errors
            print(f"  (couldn't list events: {exc})")

        if job.status in {"succeeded", "failed", "cancelled"}:
            return job
        time.sleep(poll_interval)


def save_result(job, training_file_id: str):
    data = {
        "job_id": job.id,
        "status": job.status,
        "model": job.model,
        "fine_tuned_model": getattr(job, "fine_tuned_model", None),
        "training_file": training_file_id,
        "trained_tokens": getattr(job, "trained_tokens", None),
        "created_at": getattr(job, "created_at", None),
        "finished_at": getattr(job, "finished_at", None),
        "error": None if not getattr(job, "error", None) else str(job.error),
    }
    RESULT_FILE.parent.mkdir(exist_ok=True)
    RESULT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved job result to {RESULT_FILE}")
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", help="Resume polling an existing job id")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--suffix", default=DEFAULT_SUFFIX)
    parser.add_argument("--no-poll", action="store_true", help="Create the job and exit (do not poll)")
    args = parser.parse_args()

    api_key = load_api_key()
    client = make_client(api_key)

    if args.resume:
        job = poll_job(client, args.resume)
        save_result(job, training_file_id=getattr(job, "training_file", ""))
        return 0 if job.status == "succeeded" else 1

    if not TRAIN_FILE.exists():
        raise SystemExit(f"Training file not found: {TRAIN_FILE}. Run prepare_sft_data.py first.")

    uploaded = upload_training_file(client, TRAIN_FILE)
    wait_for_file_ready(client, uploaded.id)
    job = create_job(client, uploaded.id, args.model, args.suffix)

    if args.no_poll:
        save_result(job, uploaded.id)
        print(f"\nJob created. Run `python scripts/run_sft.py --resume {job.id}` to monitor.")
        return 0

    job = poll_job(client, job.id)
    save_result(job, uploaded.id)
    return 0 if job.status == "succeeded" else 1


if __name__ == "__main__":
    sys.exit(main())
