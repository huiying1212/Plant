import os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
env_file = ROOT / "plant-therapy-app" / ".env.local"

api_key = None
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("REACT_APP_OPENAI_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

if not api_key:
    print("No API key found"); sys.exit(1)

import httpx
from openai import OpenAI
client = OpenAI(api_key=api_key, http_client=httpx.Client(trust_env=False, timeout=60))
# lightweight test: list a couple of models
resp = client.models.list()
names = [m.id for m in resp.data if "gpt-4.1" in m.id][:5]
print("OK. Sample gpt-4.1* models visible:", names)
