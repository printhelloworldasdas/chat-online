// Función para cambiar entre pestañas
function switchTab(tabName) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(`${tabName}-form`).classList.add('active');
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
}

// Función para mostrar errores
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    setTimeout(() => {
        errorElement.textContent = '';
    }, 3000);
}

// Función de registro
async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    if (password !== confirmPassword) {
        showError('register-error', 'Las contraseñas no coinciden');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'chat.html';
        } else {
            showError('register-error', data.message || 'Error en el registro');
        }
    } catch (error) {
        showError('register-error', 'Error de conexión');
    }
}

// Función de login
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'chat.html';
        } else {
            showError('login-error', data.message || 'Credenciales incorrectas');
        }
    } catch (error) {
        showError('login-error', 'Error de conexión');
    }
}

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.endsWith('index.html')) {
        window.location.href = 'chat.html';
    } else if (!token && window.location.pathname.endsWith('chat.html')) {
        window.location.href = 'index.html';
    }
});
