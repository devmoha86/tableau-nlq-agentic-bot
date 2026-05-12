"""Prefer a newer SQLite runtime for Superset migrations.

The workspace Python build ships SQLite 3.34, but recent Superset migrations
need features introduced in SQLite 3.35+. Installing pysqlite3-binary gives us
an embedded SQLite build with those capabilities, and Python loads this module
automatically when superset-local is on PYTHONPATH.
"""

import sys

try:
    import pysqlite3 as sqlite3
except Exception:
    pass
else:
    sys.modules["sqlite3"] = sqlite3