const messageContainer = document.getElementById('message-container');

function showMessage(text, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const msg = document.createElement('div');
    msg.className = `alert ${alertClass} alert-dismissible fade show`;
    msg.innerHTML = `
        ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    messageContainer.appendChild(msg);
    
    setTimeout(() => {
        msg.remove();
    }, 5000);
}

// Добавить вес
document.getElementById('weight-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const weight = parseFloat(document.getElementById('weight').value);
    const date = document.getElementById('weight-date').value || null;
    
    try {
        const response = await fetch('/api/weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight, date })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`Weight ${weight} kg added for ${data.date}`, 'success');
            document.getElementById('weight-form').reset();
        } else {
            showMessage(`Error: ${data.message}`, 'error');
        }
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    }
});

// Добавить калории
document.getElementById('calories-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const calories = parseInt(document.getElementById('calories').value);
    const datetime = document.getElementById('calories-datetime').value;
    
    // Конвертируем в ISO format
    const datetimeISO = new Date(datetime).toISOString();
    
    try {
        const response = await fetch('/api/calories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calories, datetime: datetimeISO })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`${calories} calories added`, 'success');
            document.getElementById('calories-form').reset();
        } else {
            showMessage(`Error: ${data.message}`, 'error');
        }
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    }
});

// Обновить данные
document.getElementById('update-btn').addEventListener('click', async () => {
    const btn = document.getElementById('update-btn');
    btn.disabled = true;
    btn.textContent = 'Updating...';
    
    try {
        const response = await fetch('/update', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`Data updated successfully! ${data.total_days} days tracked`, 'success');
        } else {
            showMessage(`Error: ${data.message}`, 'error');
        }
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update Data';
    }
});

// Export данных
document.getElementById('export-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/export');
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `garmin-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('Data exported successfully', 'success');
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    }
});

// Import данных
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Data imported successfully', 'success');
            setTimeout(() => location.reload(), 2000);
        } else {
            showMessage(`Error: ${result.message}`, 'error');
        }
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    }
});

// Clear данных
document.getElementById('clear-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            showMessage('All data cleared', 'success');
            setTimeout(() => location.href = '/', 2000);
        } else {
            showMessage(`Error: ${data.message}`, 'error');
        }
    } catch (err) {
        showMessage(`Error: ${err.message}`, 'error');
    }
});

// Установить текущую дату/время по умолчанию
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
document.getElementById('calories-datetime').value = now.toISOString().slice(0, 16);