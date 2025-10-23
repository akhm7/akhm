// Quick entry forms
document.getElementById('quick-weight-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const weight = document.getElementById('quick-weight').value;
    if (!weight) return;

    const formData = new FormData();
    formData.append('weight', weight);

    const res = await fetch('/api/weight', { method: 'POST', body: formData });
    if (res.ok) {
        document.getElementById('quick-weight').value = '';
        location.reload();
    }
});

document.getElementById('quick-water-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const water = document.getElementById('quick-water').value;
    if (!water) return;

    const formData = new FormData();
    formData.append('water_ml', water);

    const res = await fetch('/api/water', { method: 'POST', body: formData });
    if (res.ok) {
        document.getElementById('quick-water').value = '';
        location.reload();
    }
});

document.getElementById('quick-calories-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const calories = document.getElementById('quick-calories').value;
    if (!calories) return;

    const now = new Date();
    const datetime = now.toISOString().slice(0, 16);

    const formData = new FormData();
    formData.append('calories', calories);
    formData.append('datetime', datetime);

    const res = await fetch('/api/calories', { method: 'POST', body: formData });
    if (res.ok) {
        document.getElementById('quick-calories').value = '';
        location.reload();
    }
});

// Sync button
document.getElementById('update-btn')?.addEventListener('click', async () => {
    const btn = document.querySelector('.btn-success');
    const originalText = btn.textContent;
    btn.textContent = 'Syncing...';
    btn.disabled = true;

    const res = await fetch('/update', { method: 'POST' });
    if (res.ok) {
        location.reload();
    } else {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

if (!data) {
    console.log('No data available');
} else {
    renderStepsChart();
    renderCaloriesChart();
    renderSleepChart();
    renderWeightChart();
    renderWaterChart();
}

Chart.defaults.color = '#9198a1';
Chart.defaults.borderColor = '#3d444d';

function getLast30Days() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function getLast90Days() {
    const days = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function renderStepsChart() {
    const ctx = document.getElementById('steps-chart');
    if (!ctx) return;
    
    const last30Days = getLast30Days();
    const stepsData = last30Days.map(date => {
        const day = data.daily_data[date];
        return day?.steps || 0;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [{
                label: 'Steps',
                data: stepsData,
                backgroundColor: 'rgba(88, 166, 255, 0.5)',
                borderColor: '#58a6ff',
                borderWidth: 1,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2d333b',
                    borderColor: '#3d444d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' steps';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        callback: function(value) {
                            return value >= 1000 ? (value/1000) + 'k' : value;
                        }
                    },
                    grid: { color: '#3d444d' }
                },
                x: {
                    border: { display: false },
                    ticks: { color: '#9198a1' },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderCaloriesChart() {
    const ctx = document.getElementById('calories-chart');
    if (!ctx) return;
    
    const last30Days = getLast30Days();
    
    // Burned calories (from Garmin)
    const burnedData = last30Days.map(date => {
        const day = data.daily_data[date];
        return day?.calories || 0;
    });
    
    // Consumed calories (from food log)
    const consumedData = last30Days.map(date => {
        const day = data.daily_data[date];
        if (!day?.food_log) return 0;
        return day.food_log.reduce((sum, entry) => sum + entry.calories, 0);
    });
    
    const hasConsumedData = consumedData.some(v => v > 0);
    
    const datasets = [{
        label: 'Burned',
        data: burnedData,
        backgroundColor: 'rgba(248, 81, 73, 0.5)',
        borderColor: '#f85149',
        borderWidth: 1,
        borderRadius: 3,
        type: 'bar',
        order: 2
    }];

    if (hasConsumedData) {
        datasets.push({
            label: 'Consumed',
            data: consumedData,
            backgroundColor: 'rgba(63, 185, 80, 0.1)',
            borderColor: '#3fb950',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            type: 'line',
            order: 1,
            pointRadius: 2,
            pointHoverRadius: 4
        });
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: hasConsumedData,
                    position: 'top',
                    labels: { color: '#9198a1', usePointStyle: true, padding: 10, font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#2d333b',
                    borderColor: '#3d444d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' kcal';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        callback: function(value) {
                            return value >= 1000 ? (value/1000) + 'k' : value;
                        }
                    },
                    grid: { color: '#3d444d' }
                },
                x: {
                    border: { display: false },
                    ticks: { color: '#9198a1' },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderSleepChart() {
    const ctx = document.getElementById('sleep-chart');
    if (!ctx) return;
    
    const last30Days = getLast30Days();
    
    const deepData = [];
    const lightData = [];
    const remData = [];
    const awakeData = [];
    
    last30Days.forEach(date => {
        const day = data.daily_data[date];
        if (day?.sleep?.total_minutes) {
            deepData.push(day.sleep.deep_sleep_minutes || 0);
            lightData.push(day.sleep.light_sleep_minutes || 0);
            remData.push(day.sleep.rem_sleep_minutes || 0);
            awakeData.push(day.sleep.awake_minutes || 0);
        } else {
            deepData.push(0);
            lightData.push(0);
            remData.push(0);
            awakeData.push(0);
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [
                {
                    label: 'Deep',
                    data: deepData,
                    backgroundColor: '#58a6ff',
                    stack: 'sleep'
                },
                {
                    label: 'Light',
                    data: lightData,
                    backgroundColor: '#1f6feb',
                    stack: 'sleep'
                },
                {
                    label: 'REM',
                    data: remData,
                    backgroundColor: '#388bfd',
                    stack: 'sleep'
                },
                {
                    label: 'Awake',
                    data: awakeData,
                    backgroundColor: '#2d333b',
                    stack: 'sleep'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#9198a1', usePointStyle: true, boxWidth: 10, padding: 8, font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#2d333b',
                    borderColor: '#3d444d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const hours = Math.floor(context.parsed.y / 60);
                            const mins = context.parsed.y % 60;
                            return `${context.dataset.label}: ${hours}h ${mins}m`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    stacked: true,
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            return hours + 'h';
                        }
                    },
                    grid: { color: '#3d444d' }
                },
                x: {
                    stacked: true,
                    border: { display: false },
                    ticks: { color: '#9198a1' },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderWeightChart() {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;
    
    const last90Days = getLast90Days();
    
    const weightEntries = last90Days
        .map(date => {
            const day = data.daily_data[date];
            return { date, weight: day?.weight || null };
        })
        .filter(entry => entry.weight !== null);
    
    if (weightEntries.length === 0) {
        document.getElementById('weight-container').style.display = 'none';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightEntries.map(e => new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Weight (kg)',
                data: weightEntries.map(e => e.weight),
                borderColor: '#3fb950',
                backgroundColor: 'rgba(63, 185, 80, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#3fb950',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2d333b',
                    borderColor: '#3d444d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: {
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        callback: function(value) {
                            return value.toFixed(1) + ' kg';
                        }
                    },
                    grid: { color: '#3d444d' }
                },
                x: {
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderWaterChart() {
    const ctx = document.getElementById('water-chart');
    if (!ctx) return;
    
    const last30Days = getLast30Days();
    
    const waterEntries = last30Days
        .map(date => {
            const day = data.daily_data[date];
            return { date, water: day?.water_ml || null };
        })
        .filter(entry => entry.water !== null);
    
    if (waterEntries.length === 0) {
        document.getElementById('water-container').style.display = 'none';
        return;
    }
    
    // Целевое значение - 2000ml (2 литра в день)
    const targetWater = 2000;
    
    const waterData = last30Days.map(date => {
        const day = data.daily_data[date];
        return day?.water_ml || 0;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [
                {
                    label: 'Water',
                    data: waterData,
                    backgroundColor: waterData.map(val =>
                        val >= targetWater ? 'rgba(88, 166, 255, 0.6)' : 'rgba(88, 166, 255, 0.3)'
                    ),
                    borderColor: '#58a6ff',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: 'Target (2L)',
                    data: new Array(last30Days.length).fill(targetWater),
                    type: 'line',
                    borderColor: '#d29922',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#9198a1', usePointStyle: true, padding: 8, font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#2d333b',
                    borderColor: '#3d444d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Target (2L)') {
                                return 'Target: 2000 ml';
                            }
                            const liters = (context.parsed.y / 1000).toFixed(2);
                            return context.parsed.y + ' ml (' + liters + 'L)';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        color: '#9198a1',
                        callback: function(value) {
                            return (value / 1000).toFixed(1) + 'L';
                        }
                    },
                    grid: { color: '#3d444d' }
                },
                x: {
                    border: { display: false },
                    ticks: { color: '#9198a1' },
                    grid: { display: false }
                }
            }
        }
    });
}