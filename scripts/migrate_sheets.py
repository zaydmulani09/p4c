#!/usr/bin/env python3
"""
Migrate South Brunswick outreach CSV into Supabase as Chapter 001.

Usage:
    python migrate_sheets.py outreach.csv
    python migrate_sheets.py outreach.csv --dry-run

Requires environment variables:
    SUPABASE_URL        - e.g. https://xxxx.supabase.co
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
    'Organization Name':   'org_name',
    'Organization Type':   'org_type',
    'Website':             'website',
    'Contact Name':        'contact_name',
    'Position / Title':    'contact_title',
    'Email Address':       'email',
    'Phone Number':        'phone',
    'Township/ State':     'township',
    'Date Researched':     'date_researched',
    'Date First Contacted':'date_first_contacted',
    'Contact Method':      'contact_method',
    'Current Status':      'current_status',
    'Follow-Up Date':      'follow_up_date',
    'Last Response Date':  'last_response_date',
    'Partnership Interest':'partnership_interest',
    'Notes':               'notes',
    'Outcome':             'outcome',
    # 'Logged By' is a UUID FK — skip during migration; left NULL
}

DATE_FIELDS = {
    'date_researched', 'date_first_contacted',
    'follow_up_date', 'last_response_date',
}


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
        record[db_col] = val
    return record


def insert_batch(batch, url, headers, dry_run):
    if dry_run:
        for row in batch:
            print(f"  [dry-run] {row.get('org_name', '?')} — {row.get('current_status', '')}")
        return 0

    body = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(
        f"{url}/rest/v1/organizations",
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
    parser = argparse.ArgumentParser(description='Migrate outreach CSV to Supabase')
    parser.add_argument('csv_path', help='Path to the outreach CSV file')
    parser.add_argument('--chapter-id', default='REPLACE_WITH_SOUTH_BRUNSWICK_UUID',
                        help='Chapter UUID for South Brunswick (Chapter 001)')
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
    with open(args.csv_path, newline='', encoding='utf-8-sig') as f:
        raw = csv.reader(f)
        first = next(raw)  # row 1: spreadsheet title — skip
        # If the first cell looks like a title (not a known header), row 2 has real headers
        if first and first[0].strip() != 'Organization Name':
            reader = csv.DictReader(f)  # file pointer is now at row 2
        else:
            # first row was already the header; re-open with DictReader from top
            f.seek(0)
            reader = csv.DictReader(f)
        for csv_row in reader:
            org_name = csv_row.get('Organization Name', '').strip()
            if not org_name:
                continue
            row_number += 1
            record = map_row(csv_row, args.chapter_id)
            record['row_number'] = row_number
            rows.append(record)

    total   = len(rows)
    errors  = 0
    inserted = 0

    print(f"Found {total} rows to migrate (chapter_id={args.chapter_id})")
    if args.dry_run:
        print('[dry-run mode — no data will be inserted]\n')

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        batch_end = min(i + BATCH_SIZE, total)
        errs = insert_batch(batch, supabase_url, headers, args.dry_run)
        errors += errs
        inserted += len(batch) - errs
        if not args.dry_run:
            print(f"Inserted row {batch_end}/{total}...")

    print(f"\nMigration complete. {inserted} rows inserted, {errors} errors.")


if __name__ == '__main__':
    main()
