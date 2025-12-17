from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lniuser:lnipassword@localhost:5432/lnidb")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def remove_fake_users():
    db = SessionLocal()
    try:
        # Trova tutti gli utenti tranne 'test'
        fake_users = db.query(User).filter(User.username != 'test').all()
        
        if not fake_users:
            print("✅ Nessun utente fittizio da rimuovere")
            return
        
        print(f"🔍 Trovati {len(fake_users)} utenti da rimuovere:")
        for user in fake_users:
            print(f"   - {user.username} (ID: {user.id})")
        
        print("\n⚠️  Procedendo con la rimozione automatica...")
        
        # Rimuovi gli utenti
        deleted_count = 0
        for user in fake_users:
            try:
                db.delete(user)
                deleted_count += 1
                print(f"✅ Rimosso: {user.username}")
            except Exception as e:
                print(f"❌ Errore rimuovendo {user.username}: {e}")

        db.commit()
        print(f"\n✅ Operazione completata! Rimossi {deleted_count} utenti")
        print(f"✅ Utente 'test' mantenuto nel database")

    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🗑️  RIMOZIONE UTENTI FITTIZI")
    print("=" * 60)
    remove_fake_users()
