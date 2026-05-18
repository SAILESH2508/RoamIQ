import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'locations.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("Querying for Kunnathur...")
c.execute("select name, country_code, display_name from locations where name like 'Kunnathur%' limit 10")
for row in c.fetchall():
    print(repr(row))

print("\nTotal IN rows:")
c.execute("select count(*) from locations where country_code='IN'")
print(c.fetchone()[0])

print("\nTotal US rows:")
c.execute("select count(*) from locations where country_code='US'")
print(c.fetchone()[0])

conn.close()
