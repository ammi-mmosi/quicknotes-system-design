# QuickNotes Data Model

## Database choice
Use **PostgreSQL (SQL)**: QuickNotes has clearly related users, notes and tags, needs referential integrity and atomic updates, and benefits from indexed queries and joins. A document database might offer flexible schemas and horizontal scaling but would complicate consistent many-to-many relationships. PostgreSQL can scale through read replicas, partitioning when needed and caching.

## Entities and relationships

| Table | Column | Type | Constraint |
|---|---|---|---|
| users | id | UUID | Primary key |
| users | email | VARCHAR(255) | NOT NULL, UNIQUE |
| users | password_hash | TEXT | NOT NULL |
| users | created_at | TIMESTAMPTZ | NOT NULL |
| notes | id | UUID | Primary key |
| notes | user_id | UUID | Foreign key → users.id |
| notes | title | VARCHAR(100) | NOT NULL |
| notes | body | TEXT | NOT NULL |
| notes | created_at | TIMESTAMPTZ | NOT NULL |
| notes | updated_at | TIMESTAMPTZ | NOT NULL |
| tags | id | UUID | Primary key |
| tags | user_id | UUID | Foreign key → users.id |
| tags | name | VARCHAR(50) | NOT NULL |
| note_tags | note_id | UUID | Composite primary key, foreign key → notes.id |
| note_tags | tag_id | UUID | Composite primary key, foreign key → tags.id |

One **user has many notes** and **many tags** (one-to-many). A **note has many tags**, and a **tag belongs to many notes** (many-to-many) through `note_tags`. Each tag belongs to one user. Application transactions must check that both the note and tag have the same owner before creating an association.

## PostgreSQL schema

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC, id DESC);
CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
```

`idx_notes_user_created` speeds up the frequent query to list a user's newest notes and supports cursor pagination. The `note_tags(tag_id)` index speeds up reverse tag lookups and cascading tag deletes; the primary key already indexes `(note_id, tag_id)`.

## Example SQL queries

**1. List 20 most recent notes for a user** (supply the UUID as `$1`):

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**2. Find notes tagged with a given tag (JOIN):**

```sql
SELECT n.id, n.title, t.name AS tag
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1 AND t.user_id = $1 AND t.name = $2
ORDER BY n.created_at DESC;
```

**3. Count notes per user:**

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email;
```

**4. Insert a note:**

```sql
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, $3)
RETURNING id, title, body, created_at;
```

All API queries must use parameterized SQL and enforce ownership checks. `updated_at` should be refreshed by the update query or a database trigger.
