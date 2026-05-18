import os
import sys
import zipfile
import sqlite3
import requests
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

COUNTRIES = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'AE': 'United Arab Emirates',
    'CH': 'Switzerland',
    'CA': 'Canada',
    'AU': 'Australia',
    'RU': 'Russia',
    # Europe
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'PL': 'Poland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'FI': 'Finland',
    'DK': 'Denmark',
    'IE': 'Ireland',
    'BE': 'Belgium',
    'AT': 'Austria',
    'PT': 'Portugal',
    'GR': 'Greece',
    'TR': 'Turkey',
    'UA': 'Ukraine',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'HR': 'Croatia',
    'BG': 'Bulgaria'
}

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'locations.db')
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'temp_geonames')

def download_country_zip(code):
    dest = os.path.join(TEMP_DIR, f"{code}.zip")
    
    # Check if a valid cached zip file already exists
    if os.path.exists(dest) and zipfile.is_zipfile(dest):
        print(f"Skipping {code}.zip (already cached and valid)...", flush=True)
        return code, True
        
    if os.path.exists(dest):
        os.remove(dest)
        
    url = f"https://download.geonames.org/export/dump/{code}.zip"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(url, headers=headers, stream=True, timeout=60)
            response.raise_for_status()
            
            with open(dest, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            
            if zipfile.is_zipfile(dest):
                print(f"Downloaded {code}.zip successfully (Attempt {attempt})!", flush=True)
                return code, True
            else:
                raise Exception("Corrupted ZIP file structure detected")
        except Exception as e:
            print(f"Attempt {attempt} failed for {code}.zip: {e}", flush=True)
            if os.path.exists(dest):
                os.remove(dest)
            if attempt < max_retries:
                time.sleep(2)
                
    print(f"Failed to download {code}.zip after {max_retries} attempts.", flush=True)
    return code, False

def build_db():
    # Setup directories
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Initialize SQLite database
    print(f"Initializing database at {DB_PATH}...", flush=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # SQLite performance optimizations
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA journal_mode = MEMORY")
    cursor.execute("PRAGMA cache_size = 100000")

    # Create tables and indexes
    cursor.execute("""
    CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        display_name TEXT,
        lat REAL,
        lon REAL,
        country_code TEXT,
        feature_class TEXT,
        feature_code TEXT
    )
    """)
    cursor.execute("CREATE INDEX idx_locations_name ON locations (name COLLATE NOCASE)")
    cursor.execute("CREATE INDEX idx_locations_country ON locations (country_code)")
    conn.commit()

    # Step 1: Download all ZIP files in parallel
    print(f"Starting parallel download/validation of {len(COUNTRIES)} country files...", flush=True)
    download_statuses = {}
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_country_zip, code): code for code in COUNTRIES.keys()}
        for future in as_completed(futures):
            code, success = future.result()
            download_statuses[code] = success

    # Step 2: Parse and insert sequentially
    print("\nProcessing downloaded country files sequentially...", flush=True)
    
    total_locations = 0

    # Tourist attraction feature classes and codes to include
    tourist_h_codes = {'BEAC', 'LK', 'WTRF'}  # Beaches, Lakes, Waterfalls
    tourist_l_codes = {'PRK', 'RES'}          # Parks, Reserves
    tourist_t_codes = {'MT', 'VAL'}           # Mountains, Valleys
    tourist_s_codes = {'TMPL', 'FT', 'PAL', 'MUSE', 'GARD', 'MONU', 'RUIN', 'CH', 'MSQE'} # Historical/Sightseeing spots

    for code, country_name in COUNTRIES.items():
        if not download_statuses.get(code):
            print(f"Skipping {country_name} ({code}) due to download failure.", flush=True)
            continue

        zip_dest = os.path.join(TEMP_DIR, f"{code}.zip")
        txt_file = os.path.join(TEMP_DIR, f"{code}.txt")

        try:
            # Check if text file was already unzipped
            if not os.path.exists(txt_file):
                print(f"Extracting {zip_dest}...", flush=True)
                with zipfile.ZipFile(zip_dest, 'r') as zip_ref:
                    zip_ref.extract(f"{code}.txt", TEMP_DIR)

            print(f"Processing {txt_file} into SQLite...", flush=True)
            
            insert_buffer = []
            count = 0
            
            with open(txt_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    parts = line.strip().split('\t')
                    if len(parts) < 19:
                        continue
                    
                    name = parts[2] if parts[2] else parts[1]
                    lat = parts[4]
                    lon = parts[5]
                    feature_class = parts[6]
                    feature_code = parts[7]
                    country_code = parts[8]
                    admin1 = parts[10]
                    
                    # 1. Populated place check
                    is_populated = (feature_class == 'P')
                    
                    # 2. Administrative boundary check
                    is_district = (feature_class == 'A' and feature_code in ('ADM1', 'ADM2'))
                    
                    # 3. Rich Tourist/Sightseeing attractions check (temples, beaches, reserves, waterfalls, mountains)
                    is_tourist = (
                        (feature_class == 'H' and feature_code in tourist_h_codes) or
                        (feature_class == 'L' and feature_code in tourist_l_codes) or
                        (feature_class == 'T' and feature_code in tourist_t_codes) or
                        (feature_class == 'S' and feature_code in tourist_s_codes)
                    )
                    
                    if is_populated or is_district or is_tourist:
                        # Construct a clean and descriptive display name
                        type_suffix = ""
                        if is_tourist:
                            if feature_code == 'TMPL': type_suffix = " Temple"
                            elif feature_code == 'FT': type_suffix = " Fort"
                            elif feature_code == 'BEAC': type_suffix = " Beach"
                            elif feature_code == 'WTRF': type_suffix = " Waterfall"
                            elif feature_code == 'RES': type_suffix = " Reserve"
                            elif feature_code == 'PRK': type_suffix = " Park"
                            elif feature_code == 'PAL': type_suffix = " Palace"
                        
                        full_name = name + type_suffix if type_suffix and not name.lower().endswith(type_suffix.lower().strip()) else name
                        
                        parts_list = [full_name]
                        if admin1:
                            parts_list.append(admin1)
                        parts_list.append(country_name)
                        display_name = ", ".join(parts_list)
                        
                        insert_buffer.append((
                            name,
                            display_name,
                            float(lat) if lat else 0.0,
                            float(lon) if lon else 0.0,
                            country_code,
                            feature_class,
                            feature_code
                        ))
                        count += 1
                        
                        if len(insert_buffer) >= 20000:
                            cursor.executemany("""
                            INSERT INTO locations (name, display_name, lat, lon, country_code, feature_class, feature_code)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, insert_buffer)
                            conn.commit()
                            insert_buffer = []

            if insert_buffer:
                cursor.executemany("""
                INSERT INTO locations (name, display_name, lat, lon, country_code, feature_class, feature_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, insert_buffer)
                conn.commit()
                
            print(f"Added {count} locations (places & tourist spots) for {country_name} ({code})!", flush=True)
            total_locations += count
            
        except Exception as e:
            print(f"Error processing country {code}: {e}", flush=True)
        finally:
            # Clean up intermediate files immediately to save disk space
            if os.path.exists(zip_dest):
                os.remove(zip_dest)
            if os.path.exists(txt_file):
                os.remove(txt_file)

    # Clean up temp dir
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

    # Reset SQLite sync mode
    cursor.execute("PRAGMA synchronous = NORMAL")
    conn.close()
    
    print(f"\nDatabase build complete! Loaded a total of {total_locations} global locations.", flush=True)

if __name__ == '__main__':
    build_db()
