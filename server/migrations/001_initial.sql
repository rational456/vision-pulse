CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT,
  title TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(keywords)),
  authors TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(authors)),
  conference TEXT CHECK (conference IN ('CVPR', 'ICCV', 'ECCV')),
  venue TEXT,
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  paper_url TEXT NOT NULL,
  doi TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS papers_external_id_unique
  ON papers (external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS papers_identity_unique
  ON papers (lower(title), coalesce(conference, ''), coalesce(year, -1));

CREATE INDEX IF NOT EXISTS papers_filter_index
  ON papers (conference, year);

CREATE TABLE IF NOT EXISTS keyword_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  conference TEXT CHECK (conference IN ('CVPR', 'ICCV', 'ECCV')),
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  paper_count INTEGER NOT NULL DEFAULT 0 CHECK (paper_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (keyword, conference, year)
);

CREATE TABLE IF NOT EXISTS import_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  error_report TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
