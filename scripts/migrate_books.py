#!/usr/bin/env python3
"""
Migrate books CSV or XLSX into Supabase.

Usage:
    python migrate_books.py books.csv
    python migrate_books.py "Book Inventory.xlsx" --chapter-id <uuid> --dry-run

Expected columns (case-insensitive match):
    Title, Author, Genre, Age Range, Condition, Quantity, Date Received

Requires environment variables:
    SUPABASE_URL         - e.g. https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY - service role key (bypasses RLS)
"""

import csv
import json
import os
import sys
import argparse
from datetime import datetime
import urllib.request
import urllib.error

BATCH_SIZE = 50

COLUMN_MAP = {
    'Title / Description': 'title',
    'Genre':               'genre',
    'Age Group':           'age_range',
    'Condition':           'condition',
    'Qty Available':       'quantity',
    'Date Received':       'date_received',
    'Source / Donor':      'author',   # closest available field; stored in author column
}

DATE_FIELDS    = {'date_received'}
INTEGER_FIELDS = {'quantity'}


def parse_date(val):
    if not val or not val.strip():
        return None
    for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d'):
        try:
            return datetime.strptime(val.strip(), fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def map_row(csv_row, chapter_id):
    record = {'chapter_id': chapter_id}
    for csv_col, db_col in COLUMN_MAP.items():
        val = csv_row.get(csv_col, '').strip() or None
        if db_col in DATE_FIELDS:
            val = parse_date(val) if val else None
        elif db_col in INTEGER_FIELDS:
            try:
                val = int(float(val)) if val and val != 'None' else 1
            except (ValueError, TypeError):
                val = 1
        record[db_col] = val
    if not record.get('quantity') or record['quantity'] < 1:
        record['quantity'] = 1
    return record


def insert_batch(batch, url, headers, dry_run):
    if dry_run:
        for row in batch:
            print(f"  [dry-run] {row.get('title', '?')} — qty {row.get('quantity', '?')} — row {row.get('row_number', '?')}")
        return 0

    body = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(
        f"{url}/rest/v1/books",
        data=body,
        headers={**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 201):
                raise RuntimeError(f"HTTP {resp.status}")
        return 0
    except urllib.error.HTTPError as e:
        body_text = e.read().decode('utf-8', errors='replace')
        print(f"  ERROR inserting batch: HTTP {e.code} — {body_text}", file=sys.stderr)
        return len(batch)


def main():
    parser = argparse.ArgumentParser(description='Migrate books CSV to Supabase')
    parser.add_argument('csv_path', help='Path to the books CSV or XLSX file')
    parser.add_argument('--chapter-id', default='e554fa97-f949-4600-8023-b65d60edd034',
                        help='Chapter UUID')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print rows without inserting')
    args = parser.parse_args()

    supabase_url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    service_key  = os.environ.get('SUPABASE_SERVICE_KEY', '')

    if not args.dry_run:
        if not supabase_url:
            print('ERROR: SUPABASE_URL env var not set', file=sys.stderr)
            sys.exit(1)
        if not service_key:
            print('ERROR: SUPABASE_SERVICE_KEY env var not set', file=sys.stderr)
            sys.exit(1)

    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
    }

    rows = []
    row_number = 0
    path = args.csv_path

    if path.lower().endswith('.xlsx'):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        # Row 1 = spreadsheet title, Row 2 = manager info, Row 3 = column headers
        raw_headers = [str(v).strip() if v is not None else '' for v in all_rows[2]]
        for row in all_rows[3:]:
            csv_row = {raw_headers[i]: (str(v).strip() if v is not None else '') for i, v in enumerate(row)}
            title = csv_row.get('Title / Description', '').strip()
            if not title or title == 'None':
                continue
            row_number += 1
            record = map_row(csv_row, args.chapter_id)
            record['row_number'] = row_number
            rows.append(record)
        wb.close()
    else:
        with open(path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for csv_row in reader:
                title = csv_row.get('Title', '').strip()
                if not title:
                    continue
                row_number += 1
                record = map_row(csv_row, args.chapter_id)
                record['row_number'] = row_number
                rows.append(record)

    total    = len(rows)
    errors   = 0
    inserted = 0

    print(f"Found {total} books to migrate (chapter_id={args.chapter_id})")
    if args.dry_run:
        print('[dry-run mode — no data will be inserted]\n')

    for i in range(0, total, BATCH_SIZE):
        batch     = rows[i:i + BATCH_SIZE]
        batch_end = min(i + BATCH_SIZE, total)
        errs      = insert_batch(batch, supabase_url, headers, args.dry_run)
        errors   += errs
        inserted += len(batch) - errs
        if not args.dry_run:
            print(f"Inserted row {batch_end}/{total}...")

    print(f"\nMigration complete. {inserted} books inserted, {errors} errors.")


if __name__ == '__main__':
    main()
