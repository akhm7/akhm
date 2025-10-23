// Theme management
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

if (!data) {
    console.log('No data available');
} else {
    renderHeatmap();
    renderSleepChart();
}

function renderHeatmap() {
    const heatmapEl = document.getElementById('heatmap');
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    
    // Получаем все данные и находим максимум для нормализации
    const dailyData = data.daily_data;
    const steps = Object.values(dailyData)
        .map(d => d.steps || 0)
        .filter(s => s > 0);
    
    const maxSteps = Math.max(...steps);
    const avgSteps = data.averages.steps;
    
    // Генерируем последние 371 день (53 недели)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 370);
    
    // Начинаем с воскресенья
    while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() - 1);
    }
    
    for (let i = 0; i < 371; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dailyData[dateStr];
        const steps = dayData?.steps || 0;
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        // Уровень активности (0-4)
        let level = 0;
        if (steps > 0) {
            if (steps >= avgSteps * 1.5) level = 4;
            else if (steps >= avgSteps * 1.2) level = 3;
            else if (steps >= avgSteps * 0.8) level = 2;
            else level = 1;
        }
        
        cell.setAttribute('data-level', level);
        cell.setAttribute('title', `${dateStr}: ${steps.toLocaleString()} steps`);
        
        grid.appendChild(cell);
    }
    
    heatmapEl.appendChild(grid);
}

function renderSleepChart() {
    const sleepEl = document.getElementById('sleep-bars');
    const avgSleep = data.averages.sleep_minutes;
    
    // Вычисляем средние фазы сна из всех дней
    const allDays = Object.values(data.daily_data).filter(d => d.sleep.total_minutes);
    
    const phases = {
        'Deep': allDays.map(d => d.sleep.deep_sleep_minutes || 0),
        'Light': allDays.map(d => d.sleep.light_sleep_minutes || 0),
        'REM': allDays.map(d => d.sleep.rem_sleep_minutes || 0),
        'Awake': allDays.map(d => d.sleep.awake_minutes || 0)
    };
    
    const avgPhases = {};
    for (const [phase, values] of Object.entries(phases)) {
        const sum = values.reduce((a, b) => a + b, 0);
        avgPhases[phase] = values.length > 0 ? Math.round(sum / values.length) : 0;
    }
    
    // Находим максимум для нормализации
    const maxPhase = Math.max(...Object.values(avgPhases));
    
    for (const [phase, minutes] of Object.entries(avgPhases)) {
        const bar = document.createElement('div');
        bar.className = 'sleep-bar';
        
        const label = document.createElement('div');
        label.className = 'sleep-label';
        label.textContent = phase;
        
        const track = document.createElement('div');
        track.className = 'sleep-track';
        
        const fill = document.createElement('div');
        fill.className = 'sleep-fill';
        const percentage = maxPhase > 0 ? (minutes / maxPhase) * 100 : 0;
        fill.style.width = `${percentage}%`;
        
        const value = document.createElement('div');
        value.className = 'sleep-value';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        value.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        track.appendChild(fill);
        bar.appendChild(label);
        bar.appendChild(track);
        bar.appendChild(value);
        sleepEl.appendChild(bar);
    }
}