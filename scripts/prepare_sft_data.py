"""Prepare FINAL_therapy_full.jsonl for OpenAI supervised fine-tuning.

Cleaning steps (Plan A):
1. Replace the per-sample ``system`` message with the production prompt from
   ``plant-therapy-app/src/llmService.js`` (CN or EN depending on the language
   detected in the dialog).
2. Detect stage transitions inside each long dialog and split it into multiple
   stage-scoped training samples. The ``{stage}`` placeholder in the system
   prompt is replaced with the detected stage (roots/trunk/branches/leaves/
   fruits/... in CN or EN).
3. Trim every sample so the last message is an ``assistant`` message (OpenAI
   SFT only computes loss on assistant tokens).
4. Drop very short fragments (< 1 user + 1 assistant after system).
5. Hold out 5 samples (mix of CN & EN) for evaluation, use the rest as
   training data.

Outputs:
  data/sft_train.jsonl      -> fed to the OpenAI fine-tuning job
  data/sft_holdout.jsonl    -> used later by eval_holdout.py
  data/sft_stats.json       -> summary for quick inspection
"""

from __future__ import annotations

import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_FILE = ROOT / "FINAL_therapy_full.jsonl"
OUT_DIR = ROOT / "data"
OUT_DIR.mkdir(exist_ok=True)

SEED = 20260424
HOLDOUT_SIZE = 5
MIN_MESSAGES_PER_SEGMENT = 3  # at least system + 1 user + 1 assistant

# ---------------------------------------------------------------------------
# Production system prompts (mirrors plant-therapy-app/src/llmService.js)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_CN = """你是一位富有同理心和支持性的疗愈助手，正在引导来访者完成"生命之树"隐喻疗愈练习。

你可以访问一个全面的植物隐喻数据库知识库。在相关时，请使用这些知识来：
- 建议与用户体验或图像内容（如颜色、文字）相呼应的适当植物隐喻
- 基于已建立的植物疗法技术提供治疗指导
- 使用与用户情绪状态匹配的植物意象提供创意提示

生命之树是一种叙事性活动，人们通过绘制树来表达生命故事：
- 根：起源、家庭、文化、价值观、重要的地方
- 树干：优势、技能、让他们坚强站立的力量
- 枝条：希望、梦想、想要成长的方向
- 树叶：重要的人和关系
- 果实/花朵：成就、成果、感到自豪的事情
- 虫子：担忧、焦虑、不完美之处
- 风暴：挑战、重大生活变化

你的角色是：
1. 当收到绘画时，观察并评论你看到的内容 - 使用的颜色、绘制的符号、添加的文字、整体感觉
2. 从植物隐喻数据库中提取相关的隐喻和治疗技术，帮助他们反思绘画所揭示的经历和感受，并提出温和、开放式的问题，帮助他们探索更深层的含义
3. 给予鼓励和认可 - 肯定他们的努力和创造力
4. 如果绘画中某些内容缺失或不清晰，温和地邀请他们添加更多细节
5. 如果绘画内容不健康，引导他们看到更加积极的一面并重新绘画
6. 绝不评判或提供医疗建议
7. 保持回应简洁且支持性（最多2-4句话）
8. 在引导中自然地使用树的隐喻
9. 如果你认为用户在这一阶段的探索已经充分，可以引导他们点击进入下一个阶段
10. 在完成所有阶段后，请提供一个温暖的结束性反思，将整棵「生命之树」整合在一起。总结应呼应用户使用的隐喻，而不是重新解释或替用户下定义。

当前阶段：{stage}"""

SYSTEM_PROMPT_EN = """You are a compassionate and supportive therapy assistant guiding someone through the "Tree of Life" metaphor therapy exercise.

You have access to a comprehensive Plant Metaphor Database knowledge base. When relevant, use this knowledge to:
- Suggest appropriate plant metaphors that resonate with the user's experience or the image they draw (e.g. colors/text)
- Provide therapeutic guidance based on established plant therapy techniques
- Offer creative prompts using plant imagery that matches the user's emotional state

