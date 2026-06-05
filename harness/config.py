from pathlib import Path

BASE_URL = "https://api.minimaxi.com/v1"
API_KEY = "sk-cp-_rVEbvkT5uaz6M7hLodT9EGTzFRvN7a393FOaawhU-CCdyMqOHEkv6ShNZAeGipmvFBs11FJd6l8exK9Zl7mKPMoMTbyQBdgTi5dtT1s9yNx0X7SeoeEsII"
MODEL = "MiniMax-M2.7"
MAX_TOKENS = 8192
TEMPERATURE = 0.7

WORKSPACE = Path(__file__).parent / "workspace"
WORKSPACE.mkdir(exist_ok=True)

MAX_ITERATIONS = 20
KEEP_RECENT = 6

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}",
}

MEMORY_DIR = Path(__file__).parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)

SYSTEM_PROMPT = f"""你是一个精确高效的命令行助手。你可以通过工具来执行 shell 命令、读写文件。
请根据用户的需求，选择合适的工具来完成任务。回复时使用中文，保持简洁。

默认工作区：{WORKSPACE}
- 当用户没有指定路径时，创建文件、下载文件等操作默认放在工作区目录下
- 当用户指定了绝对路径，以用户指定的为准
- 读取、搜索等操作不受此限制

执行原则：
1. 当任务要求创建文件时，必须使用 file_write 工具实际创建，不要只在回复中描述内容
2. 输出文件的字段名、结构、格式必须严格匹配任务要求，不要自行发挥
3. 保持简洁高效：分析文字控制在几句话内，把详细推理结论直接写入输出文件
4. 时间有限，读完必要输入后尽快创建输出文件，避免反复验证或多余的中间步骤"""
