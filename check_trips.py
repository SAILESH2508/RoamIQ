from backend.app import app
from backend.models.trip import Trip
from backend.extensions import db

with app.app_context():
    trips = Trip.query.all()
    print(f"Total trips in DB: {len(trips)}")
    for trip in trips:
        print(trip.to_dict())
