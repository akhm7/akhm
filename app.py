from fastapi import FastAPI, Request, Body
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import redis
import json
import os
from datetime import datetime, timedelta
from garminconnect import Garmin
from typing import Optional

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Redis connection
r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

PROFILE = {
    "name": "Khojiakbar Akhmedov",
    "telegram": "@akhm7",
    "role": "Software Engineer, Data Engineer",
    "hobbies": "Basketball, Manga/Manhwa/Ranobe"
}

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Главная страница"""
    # Получаем данные из Redis
    data = r.get("garmin_data")
    if not data:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "profile": PROFILE,
            "data": None,
            "message": "No data yet. Run /update to fetch data."
        })
    
    parsed_data = json.loads(data)
    return templates.TemplateResponse("index.html", {
        "request": request,
        "profile": PROFILE,
        "data": parsed_data
    })

@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request):
    """Admin страница"""
    return templates.TemplateResponse("admin.html", {
        "request": request
    })

@app.get("/api/data")
async def get_data():
    """API endpoint для получения данных"""
    data = r.get("garmin_data")
    if not data:
        return JSONResponse({"error": "No data available"}, status_code=404)
    return JSONResponse(json.loads(data))

@app.post("/api/weight")
async def add_weight(
    weight: float = Body(..., embed=True),
    date: Optional[str] = Body(None, embed=True)
):
    """Добавить вес за день"""
    try:
        date_str = date or datetime.today().strftime('%Y-%m-%d')
        
        # Получаем существующие данные
        existing_data = r.get("garmin_data")
        if not existing_data:
            return JSONResponse({"error": "No data initialized. Run /update first"}, status_code=400)
        
        result = json.loads(existing_data)
        daily_data = result.get("daily_data", {})
        
        # Добавляем или обновляем вес
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "steps": None,
                "calories": None,
                "distance_km": None,
                "sleep": {"total_minutes": None},
                "weight": weight
            }
        else:
            daily_data[date_str]["weight"] = weight
        
        result["daily_data"] = daily_data
        result["last_update"] = datetime.now().isoformat()
        
        # Сохраняем
        r.set("garmin_data", json.dumps(result))
        
        return JSONResponse({
            "status": "success",
            "date": date_str,
            "weight": weight
        })
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post("/api/calories")
async def add_calories(
    calories: int = Body(..., embed=True),
    datetime_str: str = Body(..., embed=True, alias="datetime")
):
    """Добавить съеденные калории с датой и временем"""
    try:
        # Парсим дату-время
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        date_str = dt.strftime('%Y-%m-%d')
        
        # Получаем существующие данные
        existing_data = r.get("garmin_data")
        if not existing_data:
            return JSONResponse({"error": "No data initialized. Run /update first"}, status_code=400)
        
        result = json.loads(existing_data)
        daily_data = result.get("daily_data", {})
        
        # Инициализируем день если нет
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "steps": None,
                "calories": None,
                "distance_km": None,
                "sleep": {"total_minutes": None},
                "food_log": []
            }
        
        # Добавляем запись о еде
        if "food_log" not in daily_data[date_str]:
            daily_data[date_str]["food_log"] = []
        
        daily_data[date_str]["food_log"].append({
            "calories": calories,
            "datetime": datetime_str
        })
        
        result["daily_data"] = daily_data
        result["last_update"] = datetime.now().isoformat()
        
        # Сохраняем
        r.set("garmin_data", json.dumps(result))
        
        return JSONResponse({
            "status": "success",
            "date": date_str,
            "calories": calories,
            "datetime": datetime_str
        })
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/export")
async def export_data():
    """Экспорт данных из Redis"""
    data = r.get("garmin_data")
    if not data:
        return JSONResponse({"error": "No data available"}, status_code=404)
    return JSONResponse(json.loads(data))

@app.post("/api/import")
async def import_data(data: dict = Body(...)):
    """Импорт данных в Redis"""
    try:
        r.set("garmin_data", json.dumps(data))
        return JSONResponse({"status": "success", "message": "Data imported successfully"})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post("/api/clear")
async def clear_data():
    """Очистить все данные из Redis"""
    try:
        r.delete("garmin_data")
        return JSONResponse({"status": "success", "message": "All data cleared"})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
    
@app.post("/update")
async def update_data():
    """Обновление данных (вызывать через cron)"""
    import traceback
    try:
        # Путь к директории с токенами
        tokenstore = os.path.expanduser("~/.garminconnect")
        
        # Создаем клиента
        client = Garmin()
        
        # Пробуем логин с токенами
        try:
            client.login(tokenstore)
        except (FileNotFoundError, Exception):
            # Если токены не работают - логинимся заново
            client = Garmin("xgm.suite@gmail.com", "@Akhmedov4702468")
            client.login()
            # Сохраняем токены
            client.garth.dump(tokenstore)
        
        # Получаем существующие данные
        existing_data = r.get("garmin_data")
        if existing_data:
            result = json.loads(existing_data)
            daily_data = result.get("daily_data", {})
        else:
            # Первый запуск - загружаем все данные с начала года
            daily_data = {}
            start_date = datetime(2025, 1, 1)
            current = start_date
            today = datetime.today()
            
            while current <= today:
                date_str = current.strftime('%Y-%m-%d')
                try:
                    stats = client.get_stats(date_str)
                    sleep_data = client.get_sleep_data(date_str)
                    
                    day_data = process_day_data(date_str, stats, sleep_data)
                    if day_data:
                        daily_data[date_str] = day_data
                except:
                    pass
                current += timedelta(days=1)
        
        # Обновляем только сегодняшний день
        today_str = datetime.today().strftime('%Y-%m-%d')
        try:
            stats = client.get_stats(today_str)
            sleep_data = client.get_sleep_data(today_str)
            day_data = process_day_data(today_str, stats, sleep_data)
            if day_data:
                daily_data[today_str] = day_data
        except:
            pass
        
        # Пересчитываем средние
        averages = calculate_averages(daily_data)
        
        result = {
            "period": {
                "start": "2025-01-01",
                "end": today_str
            },
            "daily_data": daily_data,
            "averages": averages,
            "last_update": datetime.now().isoformat()
        }
        
        # Сохраняем в Redis
        r.set("garmin_data", json.dumps(result))
        
        return JSONResponse({
            "status": "success",
            "updated": today_str,
            "total_days": len(daily_data)
        })
    
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"ERROR: {str(e)}")
        print(f"TRACEBACK: {error_trace}")
        return JSONResponse({
            "status": "error",
            "message": str(e),
            "trace": error_trace
        }, status_code=500)

def process_day_data(date_str, stats, sleep_data):
    """Обрабатывает данные за день"""
    day_data = {
        "date": date_str,
        "steps": None,
        "calories": None,
        "distance_km": None,
        "sleep": {
            "total_minutes": None,
            "deep_sleep_minutes": None,
            "light_sleep_minutes": None,
            "rem_sleep_minutes": None,
            "awake_minutes": None
        }
    }
    
    if stats:
        steps = stats.get('totalSteps')
        if steps and steps > 0:
            day_data["steps"] = steps
            day_data["calories"] = stats.get('totalKilocalories')
            distance = stats.get('totalDistanceMeters')
            day_data["distance_km"] = round(distance / 1000, 2) if distance else None
    
    if sleep_data and 'dailySleepDTO' in sleep_data:
        sleep_info = sleep_data['dailySleepDTO']
        total_sleep = sleep_info.get('sleepTimeSeconds')
        
        if total_sleep:
            day_data["sleep"]["total_minutes"] = round(total_sleep / 60)
            day_data["sleep"]["deep_sleep_minutes"] = round(sleep_info.get('deepSleepSeconds', 0) / 60)
            day_data["sleep"]["light_sleep_minutes"] = round(sleep_info.get('lightSleepSeconds', 0) / 60)
            day_data["sleep"]["rem_sleep_minutes"] = round(sleep_info.get('remSleepSeconds', 0) / 60)
            day_data["sleep"]["awake_minutes"] = round(sleep_info.get('awakeSleepSeconds', 0) / 60)
    
    if day_data["steps"] or day_data["sleep"]["total_minutes"]:
        return day_data
    return None

def calculate_averages(daily_data):
    """Вычисляет средние значения"""
    all_steps = []
    all_calories = []
    all_distance = []
    all_sleep = []
    all_weight = []
    
    # За последний месяц
    month_ago = datetime.now() - timedelta(days=30)
    month_steps = []
    month_calories = []
    month_distance = []
    month_sleep = []
    
    for date_str, day in daily_data.items():
        day_date = datetime.strptime(date_str, '%Y-%m-%d')
        
        if day["steps"]:
            all_steps.append(day["steps"])
            if day["calories"]:
                all_calories.append(day["calories"])
            if day["distance_km"]:
                all_distance.append(day["distance_km"])
            
            # За месяц
            if day_date >= month_ago:
                month_steps.append(day["steps"])
                if day["calories"]:
                    month_calories.append(day["calories"])
                if day["distance_km"]:
                    month_distance.append(day["distance_km"])
        
        if day["sleep"]["total_minutes"]:
            all_sleep.append(day["sleep"]["total_minutes"])
            if day_date >= month_ago:
                month_sleep.append(day["sleep"]["total_minutes"])
        
        if day.get("weight"):
            all_weight.append(day["weight"])
    
    return {
        "year": {
            "steps": round(sum(all_steps) / len(all_steps)) if all_steps else 0,
            "calories": round(sum(all_calories) / len(all_calories)) if all_calories else 0,
            "distance_km": round(sum(all_distance) / len(all_distance), 2) if all_distance else 0,
            "sleep_minutes": round(sum(all_sleep) / len(all_sleep)) if all_sleep else 0,
            "days_with_data": len(all_steps),
            "total_steps": sum(all_steps) if all_steps else 0
        },
        "month": {
            "steps": round(sum(month_steps) / len(month_steps)) if month_steps else 0,
            "calories": round(sum(month_calories) / len(month_calories)) if month_calories else 0,
            "distance_km": round(sum(month_distance) / len(month_distance), 2) if month_distance else 0,
            "sleep_minutes": round(sum(month_sleep) / len(month_sleep)) if month_sleep else 0,
            "days_with_data": len(month_steps)
        },
        "weight": {
            "current": all_weight[-1] if all_weight else None,
            "average": round(sum(all_weight) / len(all_weight), 1) if all_weight else None,
            "min": min(all_weight) if all_weight else None,
            "max": max(all_weight) if all_weight else None
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)