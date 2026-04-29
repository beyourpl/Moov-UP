#!/usr/bin/env python3
"""Validate a local SSH private key file before storing it in GitHub Actions secret VPS_SSH_KEY.
Does not print or log key material — only lengths and booleans."""

from __future__ import annotations

import json
import shutil
from typing import Optional
import subprocess
import sys
import time
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_LOG_PATH = _REPO_ROOT / "debug-24b5ca.log"
_SESSION = "24b5ca"


# region agent log
def _agent_log(hypothesis_id: str, message: str, data: Optional[dict] = None) -> None:
    payload: dict = {
        "sessionId": _SESSION,
        "hypothesisId": hypothesis_id,
        "message": message,
        "timestamp": int(time.time() * 1000),
    }
    if data is not None:
        payload["data"] = data
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


# endregion


def main() -> int:
    print(f"DEBUG_LOG_PATH={_LOG_PATH.resolve()}", file=sys.stderr)
    if len(sys.argv) < 2:
        _agent_log(
            "H0",
            "missing_key_path",
            {"hint": "usage python scripts/verify_github_ssh_secret.py PATH_TO_PRIVATE_KEY"},
        )
        print(
            "Usage: python scripts/verify_github_ssh_secret.py PATH_TO_PRIVATE_KEY",
            file=sys.stderr,
        )
        return 1

    key_path = Path(sys.argv[1]).expanduser().resolve()
    exists = key_path.exists()
    size_b = key_path.stat().st_size if exists else None
    _agent_log("H0", "start", {"exists": exists, "size_bytes": size_b})

    if not exists:
        _agent_log("H2", "file_missing", {})
        return 2

    raw = key_path.read_bytes()
    has_bom = raw[:3] == b"\xef\xbb\xbf"
    _agent_log("H3", "bom_check", {"has_utf8_bom": has_bom})

    text = raw.decode("utf-8-sig")
    has_crlf = (b"\r\n" in raw) or ("\r" in text)
    line_count = text.count("\n") + (1 if text and not text.endswith("\n") else 0)
    _agent_log("H1", "newline_check", {"has_crlf": has_crlf, "approx_lines": line_count})

    s = text.strip()
    has_begin = "BEGIN" in s and "PRIVATE" in s and "KEY" in s
    looks_pub_only = s.startswith("ssh-ed25519 ") or s.startswith("ssh-rsa ") or s.startswith("ecdsa-")
    _agent_log(
        "H2",
        "format_markers",
        {"has_begin_private_markers": has_begin, "looks_like_public_key_line": looks_pub_only},
    )

    if looks_pub_only:
        _agent_log("H2", "reject_likely_public_key_file", {})
        print("This file looks like a PUBLIC key (.pub). VPS_SSH_KEY must be the PRIVATE key.", file=sys.stderr)
        return 3

    exe = shutil.which("ssh-keygen")
    if not exe:
        _agent_log("H4", "ssh_keygen_not_in_path", {})
        print(
            "ssh-keygen not found in PATH. Install Git for Windows or OpenSSH; "
            "then re-run this script.",
            file=sys.stderr,
        )
        return 4

    proc = subprocess.run(
        [exe, "-y", "-f", str(key_path)],
        capture_output=True,
        text=True,
        timeout=15,
    )
    _agent_log(
        "H4",
        "ssh_keygen_validate",
        {
            "returncode": proc.returncode,
            "stderr_char_len": len(proc.stderr or ""),
            "parse_ok": proc.returncode == 0,
        },
    )

    if proc.returncode != 0:
        _agent_log("H4", "parse_failed_like_github_ParsePrivateKey", {})
        print(
            "ssh-keygen could not read this private key (same class of error as "
            "GitHub `ssh.ParsePrivateKey: ssh: no key found`).",
            file=sys.stderr,
        )
        print("Fix: LF line endings, UTF-8 without BOM, full BEGIN–END block.", file=sys.stderr)
        return 5

    _agent_log("H5", "validation_success_ready_for_github_secret", {})
    print("OK — private key parses locally. Safe to paste into VPS_SSH_KEY (same bytes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
