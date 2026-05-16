from sqlalchemy import create_engine, text

url = "postgresql://postgres:8lX9ssHf9OjaWxp60eH27M1BxV2q6gPfL5W8I2MDKI9OJ5zDdZz2QkHb99djS4Zv@72.61.225.68:5450/postgres"

try:
    engine = create_engine(url, connect_args={"connect_timeout": 10})
    with engine.connect() as conn:
        ver = conn.execute(text("SELECT version()")).fetchone()
        print("Connected OK:", ver[0])
        ext = conn.execute(text("SELECT installed_version FROM pg_available_extensions WHERE name = 'vector'")).fetchone()
        print("pgvector available:", ext[0] if ext else "NOT INSTALLED")
except Exception as e:
    print("Connection FAILED:", e)
