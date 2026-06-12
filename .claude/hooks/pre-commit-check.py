#!/usr/bin/env python3
"""
PreToolUse hook on Bash: block `git commit` if Clean Architecture violations are found.

Hook matchers match on tool NAME only ("Bash"), so this script receives ALL Bash
calls and must itself decide whether the command is a git commit. For anything
else it exits 0 immediately so normal shell use is unaffected.

Exit code 2 blocks the tool call (the git commit) and feeds stderr back to Claude.
"""
import json
import os
import re
import sys

# ── 1. Only act on git commit commands ──────────────────────────────────────
try:
    payload = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

command = str(payload.get("tool_input", {}).get("command", ""))

# Matches "git commit", "git -C path commit", "git commit -m ..." — anywhere in
# a compound command (e.g. "cd x && git commit"). Ignores "git committed" etc.
if not re.search(r"\bgit\b[^|;&\n]*\bcommit\b", command):
    sys.exit(0)

# ── 2. Scan for Clean Architecture violations ───────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "src")

FORBIDDEN = [
    (
        "core/AiSalesCoach.Domain",
        r"using AiSalesCoach\.(Application|Infrastructure|Api)",
        "Domain → upper layer (Application/Infrastructure/Api)",
    ),
    (
        "core/AiSalesCoach.Application",
        r"using AiSalesCoach\.(Infrastructure|Api)",
        "Application → Infrastructure/Api",
    ),
    (
        "clients/AiSalesCoach.Desktop",
        r"using AiSalesCoach\.(Application|Infrastructure|Api)",
        "Desktop → backend layers (Application/Infrastructure/Api)",
    ),
]

violations = []

for path_fragment, pattern, label in FORBIDDEN:
    search_dir = os.path.join(SRC, path_fragment)
    if not os.path.exists(search_dir):
        continue
    rx = re.compile(pattern)
    for dirpath, dirnames, filenames in os.walk(search_dir):
        dirnames[:] = [d for d in dirnames if d not in ("bin", "obj")]
        for fn in filenames:
            if not fn.endswith(".cs"):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                with open(fp, encoding="utf-8") as f:
                    for i, line in enumerate(f, 1):
                        stripped = line.strip()
                        if stripped.startswith("//"):
                            continue
                        if rx.search(line):
                            rel = os.path.relpath(fp, ROOT)
                            violations.append(f"  [{label}] {rel}:{i}  →  {stripped}")
            except OSError:
                pass

if violations:
    print("❌ CLEAN ARCHITECTURE VIOLATIONS — commit blokeret:\n", file=sys.stderr)
    for v in violations:
        print(v, file=sys.stderr)
    print(
        f"\n{len(violations)} violation(s) fundet. "
        "Ret dem inden commit. Se .claude/rules/clean-architecture.md",
        file=sys.stderr,
    )
    sys.exit(2)

print("✓ Clean Architecture check bestået.")
