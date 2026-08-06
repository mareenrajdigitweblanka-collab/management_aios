"""Dependency-pin consistency check (REQ-CAL-REV-PDF-003 Gate B).

pyproject.toml is the confirmed canonical production/Vercel dependency
source (validation/member-schedule-vercel-function-crash-check-2026-07-10.md);
backend/requirements.txt remains actively required for local dev/test
parity (it supplies httpx, test-only, which pyproject.toml deliberately
omits). No CI/sync mechanism exists between the two files, so this test is
the drift-detection mechanism the approved technical design (§5.6 "Final
dependency-pin rule") requires: both files must carry the identical exact
`reportlab` pin, and neither may carry a second, conflicting declaration.

Run with: python -m unittest backend.tests.test_dependency_pin_consistency
"""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PYPROJECT_PATH = REPO_ROOT / "pyproject.toml"
BACKEND_REQUIREMENTS_PATH = REPO_ROOT / "backend" / "requirements.txt"

# Matches a quoted pyproject.toml dependency-array entry for a given
# package, e.g. "reportlab==5.0.0" — captures the full constraint string
# after the package name.
_PYPROJECT_ENTRY_RE = re.compile(r'"reportlab([=<>!~][^"]*)"')

# Matches a plain requirements.txt line for a given package (no extras,
# matching this file's existing single-package-per-line convention),
# e.g. reportlab==5.0.0 — captures the constraint string.
_REQUIREMENTS_LINE_RE = re.compile(r"(?m)^reportlab([=<>!~][^\s#]*)\s*(?:#.*)?$")


def _find_pyproject_reportlab_constraints():
    text = PYPROJECT_PATH.read_text(encoding="utf-8")
    return _PYPROJECT_ENTRY_RE.findall(text)


def _find_requirements_reportlab_constraints():
    text = BACKEND_REQUIREMENTS_PATH.read_text(encoding="utf-8")
    return _REQUIREMENTS_LINE_RE.findall(text)


class DependencyPinConsistencyTestCase(unittest.TestCase):
    """No network/subprocess/pip call — pure text-parsing against the two
    tracked dependency files, so this runs as fast and as offline as any
    other unit test in this suite."""

    def test_pyproject_declares_reportlab(self):
        constraints = _find_pyproject_reportlab_constraints()
        self.assertEqual(len(constraints), 1, "pyproject.toml must declare reportlab exactly once")

    def test_backend_requirements_declares_reportlab(self):
        constraints = _find_requirements_reportlab_constraints()
        self.assertEqual(len(constraints), 1, "backend/requirements.txt must declare reportlab exactly once")

    def test_pyproject_pins_exact_verified_version(self):
        constraints = _find_pyproject_reportlab_constraints()
        self.assertEqual(constraints[0], "==5.0.0")

    def test_backend_requirements_pins_exact_verified_version(self):
        constraints = _find_requirements_reportlab_constraints()
        self.assertEqual(constraints[0], "==5.0.0")

    def test_both_files_pin_the_identical_version(self):
        pyproject_constraint = _find_pyproject_reportlab_constraints()[0]
        requirements_constraint = _find_requirements_reportlab_constraints()[0]
        self.assertEqual(
            pyproject_constraint, requirements_constraint,
            "pyproject.toml and backend/requirements.txt must pin the identical reportlab version",
        )

    def test_no_duplicate_conflicting_pin_in_pyproject(self):
        self.assertEqual(len(_find_pyproject_reportlab_constraints()), 1)

    def test_no_duplicate_conflicting_pin_in_backend_requirements(self):
        self.assertEqual(len(_find_requirements_reportlab_constraints()), 1)


if __name__ == "__main__":
    unittest.main()
