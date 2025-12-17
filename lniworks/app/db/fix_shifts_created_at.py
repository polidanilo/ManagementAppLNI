import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.db.models import Shift


def fix_shifts_created_at():
    db = SessionLocal()

    try:
        print("🔧 Aggiornamento created_at per turni esistenti...\n")

        # Trova tutti i turni con created_at NULL
        shifts_to_fix = db.query(Shift).filter(Shift.created_at == None).all()

        if not shifts_to_fix:
            print("✅ Tutti i turni hanno già created_at impostato!")
            return

        print(f"📋 Trovati {len(shifts_to_fix)} turni da aggiornare:")

        for shift in shifts_to_fix:
            print(f"   - ID: {shift.id}, Stagione: {shift.season_id}, Turno: {shift.shift_number}")

        # Aggiorna con timestamp corrente
        now = datetime.utcnow()
        for shift in shifts_to_fix:
            shift.created_at = now

        db.commit()

        print(f"\n✅ Aggiornati {len(shifts_to_fix)} turni con created_at = {now}")
        print("🎉 Operazione completata con successo!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Errore durante l'aggiornamento: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_shifts_created_at()
