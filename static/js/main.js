function sendChat() {
    const message = document.getElementById('chat-input').value;
    if (!message) return;

    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showModal();
        } else {
            alert(data.response); // Replace with chat UI later
            document.getElementById('chat-input').value = '';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal();
    });
}

function checkAuth(route) {
    showModal(); // Directly show modal for placeholder buttons
}

function showModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function redirectToLogin() {
    window.location.href = '/login';
}