#!/usr/bin/env python3
"""PostToolUse hook: warns if a subagent response is missing the read token."""
import sys
import json

try:
    data = json.load(sys.stdin)
    response = str(data.get("tool_response", ""))
    if "Nx7vP-Qm3kR-read" not in response:
        print(
            "⚠️  READ TOKEN MANGLER: Agenten svarede uden at læse de obligatoriske filer.\n"
            "Bed agenten om at:\n"
            "  1. Read `.claude/rules/product-context.md` → udtræk Nx7vP\n"
            "  2. Read `.claude/rules/aisalescoach.md` → udtræk Qm3kR\n"
            "  3. Starte svaret med *Nx7vP-Qm3kR-read*",
            file=sys.stderr,
        )
        sys.exit(2)
except Exception:
    pass
