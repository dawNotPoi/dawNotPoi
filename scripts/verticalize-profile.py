from pathlib import Path
import re

path = Path("README.md")
text = path.read_text(encoding="utf-8")

replacement = '''## Selected Projects

### <img src="./assets/projects/peekpal.png" width="36" alt="PeekPal" /> [PeekPal](https://github.com/dawNotPoi/PeekPal)

A lightweight desktop devtool built around an embedded-browser workflow.

<img src="https://img.shields.io/badge/Electron-1F2328?style=flat-square&logo=electron&logoColor=47848F" alt="Electron" />
<img src="https://img.shields.io/badge/TypeScript-1F2328?style=flat-square&logo=typescript&logoColor=3178C6" alt="TypeScript" />

<br />

### <img src="./assets/projects/skills.svg" width="36" alt="Skills" /> [Skills](https://github.com/dawNotPoi/skills)

Composable skills and workflow definitions for AI-assisted development.

<img src="https://img.shields.io/badge/Agent_Skills-1F2328?style=flat-square" alt="Agent Skills" />
<img src="https://img.shields.io/badge/UI_Workflow-1F2328?style=flat-square" alt="UI Workflow" />

<br />

### <img src="./assets/projects/nubbi.svg" width="36" alt="Nubbi" /> [Nubbi](https://github.com/dawNotPoi/Nubbi)

Full-stack knowledge workspace with rich-text notes, file storage, real-time collaboration and an MCP server.

<img src="https://img.shields.io/badge/React-1F2328?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
<img src="https://img.shields.io/badge/MCP-1F2328?style=flat-square" alt="MCP" />

---

## Open Source

<p align="center">
  <a href="https://github.com/search?q=is%3Apr+is%3Amerged+author%3AdawNotPoi&type=pullrequests">
    <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Fsearch%2Fissues%3Fq%3Dis%3Apr%2Bis%3Amerged%2Bauthor%3AdawNotPoi&query=%24.total_count&label=merged%20PRs&color=2ea043&style=flat-square&logo=github" alt="Merged pull requests across open source" />
  </a>
</p>

### <img src="./assets/projects/codeg.svg" width="36" alt="Codeg" /> [Codeg](https://github.com/xintaofei/codeg)

Coding-agent workspace and orchestration layer.

<sub>MCP discovery · ACP sessions · tool-call normalization</sub>

<img src="https://img.shields.io/badge/Rust-1F2328?style=flat-square&logo=rust&logoColor=FFFFFF" alt="Rust" />
<img src="https://img.shields.io/badge/MCP-1F2328?style=flat-square" alt="MCP" />

<br />

### <img src="./assets/projects/3x-ui.png" width="36" alt="3x-ui" /> [3x-ui](https://github.com/MHSanaei/3x-ui)

Multi-platform Xray management panel.

<sub>Frontend · backend · subscription behavior · concurrency fixes</sub>

<img src="https://img.shields.io/badge/Go-1F2328?style=flat-square&logo=go&logoColor=00ADD8" alt="Go" />
<img src="https://img.shields.io/badge/React-1F2328?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />

<br />

### <img src="./assets/projects/assistant-ui.svg" width="36" alt="assistant-ui" /> [assistant-ui](https://github.com/assistant-ui/assistant-ui)

React infrastructure for AI chat and agent interfaces.

<sub>Runtime state · trigger behavior · CI reliability</sub>

<img src="https://img.shields.io/badge/React-1F2328?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
<img src="https://img.shields.io/badge/Agent_UI-1F2328?style=flat-square" alt="Agent UI" />

---

## Activity'''

updated, count = re.subn(
    r"## Selected Projects\n.*?\n---\n\n## Activity",
    replacement,
    text,
    count=1,
    flags=re.S,
)

if count != 1:
    raise SystemExit(f"Expected one project/open-source section, replaced {count}")

path.write_text(updated, encoding="utf-8")
