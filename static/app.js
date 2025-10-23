if (!data) {
    console.log('No data available');
} else {
    renderStepsChart();
    renderCaloriesChart();
    renderSleepChart();
    renderWeightChart();
}

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
        type: 'line',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [{
                label: 'Steps',
                data: stepsData,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
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
                    ticks: { color: '#6c757d' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { color: '#6c757d' },
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
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        tension: 0.4,
        fill: true
    }];
    
    if (hasConsumedData) {
        datasets.push({
            label: 'Consumed',
            data: consumedData,
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.4,
            fill: true
        });
    }
    
    new Chart(ctx, {
        type: 'line',
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
                    labels: { color: '#6c757d', usePointStyle: true }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#6c757d' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { color: '#6c757d' },
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
                    backgroundColor: '#0d6efd',
                    stack: 'sleep'
                },
                {
                    label: 'Light',
                    data: lightData,
                    backgroundColor: '#6ea8fe',
                    stack: 'sleep'
                },
                {
                    label: 'REM',
                    data: remData,
                    backgroundColor: '#9ec5fe',
                    stack: 'sleep'
                },
                {
                    label: 'Awake',
                    data: awakeData,
                    backgroundColor: '#e7f1ff',
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
                    labels: { color: '#6c757d', usePointStyle: true, boxWidth: 12 }
                },
                tooltip: {
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
                    ticks: { 
                        color: '#6c757d',
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            return hours + 'h';
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    stacked: true,
                    ticks: { color: '#6c757d' },
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
                borderColor: '#198754',
                backgroundColor: 'rgba(25, 135, 84, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
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
                    ticks: { color: '#6c757d' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { 
                        color: '#6c757d',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}