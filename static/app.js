if (!data) {
    console.log('No data available');
} else {
    renderStepsChart();
    renderCaloriesChart();
    renderSleepChart();
    renderWeightChart();
    renderWaterChart();
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
        type: 'bar',
        data: {
            labels: last30Days.map(d => new Date(d).getDate()),
            datasets: [{
                label: 'Steps',
                data: stepsData,
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderColor: '#0d6efd',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
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
                    ticks: { 
                        color: '#6c757d',
                        callback: function(value) {
                            return value >= 1000 ? (value/1000) + 'k' : value;
                        }
                    },
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
        backgroundColor: 'rgba(220, 53, 69, 0.7)',
        borderColor: '#dc3545',
        borderWidth: 2,
        type: 'bar',
        order: 2
    }];
    
    if (hasConsumedData) {
        datasets.push({
            label: 'Consumed',
            data: consumedData,
            backgroundColor: 'rgba(25, 135, 84, 0.2)',
            borderColor: '#198754',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            type: 'line',
            order: 1,
            pointRadius: 3,
            pointHoverRadius: 5
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
                    labels: { color: '#6c757d', usePointStyle: true, padding: 15 }
                },
                tooltip: {
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
                    ticks: { 
                        color: '#6c757d',
                        callback: function(value) {
                            return value >= 1000 ? (value/1000) + 'k' : value;
                        }
                    },
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
                    labels: { color: '#6c757d', usePointStyle: true, boxWidth: 12, padding: 10 }
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
                pointHoverRadius: 6,
                pointBackgroundColor: '#198754',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: { 
                        color: '#6c757d',
                        callback: function(value) {
                            return value.toFixed(1) + ' kg';
                        }
                    },
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
                    label: 'Water Intake',
                    data: waterData,
                    backgroundColor: waterData.map(val => 
                        val >= targetWater ? 'rgba(13, 202, 240, 0.7)' : 'rgba(13, 202, 240, 0.4)'
                    ),
                    borderColor: '#0dcaf0',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Target (2L)',
                    data: new Array(last30Days.length).fill(targetWater),
                    type: 'line',
                    borderColor: '#fd7e14',
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
                    labels: { color: '#6c757d', usePointStyle: true, padding: 10 }
                },
                tooltip: {
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
                    ticks: { 
                        color: '#6c757d',
                        callback: function(value) {
                            return (value / 1000).toFixed(1) + 'L';
                        }
                    },
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