document.addEventListener('DOMContentLoaded', function() {
    // --- Initial Element Setup ---
    const form = document.getElementById('addEditUserForm');
    const userRoleSelect = document.getElementById('userRole');
    const userIdInput = document.getElementById('userId');
    const userNameInput = document.getElementById('userName');
    const roleSpecificFields = document.getElementById('roleSpecificFields');
    const rosterBody = document.querySelector('.roster-table tbody');
    const clearBtn = document.getElementById('clear-form-btn');
    const addButton = document.getElementById('add-to-roster-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const tabButtons = document.querySelectorAll('.tab-button');
    const contentAreas = document.querySelectorAll('.dashboard-content');
    const billingBody = document.getElementById('billing-report-body');
    const dailyTotalDisplay = document.getElementById('daily-total');
    // ADDED SEARCH INPUT ELEMENT
    const rosterSearchInput = document.getElementById('rosterSearchInput');

    let staffRoster = [];
    let patientBills = [];
    let isEditingIndex = null;

    // --- Tab Switching Logic ---
    function switchTab(targetTab) {
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
        });

        contentAreas.forEach(content => {
            content.style.display = content.id === targetTab + '-content' ? 'block' : 'none';
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-tab');
            switchTab(target);
            if (target === 'patient-billing-report') {
                loadBills();
                renderBillingReport();
            }
        });
    });

    // --- Logout Function ---
    function logout() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.clear();
            window.location.href = '../LOGIN/login.html';
        }
    }
    logoutBtn.addEventListener('click', logout);

    // --- Persistence Functions (Local Storage) ---
    function loadRoster() {
        const storedRoster = localStorage.getItem('hospitalStaffRoster');
        if (storedRoster) {
            staffRoster = JSON.parse(storedRoster);
        } else {
            // Initial data for demonstration if LocalStorage is empty
            staffRoster.push(
                { name: 'sharath', id: 'PHARM14', role: 'Pharmacist', detail: 'Pharmacy Technician', location: 'pharmacy1', status: 'Available', password: 'password123' },
                { name: 'guru', id: 'DOCT322', role: 'Doctor', detail: 'Cardiology', location: 'r203', status: 'Available', password: 'password123', fee: '150.00' },
                { name: 'gurusmon', id: 'RECEP238', role: 'Receptionist', detail: 'Day Shift', location: 'Desk 1', status: 'Available', password: 'password123' },
                { name: 'reena', id: 'LAB1051', role: 'Lab Technician', detail: 'Clinical Pathology', location: 'Lab 1', status: 'Available', password: 'password123' }
            );
        }
    }

    function saveRoster() {
        localStorage.setItem('hospitalStaffRoster', JSON.stringify(staffRoster));
        renderRoster(); // Re-render the full list after saving
    }

    function loadBills() {
        const storedBills = localStorage.getItem('patientBills');
        if (storedBills) {
            patientBills = JSON.parse(storedBills);
        } else {
            // Initial data for demonstration if LocalStorage is empty
            patientBills.push(
                { patientId: 'P1001', item: 'Paracetamol', provider: 'PHARM14', amount: '12.50', date: '2025-09-26', status: 'Paid' },
                { patientId: 'P1002', item: 'Blood Test', provider: 'LAB1051', amount: '75.00', date: '2025-09-27', status: 'Pending' }
            );
        }
    }

    function saveBills() {
        localStorage.setItem('patientBills', JSON.stringify(patientBills));
        renderBillingReport();
    }

    // --- Rendering Functions ---
    function renderRoster(filterText = '') {
        rosterBody.innerHTML = '';
        const lowerCaseFilter = filterText.toLowerCase().trim();
        
        // Filter the staffRoster based on the search input
        const filteredRoster = staffRoster.filter(user => {
            if (lowerCaseFilter === '') return true;
            return user.name.toLowerCase().includes(lowerCaseFilter) ||
                   user.id.toLowerCase().includes(lowerCaseFilter) ||
                   user.role.toLowerCase().includes(lowerCaseFilter) ||
                   (user.detail && user.detail.toLowerCase().includes(lowerCaseFilter));
        });

        if (filteredRoster.length === 0 && lowerCaseFilter !== '') {
            const row = rosterBody.insertRow();
            row.innerHTML = `<td colspan="6" style="text-align: center; color: #cc0000; font-weight: 600;">No staff found matching "${filterText}"</td>`;
            return;
        }


        filteredRoster.forEach((user, index) => {
            // Find the original index in the staffRoster array for editing/deleting
            const originalIndex = staffRoster.findIndex(u => u.id === user.id);
            
            const newRow = rosterBody.insertRow();
            newRow.innerHTML = `
                <td>${user.name}</td>
                <td>${user.id}</td>
                <td>${user.role} (${user.detail || '-'})</td>
                <td>${user.location || '-'}</td>
                <td><span class="status-${user.status.toLowerCase().replace(' ', '')}">${user.status}</span></td>
                <td>
                    <button class="action-btn edit-btn" data-index="${originalIndex}">Edit</button>
                    <button class="action-btn delete-btn" data-index="${originalIndex}">Del</button>
                </td>
            `;
        });
    }

    function renderBillingReport() {
        billingBody.innerHTML = '';
        let totalAmount = 0;

        patientBills.forEach((bill, index) => {
            const newRow = billingBody.insertRow();
            const actionButton = bill.status === 'Pending' ? 
                `<button class="action-btn primary pay-btn" data-index="${index}">Mark Paid</button>` : 
                '';

            newRow.innerHTML = `
                <td>${bill.patientId}</td>
                <td>${bill.item}</td>
                <td>${bill.provider}</td>
                <td>${parseFloat(bill.amount).toFixed(2)}</td>
                <td>${bill.date}</td>
                <td><span class="status-${bill.status.toLowerCase()}">${bill.status}</span></td>
                <td>${actionButton}</td>
            `;
            
            if (bill.status === 'Paid') {
                totalAmount += parseFloat(bill.amount);
            }
        });
        
        dailyTotalDisplay.textContent = `Total Paid Amount (Report): Rs${totalAmount.toFixed(2)}`;
    }

    // --- Form Dynamics and Submission ---
    function updateRoleFields(role, userData = {}) {
        let fieldsHtml = '';
        let defaultIdPrefix = '';
        let isEditing = !!userData.id;

        userNameInput.value = userData.name || '';
        userNameInput.placeholder = `Enter ${role} Name`;
        document.getElementById('tempPassword').value = userData.password || 'password123';
        document.getElementById('availabilityStatus').value = userData.status || 'Available';
        // Only allow changing ID if not editing
        userIdInput.readOnly = isEditing; 

        let randomNum = Math.floor(Math.random() * 999 + 100).toString();

        switch (role) {
            case 'Doctor':
                defaultIdPrefix = 'DOCT';
                fieldsHtml = `
                    <div class="form-group">
                        <label for="detail">Department / Qualification:</label>
                        <select id="detail" name="detail" required>
                            <option value="" disabled selected>-- Select Qualification --</option>
                            <option value="General Medicine">General Medicine (M.D.)</option>
                            <option value="Cardiology">Cardiology (DM)</option>
                            <option value="Pediatrics">Pediatrics (DNB)</option>
                            <option value="Orthopedics">Orthopedics (M.S.)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="location">Room/Location:</label>
                        <input type="text" id="location" name="location" placeholder="R201" value="${userData.location || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="fee">Consultation Fee (Rs):</label>
                        <input type="number" id="fee" name="fee" min="0.00" step="0.01" placeholder="150.00" value="${userData.fee || '150.00'}" required>
                    </div>
                `;
                break;
            case 'Pharmacist':
                defaultIdPrefix = 'PHARM';
                fieldsHtml = `
                    <div class="form-group">
                        <label for="detail">Specialty:</label>
                        <input type="text" id="detail" name="detail" placeholder="Pharmacy Manager" value="${userData.detail || 'Pharmacy Technician'}" required>
                    </div>
                    <div class="form-group">
                        <label for="location">Location:</label>
                        <input type="text" id="location" name="location" placeholder="Pharmacy 1" value="${userData.location || 'Pharmacy 1'}" required>
                    </div>
                `;
                break;
            case 'Lab Technician':
                defaultIdPrefix = 'LAB';
                fieldsHtml = `
                    <div class="form-group">
                        <label for="detail">Specialty:</label>
                        <input type="text" id="detail" name="detail" placeholder="Clinical Pathology" value="${userData.detail || 'Clinical Pathology'}" required>
                    </div>
                    <div class="form-group">
                        <label for="location">Location:</label>
                        <input type="text" id="location" name="location" placeholder="Lab 1" value="${userData.location || 'Lab 1'}" required>
                    </div>
                `;
                break;
            case 'Receptionist':
                defaultIdPrefix = 'RECEP';
                fieldsHtml = `
                    <div class="form-group">
                        <label for="detail">Shift:</label>
                        <input type="text" id="detail" name="detail" placeholder="Day Shift" value="${userData.detail || 'Day Shift'}" required>
                    </div>
                    <div class="form-group">
                        <label for="location">Desk/Location:</label>
                        <input type="text" id="location" name="location" placeholder="Desk 1" value="${userData.location || 'Desk 1'}" required>
                    </div>
                `;
                break;
            default:
                fieldsHtml = '<p>Select a role to see role-specific fields.</p>';
                defaultIdPrefix = 'USER';
        }

        roleSpecificFields.innerHTML = fieldsHtml;
        
        // Pre-fill the detail/location selects if data exists
        if (role === 'Doctor' && userData.detail) {
            document.getElementById('detail').value = userData.detail;
        }

        if (!isEditing) {
            userIdInput.value = `${defaultIdPrefix}${randomNum}`;
        } else {
            // When editing, keep the original ID, as set above: userIdInput.readOnly = true
            userIdInput.value = userData.id; 
            addButton.textContent = 'UPDATE USER IN ROSTER';
            addButton.classList.remove('primary');
            addButton.classList.add('secondary');
        }

        // Add event listener to dynamically created select/input to pre-fill on edit
        if (userData.detail && document.getElementById('detail')) {
            document.getElementById('detail').value = userData.detail;
        }
    }

    userRoleSelect.addEventListener('change', (e) => {
        updateRoleFields(e.target.value);
    });
    
    // Form Submission Handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const role = userRoleSelect.value;
        const id = userIdInput.value.trim();
        const name = userNameInput.value.trim();
        const password = document.getElementById('tempPassword').value;
        const status = document.getElementById('availabilityStatus').value;
        const detail = document.getElementById('detail') ? document.getElementById('detail').value.trim() : null;
        const location = document.getElementById('location') ? document.getElementById('location').value.trim() : null;
        const fee = document.getElementById('fee') ? document.getElementById('fee').value.trim() : null;

        const newStaffMember = {
            id,
            name,
            role,
            password,
            status,
            detail,
            location,
            fee 
        };
        
        // Validation: Check for duplicate ID only on ADD (isEditingIndex is null)
        if (isEditingIndex === null && staffRoster.some(user => user.id === id)) {
            alert(`User ID ${id} already exists. Please choose a unique ID.`);
            return;
        }

        if (isEditingIndex !== null) {
            // Edit existing user
            staffRoster[isEditingIndex] = newStaffMember;
            alert(`${name} (${id}) updated successfully!`);
        } else {
            // Add new user
            staffRoster.push(newStaffMember);
            alert(`${name} (${id}) added to the roster!`);
        }

        saveRoster(); 
        resetForm();
    });

    // Reset Form Logic
    function resetForm() {
        form.reset();
        isEditingIndex = null;
        userIdInput.readOnly = false;
        addButton.textContent = 'ADD USER TO ROSTER';
        addButton.classList.add('primary');
        addButton.classList.remove('secondary');
        roleSpecificFields.innerHTML = '<p>Select a role to see role-specific fields.</p>';
        userIdInput.value = ''; // Clear ID field for new user generation
    }
    clearBtn.addEventListener('click', resetForm);

    // Edit/Delete Button Logic
    rosterBody.addEventListener('click', function(e) {
        const index = e.target.getAttribute('data-index');
        if (index === null) return;
        
        const user = staffRoster[parseInt(index)];

        if (e.target.classList.contains('edit-btn')) {
            isEditingIndex = parseInt(index);
            userRoleSelect.value = user.role;
            updateRoleFields(user.role, user);
            // Scroll to the form section
            document.getElementById('addEditUserForm').scrollIntoView({ behavior: 'smooth' });

        } else if (e.target.classList.contains('delete-btn')) {
            if (confirm(`Are you sure you want to remove ${user.name} (${user.id}) from the roster?`)) {
                staffRoster.splice(parseInt(index), 1);
                saveRoster(); 
                alert(`${user.name} removed.`);
            }
        }
    });

    // Billing Report 'Pay' Button Logic
    billingBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('pay-btn')) {
            const index = e.target.getAttribute('data-index');
            patientBills[parseInt(index)].status = 'Paid';
            saveBills();
            alert(`Bill for Patient ID ${patientBills[parseInt(index)].patientId} marked as Paid.`);
        }
    });
    
    // --- ADDED: Roster Search Logic ---
    rosterSearchInput.addEventListener('keyup', (e) => {
        renderRoster(e.target.value);
    });

    // --- Initial Load ---
    loadRoster();
    renderRoster();

});