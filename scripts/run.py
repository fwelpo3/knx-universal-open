"""Run explicit project gates. No framework detection and no dependency installation."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone


def run_gate(root, gate):
    report = {"gate": gate, "started_at": datetime.now(timezone.utc).isoformat(),
              "result": "UNVERIFIED", "commands": []}
    code = 2
    try:
        if gate not in {"check", "test", "build", "full-check"}:
            raise ValueError("Unknown gate: " + gate)
        config = json.loads((root / ".agent/commands.json").read_text(encoding="utf-8-sig"))
        if config.get("version") != 1:
            raise ValueError("commands.json requires version 1")
        timeout = config.get("timeout_seconds", 600)
        if isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or timeout <= 0:
            raise ValueError("timeout_seconds must be positive")
        names = ["check", "test", "build"] if gate == "full-check" else [gate]
        commands = []
        for name in names:
            entries = config.get("commands", {}).get(name)
            if not isinstance(entries, list) or not entries:
                raise ValueError(name + " is not configured; no PASS can be claimed")
            for argv in entries:
                if (not isinstance(argv, list) or not argv or
                        any(not isinstance(arg, str) or not arg for arg in argv)):
                    raise ValueError(name + " must contain nonempty argv lists")
                commands.append((name, argv))
        for name, argv in commands:
            executable = shutil.which(argv[0])
            if not executable:
                raise ValueError("Executable not found: " + argv[0])
            record = {"gate": name, "argv": argv, "exit_code": None}
            report["commands"].append(record)
            print("RUN", name, json.dumps(argv, ensure_ascii=True), flush=True)
            try:
                process = subprocess.Popen([executable, *argv[1:]], cwd=root,
                                           start_new_session=(os.name != "nt"))
                try:
                    code = process.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    if os.name == "nt":
                        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                       capture_output=True, check=False)
                        if process.poll() is None:
                            process.kill()
                    else:
                        import signal
                        os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    record["result"] = "TIMEOUT"
                    raise ValueError("Command timed out")
            except OSError as error:
                raise ValueError("Cannot start command: " + str(error)) from error
            record["exit_code"] = code
            if code != 0:
                report["result"] = "FAIL"
                break
        else:
            report["result"] = "PASS"
            code = 0
    except (ValueError, OSError, TypeError, KeyError) as error:
        report["reason"] = str(error)
        print("UNVERIFIED:", error, file=sys.stderr)
        code = 2
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    (root / ".agent").mkdir(exist_ok=True)
    (root / ".agent/LAST_VALIDATION.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(report["result"], gate, flush=True)
    return code


def main(gate=None):
    root = Path(__file__).resolve().parent.parent
    if root.name == ".agent":
        root = root.parent
    return run_gate(root, gate or (sys.argv[1] if len(sys.argv) > 1 else "full-check"))


if __name__ == "__main__":
    sys.exit(main())