The Tree of Life is a narrative-based activity where people draw a tree to represent their life story:
- Roots: origins, family, culture, values, important places
- Trunk: strengths, skills, what keeps them standing strong
- Branches: hopes, dreams, where they want to grow
- Leaves: important people and relationships
- Fruits/Flowers: achievements, accomplishments, what they're proud of
- Bugs: worries, anxieties, imperfections
- Storms: challenges, major life changes

Your role is to:
1. When you receive a drawing, observe and comment on what you see - colors used, symbols drawn, text added, overall feeling
2. Draw upon the relevant plant metaphor from the database, help them reflect on what their drawing reveals about their experiences, and ask gentle, open-ended questions to help them explore deeper meaning
3. Be encouraging and validating - acknowledge their effort and creativity
4. If something seems missing or unclear in their drawing, gently invite them to add more detail
5. If the image user draws is not healthy, lead them to reflect on a more positive aspects of their life and encourage them to draw a more positive one
6. Never judge or provide medical advice
7. Keep responses concise and supportive (2-4 sentences max)
8. Use the tree metaphor naturally in your guidance
9. If you think the user has explored this stage sufficiently, you can guide them to click on the next stage
10. After completing all stages, please provide a warm closing reflection, integrating the whole "Tree of Life" metaphorically. The summary should align with the metaphors used by the user, rather than reinterpret them.

