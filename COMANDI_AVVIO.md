RIEPILOGO COMANDI PER RIACCENSIONE
TERMINALE 1 - Backend:
bash
cd ~/LNIfinal/LNI/lniworks
sudo service docker start
docker-compose up -d
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
TERMINALE 2 - Frontend:
bash
cd ~/LNIfinal/LNI/frontend
npm run dev
Ho salvato la guida completa nel file COMANDI_AVVIO.md nella root del progetto per riferimento futuro.

Accessi:

Frontend: http://localhost:5173
Backend: http://localhost:8000
API docs: http://localhost:8000/docs

# COMANDI PER AVVIO RAPIDO APP LNI

## Ogni volta che accendi il PC, segui questi passaggi:

### TERMINALE 1 - BACKEND (PostgreSQL + FastAPI)

```bash
# Entra nella cartella del backend
cd ~/LNIfinal/LNI/lniworks

# Avvia Docker daemon
sudo service docker start

# Avvia il database PostgreSQL
docker-compose up -d

# Attiva l'ambiente virtuale Python
source .venv/bin/activate

# Avvia il server FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### TERMINALE 2 - FRONTEND (Vite + React)

```bash
# Entra nella cartella del frontend
cd ~/LNIfinal/LNI/frontend

# Avvia il server di sviluppo Vite
npm run dev
```

## ACCESSI

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentazione API**: http://localhost:8000/docs

## VERIFICHE

Se qualcosa non funziona, verifica:

```bash
# Verifica Docker
docker ps
docker-compose ps

# Verifica Python
python3 --version
which python3

# Verifica Node.js
node --version
npm --version
```

## STOP DEI SERVIZI

Per fermare tutto:

```bash
# Terminale 1: Ctrl+C (per fermare uvicorn)
# Terminale 2: Ctrl+C (per fermare vite)

# Ferma i container Docker
cd ~/LNIfinal/LNI/lniworks
docker-compose down
```

## NOTE IMPORTANTI

- Assicurati che Docker Desktop sia avviato su Windows (se installato)
- I file .env sono già configurati per localhost
- L'ambiente virtuale Python (.venv) è già creato
- Le dipendenze npm sono già installate
