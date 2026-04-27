import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DATA_DIR", "./tests/fixtures")
# Désactive slowapi par défaut pour ne pas faire échouer les tests qui hit le
# meme endpoint plusieurs fois. Le test dédié au rate limiting le réactive.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
