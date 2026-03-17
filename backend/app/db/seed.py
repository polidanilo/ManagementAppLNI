from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Boat, BoatPart, BoatType

def seed_boats():
    db = SessionLocal()

    gommoni_count = db.query(Boat).filter(Boat.type == BoatType.GOMMONE).count()
    if gommoni_count > 0:
        db.close()
        return

    gommoni = [
        "Gommorizzo giallo (Honda 1)",
        "Gommorizzo blu (Suzuki 3)",
        "Gommorizzo rosso (Suzuki 2)",
        "Forsea",
        "Marshall",
        "Arancio 1 (Suzuki 1)",
        "Arancio 1 (Evinrude)",
        "Arancio 3 (Johnson)",
    ]
    
    # Optimist (1-20 + Openbic)
    optimist = [f"Optimist {i}" for i in range(1, 21)]
    optimist.append("Openbic")
    
    # Fly (A-T excluding J, K + Ultimo, X, Y, Z, Anna F, K + N1-N11)
    fly_names = [chr(65 + i) for i in range(20) if chr(65 + i) not in ['J', 'K']]
    fly_names.extend(["Ultimo", "X", "Y", "Z", "Anna F", "K"])
    fly_names.extend([f"N{i}" for i in range(1, 12)])
    
    # Equipe (1-13)
    equipe = [f"Equipe {i}" for i in range(1, 14)]
    
    # Caravelle
    caravelle = ["Roma", "Pinta", "Carla"]
    
    # Trident (1-4)
    trident = [f"Trident {i}" for i in range(1, 5)]
    
    # Combine all boats with their types
    boats_data = [
        (name, BoatType.GOMMONE) for name in gommoni
    ] + [
        (name, BoatType.OPTIMIST) for name in optimist
    ] + [
        (name, BoatType.FLY) for name in fly_names
    ] + [
        (name, BoatType.EQUIPE) for name in equipe
    ] + [
        (name, BoatType.CARAVELLE) for name in caravelle
    ] + [
        (name, BoatType.TRIDENT) for name in trident
    ]
    
    # Insert boats
    for name, boat_type in boats_data:
        boat = Boat(name=name, type=boat_type)
        db.add(boat)
    
    db.commit()
    print(f"Seeded {len(boats_data)} boats successfully!")
    
    # Boat parts mapping
    boat_parts = {
        BoatType.GOMMONE: ["Battello", "Motore", "Altro"],
        BoatType.OPTIMIST: ["Albero", "Circuito", "Deriva", "Picco", "Randa", "Scafo", "Timone", "Altro"],
        BoatType.FLY: ["Albero", "Crocette", "Deriva", "Drizza Fiocco", "Drizza Randa", "Fiocco Randa", "Sartiame", "Scafo", "Scotta Fiocco", "Scotta Randa", "Stecche", "Timone", "Altro"],
        BoatType.EQUIPE: ["Albero", "Crocette", "Deriva", "Drizza Fiocco", "Drizza Randa", "Fiocco Randa", "Sartiame", "Scafo", "Scotta Fiocco", "Scotta Randa", "Stecche", "Timone", "Altro"],
        BoatType.CARAVELLE: ["Albero", "Crocette", "Deriva", "Drizza Fiocco", "Drizza Randa", "Fiocco Randa", "Sartiame", "Scafo", "Scotta Fiocco", "Scotta Randa", "Stecche", "Timone", "Altro"],
        BoatType.TRIDENT: ["Albero", "Crocette", "Deriva", "Drizza Fiocco", "Drizza Randa", "Fiocco Randa", "Sartiame", "Scafo", "Scotta Fiocco", "Scotta Randa", "Stecche", "Timone", "Altro"],
    }
    
    # Insert boat parts
    total_parts = 0
    for boat_type, parts in boat_parts.items():
        for part_name in parts:
            boat_part = BoatPart(boat_type=boat_type, part_name=part_name)
            db.add(boat_part)
            total_parts += 1
    
    db.commit()
    print(f"Seeded {total_parts} boat parts successfully!")
    db.close()

if __name__ == "__main__":
    seed_boats()