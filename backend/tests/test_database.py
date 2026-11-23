"""Isolated tests for SQLAlchemy pool configuration and session cleanup."""

import unittest
from unittest import mock

from backend import config, database


class DatabasePoolConfigurationTests(unittest.TestCase):
    def test_integer_setting_defaults_and_bounds(self):
        self.assertEqual(config._read_integer_setting("POOL", 2, 1, {}), 2)
        self.assertEqual(config._read_integer_setting("POOL", 2, 1, {"POOL": " 4 "}), 4)
        self.assertEqual(config._read_integer_setting("POOL", 2, 1, {"POOL": ""}), 2)

        for raw in ("not-an-int", "1.5"):
            with self.subTest(raw=raw):
                with self.assertRaisesRegex(RuntimeError, "POOL must be an integer"):
                    config._read_integer_setting("POOL", 2, 1, {"POOL": raw})

        for raw, minimum in (("0", 1), ("-1", 0)):
            with self.subTest(raw=raw, minimum=minimum):
                with self.assertRaisesRegex(RuntimeError, "POOL must be at least " + str(minimum)):
                    config._read_integer_setting("POOL", 2, minimum, {"POOL": raw})

    def test_cached_engine_uses_validated_pool_settings(self):
        sentinel_engine = object()
        original = {
            "engine": database._engine,
            "session": database._SessionLocal,
            "url": database.DATABASE_URL,
            "size": database.DATABASE_POOL_SIZE,
            "overflow": database.DATABASE_MAX_OVERFLOW,
            "timeout": database.DATABASE_POOL_TIMEOUT,
            "recycle": database.DATABASE_POOL_RECYCLE,
        }
        try:
            database._engine = None
            database._SessionLocal = None
            database.DATABASE_URL = "postgresql+psycopg://test-host/test-db"
            database.DATABASE_POOL_SIZE = 2
            database.DATABASE_MAX_OVERFLOW = 0
            database.DATABASE_POOL_TIMEOUT = 10
            database.DATABASE_POOL_RECYCLE = 1800
            with mock.patch.object(database, "create_engine", return_value=sentinel_engine) as create:
                self.assertIs(database.get_engine(), sentinel_engine)
                self.assertIs(database.get_engine(), sentinel_engine)
                create.assert_called_once_with(
                    database.DATABASE_URL,
                    pool_pre_ping=True,
                    pool_size=2,
                    max_overflow=0,
                    pool_timeout=10,
                    pool_recycle=1800,
                )
        finally:
            database._engine = original["engine"]
            database._SessionLocal = original["session"]
            database.DATABASE_URL = original["url"]
            database.DATABASE_POOL_SIZE = original["size"]
            database.DATABASE_MAX_OVERFLOW = original["overflow"]
            database.DATABASE_POOL_TIMEOUT = original["timeout"]
            database.DATABASE_POOL_RECYCLE = original["recycle"]

    def test_session_factory_is_cached(self):
        sentinel_engine = object()
        original_engine = database._engine
        original_factory = database._SessionLocal
        try:
            database._engine = sentinel_engine
            database._SessionLocal = None
            first = database.get_session_factory()
            second = database.get_session_factory()
            self.assertIs(first, second)
        finally:
            database._engine = original_engine
            database._SessionLocal = original_factory


class DatabaseSessionCleanupTests(unittest.TestCase):
    def _exercise_generator(self, action):
        session = mock.Mock()
        factory = mock.Mock(return_value=session)
        with mock.patch.object(database, "get_session_factory", return_value=factory):
            generator = database.get_db()
            self.assertIs(next(generator), session)
            action(generator)
        session.close.assert_called_once_with()

    def test_get_db_closes_session_after_success(self):
        self._exercise_generator(lambda generator: generator.close())

    def test_get_db_closes_session_after_exception(self):
        def throw(generator):
            with self.assertRaisesRegex(RuntimeError, "route failed"):
                generator.throw(RuntimeError("route failed"))

        self._exercise_generator(throw)


if __name__ == "__main__":
    unittest.main()
