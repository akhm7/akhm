// Theme management (disabled, only light theme)
const html = document.documentElement;
html.setAttribute('data-theme', 'light');

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
    renderStepsChart();
    renderWeightChart();
    renderFoodChart();
}

function getChartColors() {
    return {
        text: '#24292f',
        grid: '#d0d7de',
        accent: '#0969da',
        green: '#30a14e',
        red: '#cf222e'
    };
}

function renderStepsChart() {
    const ctx = document.getElementById('steps-chart');
    if (!ctx) return;
    
    const colors = getChartColors();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last30Days.push(d.toISOString().split('T')[0]);
    }
    
    const stepsData = last30Days.map(date => {
        const day = data.daily_data[date];
        return day?.steps || 0;
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [{
                label: 'Steps',
                data: stepsData,
                borderColor: colors.accent,
                backgroundColor: colors.accent + '20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                },
                x: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                }
            }
        }
    });
}

function renderWeightChart() {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;
    
    const colors = getChartColors();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 90);
    
    const weightEntries = Object.entries(data.daily_data)
        .filter(([date, day]) => {
            const d = new Date(date);
            return d >= daysAgo && day.weight;
        })
        .sort(([a], [b]) => a.localeCompare(b));
    
    if (weightEntries.length === 0) {
        ctx.parentElement.style.display = 'none';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightEntries.map(([date]) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Weight (kg)',
                data: weightEntries.map(([, day]) => day.weight),
                borderColor: colors.green,
                backgroundColor: colors.green + '20',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                },
                x: {
                    ticks: { color: colors.text, maxRotation: 45 },
                    grid: { color: colors.grid }
                }
            }
        }
    });
}

function renderFoodChart() {
    const ctx = document.getElementById('food-chart');
    if (!ctx) return;
    
    const colors = getChartColors();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);
    
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last14Days.push(d.toISOString().split('T')[0]);
    }
    
    const foodData = last14Days.map(date => {
        const day = data.daily_data[date];
        if (!day?.food_log) return 0;
        return day.food_log.reduce((sum, entry) => sum + entry.calories, 0);
    });
    
    const hasData = foodData.some(v => v > 0);
    if (!hasData) {
        ctx.parentElement.style.display = 'none';
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last14Days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Calories',
                data: foodData,
                backgroundColor: colors.red + '80',
                borderColor: colors.red,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                },
                x: {
                    ticks: { color: colors.text, maxRotation: 45 },
                    grid: { color: colors.grid }
                }
            }
        }
    });
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