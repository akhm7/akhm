# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Health & Fitness Analytics Dashboard - A personal health tracking web application that integrates with Garmin Connect to visualize fitness and wellness metrics. Built with FastAPI (Python), Redis for data persistence, and vanilla JavaScript with Chart.js for visualizations.

**Design Philosophy**: Minimalist dark-themed interface inspired by GitHub's design system - serious, professional, and focused on data analysis. No decorative elements or emojis, clean typography, and high-contrast charts for optimal readability.

## Technology Stack

- **Backend**: FastAPI 0.119.1, Python 3.13, Uvicorn ASGI server
- **Data Store**: Redis 7 (single key `garmin_data` stores all metrics as JSON)
- **Frontend**: Vanilla JavaScript, Bootstrap 5.3.0, Chart.js 4.4.0 (all via CDN)
- **Integration**: garminconnect 0.2.30 library for Garmin Connect API
- **Deployment**: Docker Compose with web service and Redis container

## Development Commands

### Running the Application

**With Docker Compose (recommended):**
```bash
docker-compose up -d              # Start services
docker-compose logs -f web        # View application logs
docker-compose logs -f redis      # View Redis logs
docker-compose down               # Stop services
```

**With Python directly (requires Redis running):**
```bash
pip install -r requirements.txt   # Install dependencies
python app.py                     # Run application
```

Access the dashboard at http://localhost:8000

### Docker Operations

```bash
docker build -t akhm:latest .                    # Build image
docker-compose up --build                        # Rebuild and start
docker exec -it akhm-web-1 bash                 # Shell into web container
docker exec -it akhm-redis-1 redis-cli          # Access Redis CLI
```

## Architecture

### Application Structure

- **app.py** (18.5KB): Main FastAPI application containing:
  - All API endpoints (dashboard, admin, data management)
  - Garmin Connect integration logic
  - Data processing and averaging calculations
  - Redis connection and data persistence

- **templates/**: Jinja2 HTML templates
  - `index.html`: Main dashboard with daily metrics and 5 chart containers
  - `admin.html`: Admin panel for manual data entry and export/import

- **static/**: Client-side JavaScript
  - `app.js`: Chart.js rendering for 5 metric visualizations (30-day trends, 90-day for weight)
  - `admin.js`: Form handlers for data entry, export, import, and clear operations

### Data Flow

```
Garmin Connect API → POST /update → app.py → Redis (garmin_data key)
                                              ↓
                                    GET / or GET /api/data
                                              ↓
                                    Jinja2 Template / JSON
                                              ↓
                                    Browser → Chart.js Rendering
```

### Core API Endpoints

```
GET  /                    → Dashboard page with daily metrics and charts
GET  /admin              → Admin control panel
POST /update             → Fetch latest data from Garmin Connect
POST /api/weight         → Add/update weight entry
POST /api/calories       → Add food calories with datetime
POST /api/water          → Add water intake (cumulative daily tracking)
GET  /api/data           → Retrieve all stored data as JSON
GET  /api/export         → Export data for backup
POST /api/import         → Import data from JSON file
POST /api/clear          → Clear all data from Redis
```

### Redis Data Structure

Single key `garmin_data` stores JSON object:
```json
{
  "period": {"start": "2025-01-01", "end": "YYYY-MM-DD"},
  "daily_data": {
    "YYYY-MM-DD": {
      "date": "YYYY-MM-DD",
      "steps": int,
      "calories": int,
      "distance_km": float,
      "sleep": {
        "total_minutes": int,
        "deep_sleep_minutes": int,
        "light_sleep_minutes": int,
        "rem_sleep_minutes": int,
        "awake_minutes": int
      },
      "weight": float,          // User-entered
      "water_ml": int,          // User-entered (cumulative daily)
      "food_log": [             // User-entered
        {"time": "HH:MM", "food": "description", "calories": int}
      ]
    }
  },
  "averages": {
    "year": {...},
    "month": {...},
    "weight": {...}
  },
  "last_update": "ISO timestamp"
}
```

## Metrics Tracked

**From Garmin Connect (automatic sync via /update):**
- Steps, distance (km), calories burned
- Sleep breakdown (deep/light/REM/awake minutes)

**User-entered (via admin panel):**
- Weight (kg) - displayed in 90-day trend chart
- Food calories with time and description
- Water intake (ml) - tracks cumulative daily amount, 2000ml target

## Key Implementation Details

### UI/UX Design

- **Dark Theme**: GitHub-inspired color scheme with CSS variables (--bg-primary: #1a1d23, --accent: #58a6ff)
- **Quick Entry Panel**: Inline forms on main dashboard for weight, water, and calories (no need to navigate to admin)
- **Sync Button**: Direct access to Garmin sync from header
- **Typography**: System font stack, uppercase labels with letter-spacing, tabular numbers
- **Charts**: Dark-themed with muted gridlines (#3d444d), minimal borders, optimized for data analysis

### Garmin Integration

- OAuth credentials stored in `~/.garminconnect` directory after first login
- Initial sync downloads from 2025-01-01 (hardcoded in app.py:278)
- Subsequent syncs update only current day's data
- Graceful error handling if Garmin API unavailable

### Chart Visualizations

All charts show last 30 days except weight (90 days):
- **Steps**: Bar chart (blue)
- **Calories**: Combined bar (burned - red) and line (consumed - green)
- **Sleep Cycles**: Stacked bar (deep/light/REM/awake - blue shades)
- **Water Intake**: Bar chart with 2000ml target line (yellow dashed)
- **Weight Progress**: 90-day line chart with area fill (green)

### Data Management

- **Quick Entry**: Directly on main page for weight (kg), water (ml), and calories (kcal)
- **Export**: Downloads JSON file with all data (via admin page)
- **Import**: Uploads JSON file to restore data (via admin page)
- **Clear**: Removes all data from Redis (via admin page, requires confirmation)
- Manual entries automatically use current date/time

## Development Notes

- No build tools or npm required - uses CDN libraries for frontend
- Redis must be running before starting the application
- Docker Compose handles service dependencies automatically
- Hot-reload enabled in docker-compose.yml with volume mounts
- `update_data.py` is a placeholder for scheduled cron jobs (currently empty)

## Security Considerations

**Current Issues:**
- Garmin credentials hardcoded in app.py (lines 265-266)
- No authentication on admin endpoints - open access to data management
- Should implement environment variables for sensitive configuration

**When modifying:**
- Do not commit Garmin credentials to repository
- Consider adding FastAPI security (OAuth2, JWT, or basic auth) for admin panel
- Keep `.garminconnect` directory in .gitignore
