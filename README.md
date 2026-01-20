# Purpose Activation Toolkit

This repository contains the **Purpose Activation Toolkit**, an interactive web application designed to empower individuals to recognize their divine power, awaken to their divine potential and align with their divine purpose.  

The toolkit combines concepts from quantum science, mindfulness, and vitality research to provide a structured pathway for seekers, awakened individuals and fundamentalists alike. It leverages modern web technologies to create a dynamic experience while remaining portable enough to embed into other platforms (e.g. the **Sites** section of GoHighLevel).

## Project Structure

```
├── backend/            # FastAPI backend providing API endpoints
│   └── app.py          # Main FastAPI application with route definitions
├── frontend/           # Static web application (can be served via any web server)
│   ├── index.html      # Main page with interactive sections
│   ├── style.css       # Stylesheet for the frontend
│   └── script.js       # Client‑side JavaScript powering interactivity
├── docs/               # Design and content documentation
│   └── sections.md     # Detailed outline of toolkit sections
├── package.json        # Optional Node package definition (placeholder for future expansion)
└── README.md           # Project overview and setup instructions
```

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jeremiahvanwagner-droid/purpose-activation-toolkit.git
   cd purpose-activation-toolkit
   ```

## Environment variables

Set these values in your shell, `.env`, or Docker Compose environment block before running the services:

- `DATABASE_URL`: Database connection string for the backend.
- `JWT_SECRET_KEY`: Secret used to sign access and refresh tokens.
- `JWT_ALGORITHM`: Algorithm for JWT signing (e.g., `HS256`).
- `JWT_ACCESS_EXPIRE_MINUTES`: Access token lifetime in minutes.
- `JWT_REFRESH_EXPIRE_DAYS`: Refresh token lifetime in days.
- `REDIS_URL`: Redis connection string for Celery broker/result backend.
- External links used by the frontend or content integrations:
  - `BEYOND_VEIL_URL`
  - `CALENDLY_URL`
  - `SKOOL_URL`
  - `BOOK_STORE_URL`

## Usage

### Run with Docker (recommended)

```bash
docker compose up --build
```

The services are available at:
* Frontend: `http://localhost:8080`
* API: `http://localhost:8000`

The compose file mounts `backend/app.py` into the API container and runs Uvicorn with `--reload`
for a fast development loop.

### Run manually (without Docker)

1. **Install backend dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn
   ```

2. **Run the backend server:**
   ```bash
   uvicorn backend.app:app --reload
   ```
   The API will be available at `http://localhost:8000`.

3. **Run the Celery worker (for background jobs):**
   ```bash
   celery -A backend.worker worker -l info
   ```
   Ensure `REDIS_URL` is configured so the worker can connect to Redis.

4. **Serve the frontend:**
   Since the frontend is static, you can open `frontend/index.html` in a browser directly or serve it with any static file server. If running with the backend, you can add a middleware or mount static files to serve the frontend on the same domain.

5. **If you have a Next.js frontend:**
   Install dependencies and run the Next.js development server:
   ```bash
   npm install
   npm run dev
   ```

## Assessments & integrations

- Use the external link environment variables to point users to assessments, scheduling, community, and bookstore experiences hosted elsewhere.
- These URLs can be surfaced in the frontend or embedded in partner platforms such as GoHighLevel sites.

## Customisation

The toolkit is designed to be modular:

* **Sections** – The content of each section can be adjusted in `docs/sections.md` and reflected in `frontend/index.html`.  
* **API endpoints** – The backend exposes endpoints such as `/api/intent` and `/api/activate` for dynamic functionality. These can be extended or integrated into other services.

## Integration with GoHighLevel Sites

Because the frontend is a simple static web application, it can be embedded into GoHighLevel Sites via an iframe or by copying the HTML/CSS/JS content into a page on the platform. The backend can run separately on a hosting provider (e.g. Heroku, Render) or be omitted if the site only requires static content.

## Contributing

1. Fork the repository.
2. Create a new branch with your feature/fix.
3. Commit your changes.
4. Open a pull request detailing the modifications.

## License

This project is licensed under the MIT license. See [LICENSE](LICENSE) for details.
