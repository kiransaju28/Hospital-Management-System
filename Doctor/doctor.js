document.addEventListener('DOMContentLoaded', function() {
    
    // --- AUTHENTICATION CHECK ---
    const currentUserId = sessionStorage.getItem('currentUserId');
    const currentUserRole = sessionStorage.getItem('currentUserRole');
    const doctorName = sessionStorage.getItem('currentUserName');

    if (!currentUserId || currentUserRole !== 'Doctor') {
        alert("Access Denied. Please log in as a Doctor.");
        window.location.href = '../LOGIN/login.html'; 
        return; 
    }

    // --- INITIALIZATION & ELEMENT REFERENCES ---
    const doctorInfoSpan = document.getElementById('doctor-info');
    const currentTimeSpan = document.getElementById('current-time');
    const logoutBtn = document.getElementById('logout-btn');
    const queueListDiv = document.getElementById('patientQueueList');
    const nextPatientBtn = document.getElementById('nextPatientBtn');
    const consultationHeader = document.getElementById('consultationHeader');
    const consultationForm = document.getElementById('consultationForm');
    const formInputs = document.querySelectorAll('#consultationForm input, #consultationForm textarea, #consultationForm select');
    const pTokenDisplay = document.getElementById('pTokenDisplay');
    const pNameDisplay = document.getElementById('pNameDisplay');
    const pAgeDisplay = document.getElementById('pAgeDisplay');
    const pBloodDisplay = document.getElementById('pBloodDisplay');
    const pContactDisplay = document.getElementById('pContactDisplay');
    const pWeightInput = document.getElementById('pWeight');
    const pHeightInput = document.getElementById('pHeight');
    const medNameInput = document.getElementById('medName');
    const doseInput = document.getElementById('dose');
    const durationInput = document.getElementById('duration');
    const dosageTextInput = document.getElementById('dosageText');
    const symptomsObserved = document.getElementById('symptomsObserved');
    const finalDiagnosis = document.getElementById('finalDiagnosis');
    const notesInternal = document.getElementById('notesInternal');
    const labTestsSelect = document.getElementById('labTests');
    const sendToPharmacyBtn = document.getElementById('sendToPharmacy');
    const sendToLabBtn = document.getElementById('sendToLab');
    const completeConsultationBtn = document.getElementById('completeConsultation');
    const clearFormBtn = document.getElementById('clearForm');
    const labReportsList = document.getElementById('lab-reports-list');
    const searchReportIdInput = document.getElementById('search-report-id');
    const searchReportBtn = document.getElementById('search-report-btn');

    // --- NEW ELEMENTS FOR CONSULTATION MANAGEMENT ---
    const searchConsultationNameInput = document.getElementById('search-consultation-name');
    const searchConsultationBtn = document.getElementById('search-consultation-btn');
    const consultationResultsList = document.getElementById('consultation-results-list');
    
    let currentPatient = null;
    let editingConsultationId = null; 
    
    const testCosts = {
        'Blood Test': 50.00,
        'Urine Analysis': 35.00,
        'ECG': 65.00,
        'X-Ray': 90.00
    };

    // --- DATA MANAGEMENT FUNCTIONS ---

    function getNormalRange(testName) {
        switch(testName) {
            case 'Blood Test':
                return 'RBC: 4.5 - 5.5 million cells/mcL, WBC: 4,500 - 11,000 cells/mcL';
            case 'Urine Analysis':
                return 'Clear, pH 4.5-8.0, no protein or glucose';
            case 'ECG':
                return 'Normal Sinus Rhythm, 60-100 bpm';
            case 'X-Ray':
                return 'No fractures or abnormalities';
            default:
                return 'N/A';
        }
    }

    function updateUserInfo() {
        const now = new Date();
        const dateTimeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

        doctorInfoSpan.textContent = `Dr. ${doctorName} (${currentUserId})`;
        currentTimeSpan.textContent = dateTimeStr;
    }

    function getTestCost(testName) {
        return testCosts[testName] || 0;
    }

    function loadAndRenderQueue() {
        const queue = JSON.parse(localStorage.getItem('patientQueue') || '[]');
        const myQueue = queue.filter(p => p.doctorId === currentUserId && p.status === 'Waiting');
        
        queueListDiv.innerHTML = '';
        if (myQueue.length === 0) {
            queueListDiv.innerHTML = '<p>No patients in queue.</p>';
            nextPatientBtn.disabled = true;
        } else {
            nextPatientBtn.disabled = false;
            const ul = document.createElement('ul');
            myQueue.forEach(patient => {
                const li = document.createElement('li');
                li.textContent = `[Token: ${patient.token}] ${patient.name} (Age: ${patient.age})`;
                ul.appendChild(li);
            });
            queueListDiv.appendChild(ul);
        }
    }

    function deleteReport(reportId) {
        let reports = JSON.parse(localStorage.getItem('doctorLabReports') || '[]');
        reports = reports.filter(report => report.completionTime !== reportId);
        localStorage.setItem('doctorLabReports', JSON.stringify(reports));
        loadAndRenderLabReports(); 
        alert("Report confirmed and deleted.");
    }

    function loadAndRenderLabReports(query = '') {
        const allReports = JSON.parse(localStorage.getItem('doctorLabReports') || '[]');
        const myReports = allReports.filter(report => report.doctorID === currentUserId);
        
        let reportsToDisplay = myReports;

        if (query.trim() !== '') {
            const lowerCaseQuery = query.toLowerCase();
            reportsToDisplay = myReports.filter(report => report.patientID.toLowerCase().includes(lowerCaseQuery));
        }

        labReportsList.innerHTML = '';
        if (reportsToDisplay.length === 0) {
            labReportsList.innerHTML = '<p>No new lab reports.</p>';
        } else {
            reportsToDisplay.forEach(report => {
                const reportItem = document.createElement('div');
                reportItem.classList.add('report-item');
                
                let testsList = '';
                report.testDetails.forEach(test => {
                    testsList += `<li>
                        <strong>Test:</strong> ${test.name}<br>
                        <strong>Result:</strong> ${test.result || 'N/A'}<br>
                        <strong>Normal Range:</strong> ${getNormalRange(test.name)}
                    </li>`;
                });

                reportItem.innerHTML = `
                    <h4>Report for ${report.patientName} (${report.patientID})</h4>
                    <p><strong>Test(s):</strong> <ul>${testsList}</ul></p>
                    <p><strong>Date & Time:</strong> ${report.collectionDate} at ${report.collectionTime}</p>
                    <p><strong>Notes from Technician:</strong> ${report.resultsNotes || 'N/A'}</p>
                    <p><strong>Completed by:</strong> ${report.labTechnicianName}</p>
                    <p class="report-id" style="font-size: 0.8em; color: #777;">Report ID: ${report.completionTime}</p>
                    <button class="delete-btn" data-report-id="${report.completionTime}">Confirm and Delete</button>
                `;
                labReportsList.appendChild(reportItem);
            });
            
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const reportId = this.dataset.reportId;
                    deleteReport(reportId);
                });
            });
        }
    }

    function updatePatientStatus(patientId, newStatus) {
        let queue = JSON.parse(localStorage.getItem('patientQueue') || '[]');
        const index = queue.findIndex(p => p.id === patientId);

        if (index !== -1) {
            queue[index].status = newStatus;
            localStorage.setItem('patientQueue', JSON.stringify(queue));
        }
    }

    function setFormEnabled(enabled) {
        formInputs.forEach(input => {
            input.disabled = !enabled;
        });
        sendToPharmacyBtn.disabled = !enabled;
        sendToLabBtn.disabled = !enabled;
        completeConsultationBtn.disabled = !enabled;
        clearFormBtn.disabled = !enabled;

        // --- CORRECTED LOGIC: Check if we are in EDIT mode (editingConsultationId is set) ---
        if (enabled && editingConsultationId) {
            // Form is enabled for editing, but these two fields must remain disabled
            symptomsObserved.disabled = true;
            finalDiagnosis.disabled = true;
        } else {
            // If form is disabled, or if form is enabled for a NEW patient (editingConsultationId is null)
            // allow the general setting to apply (i.e., symptoms/diagnosis are enabled for new patients)
            symptomsObserved.disabled = !enabled;
            finalDiagnosis.disabled = !enabled;
        }
        // -----------------------------------------------------------------------------------
    }

    function resetConsultationArea() {
        currentPatient = null;
        editingConsultationId = null;
        consultationForm.reset();
        // This call will set all fields to disabled, including symptoms/diagnosis
        setFormEnabled(false); 
        consultationHeader.textContent = `Consultation: Select Patient`;
        completeConsultationBtn.textContent = 'COMPLETE CONSULTATION';
        pTokenDisplay.textContent = pNameDisplay.textContent = pAgeDisplay.textContent = pBloodDisplay.textContent = pContactDisplay.textContent = 'N/A';
    }


    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.clear();
            window.location.href = '../LOGIN/login.html';
        }
    });

    nextPatientBtn.addEventListener('click', function() {
        if (editingConsultationId) {
            if (!confirm("You are currently editing a past consultation. Do you want to discard changes and see the next patient?")) {
                return;
            }
        }
        resetConsultationArea();

        const queue = JSON.parse(localStorage.getItem('patientQueue') || '[]');
        const nextPatient = queue.find(p => p.doctorId === currentUserId && p.status === 'Waiting');

        if (nextPatient) {
            currentPatient = nextPatient;
            updatePatientStatus(currentPatient.id, 'Consulting');
            
            pTokenDisplay.textContent = currentPatient.token;
            pNameDisplay.textContent = currentPatient.name;
            pAgeDisplay.textContent = currentPatient.age;
            pBloodDisplay.textContent = currentPatient.bloodGroup;
            pContactDisplay.textContent = currentPatient.contact;
            consultationHeader.textContent = `Consultation: ${currentPatient.name}`;
            consultationForm.reset();

            setFormEnabled(true);
            
            loadAndRenderQueue();
            
            alert(`Now consulting patient ${currentPatient.name} (Token: ${currentPatient.token}).`);
        } else {
            alert("No patients currently waiting.");
        }
    });
    
    sendToPharmacyBtn.addEventListener('click', function() {
        const patientName = pNameDisplay.textContent;
        if (patientName === 'N/A') return alert("Please select a patient first.");

        const medName = medNameInput.value.trim();
        const dose = doseInput.value.trim();
        const duration = durationInput.value.trim();

        if (!medName || !dose || !duration) {
            return alert("Please enter medicine details (Name, Dose, Duration) before sending to Pharmacy.");
        }
        
        const prescriptionData = {
            patientId: currentPatient ? currentPatient.id : 'N/A', 
            patientName: patientName,
            doctorName: doctorName,
            token: pTokenDisplay.textContent,
            medName: medName,
            dose: dose,
            duration: duration,
            dosageText: dosageTextInput.value.trim(),
            date: new Date().toISOString(),
            status: 'Pending'
        };

        const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        prescriptions.push(prescriptionData);
        localStorage.setItem('prescriptions', JSON.stringify(prescriptions));

        alert(`Prescription for ${patientName} sent to Pharmacy!`);
    });

    sendToLabBtn.addEventListener('click', function() {
        const patientName = pNameDisplay.textContent;
        if (patientName === 'N/A') {
            return alert("Please select a patient first.");
        }
        
        const selectedTest = labTestsSelect.value;
        if (selectedTest === 'none') {
            return alert("Please select a valid lab test before sending.");
        }
        
        const labRequestData = {
            patientID: currentPatient ? currentPatient.id : 'N/A', 
            patientName: patientName,
            doctorName: doctorName,
            age: pAgeDisplay.textContent,
            doctorID: currentUserId,
            tests: [{
                name: selectedTest,
                cost: getTestCost(selectedTest)
            }]
        };

        const labQueue = JSON.parse(localStorage.getItem('labTestQueue') || '[]');
        labQueue.push(labRequestData);
        localStorage.setItem('labTestQueue', JSON.stringify(labQueue));

        alert(`Lab test (${selectedTest}) request for ${patientName} sent to Lab!`);
    });
    
    clearFormBtn.addEventListener('click', function() {
        consultationForm.reset();
    });

    searchReportBtn.addEventListener('click', function() {
        const query = searchReportIdInput.value;
        loadAndRenderLabReports(query);
    });

    // --- NEW: CONSULTATION MANAGEMENT LOGIC ---

    function saveOrUpdateConsultation() {
        const patientName = pNameDisplay.textContent;
        if (patientName === 'N/A') {
            alert("No patient selected to save consultation.");
            return;
        }

        let allConsultations = JSON.parse(localStorage.getItem('completedConsultations') || '[]');
        
        const consultationData = {
            
            patientToken: pTokenDisplay.textContent,
            patientName: pNameDisplay.textContent,
            patientAge: pAgeDisplay.textContent,
            patientBloodGroup: pBloodDisplay.textContent,
            patientContact: pContactDisplay.textContent,
            
            doctorId: currentUserId,
            doctorName: doctorName,
            consultationDate: new Date().toISOString(),
            
            // Note: Symptoms and Diagnosis values are saved whether in edit mode or not
            symptoms: symptomsObserved.value.trim(),
            weight: pWeightInput.value.trim(),
            height: pHeightInput.value.trim(),
            diagnosis: finalDiagnosis.value.trim(),
            internalNotes: notesInternal.value.trim(),
            prescription: {
                medName: medNameInput.value.trim(),
                dose: doseInput.value,
                duration: durationInput.value,
                dosageText: dosageTextInput.value.trim()
            },
            labTest: labTestsSelect.value
        };

        if (editingConsultationId) {
            
            const index = allConsultations.findIndex(c => c.consultationId === editingConsultationId);
            if (index !== -1) {
                
                // Preserve original immutable data (like initial diagnosis/symptoms if they are required to be kept as-is)
                // For this scenario, we must ensure we *don't* overwrite symptoms/diagnosis if they were disabled and empty. 
                // Since the fields are disabled, they retain their old, populated values from record.symptoms/record.diagnosis
                // which is fine, as the form fields were populated, and the save operation uses the value from the form field.
                
                // However, to be absolutely safe when saving an update, we should retrieve the original diagnosis/symptoms if we disabled them:
                consultationData.symptoms = allConsultations[index].symptoms;
                consultationData.diagnosis = allConsultations[index].diagnosis;

                consultationData.patientId = allConsultations[index].patientId;
                consultationData.consultationId = allConsultations[index].consultationId;
                allConsultations[index] = consultationData;
                alert(`Consultation for ${patientName} has been updated.`);
            }
        } else {
            
            consultationData.patientId = currentPatient.id;
            consultationData.consultationId = Date.now().toString(); 
            allConsultations.push(consultationData);
            updatePatientStatus(currentPatient.id, 'Completed');
            alert(`Consultation for ${patientName} completed and saved.`);
        }

        localStorage.setItem('completedConsultations', JSON.stringify(allConsultations));
        resetConsultationArea();
        loadAndRenderQueue();
        
        loadAndRenderConsultations(searchConsultationNameInput.value);
    }

    function loadAndRenderConsultations(query = '') {
        const allConsultations = JSON.parse(localStorage.getItem('completedConsultations') || '[]');
        const myConsultations = allConsultations.filter(c => c.doctorId === currentUserId);
        
        let consultationsToDisplay = myConsultations;

        if (query.trim() !== '') {
            const lowerCaseQuery = query.toLowerCase();
            consultationsToDisplay = myConsultations.filter(c => c.patientName.toLowerCase().includes(lowerCaseQuery));
        } else {
            
            consultationsToDisplay = [];
        }

        consultationResultsList.innerHTML = '';
        if (consultationsToDisplay.length === 0) {
            if (query.trim() !== '') {
                consultationResultsList.innerHTML = '<p>No matching consultation records found.</p>';
            } else {
                consultationResultsList.innerHTML = '<p>Search for a patient to manage their consultation records.</p>';
            }
        } else {
            consultationsToDisplay.forEach(consult => {
                const item = document.createElement('div');
                item.classList.add('report-item'); 
                item.innerHTML = `
                    <h4>${consult.patientName} (Token: ${consult.patientToken})</h4>
                    <p><strong>Diagnosis:</strong> ${consult.diagnosis || 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date(consult.consultationDate).toLocaleDateString()}</p>
                    <div class="button-group-right">
                        <button class="action-btn secondary edit-consult-btn" data-consult-id="${consult.consultationId}">Edit</button>
                        <button class="action-btn tertiary delete-consult-btn" data-consult-id="${consult.consultationId}">Delete</button>
                    </div>
                `;
                consultationResultsList.appendChild(item);
            });
        }
    }

    function populateFormForEdit(consultationId) {
        const allConsultations = JSON.parse(localStorage.getItem('completedConsultations') || '[]');
        const record = allConsultations.find(c => c.consultationId === consultationId);

        if (!record) {
            alert("Could not find consultation record.");
            return;
        }

        if (currentPatient) {
            if (!confirm("This will clear the current patient from the consultation form. Proceed?")) {
                return;
            }
        }

        resetConsultationArea();

        
        editingConsultationId = consultationId;

        
        pTokenDisplay.textContent = record.patientToken;
        pNameDisplay.textContent = record.patientName;
        pAgeDisplay.textContent = record.patientAge;
        pBloodDisplay.textContent = record.patientBloodGroup;
        pContactDisplay.textContent = record.patientContact;
        consultationHeader.textContent = `Editing Consultation: ${record.patientName}`;

        
        symptomsObserved.value = record.symptoms;
        finalDiagnosis.value = record.diagnosis;
        
        pWeightInput.value = record.weight;
        pHeightInput.value = record.height;
        notesInternal.value = record.internalNotes;
        medNameInput.value = record.prescription.medName;
        doseInput.value = record.prescription.dose;
        durationInput.value = record.prescription.duration;
        dosageTextInput.value = record.prescription.dosageText;
        labTestsSelect.value = record.labTest;

        
        setFormEnabled(true); 
        completeConsultationBtn.textContent = 'UPDATE CONSULTATION';
        alert(`Now editing the record for ${record.patientName}.`);
        window.scrollTo(0, 0); 
    }

    function deleteConsultation(consultationId) {
        if (!confirm("Are you sure you want to permanently delete this consultation record?")) {
            return;
        }
        let allConsultations = JSON.parse(localStorage.getItem('completedConsultations') || '[]');
        const updatedConsultations = allConsultations.filter(c => c.consultationId !== consultationId);
        localStorage.setItem('completedConsultations', JSON.stringify(updatedConsultations));
        alert("Consultation record deleted.");
        
        loadAndRenderConsultations(searchConsultationNameInput.value);
    }

    
    completeConsultationBtn.addEventListener('click', function() {
        const actionText = this.textContent;
        const patientName = pNameDisplay.textContent;

        if (actionText === 'UPDATE CONSULTATION') {
            if (confirm(`Are you sure you want to UPDATE the record for ${patientName}?`)) {
                saveOrUpdateConsultation();
            }
        } else {
            if (!currentPatient) {
                alert("Please select a patient from the queue first.");
                return;
            }
            if (!finalDiagnosis.value.trim()) {
                alert("Please provide a Final Diagnosis before completing.");
                return;
            }
            if (confirm(`Mark consultation for ${patientName} as COMPLETE and SAVE record?`)) {
                saveOrUpdateConsultation();
            }
        }
    });

    
    searchConsultationBtn.addEventListener('click', function() {
        loadAndRenderConsultations(searchConsultationNameInput.value);
    });

    
    consultationResultsList.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-consult-btn')) {
            const consultId = e.target.dataset.consultId;
            populateFormForEdit(consultId);
        }
        if (e.target.classList.contains('delete-consult-btn')) {
            const consultId = e.target.dataset.consultId;
            deleteConsultation(consultId);
        }
    });


    // --- INITIAL SETUP ---
    updateUserInfo();
    setFormEnabled(false);
    loadAndRenderQueue(); 
    loadAndRenderLabReports(); 
    setInterval(updateUserInfo, 1000); 
    setInterval(loadAndRenderQueue, 5000); 
    setInterval(loadAndRenderLabReports, 5000); 
});