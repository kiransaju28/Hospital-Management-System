document.addEventListener('DOMContentLoaded', function() {
    
    // --- UTILITY FUNCTIONS ---
    function updateDateTime() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        document.getElementById('currentDateTime').textContent = 
            `${now.toLocaleDateString('en-US', dateOptions)} ${now.toLocaleTimeString('en-US', timeOptions)}`;
    }
    setInterval(updateDateTime, 1000); 
    updateDateTime(); 
    
    // --- AUTHENTICATION & INITIALIZATION ---
    const currentUserId = sessionStorage.getItem('currentUserId');
    const currentUserRole = sessionStorage.getItem('currentUserRole');
    const currentUserName = sessionStorage.getItem('currentUserName');

    if (!currentUserId || currentUserRole !== 'Receptionist') {
        alert("Access Denied. Please log in as a Receptionist.");
        window.location.href = '../LOGIN/login.html'; 
        return; 
    }
    document.getElementById('userNameDisplay').textContent = currentUserName || currentUserId;

    // --- ELEMENT REFERENCES ---
    const checkInForm = document.getElementById('checkInForm');
    const doctorSelect = document.getElementById('pDoctor');
    const doctorStatusBody = document.getElementById('doctorStatusBody');
    const feeDisplay = document.getElementById('consultationFeeDisplay');
    const invoiceOutput = document.getElementById('invoiceOutput');
    const logoutBtn = document.getElementById('logout-btn');
    const patientIdSearchInput = document.getElementById('patientIdSearch');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsOutput = document.getElementById('searchResultsOutput');
    const editContactModal = document.getElementById('editContactModal');
    const editContactInput = document.getElementById('editContactInput');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    let patientHistory = []; 
    let currentPatientIdToEdit = null;

    // --- DATA LOADING & PERSISTENCE ---
    function loadPatientHistory() {
        const storedHistory = localStorage.getItem('patientHistory');
        if (storedHistory) {
            patientHistory = JSON.parse(storedHistory);
        }
    }

    function savePatientHistory() {
        localStorage.setItem('patientHistory', JSON.stringify(patientHistory));
    }
    
    // --- DOCTOR DATA ---
    const storedRoster = localStorage.getItem('hospitalStaffRoster');
    const staffRoster = storedRoster ? JSON.parse(storedRoster) : [];
    const doctors = staffRoster.filter(member => member.role === 'Doctor');
    const doctorFeeMap = {}; 
    
    function getQueueSize(doctorId) {
        const queue = JSON.parse(localStorage.getItem('patientQueue') || '[]');
        return queue.filter(p => p.doctorId === doctorId && p.status === 'Waiting').length;
    }

    function initializeDoctorData() {
        doctorSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>';
        doctorStatusBody.innerHTML = '';
        
        if (doctors.length > 0) {
            doctors.forEach(doctor => {
                const fee = parseFloat(doctor.fee || '50.00').toFixed(2);
                doctorFeeMap[doctor.id] = fee;
                
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = `Dr. ${doctor.name} (${doctor.detail}) - Rs${fee}`;
                doctorSelect.appendChild(option);

                const row = doctorStatusBody.insertRow();
                row.innerHTML = `
                    <td>Dr. ${doctor.name}</td>
                    <td><span class="status-${doctor.status.toLowerCase().replace(' ', '')}">${doctor.status}</span></td>
                    <td>${getQueueSize(doctor.id)}</td>
                `;
            });
        } else {
            doctorStatusBody.innerHTML = '<tr><td colspan="3">No doctors currently registered in the roster.</td></tr>';
        }
    }
    
    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.clear();
            window.location.href = '../LOGIN/login.html';
        }
    });

    doctorSelect.addEventListener('change', function() {
        const selectedId = this.value;
        const fee = doctorFeeMap[selectedId] || '0.00';
        feeDisplay.textContent = `Rs${fee}`;
    });

    checkInForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const selectedDoctorId = doctorSelect.value;
        const contactNumber = document.getElementById('pContact').value;

        if (!/^\d{10}$/.test(contactNumber)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (!selectedDoctorId) {
            alert("Please select a Consulting Doctor.");
            return;
        }

        const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
        const consultationFee = doctorFeeMap[selectedDoctorId];

        const patientData = {
            name: document.getElementById('pName').value,
            age: document.getElementById('pAge').value,
            address: document.getElementById('pAddress').value,
            bloodGroup: document.getElementById('pBloodGroup').value,
            contact: contactNumber,
        };
        
        const newPatientEntry = addToPatientQueue(patientData, selectedDoctorId);
        
        generateInvoice(selectedDoctor, consultationFee, newPatientEntry.token, newPatientEntry);

        alert(`Patient ${newPatientEntry.name} (Token: ${newPatientEntry.token}) checked in for Dr. ${selectedDoctor.name}.`);
        
        checkInForm.reset();
        initializeDoctorData();
        feeDisplay.textContent = `Rs0.00`;
    });

    searchBtn.addEventListener('click', function() {
        const searchId = patientIdSearchInput.value.trim();
        if (searchId === '') {
            alert('Please enter a Patient ID to search.');
            return;
        }
        
        const foundPatient = patientHistory.find(p => p.id === searchId);
        renderPatientDetails(foundPatient);
    });

    // --- PATIENT HISTORY LOGIC ---
    function renderPatientDetails(patient) {
        if (patient) {
            searchResultsOutput.innerHTML = `
                <h4>Patient Found!</h4>
                <p><strong>ID:</strong> ${patient.id}</p>
                <p><strong>Name:</strong> ${patient.name}</p>
                <p><strong>Age:</strong> ${patient.age}</p>
                <p><strong>Contact:</strong> <span id="displayContact">${patient.contact}</span> 
                    <button class="action-btn edit-btn" id="editContactBtn">Edit</button>
                    <button class="action-btn tertiary delete-btn" id="deletePatientBtn">Delete</button>
                </p>
                <p><strong>Blood Group:</strong> ${patient.bloodGroup}</p>
                <p><strong>Last Checked In:</strong> ${new Date(patient.checkInTime).toLocaleString()}</p>
            `;
            // Add listener to the new edit button
            document.getElementById('editContactBtn').addEventListener('click', () => {
                currentPatientIdToEdit = patient.id;
                editContactInput.value = patient.contact;
                editContactModal.style.display = 'flex';
            });
            
            // Add listener to the new delete button
            document.getElementById('deletePatientBtn').addEventListener('click', () => {
                if (confirm(`Are you sure you want to permanently delete patient history for ${patient.name} (ID: ${patient.id})?`)) {
                    deletePatient(patient.id);
                }
            });

        } else {
            searchResultsOutput.innerHTML = `
                <h4>No patient found with ID: ${patientIdSearchInput.value.trim()}</h4>
                <p>Please check the ID and try again.</p>
            `;
        }
    }

    // --- NEW: Delete Patient Function ---
    function deletePatient(patientId) {
        // Remove from patientHistory array
        const initialLength = patientHistory.length;
        patientHistory = patientHistory.filter(p => p.id !== patientId);

        if (patientHistory.length < initialLength) {
            savePatientHistory();
            searchResultsOutput.innerHTML = `
                <h4>✅ Patient ID: ${patientId} successfully deleted.</h4>
                <p>Search for another patient by ID to view their details.</p>
            `;
            alert(`Patient ID ${patientId} and history has been deleted.`);
            patientIdSearchInput.value = ''; // Clear the search box
        } else {
            alert(`Error: Could not find or delete patient with ID: ${patientId}.`);
        }
    }
    
    // --- EDIT CONTACT MODAL LOGIC ---
    saveEditBtn.addEventListener('click', function() {
        const newContact = editContactInput.value.trim();
        if (!/^\d{10}$/.test(newContact)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }
        
        const patientToUpdate = patientHistory.find(p => p.id === currentPatientIdToEdit);
        if (patientToUpdate) {
            patientToUpdate.contact = newContact;
            savePatientHistory();
            alert("Mobile number updated successfully!");
            
            // Re-render the patient details with the new number
            renderPatientDetails(patientToUpdate);
        }
        editContactModal.style.display = 'none';
    });

    cancelEditBtn.addEventListener('click', function() {
        editContactModal.style.display = 'none';
        editContactInput.value = '';
        currentPatientIdToEdit = null;
    });

    // --- CORE LOGIC: ADD PATIENT TO QUEUE & HISTORY ---
    function addToPatientQueue(patientData, doctorId) {
        let queue = JSON.parse(localStorage.getItem('patientQueue') || '[]');
        const doctorQueueSize = getQueueSize(doctorId);
        const newToken = `${doctorId.substring(0,4)}-${doctorQueueSize + 1}`;
        const patientId = `P${Date.now().toString().slice(-6)}`;
        
        const newPatient = {
            id: patientId,
            token: newToken,
            name: patientData.name,
            age: patientData.age,
            address: patientData.address,
            bloodGroup: patientData.bloodGroup,
            contact: patientData.contact,
            doctorId: doctorId,
            status: 'Waiting', 
            checkInTime: new Date().toISOString()
        };

        queue.push(newPatient);
        localStorage.setItem('patientQueue', JSON.stringify(queue));

        patientHistory.push(newPatient);
        savePatientHistory();
        
        return newPatient;
    }

    // --- INVOICE GENERATION FUNCTION ---
    function generateInvoice(doctorData, fee, token, patientData) {
        const invoiceHtml = `
            <div class="print-invoice-container" style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ccc;">
                <h2 style="text-align: center; color: #333;">Faith Hospital Invoice</h2>
                <hr style="border: 1px solid #eee;">
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <h3 style="color: #007bff;">Patient Details</h3>
                <p><strong>Name:</strong> ${patientData.name}</p>
                <p><strong>Patient ID:</strong> ${patientData.id}</p>
                <p><strong>Age:</strong> ${patientData.age}</p>
                <p><strong>Contact:</strong> ${patientData.contact}</p>
                
                <h3 style="color: #007bff;">Consultation Details</h3>
                <p><strong>Consulting Doctor:</strong> Dr. ${doctorData.name}</p>
                <p><strong>Doctor's Room:</strong> ${doctorData.location}</p>
                <p><strong>Consultation Fee:</strong> Rs${fee}</p>
                <h2 style="text-align: center; color: #dc3545; margin-top: 20px;">Token: ${token}</h2>
            </div>
        `;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }
    
    // --- Initial setup calls ---
    loadPatientHistory();
    initializeDoctorData();
});