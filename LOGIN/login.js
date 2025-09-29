document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const backBtn = document.getElementById('back-btn');
    const errorMessage = document.getElementById('errorMessage');

    // Handle form submission
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const userId = document.getElementById('userId').value.toUpperCase().trim();
        const password = document.getElementById('password').value;

        errorMessage.textContent = '';
        errorMessage.classList.remove('show');

        // Get the staff roster from Local Storage
        const storedRoster = localStorage.getItem('hospitalStaffRoster');
        let staffRoster = [];

        if (storedRoster) {
            staffRoster = JSON.parse(storedRoster);
        }
        
        let userFound = false;
        let redirectUrl = '';
        let userData = null;

        // Check 1: Hardcoded Admin
        if (userId === 'ADMIN01' && password === 'adminpass') {
            userFound = true;
            redirectUrl = '../Admin/admin.html';
            userData = { name: "Admin User", id: userId, role: "Admin" };
        } 

        // Check 2: Dynamic Staff Roster (Includes Receptionist)
        if (!userFound) {
            const staffMember = staffRoster.find(member => member.id === userId && member.password === password);
            
            if (staffMember) {
                userFound = true;
                userData = staffMember;
                
                // Determine the redirect URL based on the staff member's role
                switch (staffMember.role) {
                    case 'Doctor':
                        redirectUrl = '../Doctor/doctor.html';
                        break;
                    case 'Pharmacist':
                        redirectUrl = '../Pharmacist/pharmacist.html';
                        break;
                    case 'Lab Technician':
                        redirectUrl = '../Lab Technician/lab.html';
                        break;
                    case 'Receptionist':
                        redirectUrl = '../Receptionist/recep.html';
                        break;
                    default:
                        errorMessage.textContent = 'Login successful, but role page not found.';
                        errorMessage.classList.add('show');
                        userFound = false;
                }
            }
        }

        // Final Action
        if (userFound && redirectUrl) {
            // Save the User ID and Name to session storage
            sessionStorage.setItem('currentUserId', userId);
            if (userData) {
                sessionStorage.setItem('currentUserName', userData.name);
                sessionStorage.setItem('currentUserRole', userData.role);
            }
            window.location.href = redirectUrl;
        } else if (!userFound) {
            errorMessage.textContent = 'Invalid User ID or Password.';
            errorMessage.classList.add('show');
        }
    });

    // Handle back button click
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '../LOGIN/access.html';
        });
    }
});
