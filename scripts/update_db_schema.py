import sqlite3
import os

def update_db():
    instance_dir = os.path.join(os.getcwd(), 'instance')
    db_path = os.path.join(instance_dir, 'roamiq.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(trips);")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'lat' not in columns:
            cursor.execute("ALTER TABLE trips ADD COLUMN lat FLOAT;")
            print("Added 'lat' column to 'trips' table.")
        else:
            print("'lat' column already exists.")
            
        if 'lng' not in columns:
            cursor.execute("ALTER TABLE trips ADD COLUMN lng FLOAT;")
            print("Added 'lng' column to 'trips' table.")
        else:
            print("'lng' column already exists.")
            
        conn.commit()
        print("Database update successful.")
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_db()
