from pathlib import Path
import threading
from config import WORKSPACE

WORKDIR = WORKSPACE.resolve()

_thread_local = threading.local()


def get_workdir() -> Path:
    return getattr(_thread_local, "workdir", WORKDIR)


def safe_path(p: str) -> Path:
    """解析路径：相对于路径基于 workspace，绝对路径直接使用"""
    path = Path(p).expanduser()
    if not path.is_absolute():
        path = get_workdir() / path
    return path.resolve()
