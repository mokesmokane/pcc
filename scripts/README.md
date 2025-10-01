# Firestore to Supabase Migration Scripts

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
   - Firebase service account credentials
   - Supabase project URL and service role key
   - Source document/collection details

## Usage

### Migrate a single document:
```bash
npm run migrate:single
```

### Migrate all documents in collection:
```bash
npm run migrate:all
```

## Environment Variables

- `FIRESTORE_COLLECTION`: Source collection name (default: "transcriptions")
- `FIRESTORE_DOC_ID`: Specific document ID for single migration
- `EPISODE_ID`: Target episode UUID in Supabase
- `REPLACE_EXISTING`: Delete existing segments before insert (true/false)
- `BATCH_SIZE`: Number of segments to insert per batch (default: 500)
- `MIGRATE_ALL`: Process entire collection (true/false)

## Data Mapping

Firestore segment fields → Supabase columns:
- `start` or `start_seconds` → `start_seconds`
- `end` or `end_seconds` → `end_seconds`
- `text` → `text`
- Episode ID from doc or provided → `episode_id`