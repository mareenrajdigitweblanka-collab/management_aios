"""Configuration for the member schedule API.

DATABASE_URL is read from the environment only. No credentials are hardcoded
here or anywhere else in this backend. See .env.example for the expected
variable name and format (placeholder values only).
"""

import os

DATABASE_URL = os.environ.get("DATABASE_URL")

SERVICE_NAME = "management-aios-member-schedules"

VALID_MEMBER_KEYS = ("mayurika", "suman", "arun", "rajiv")
VALID_PRIORITIES = ("High", "Medium", "Low")
VALID_SOURCE_SCOPES = ("dashboard_testing", "pilot", "approved_live")

DEFAULT_SOURCE_SCOPE = "dashboard_testing"

MEMBER_LABELS = {
    "mayurika": "Mayurika — HR",
    "suman": "Suman — Recruiting Officer",
    "arun": "Arun — Implementation Officer",
    "rajiv": "Rajiv — Admin Manager",
}
