from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

from config import WORKSPACE

console = Console()


def main():
    tool_names = ", ".join(["ToolA", "ToolB", "ToolC"])
    welcome = f"""
# uccs Agent

一个简洁优雅的命令行 Agent。由 uccs 制作。

**可用工具：** {tool_names}

**命令：** `/new` 新会话 · `/exit` 退出
"""
    console.print(Markdown(welcome))
    console.print(
        Panel(
            f"工作区: {WORKSPACE}",
            border_style="dim",
        )
    )

    messages: list[dict] = []

    while True:
        try:
            user_input = console.input("\n[bold green]❯[/] ").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n再见 👋")
            break

        if not user_input:
            continue
        if user_input.lower() == "/exit":
            console.print("再见 👋")
            break
        if user_input.lower() == "/new":
            messages.clear()
            # logger = SessionLogger()
            console.print("[dim]── 新会话已开始 ──[/dim]")
            continue


if __name__ == "__main__":
    main()
