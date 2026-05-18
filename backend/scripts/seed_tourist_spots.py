import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'locations.db')

TOURIST_SPOTS = [
    # --- TAMIL NADU (admin1='25') ---
    ("Marina Beach", "Marina Beach, Chennai, Tamil Nadu, India", 13.0500, 80.2824, "IN", "H", "BEAC"),
    ("Brihadisvara Temple", "Brihadisvara Temple, Thanjavur, Tamil Nadu, India", 10.7828, 79.1322, "IN", "S", "TMPL"),
    ("Meenakshi Amman Temple", "Meenakshi Amman Temple, Madurai, Tamil Nadu, India", 9.9195, 78.1193, "IN", "S", "TMPL"),
    ("Shore Temple", "Shore Temple, Mahabalipuram, Tamil Nadu, India", 12.6163, 80.1983, "IN", "S", "TMPL"),
    ("Ooty Botanical Gardens", "Ooty Botanical Gardens, Ooty, Tamil Nadu, India", 11.4178, 76.7111, "IN", "S", "GARD"),
    ("Kodaikanal Lake", "Kodaikanal Lake, Kodaikanal, Tamil Nadu, India", 10.2323, 77.4891, "IN", "H", "LK"),
    ("Ramanathaswamy Temple", "Ramanathaswamy Temple, Rameswaram, Tamil Nadu, India", 9.2881, 79.3174, "IN", "S", "TMPL"),
    ("Vivekananda Rock Memorial", "Vivekananda Rock Memorial, Kanyakumari, Tamil Nadu, India", 8.0779, 77.5552, "IN", "S", "MONU"),
    ("Mudumalai National Park", "Mudumalai National Park, Nilgiris, Tamil Nadu, India", 11.5623, 76.6215, "IN", "L", "PRK"),
    ("Courtallam Waterfalls", "Courtallam Waterfalls, Tenkasi, Tamil Nadu, India", 8.9298, 77.2694, "IN", "H", "WTRF"),

    # --- KERALA (admin1='13') ---
    ("Athirappilly Waterfalls", "Athirappilly Waterfalls, Thrissur, Kerala, India", 10.2851, 76.5694, "IN", "H", "WTRF"),
    ("Munnar Tea Gardens", "Munnar Tea Gardens, Munnar, Kerala, India", 10.0889, 77.0595, "IN", "S", "GARD"),
    ("Alappuzha Backwaters", "Alappuzha Backwaters, Alleppey, Kerala, India", 9.4981, 76.3388, "IN", "H", "LK"),
    ("Fort Kochi", "Fort Kochi, Ernakulam, Kerala, India", 9.9686, 76.2421, "IN", "S", "FT"),
    ("Varkala Beach", "Varkala Beach, Trivandrum, Kerala, India", 8.7338, 76.7059, "IN", "H", "BEAC"),
    ("Kovalam Beach", "Kovalam Beach, Trivandrum, Kerala, India", 8.4004, 76.9787, "IN", "H", "BEAC"),
    ("Silent Valley National Park", "Silent Valley National Park, Palakkad, Kerala, India", 11.1306, 76.4298, "IN", "L", "PRK"),
    ("Vagamon Pine Forest", "Vagamon Pine Forest, Idukki, Kerala, India", 9.6917, 76.9048, "IN", "L", "RES"),
    ("Wayanad Edakkal Caves", "Wayanad Edakkal Caves, Wayanad, Kerala, India", 11.6279, 76.2347, "IN", "S", "RUIN"),
    ("Bekal Fort", "Bekal Fort, Kasaragod, Kerala, India", 12.3908, 75.0345, "IN", "S", "FT"),

    # --- GOA (admin1='33') ---
    ("Baga Beach", "Baga Beach, Calangute, Goa, India", 15.5553, 73.7517, "IN", "H", "BEAC"),
    ("Calangute Beach", "Calangute Beach, Goa, India", 15.5442, 73.7554, "IN", "H", "BEAC"),
    ("Anjuna Beach", "Anjuna Beach, Goa, India", 15.5733, 73.7410, "IN", "H", "BEAC"),
    ("Aguada Fort", "Aguada Fort, Candolim, Goa, India", 15.4923, 73.7737, "IN", "S", "FT"),
    ("Dudhsagar Waterfalls", "Dudhsagar Waterfalls, Sanguem, Goa, India", 15.3185, 74.3140, "IN", "H", "WTRF"),
    ("Basilica of Bom Jesus", "Basilica of Bom Jesus, Old Goa, Goa, India", 15.5009, 73.9116, "IN", "S", "CH"),
    ("Palolem Beach", "Palolem Beach, Canacona, Goa, India", 15.0100, 74.0232, "IN", "H", "BEAC"),

    # --- KARNATAKA (admin1='19') ---
    ("Hampi Ruins", "Hampi Ruins, Bellary, Karnataka, India", 15.3350, 76.4600, "IN", "S", "RUIN"),
    ("Mysore Palace", "Mysore Palace, Mysuru, Karnataka, India", 12.3052, 76.6551, "IN", "S", "PAL"),
    ("Gokarna Om Beach", "Gokarna Om Beach, Gokarna, Karnataka, India", 14.5298, 74.3218, "IN", "H", "BEAC"),
    ("Coorg Abbey Falls", "Coorg Abbey Falls, Madikeri, Karnataka, India", 12.4542, 75.7423, "IN", "H", "WTRF"),
    ("Jog Falls", "Jog Falls, Shimoga, Karnataka, India", 14.2285, 74.8105, "IN", "H", "WTRF"),
    ("Bandipur National Park", "Bandipur National Park, Chamarajanagar, Karnataka, India", 11.6667, 76.6333, "IN", "L", "PRK"),

    # --- ANDHRA PRADESH (admin1='02') ---
    ("Tirupati Venkateswara Temple", "Tirupati Venkateswara Temple, Tirumala, Andhra Pradesh, India", 13.6833, 79.3500, "IN", "S", "TMPL"),
    ("Araku Valley", "Araku Valley, Visakhapatnam, Andhra Pradesh, India", 18.3273, 82.8775, "IN", "T", "VAL"),
    ("Belum Caves", "Belum Caves, Kurnool, Andhra Pradesh, India", 15.1014, 78.1130, "IN", "S", "RUIN"),
    ("Horsley Hills", "Horsley Hills, Chittoor, Andhra Pradesh, India", 13.6492, 78.3978, "IN", "T", "MT"),
    ("Borra Caves", "Borra Caves, Visakhapatnam, Andhra Pradesh, India", 18.2805, 83.0384, "IN", "S", "RUIN")
]

def seed():
    if not os.path.exists(DB_PATH):
        print("Database not found!")
        return

    print("Seeding popular South Indian tourist spots into SQLite...", flush=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    count = 0
    for name, display_name, lat, lon, country_code, feature_class, feature_code in TOURIST_SPOTS:
        # Check if already exists in locations table (prefix match or name match)
        cursor.execute("SELECT id FROM locations WHERE name = ? AND country_code = ?", (name, country_code))
        row = cursor.fetchone()
        
        if not row:
            cursor.execute("""
            INSERT INTO locations (name, display_name, lat, lon, country_code, feature_class, feature_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, display_name, lat, lon, country_code, feature_class, feature_code))
            count += 1
        else:
            # Update to make sure it has exact display name and features
            cursor.execute("""
            UPDATE locations 
            SET display_name = ?, lat = ?, lon = ?, feature_class = ?, feature_code = ?
            WHERE name = ? AND country_code = ?
            """, (display_name, lat, lon, feature_class, feature_code, name, country_code))
            count += 1

    conn.commit()
    conn.close()
    print(f"Successfully seeded/updated {count} popular South Indian tourist spots!", flush=True)

if __name__ == '__main__':
    seed()
