import sys
import os

# Aggiungi il path del backend al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.db.session import SessionLocal
from app.db.models import Season, Shift

def add_seasons_and_shifts():
    db = SessionLocal()

    try:
        season_2024 = Season(
            name="Estate 2024",
            start_date=date(2024, 6, 10),
            end_date=date(2024, 8, 30),
            is_active=True
        )
        db.add(season_2024)
        db.flush()

        shifts_2024 = [
            Shift(season_id=season_2024.id, shift_number=1, start_date=date(2024, 6, 1), end_date=date(2024, 6, 30)),
            Shift(season_id=season_2024.id, shift_number=2, start_date=date(2024, 7, 1), end_date=date(2024, 7, 31)),
            Shift(season_id=season_2024.id, shift_number=3, start_date=date(2024, 8, 1), end_date=date(2024, 8, 31)),
            Shift(season_id=season_2024.id, shift_number=4, start_date=date(2024, 9, 1), end_date=date(2024, 9, 30)),
        ]
        db.add_all(shifts_2024)

        # STAGIONE 2025 (modifica se esiste già)
        season_2025 = db.query(Season).filter(Season.name.like("%2025%")).first()
        if season_2025:
            print(f"✅ Stagione 2025 trovata (ID: {season_2025.id})")
            # Aggiorna se necessario
            season_2025.start_date = date(2025, 6, 1)
            season_2025.end_date = date(2025, 9, 30)
        else:
            season_2025 = Season(
                name="Estate 2025",
                start_date=date(2025, 6, 1),
                end_date=date(2025, 9, 30),
                is_active=True
            )
            db.add(season_2025)
            db.flush()

        # Turni per 2025 (aggiungi solo se non esistono)
        existing_shifts_2025 = db.query(Shift).filter(Shift.season_id == season_2025.id).count()
        if existing_shifts_2025 == 0:
            shifts_2025 = [
                Shift(season_id=season_2025.id, shift_number=1, start_date=date(2025, 6, 1), end_date=date(2025, 6, 30)),
                Shift(season_id=season_2025.id, shift_number=2, start_date=date(2025, 7, 1), end_date=date(2025, 7, 31)),
                Shift(season_id=season_2025.id, shift_number=3, start_date=date(2025, 8, 1), end_date=date(2025, 8, 31)),
                Shift(season_id=season_2025.id, shift_number=4, start_date=date(2025, 9, 1), end_date=date(2025, 9, 30)),
            ]
            db.add_all(shifts_2025)
        else:
            print(f"ℹ️ Stagione 2025 ha già {existing_shifts_2025} turni")

        db.commit()
        print("✅ Stagioni e turni aggiunti con successo!")

        # Stampa riepilogo
        all_seasons = db.query(Season).all()
        for season in all_seasons:
            shifts = db.query(Shift).filter(Shift.season_id == season.id).all()
            print(f"\n📅 {season.name} (ID: {season.id})")
            print(f"   Dal {season.start_date} al {season.end_date}")
            print(f"   Turni: {len(shifts)}")
            for shift in shifts:
                print(f"   - Turno {shift.shift_number}: {shift.start_date} → {shift.end_date}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Errore: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_seasons_and_shifts()