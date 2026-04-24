import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

train_path = ROOT / "data" / "sft_train.jsonl"
holdout_path = ROOT / "data" / "sft_holdout.jsonl"

with train_path.open("r", encoding="utf-8") as fp:
    first = json.loads(fp.readline())
print("=== First train sample ===")
print("message count:", len(first["messages"]))
print("system (first 240 chars):", first["messages"][0]["content"][:240])
print("last role:", first["messages"][-1]["role"])
print("last assistant (first 200 chars):", first["messages"][-1]["content"][:200])
print()

en_sample = None
with train_path.open("r", encoding="utf-8") as fp:
    for line in fp:
        obj = json.loads(line)
        if "Current stage" in obj["messages"][0]["content"]:
            en_sample = obj
            break

print("=== First EN train sample ===")
if en_sample:
    print("message count:", len(en_sample["messages"]))
    stage_line = [l for l in en_sample["messages"][0]["content"].split("\n") if "Current stage" in l]
    print("stage line:", stage_line)
    for m in en_sample["messages"][1:3]:
        print(f"[{m['role']}] {m['content'][:180]}")
else:
    print("No EN sample found")
print()

print("=== Holdout dialogs ===")
with holdout_path.open("r", encoding="utf-8") as fp:
    for line in fp:
        obj = json.loads(line)
        stages = [s["stage"] for s in obj["segments"]]
        print(f"src_idx={obj['src_idx']}  lang={obj['lang']}  segments={len(obj['segments'])}  stages={stages}")
