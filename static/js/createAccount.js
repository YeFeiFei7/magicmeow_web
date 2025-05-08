document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const tooltip = document.getElementById('tooltip');
    const requirements = [
        { regex: /[A-Z]/, text: 'Uppercase letters (A–Z)' },
        { regex: /[a-z]/, text: 'Lowercase letters (a–z)' },
        { regex: /[0-9]/, text: 'Numbers (0–9)' },
        { regex: /[!@#$%^&*]/, text: 'Special characters (e.g. !@#$%^&*)' }
    ];

    let tooltipContent = '<ul>';
    requirements.forEach(req => {
        const isValid = req.regex.test(password);
        tooltipContent += `<li style="color: ${isValid ? 'green' : 'red'}">${req.text}</li>`;
    });
    tooltipContent += '</ul>';

    tooltip.innerHTML = tooltipContent;
    tooltip.style.display = 'block';
});