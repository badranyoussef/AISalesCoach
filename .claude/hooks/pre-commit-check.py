#!/usr/bin/env python3
"""
PreToolUse hook: block git commit if Clean Architecture violations are found.
Exit code 2 blocks the Bash tool call (the git commit).
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
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
    for dirpath, _, filenames in os.walk(search_dir):
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
