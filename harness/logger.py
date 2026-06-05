from datetime import datetime
import json
from pathlib import Path

SESSION_DIR = Path(__file__).parent / "sessions"
SESSION_DIR.mkdir(exist_ok=True)


class Logger:
    def __init__(self):
        ts = datetime.now().strftime("%Y-%m-%d_%H:%M:%S")
        self.path = SESSION_DIR / f"{ts}.log"
        self.data = {
            "start_time": ts,
            "messages": [],
        }

    def log(self, messages: list[dict]):
        self.data["messages"] = messages
        self.data["end_time"] = datetime.now().strftime("%Y-%m-%d_%H:%M:%S")
        self.path.write_text(
            json.dumps(self.data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
