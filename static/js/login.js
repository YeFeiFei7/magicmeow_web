document.getElementById('login-form').addEventListener('submit', function(event) {
    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const errorMessage = document.getElementById('error-message');

    if (!username || !password) {
        event.preventDefault();
        errorMessage.textContent = 'Please fill in all fields.';
    }
});