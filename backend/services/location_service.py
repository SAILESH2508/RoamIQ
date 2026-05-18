import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

class LocationModel:
    def __init__(self, db_path):
        self.db_path = db_path
        
    def search(self, query, limit=10):
        if not query or not os.path.exists(self.db_path):
            return []

        query = query.lower().strip()
        results = []
        
        # Rank features to prioritize:
        # 1. Country Capitals (PPLC)
        # 2. State/Region Capitals (PPLA)
        # 3. States/Provinces/Regions (ADM1)
        # 4. Sub-region/District Capitals (PPLA2)
        # 5. Tourist Sights & Sights (Temples, Forts, Beaches, Palaces, Waterfalls, Reserves, Parks, Museums)
        # 6. Populated Cities/Towns/Villages (PPL)
        # 7. Districts/Counties (ADM2)
        rank_sql = """
        CASE feature_code
            WHEN 'PPLC' THEN 1
            WHEN 'PPLA' THEN 2
            WHEN 'ADM1' THEN 3
            WHEN 'PPLA2' THEN 4
            WHEN 'TMPL' THEN 5
            WHEN 'FT' THEN 5
            WHEN 'BEAC' THEN 5
            WHEN 'WTRF' THEN 5
            WHEN 'PAL' THEN 5
            WHEN 'MUSE' THEN 5
            WHEN 'PRK' THEN 5
            WHEN 'RES' THEN 5
            WHEN 'PPL' THEN 6
            WHEN 'ADM2' THEN 7
            ELSE 8
        END ASC
        """
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Prefix match (uses index). Exact name first, then feature rank, then shortest length.
            cursor.execute(f"""
                SELECT name, display_name, lat, lon 
                FROM locations 
                WHERE name LIKE ? 
                ORDER BY (name = ?) DESC, {rank_sql}, length(name) ASC 
                LIMIT ?
            """, (query + '%', query, limit))
            
            prefix_results = cursor.fetchall()
            for r in prefix_results:
                results.append({
                    'name': r[0],
                    'display_name': r[1],
                    'lat': r[2],
                    'lon': r[3]
                })
                
            # 2. Substring match if we need more results
            if len(results) < limit:
                needed = limit - len(results)
                
                cursor.execute(f"""
                    SELECT name, display_name, lat, lon 
                    FROM locations 
                    WHERE name LIKE ? AND name NOT LIKE ?
                    ORDER BY {rank_sql}, length(name) ASC 
                    LIMIT ?
                """, ('%' + query + '%', query + '%', needed))
                
                substring_results = cursor.fetchall()
                for r in substring_results:
                    results.append({
                        'name': r[0],
                        'display_name': r[1],
                        'lat': r[2],
                        'lon': r[3]
                    })
            
            conn.close()
        except Exception as e:
            logger.error(f"Error searching SQLite location DB: {e}")
            
        return results

# Initialize singleton model
data_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'locations.db')
location_model = LocationModel(data_file)
