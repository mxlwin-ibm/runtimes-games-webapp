import pytest
import backend.database

# Force all tests to use the separate test database "foosball_test"
backend.database.DATABASE_NAME = "foosball_test"

print(f"\n🔧 [TEST CONFIG] Overriding database name to '{backend.database.DATABASE_NAME}' to prevent live database wipes.\n")