Current stage: {stage}"""

STAGE_LABELS_CN = {
    0: "介绍",
    1: "根（起源与基础）",
    2: "树干（优势与技能）",
    3: "枝条（希望与梦想）",
    4: "树叶（关系与联系）",
    5: "果实/花朵（成就）",
    6: "虫子（担忧与不完美）",
    7: "风暴（挑战与变化）",
    8: "最终反思（完整生命之树的结束总结）",
}
STAGE_LABELS_EN = {
    0: "introduction",
    1: "roots (origins and foundations)",
    2: "trunk (strengths and skills)",
    3: "branches (hopes and dreams)",
    4: "leaves (relationships and connections)",
    5: "fruits/flowers (achievements)",
    6: "bugs (worries and imperfections)",
    7: "storms (challenges and changes)",
    8: "final reflection (closing summary of the complete tree)",
}

# ---------------------------------------------------------------------------
# Stage detection
# ---------------------------------------------------------------------------

# Keywords that indicate the therapist is STARTING a given stage. Earlier stages
# first so "树根" is matched before a generic "根" fallback.
STAGE_KEYWORDS_CN = [
    (1, ["树根", "I have", "i have"]),
    (2, ["树干", "I am", "i am"]),
    (3, ["树枝", "枝条", "I can", "i can"]),
    (4, ["树叶"]),
    (5, ["果实", "花朵"]),
    (6, ["虫子"]),
    (7, ["风暴"]),
]

STAGE_KEYWORDS_EN = [
    (1, ["roots", "i have"]),
    (2, ["trunk", "i am"]),
    (3, ["branches", "i can"]),
    (4, ["leaves"]),
    (5, ["fruits", "flowers"]),
    (6, ["bugs"]),
    (7, ["storms"]),
]

CLOSING_HINTS_CN = [
    "整棵树",
    "整体看",
    "总结一下",
    "今天我们",
    "这棵树就是你",
    "我听下来",
    "我来收个尾",
]
CLOSING_HINTS_EN = [
    "the whole tree",
    "the entire tree",
    "to sum up",
    "in summary",
    "your whole tree",
]


def detect_language(messages) -> str:
    """Rough CN/EN detection by counting CJK characters across the dialog."""

    all_text = " ".join(
        m["content"] if isinstance(m["content"], str) else ""
        for m in messages
    )
    cjk = sum(1 for ch in all_text if "\u4e00" <= ch <= "\u9fff")
    latin = sum(1 for ch in all_text if ch.isalpha() and ord(ch) < 128)
    return "cn" if cjk >= latin else "en"


def find_stage_in_text(text: str, lang: str, current_stage: int):
    """Return the first stage keyword mentioned that differs from ``current_stage``.

    Therapists in the training data traverse stages in different orders
    (roots -> trunk -> leaves -> branches -> fruits is common), so we allow
    both forward and backward transitions. We only skip matches that would
    keep us on the same stage we are already on.
    """

    haystack = text.lower() if lang == "en" else text
    table = STAGE_KEYWORDS_EN if lang == "en" else STAGE_KEYWORDS_CN

    for stage, keywords in table:
        if stage == current_stage:
            continue
        for kw in keywords:
            needle = kw.lower() if lang == "en" else kw
            if needle in haystack:
                return stage
    return None


def looks_like_closing(text: str, lang: str) -> bool:
    haystack = text.lower() if lang == "en" else text
    hints = CLOSING_HINTS_EN if lang == "en" else CLOSING_HINTS_CN
    return any((h.lower() if lang == "en" else h) in haystack for h in hints)


def split_by_stage(messages, lang: str):
    """Split a list of user/assistant messages into stage-labelled segments.

    Strategy:
    - Walk messages in order. Start with ``current_stage = 0`` (introduction).
    - Whenever an ``assistant`` message introduces a strictly later stage
      keyword, cut before that message and start a new segment with the new
      stage label.
    - Tag the final segment as stage 8 (final reflection) if its last
      assistant message matches a closing hint.
    """

    segments = []
    current_stage = 0
    current_seg = []

    for msg in messages:
        if msg["role"] == "assistant":
            new_stage = find_stage_in_text(msg.get("content", ""), lang, current_stage)
            if new_stage is not None and new_stage != current_stage:
                if current_seg:
                    segments.append((current_stage, current_seg))
                current_seg = []
                current_stage = new_stage
        current_seg.append(msg)

    if current_seg:
        segments.append((current_stage, current_seg))

    if segments:
        last_stage, last_seg = segments[-1]
        last_assistant = next(
            (m for m in reversed(last_seg) if m["role"] == "assistant"), None
        )
        if last_assistant and looks_like_closing(last_assistant.get("content", ""), lang):
            segments[-1] = (8, last_seg)

    return segments


def trim_to_last_assistant(messages):
    """Drop trailing user messages. Return None if no assistant remains."""

    trimmed = list(messages)
    while trimmed and trimmed[-1]["role"] != "assistant":
        trimmed.pop()
    return trimmed if trimmed else None


def build_sample(segment, stage, lang):
    """Build an OpenAI chat-format sample with the production system prompt."""

    prompt_tpl = SYSTEM_PROMPT_EN if lang == "en" else SYSTEM_PROMPT_CN
    label_tbl = STAGE_LABELS_EN if lang == "en" else STAGE_LABELS_CN
    system_msg = {
        "role": "system",
        "content": prompt_tpl.replace("{stage}", label_tbl.get(stage, label_tbl[0])),
    }

    body = trim_to_last_assistant(segment)
    if body is None:
        return None
    messages = [system_msg] + body
    if len(messages) < MIN_MESSAGES_PER_SEGMENT:
        return None
    # Must contain at least one user and one assistant reply
    roles = {m["role"] for m in body}
    if "user" not in roles or "assistant" not in roles:
        return None
    return {"messages": messages}


def load_raw():
    raw_samples = []
    with RAW_FILE.open("r", encoding="utf-8") as fp:
        for idx, line in enumerate(fp, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                print(f"[WARN] line {idx}: bad JSON ({exc})")
                continue
            raw_samples.append((idx, obj))
    return raw_samples


def sample_key_for_holdout(idx, lang, stage_distribution):
    return (idx, lang, tuple(sorted(stage_distribution.items())))


def main():
    random.seed(SEED)
    raw = load_raw()
    print(f"Loaded {len(raw)} raw samples from {RAW_FILE.name}")

    # First pass: produce segment-level samples grouped back to their source
    per_source = []  # list of (source_idx, lang, [samples])
    for src_idx, obj in raw:
        original_msgs = obj.get("messages", [])
        non_system = [m for m in original_msgs if m["role"] != "system"]
        if not non_system:
            continue
        lang = detect_language(non_system)
        segments = split_by_stage(non_system, lang)
        samples = []
        stage_counter = Counter()
        for stage, seg in segments:
            built = build_sample(seg, stage, lang)
            if built is None:
                continue
            samples.append({"stage": stage, "sample": built})
            stage_counter[stage] += 1
        if samples:
            per_source.append(
                {
                    "src_idx": src_idx,
                    "lang": lang,
                    "samples": samples,
                    "stage_distribution": dict(stage_counter),
                }
            )

    total_segments = sum(len(entry["samples"]) for entry in per_source)
    print(f"After splitting: {total_segments} stage-level samples from {len(per_source)} source dialogs")

    # Pick holdout at the *source dialog* level so we never leak turns across
    # train/holdout boundaries. Try to keep EN + CN mix.
    en_sources = [e for e in per_source if e["lang"] == "en"]
    cn_sources = [e for e in per_source if e["lang"] == "cn"]
    random.shuffle(en_sources)
    random.shuffle(cn_sources)

    desired_en = min(2, len(en_sources))
    desired_cn = HOLDOUT_SIZE - desired_en
    if desired_cn > len(cn_sources):
        desired_cn = len(cn_sources)
        desired_en = HOLDOUT_SIZE - desired_cn

    holdout_sources = en_sources[:desired_en] + cn_sources[:desired_cn]
    holdout_ids = {e["src_idx"] for e in holdout_sources}
    train_sources = [e for e in per_source if e["src_idx"] not in holdout_ids]

    train_samples = [s["sample"] for e in train_sources for s in e["samples"]]
    # For holdout keep the raw dialog for evaluation + also expose the segments
    holdout_records = []
    for entry in holdout_sources:
        holdout_records.append(
            {
                "src_idx": entry["src_idx"],
                "lang": entry["lang"],
                "stage_distribution": entry["stage_distribution"],
                "segments": [
                    {
                        "stage": s["stage"],
                        "messages": s["sample"]["messages"],
                    }
                    for s in entry["samples"]
                ],
            }
        )

    train_path = OUT_DIR / "sft_train.jsonl"
    with train_path.open("w", encoding="utf-8") as fp:
        for sample in train_samples:
            fp.write(json.dumps(sample, ensure_ascii=False) + "\n")

    holdout_path = OUT_DIR / "sft_holdout.jsonl"
    with holdout_path.open("w", encoding="utf-8") as fp:
        for record in holdout_records:
            fp.write(json.dumps(record, ensure_ascii=False) + "\n")

    stats = {
        "raw_samples": len(raw),
        "source_dialogs": len(per_source),
        "train_source_dialogs": len(train_sources),
        "holdout_source_dialogs": len(holdout_sources),
        "train_samples": len(train_samples),
        "holdout_source_segments": sum(len(r["segments"]) for r in holdout_records),
        "train_stage_distribution": dict(
            Counter(
                [seg["stage"] for e in train_sources for seg in e["samples"]]
                if False
                else [s["stage"] for e in train_sources for s in e["samples"]]
            )
        ),
        "holdout_langs": dict(Counter(e["lang"] for e in holdout_sources)),
        "holdout_src_indices": [e["src_idx"] for e in holdout_sources],
    }

    stats_path = OUT_DIR / "sft_stats.json"
    stats_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== Output ===")
    print(f"Train: {train_path} ({stats['train_samples']} samples)")
    print(f"Holdout: {holdout_path} ({stats['holdout_source_dialogs']} dialogs, "
          f"{stats['holdout_source_segments']} stage segments)")
    print(f"Holdout languages: {stats['holdout_langs']}")
    print(f"Train stage distribution: {stats['train_stage_distribution']}")


if __name__ == "__main__":
    main()
