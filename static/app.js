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

// Period toggle
const periodBtns = document.querySelectorAll('.period-btn');
const statsSections = document.querySelectorAll('.stats-grid');

periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        
        // Update buttons
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update sections
        statsSections.forEach(section => {
            if (section.dataset.period === period) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    });
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
    
    const dailyData = data.daily_data;
    
    // За последние 30 дней
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);
    
    // Начинаем с понедельника
    while (startDate.getDay() !== 1) {
        startDate.setDate(startDate.getDate() - 1);
    }
    
    // Находим максимум для нормализации
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recentSteps = Object.entries(dailyData)
        .filter(([date]) => new Date(date) >= monthAgo)
        .map(([, d]) => d.steps || 0)
        .filter(s => s > 0);
    
    const avgSteps = recentSteps.length > 0 
        ? recentSteps.reduce((a, b) => a + b, 0) / recentSteps.length 
        : 0;
    
    // Генерируем 35 дней (5 недель)
    for (let i = 0; i < 35; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dailyData[dateStr];
        const steps = dayData?.steps || 0;
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        // Уровень активности (0-4)
        let level = 0;
        if (steps > 0 && avgSteps > 0) {
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
    
    // Берем данные за последний месяц
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const allDays = Object.entries(data.daily_data)
        .filter(([date, d]) => {
            const dayDate = new Date(date);
            return dayDate >= monthAgo && d.sleep.total_minutes;
        })
        .map(([, d]) => d);
    
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