#!/usr/bin/env python3
"""
Convert member CSV from simple format to full import format.
Usage: python3 convert_csv.py input.csv output.csv
"""

import csv
import sys
import re

# Default monthly fees by level (in Rands)
LEVEL_FEES = {
    'RR': 250,
    'R': 250,
    'Pre level 1': 300,
    'Level 1': 350,
    'Level 2': 400,
    'Level 3': 450,
    'Level 4': 500,
    'Level 5': 550,
    '1': 350,
    '2': 400,
    '3': 450,
    '4': 500,
    '5': 550,
}

def normalize_level(level):
    """Normalize level names to standard format"""
    if not level or level.lower() in ['inactive', 'none', '']:
        return None

    level = level.strip()

    # Map various formats to standard
    level_map = {
        'rr': 'RR',
        'r': 'R',
        'pre level 1': 'Pre level 1',
        'level 1': 'Level 1',
        'level 2': 'Level 2',
        'level 3': 'Level 3',
        'level 4': 'Level 4',
        'level 5': 'Level 5',
        '1': 'Level 1',
        '2': 'Level 2',
        '3': 'Level 3',
        '4': 'Level 4',
        '5': 'Level 5',
    }

    return level_map.get(level.lower(), level)

def get_monthly_fee(level):
    """Get monthly fee for a level"""
    if not level:
        return 0
    return LEVEL_FEES.get(level, 350)  # Default to R350

def parse_name(full_name, first_name, last_name):
    """Parse name from the available fields"""
    # If we have both first and last name, use those
    if first_name and last_name:
        return first_name.strip(), last_name.strip()

    # Otherwise, try to parse the full name
    if full_name:
        parts = full_name.strip().split()
        if len(parts) >= 2:
            return parts[0], ' '.join(parts[1:])
        elif len(parts) == 1:
            return parts[0], parts[0]  # Use same name for both

    return 'Unknown', 'Child'

def generate_parent_email(first_name, last_name):
    """Generate a placeholder parent email"""
    # Remove special characters and spaces
    first = re.sub(r'[^a-zA-Z]', '', first_name.lower())
    last = re.sub(r'[^a-zA-Z]', '', last_name.lower())
    return f"{first}.{last}@placeholder.com"

def convert_csv(input_file, output_file):
    """Convert CSV from simple format to full import format"""

    with open(input_file, 'r', encoding='utf-8') as infile:
        # Detect delimiter (semicolon or comma)
        first_line = infile.readline()
        delimiter = ';' if ';' in first_line else ','
        infile.seek(0)  # Reset to start of file

        reader = csv.DictReader(infile, delimiter=delimiter)

        # Expected output columns
        output_columns = [
            'firstName', 'lastName', 'parentFirstName', 'parentLastName',
            'parentEmail', 'parentPhone', 'level', 'monthlyFee', 'status',
            'dateOfBirth', 'gender', 'notes', 'currentBalance', 'sagfFee',
            'equipmentFee', 'competitionFee', 'lastPaymentDate', 'lastPaymentAmount'
        ]

        rows_converted = 0
        rows_skipped = 0

        with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=output_columns)
            writer.writeheader()

            for row in reader:
                # Parse child name
                child_first, child_last = parse_name(
                    row.get('Full Name', ''),
                    row.get('Name', ''),
                    row.get('Surname', '')
                )

                # Normalize and get level
                level = normalize_level(row.get('Level', ''))

                # Determine status based on level
                if not level or level.lower() in ['inactive', 'none']:
                    status = 'INACTIVE'
                else:
                    status = 'ACTIVE'

                # Skip rows without proper name
                if child_first == 'Unknown' or not child_last:
                    rows_skipped += 1
                    continue

                # Generate parent info (placeholder - will need to be updated)
                parent_email = generate_parent_email(child_first, child_last)

                # Get monthly fee
                monthly_fee = get_monthly_fee(level) if level else 0

                output_row = {
                    'firstName': child_first,
                    'lastName': child_last,
                    'parentFirstName': 'Parent',
                    'parentLastName': child_last,
                    'parentEmail': parent_email,
                    'parentPhone': '',
                    'level': level or 'R',
                    'monthlyFee': f'R{monthly_fee}',
                    'status': status,
                    'dateOfBirth': '',
                    'gender': '',
                    'notes': f'Imported from CSV - verify parent contact details',
                    'currentBalance': 'R0',
                    'sagfFee': '',
                    'equipmentFee': '',
                    'competitionFee': '',
                    'lastPaymentDate': '',
                    'lastPaymentAmount': ''
                }

                writer.writerow(output_row)
                rows_converted += 1

        print(f"✅ Conversion complete!")
        print(f"   - Converted: {rows_converted} members")
        print(f"   - Skipped: {rows_skipped} rows")
        print(f"   - Output: {output_file}")
        print(f"\n⚠️  Important: Parent emails are placeholders - update them before importing!")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 convert_csv.py input.csv output.csv")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        convert_csv(input_file, output_file)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
