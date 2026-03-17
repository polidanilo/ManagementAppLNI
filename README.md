# LNI Management App

I wanted to design and build a full-stack digital management system to solve a real-world problem at the LNI (Lega Navale Italiana) nautical center: transitioning their daily operations from paper logs to a streamlined, mobile-first digital workspace. This project served as my first complete web application, allowing me to bridge my existing knowledge of systems and containerization (Docker, Databases) with modern software development. 

Since I heavily leveraged AI tools for the raw coding phase, I chose to use this project as an opportunity to step back and act as a System Architect and Product Manager. This allowed me to break free from syntax analysis paralysis and focus entirely on system design, edge-case handling, and user experience.

<p align="center">
  <img src="assets/preview/home_navigation.gif" alt="App Navigation and UI" width="80%">
  <br>
  <em>Main Dashboard: The application provides a mobile-first interface to track boat problems, volunteer shifts, and purchase orders, dynamically updating based on the selected season and shift.</em>
</p>

## Overview
Inspired by the operational bottlenecks of manual record-keeping in a nautical environment, this project explores the architectural principles of modern web applications: client-server decoupling, RESTful API design, and relational data persistence. Its primary goal is to provide staff and volunteers with a lightweight, error-resistant tool to log operations and quickly monitor pending versus completed tasks.

Building the system from scratch (conceptually and architecturally) was a practical dive into:
* **User Experience (UX) and Continuity:** Designing bottom-sheet modals with background overlays so users can add or edit items without losing the visual context of the main data lists.
* **State Management and Edge Cases:** Preventing UI breaks from ultra-long text inputs, handling unpredictable browser "back-button" navigations, and ensuring robust local state updates after database mutations.
* **Production-Ready Architecture:** Implementing a strict separation of concerns. The React frontend handles the presentation layer, the FastAPI backend processes the business logic, and the PostgreSQL database ensures data persistence within an isolated Docker container.

<p align="center">
  <img src="assets/preview/modal_interaction.png" alt="Bottom-sheet Modal Interaction" width="60%">
  <br>
  <em>UX/UI Design: Using overlay modals for data entry (e.g., adding a new maintenance work or boat problem) to maintain context and improve mobile usability.</em>
</p>

## Architecture & Core Modules
The repository is organized around a decoupled architecture, split into two main domains. Here are the critical components that define the system's behavior:

**`frontend/src/` (The Client)**

A Single Page Application (SPA) built with React and Vite. It handles local state, form collection, and uses Axios to send JSON payloads to the backend. It relies on a global context to manage authentication state and active filters (Season/Shift).

**`backend/app/api/routes/` (The API Gateway)**

The core of the FastAPI application. It exposes RESTful endpoints (GET, POST, PUT, DELETE) grouped by domain (e.g., `/orders`, `/boats`, `/problems`). Each route is protected by dependency injection requiring a valid JWT Bearer token.

**`backend/app/schemas/` (Data Validation)**

Pydantic models act as the system's strict gatekeepers. Before any data touches the database, these schemas validate the incoming HTTP request payloads (e.g., ensuring prices are numbers and required fields are present), immediately rejecting malformed data with a 422 Unprocessable Entity error.

**`backend/app/db/models.py` (The Persistence Layer)**

SQLAlchemy Object-Relational Mapping (ORM) classes. These define the physical structure of the PostgreSQL tables and their relationships (Foreign Keys). A key design choice was strictly separating these ORM models from the Pydantic schemas to ensure sensitive data (like password hashes) is never serialized and leaked to the frontend.

**`docker-compose.yml`**

The infrastructure definition. It spins up a PostgreSQL 15 database in an isolated container, ensuring that the development environment is perfectly reproducible across different machines without localized dependency conflicts.

### System Integration Notes
* **Data Flow:** A typical mutation (e.g., creating an order) follows a strict path: React Component -> Axios POST request -> FastAPI Router -> Pydantic Validation -> SQLAlchemy Session -> PostgreSQL Insert -> JSON Response -> React Query State Invalidation -> UI Update.
* **Authentication Security:** JWT (JSON Web Tokens) are generated upon login and stored in the client's `localStorage`. An Axios interceptor automatically attaches this token to the `Authorization` header of every subsequent outgoing API request.
* **Database Seeding:** A custom `seed.py` script was developed to populate the database with initial structural data (Boat types, Parts, standard Shifts) to allow immediate testing without a cold-start UI lock.

## How to Run Locally

The project requires Docker and Node.js. 

**1. Start the Database**
Navigate to the backend directory and spin up the PostgreSQL container:
```bash
cd backend
sudo docker compose up -d
