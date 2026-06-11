#!/usr/bin/env python3
"""Build data/spells.db (SQLite + FTS5) from the extracted JSON.

Idempotent: drops and recreates everything from data/spells.json and
data/guidelines.json. The FTS tables are standalone (not external-content) and
populated at build time, since the DB is always regenerated rather than edited.
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DB = DATA / "spells.db"

SCHEMA = """
DROP TABLE IF EXISTS spells;
DROP TABLE IF EXISTS guidelines;
DROP TABLE IF EXISTS virtues_flaws;
DROP TABLE IF EXISTS abilities;
DROP TABLE IF EXISTS spells_fts;
DROP TABLE IF EXISTS guidelines_fts;
DROP TABLE IF EXISTS virtues_flaws_fts;
DROP TABLE IF EXISTS abilities_fts;

CREATE TABLE spells (
  id           INTEGER PRIMARY KEY,
  name         TEXT,
  technique    TEXT,
  form         TEXT,
  tech_abbr    TEXT,
  form_abbr    TEXT,
  level        INTEGER,        -- NULL for General-level spells
  is_general   INTEGER,        -- 0/1
  is_ritual    INTEGER,        -- 0/1
  range        TEXT,
  duration     TEXT,
  target       TEXT,
  requisites   TEXT,           -- JSON array
  damage       INTEGER,        -- NULL if the spell deals no listed damage
  design_raw   TEXT,
  description  TEXT,
  source_file  TEXT,
  source_line  INTEGER
);

CREATE TABLE guidelines (
  id           INTEGER PRIMARY KEY,
  technique    TEXT,
  form         TEXT,
  level        INTEGER,        -- NULL for General guidelines
  is_general   INTEGER,
  effect       TEXT,
  source_file  TEXT,
  source_line  INTEGER
);

CREATE TABLE virtues_flaws (
  id           INTEGER PRIMARY KEY,
  name         TEXT,
  kind         TEXT,           -- 'Virtue' | 'Flaw'
  size         TEXT,           -- 'Minor' | 'Major' | 'Free' | 'Major or Minor'
  category     TEXT,           -- primary category (Hermetic, General, ...)
  categories   TEXT,           -- JSON array (some entries list several)
  tainted      INTEGER,        -- 0/1
  cost_raw     TEXT,
  description  TEXT,
  source_file  TEXT,
  source_line  INTEGER
);

CREATE TABLE abilities (
  id           INTEGER PRIMARY KEY,
  name         TEXT,
  type         TEXT,           -- General, Academic, Arcane, Martial, Supernatural (NULL if unstated)
  restricted   INTEGER,        -- 0/1: needs a Virtue to take (marked '*' in source)
  specialties  TEXT,
  description  TEXT,
  source_file  TEXT,
  source_line  INTEGER
);

CREATE VIRTUAL TABLE spells_fts        USING fts5(name, description);
CREATE VIRTUAL TABLE guidelines_fts    USING fts5(effect);
CREATE VIRTUAL TABLE virtues_flaws_fts USING fts5(name, description);
CREATE VIRTUAL TABLE abilities_fts     USING fts5(name, description);

CREATE INDEX idx_spells_tf    ON spells(technique, form);
CREATE INDEX idx_spells_level ON spells(level);
CREATE INDEX idx_gl_tf        ON guidelines(technique, form);
CREATE INDEX idx_vf_kind      ON virtues_flaws(kind, category, size);
CREATE INDEX idx_abil_type    ON abilities(type);
"""


def main():
    spells = json.loads((DATA / "spells.json").read_text())
    guidelines = json.loads((DATA / "guidelines.json").read_text())

    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)

    for i, s in enumerate(spells, start=1):
        con.execute(
            """INSERT INTO spells (id,name,technique,form,tech_abbr,form_abbr,level,
               is_general,is_ritual,range,duration,target,requisites,damage,design_raw,
               description,source_file,source_line)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (i, s["name"], s["technique"], s["form"], s["tech_abbr"], s["form_abbr"],
             s["level"], int(s["is_general"]), int(s["is_ritual"]), s["range"],
             s["duration"], s["target"], json.dumps(s["requisites"]), s["damage"],
             s["design_raw"], s["description"], s["source_file"], s["source_line"]),
        )
        con.execute("INSERT INTO spells_fts (rowid,name,description) VALUES (?,?,?)",
                    (i, s["name"], s["description"]))

    for i, g in enumerate(guidelines, start=1):
        con.execute(
            """INSERT INTO guidelines (id,technique,form,level,is_general,effect,
               source_file,source_line) VALUES (?,?,?,?,?,?,?,?)""",
            (i, g["technique"], g["form"], g["level"], int(g["is_general"]),
             g["effect"], g["source_file"], g["source_line"]),
        )
        con.execute("INSERT INTO guidelines_fts (rowid,effect) VALUES (?,?)",
                    (i, g["effect"]))

    vf = json.loads((DATA / "virtues_flaws.json").read_text())
    for i, v in enumerate(vf, start=1):
        con.execute(
            """INSERT INTO virtues_flaws (id,name,kind,size,category,categories,
               tainted,cost_raw,description,source_file,source_line)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (i, v["name"], v["kind"], v["size"], v["category"],
             json.dumps(v["categories"]), int(v["tainted"]), v["cost_raw"],
             v["description"], v["source_file"], v["source_line"]),
        )
        con.execute("INSERT INTO virtues_flaws_fts (rowid,name,description) VALUES (?,?,?)",
                    (i, v["name"], v["description"]))

    abil = json.loads((DATA / "abilities.json").read_text())
    for i, a in enumerate(abil, start=1):
        con.execute(
            """INSERT INTO abilities (id,name,type,restricted,specialties,
               description,source_file,source_line) VALUES (?,?,?,?,?,?,?,?)""",
            (i, a["name"], a["type"], int(a["restricted"]), a["specialties"],
             a["description"], a["source_file"], a["source_line"]),
        )
        con.execute("INSERT INTO abilities_fts (rowid,name,description) VALUES (?,?,?)",
                    (i, a["name"], a["description"]))

    con.commit()
    counts = {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
              for t in ("spells", "guidelines", "virtues_flaws", "abilities")}
    con.close()
    print(f"Built {DB.relative_to(ROOT)}: "
          + ", ".join(f"{n} {t}" for t, n in counts.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
