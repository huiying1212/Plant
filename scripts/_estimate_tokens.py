import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
train = ROOT / "data" / "sft_train.jsonl"

total_chars = 0
total_msgs = 0
with train.open("r", encoding="utf-8") as fp:
    for line in fp:
        obj = json.loads(line)
        for m in obj["messages"]:
            c = m.get("content", "")
            if isinstance(c, str):
                total_chars += len(c)
            total_msgs += 1

rough_tokens = total_chars // 2
print(f"Train samples total chars: {total_chars:,}")
print(f"Train samples total messages: {total_msgs}")
print(f"Rough token estimate (Chinese ~2 chars/token): {rough_tokens:,}")
print()
print(f"If 3 epochs default: {rough_tokens * 3:,} training tokens")
print(f"  gpt-4.1 training @ $25/1M: ${rough_tokens * 3 * 25 / 1_000_000:.2f}")
print(f"  gpt-4.1-mini @ $5/1M:     ${rough_tokens * 3 * 5 / 1_000_000:.2f}")
print(f"  gpt-4.1-nano @ $1.5/1M:   ${rough_tokens * 3 * 1.5 / 1_000_000:.2f}")
