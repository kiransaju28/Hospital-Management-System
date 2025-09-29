document.addEventListener('DOMContentLoaded', () => {
    const buttons = [
        document.getElementById('admin-btn'),
        document.getElementById('doctor-btn'),
        document.getElementById('pharmacist-btn'),
        document.getElementById('lab-btn'),
        document.getElementById('receptionist-btn')
    ];

    buttons.forEach(button => {
        if (button) {
            button.addEventListener('click', () => {
                window.location.href = '../LOGIN/login.html';
            });
        }
    });
});