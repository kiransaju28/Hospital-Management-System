document.addEventListener('DOMContentLoaded', function() {
    // --- Initial Setup ---
    const userInfoDiv = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const queueList = document.getElementById('lab-queue-list');
    const fetchPendingBtn = document.getElementById('fetch-pending-btn');
    const searchPatientIdInput = document.getElementById('search-patient-id');
    const searchBtn = document.getElementById('search-btn');
    const processBillingBtn = document.getElementById('process-billing-btn');
    const clearNextBtn = document.getElementById('clear-next-btn');
    const requestedTestsBody = document.getElementById('requested-tests-body');
    const totalLabFeeSpan = document.getElementById('total-lab-fee');
    const testResultsNotes = document.getElementById('test-results-notes');
    const invoiceBox = document.querySelector('.invoice-box');
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');

    // NEW elements
    const sampleCollectionDateInput = document.getElementById('sample-collection-date');
    const sampleCollectionTimeInput = document.getElementById('sample-collection-time');
    const patientAgeGroupSpan = document.getElementById('patient-age-group');
    
    // BUTTONS FOR UPDATE/DELETE
    const updateResultsBtn = document.getElementById('update-results-btn');
    const deleteRequestBtn = document.getElementById('delete-request-btn');

    // Data for costs and normal ranges - In a real app, this would be from a database
    const normalRanges = {
        'Blood Test': {
            'child': 'Range 0-10: <100 normal',
            'adult': 'Range >20: High; Range >50: normal'
        },
        'Urine Analysis': {
            'child': 'Range 0-10: <100 normal',
            'adult': 'Range >20: High; Range >50: normal'
        },
        'ECG': {
            'child': 'Range 0-10: <100 normal',
            'adult': 'Range >20: High; Range >50: normal'
        },
        'X-Ray': {
            'child': 'Range 0-10: <100 normal',
            'adult': 'Range >20: High; Range >50: normal'
        }
    };

    let currentPatient = null;
    let labQueue = [];

    // --- Utility Functions ---

    function updateUserInfo() {
        const userName = sessionStorage.getItem('currentUserName');
        const userId = sessionStorage.getItem('currentUserId');
        const role = sessionStorage.getItem('currentUserRole');
        const now = new Date();
        const dateTimeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

        // Update the user info and date/time in the header
        userInfoDiv.innerHTML = `
            <span>${role}: ${userName} (${userId})</span> 
            <span class="datetime">${dateTimeStr}</span>
            <button id="logout-btn" class="action-btn tertiary">Logout</button>
        `;

        // Re-attach the logout button listener since the HTML was replaced
        document.getElementById('logout-btn').addEventListener('click', function() {
            if (confirm('Are you sure you want to log out?')) {
                sessionStorage.clear();
                window.location.href = '../LOGIN/login.html';
            }
        });
    }

    // This is sample data. In a real application, this would be retrieved from a server.
    function loadSampleQueue() {
        const sampleData = [
            { patientID: 'P00001', patientName: 'John Doe', doctorID: 'DR001', doctorName: 'Dr. Smith', age: 35, tests: [
                { name: 'Blood Test', cost: 50.00 }, 
                { name: 'Urine Analysis', cost: 35.00 }
            ]},
            { patientID: 'P00002', patientName: 'Jane Foster', doctorID: 'DR002', doctorName: 'Dr. Jones', age: 8, tests: [
                { name: 'Blood Test', cost: 50.00 }, 
                { name: 'ECG', cost: 65.00 }
            ]},
            { patientID: 'P00003', patientName: 'Peter Parker', doctorID: 'DR001', doctorName: 'Dr. Smith', age: 16, tests: [
                { name: 'X-Ray', cost: 90.00 }
            ]}
        ];
        
        // This simulates receiving new requests and storing them locally
        if (!localStorage.getItem('labTestQueue')) {
            localStorage.setItem('labTestQueue', JSON.stringify(sampleData));
        }
    }

    function loadQueue() {
        const storedQueue = localStorage.getItem('labTestQueue');
        if (storedQueue) {
            labQueue = JSON.parse(storedQueue);
        }
    }

    function saveQueue() {
        localStorage.setItem('labTestQueue', JSON.stringify(labQueue));
    }

    function renderQueue(filteredQueue = labQueue) {
        if (filteredQueue.length === 0) {
            queueList.innerHTML = '<p>No pending lab requests.</p>';
            return;
        }

        queueList.innerHTML = '';
        filteredQueue.forEach((item) => {
            const queueItem = document.createElement('div');
            queueItem.classList.add('queue-item');
            queueItem.setAttribute('data-patient-id', item.patientID);
            queueItem.innerHTML = `
                <strong>${item.patientName} (${item.patientID})</strong>
                <br>Requested by Dr. ${item.doctorName}
            `;
            queueList.appendChild(queueItem);
        });
    }

    function loadPatientDetails(patientData) {
        currentPatient = patientData;

        // Detailed Age Group Logic
        let ageGroup;
        if (patientData.age <= 12) {
            ageGroup = 'Child';
        } else if (patientData.age >= 13 && patientData.age <= 17) {
            ageGroup = 'Teenager';
        } else {
            ageGroup = 'Adult';
        }

        const rangeKey = ageGroup === 'Child' ? 'child' : 'adult'; 

        // Display patient info
        document.getElementById('patient-id-display').textContent = patientData.patientID;
        document.getElementById('patient-name-display').textContent = patientData.patientName;
        document.getElementById('doctor-name-display').textContent = patientData.doctorName;
        patientAgeGroupSpan.textContent = `${ageGroup} (${patientData.age} yrs)`;

        // Populate the tests table and calculate total fee
        requestedTestsBody.innerHTML = '';
        let totalFee = 0;
        
        if (patientData.tests && Array.isArray(patientData.tests)) {
            patientData.tests.forEach(test => {
                const row = requestedTestsBody.insertRow();
                const range = normalRanges[test.name] ? normalRanges[test.name][rangeKey] : 'N/A';
                row.innerHTML = `
                    <td>${test.name}</td>
                    <td>${test.cost.toFixed(2)}</td>
                    <td>${range}</td>
                `;
                totalFee += test.cost;
            });
        }

        totalLabFeeSpan.textContent = totalFee.toFixed(2);
        
        // Load data from the queue item if it exists, otherwise fields will be empty
        testResultsNotes.value = patientData.resultsNotes || '';
        sampleCollectionDateInput.value = patientData.collectionDate || '';
        sampleCollectionTimeInput.value = patientData.collectionTime || '';

        // Update the Invoice Summary
        updateInvoiceSummary(totalFee, patientData.patientName, patientData.tests ? patientData.tests.length : 0, patientData.collectionDate || '');

        // Enable buttons
        processBillingBtn.disabled = false;
        updateResultsBtn.disabled = false;
        deleteRequestBtn.disabled = false;
    }

    function updateInvoiceSummary(subtotal, patientName, testCount, collectionDate) {
        const taxRate = 0.05;
        const tax = subtotal * taxRate;
        const grandTotal = subtotal + tax;
        
        document.getElementById('invoice-p-name').textContent = patientName;
        document.getElementById('invoice-test-count').textContent = testCount;
        document.getElementById('invoice-collection-date').textContent = collectionDate || 'N/A';
        document.getElementById('invoice-subtotal').textContent = subtotal.toFixed(2);
        document.getElementById('invoice-tax').textContent = tax.toFixed(2);
        document.getElementById('invoice-grand-total').textContent = grandTotal.toFixed(2);
        
        invoiceBox.style.display = 'block';
    }

    function clearDesk() {
        currentPatient = null;
        
        document.getElementById('patient-id-display').textContent = 'N/A';
        document.getElementById('patient-name-display').textContent = 'N/A';
        document.getElementById('doctor-name-display').textContent = 'N/A';
        patientAgeGroupSpan.textContent = 'N/A';
        requestedTestsBody.innerHTML = '';
        totalLabFeeSpan.textContent = '0.00';
        testResultsNotes.value = '';
        sampleCollectionDateInput.value = '';
        sampleCollectionTimeInput.value = '';
        
        document.getElementById('invoice-summary').innerHTML = '<p>Select a patient to generate the invoice summary.</p>';
        invoiceBox.style.display = 'none';

        const selected = queueList.querySelector('.queue-item.selected');
        if (selected) selected.classList.remove('selected');
        
        // Disable buttons
        processBillingBtn.disabled = true;
        updateResultsBtn.disabled = true;
        deleteRequestBtn.disabled = true;
    }

    function printDiv(divId) {
        const printContents = document.getElementById(divId).innerHTML;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); 
    }

    // --- FUNCTIONALITY: UPDATE ---
    function updatePatientRequest() {
        if (!currentPatient) return;

        // Get data directly from input fields
        const results = testResultsNotes.value.trim();
        const collectionDate = sampleCollectionDateInput.value;
        const collectionTime = sampleCollectionTimeInput.value;

        if (!collectionDate || !collectionTime || results.length < 10) {
            alert('Please enter a valid sample collection date/time and detailed test results (min 10 characters) to save changes.');
            return;
        }

        const patientIndex = labQueue.findIndex(p => p.patientID === currentPatient.patientID);
        
        if (patientIndex !== -1) {
            // Update the data in the queue item
            labQueue[patientIndex].collectionDate = collectionDate;
            labQueue[patientIndex].collectionTime = collectionTime;
            labQueue[patientIndex].resultsNotes = results;
            
            saveQueue(); // Save changes to localStorage
            
            alert(`Lab request for ${currentPatient.patientName} (${currentPatient.patientID}) updated successfully.`);
            
            // Re-select the patient to refresh the invoice summary
            loadPatientDetails(labQueue[patientIndex]);
        } else {
            alert('Error: Patient not found in the queue.');
        }
    }

    // --- FUNCTIONALITY: DELETE ---
    function deletePatientRequest() {
        if (!currentPatient) return;
        
        if (!confirm(`Are you sure you want to permanently DELETE the lab request for Patient ID: ${currentPatient.patientID} - ${currentPatient.patientName}? This action cannot be undone.`)) {
            return;
        }

        const patientIndex = labQueue.findIndex(p => p.patientID === currentPatient.patientID);

        if (patientIndex !== -1) {
            labQueue.splice(patientIndex, 1); // Remove the item
            saveQueue(); // Save the updated queue to localStorage
            
            alert(`Lab request for ${currentPatient.patientName} has been deleted.`);
            clearDesk();
            renderQueue(); // Update the displayed queue list
        } else {
            alert('Error: Patient not found in the queue.');
        }
    }


    // --- Event Handlers ---

    // 1. Logout
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.clear();
            window.location.href = '../LOGIN/login.html';
        }
    });

    // 2. FETCH PENDING button click
    fetchPendingBtn.addEventListener('click', function() {
        loadQueue();
        renderQueue();
        if (labQueue.length > 0) {
            alert(`Found ${labQueue.length} pending lab requests.`);
        } else {
            alert('No pending requests found.');
        }
    });

    // 3. Search button click
    searchBtn.addEventListener('click', function() {
        const query = searchPatientIdInput.value.trim().toUpperCase();
        if (query) {
            const result = labQueue.filter(patient => patient.patientID.toUpperCase().includes(query));
            renderQueue(result);
        } else {
            renderQueue(); 
        }
    });

    // 4. Queue item click handler
    queueList.addEventListener('click', function(e) {
        const item = e.target.closest('.queue-item');
        if (!item) return;
        
        const previousSelected = queueList.querySelector('.queue-item.selected');
        if (previousSelected) previousSelected.classList.remove('selected');
        
        item.classList.add('selected');
        
        const patientID = item.getAttribute('data-patient-id');
        const patientData = labQueue.find(p => p.patientID === patientID);

        if (patientData) {
            loadPatientDetails(patientData);
        }
    });

    // 5. Process Billing & Complete Handler (FIXED to use input field values)
    processBillingBtn.addEventListener('click', function() {
        if (!currentPatient) {
            alert('Please select a patient from the queue first.');
            return;
        }
        
        // Get data from INPUT fields for validation and final report
        const results = testResultsNotes.value.trim();
        const collectionDate = sampleCollectionDateInput.value;
        const collectionTime = sampleCollectionTimeInput.value;

        if (!collectionDate || !collectionTime || results.length < 10) {
            alert('Please enter a valid sample collection date/time and detailed test results before completing the process.');
            return;
        }

        // Prepare the report object to be sent to the doctor
        const labReport = {
            patientID: currentPatient.patientID,
            patientName: currentPatient.patientName,
            doctorID: currentPatient.doctorID,
            doctorName: currentPatient.doctorName,
            labTechnicianName: sessionStorage.getItem('currentUserName'),
            testDetails: currentPatient.tests,
            totalFee: parseFloat(totalLabFeeSpan.textContent),
            collectionDate: collectionDate, // Use data from input
            collectionTime: collectionTime, // Use data from input
            resultsNotes: results, // Use data from input
            completionTime: new Date().toISOString()
        };

        // Update the doctor's local storage with the new lab report
        let doctorReports = JSON.parse(localStorage.getItem('doctorLabReports') || '[]');
        doctorReports.push(labReport);
        localStorage.setItem('doctorLabReports', JSON.stringify(doctorReports));

        // Mark the patient's lab request as completed in the main queue
        const patientIndex = labQueue.findIndex(p => p.patientID === currentPatient.patientID);
        if (patientIndex !== -1) {
            labQueue.splice(patientIndex, 1);
            saveQueue();
        }

        alert(`Lab results processed and sent to Dr. ${currentPatient.doctorName}.`);
        clearDesk();
        renderQueue(); 
    });

    // 6. Clear/Next Patient Handler
    clearNextBtn.addEventListener('click', clearDesk);

    // 7. Print Invoice Handler
    printInvoiceBtn.addEventListener('click', function() {
        const collectionDate = document.getElementById('sample-collection-date').value;
        if (currentPatient && collectionDate) {
            updateInvoiceSummary(parseFloat(totalLabFeeSpan.textContent), currentPatient.patientName, currentPatient.tests.length, collectionDate);
            printDiv('invoice-summary');
        } else {
            alert("Please select a patient and enter a sample collection date first.");
        }
    });

    // 8. UPDATE RESULTS button handler
    updateResultsBtn.addEventListener('click', updatePatientRequest);

    // 9. DELETE REQUEST button handler
    deleteRequestBtn.addEventListener('click', deletePatientRequest);

    // --- Initialization ---
    updateUserInfo();
    loadSampleQueue(); 
    loadQueue();
    // Update time every second
    setInterval(updateUserInfo, 1000); 
});