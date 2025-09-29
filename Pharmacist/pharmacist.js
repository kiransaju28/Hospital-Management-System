document.addEventListener('DOMContentLoaded', function() {
    
    // --- AUTHENTICATION CHECK ---
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (!currentUserId || currentUserId.substring(0, 5) !== 'PHARM') {
        alert("Access Denied. Please log in as Pharmacist.");
        window.location.href = '../LOGIN/login.html'; 
        return; 
    }
    
    // --- INITIALIZATION ---
    const name = sessionStorage.getItem('currentUserName');
    document.getElementById('pharmacistNameDisplay').textContent = `${name} (${currentUserId})`;
    
    let currentStock = JSON.parse(localStorage.getItem('pharmacyStock') || '[]');
    let currentPrescription = null; 

    // --- UTILITIES ---
    function updateDateTime() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        document.getElementById('currentDateTime').textContent = 
            `${now.toLocaleDateString('en-US', dateOptions)} ${now.toLocaleTimeString('en-US', timeOptions)}`;
    }
    setInterval(updateDateTime, 1000); 
    updateDateTime();
    
    // --- STOCK MANAGEMENT ---

    function renderStockTable(searchTerm = '') {
        const tableBody = document.querySelector('#inventoryTable tbody');
        tableBody.innerHTML = '';
        
        const filteredStock = currentStock.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredStock.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No stock items found.</td></tr>';
            return;
        }

        filteredStock.forEach(item => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>Rs.${parseFloat(item.price).toFixed(2)}</td>
                <td>
                    <button class="action-btn secondary edit-stock-btn" data-name="${item.name}">Edit</button>
                    <button class="action-btn tertiary delete-stock-btn" data-name="${item.name}">Delete</button>
                </td>
            `;
        });
        
        // Add Edit button listeners
        document.querySelectorAll('.edit-stock-btn').forEach(button => {
            button.addEventListener('click', function() {
                const medName = this.getAttribute('data-name');
                const item = currentStock.find(s => s.name === medName);
                if (item) {
                    document.getElementById('stockMedName').value = item.name;
                    document.getElementById('stockPrice').value = item.price;
                    document.getElementById('stockQty').value = ''; 
                    alert(`Editing: Current stock for ${item.name} is ${item.qty}. Enter the amount you want to ADD.`);
                }
            });
        });

        // Add Delete button listeners
        document.querySelectorAll('.delete-stock-btn').forEach(button => {
            button.addEventListener('click', function() {
                const medName = this.getAttribute('data-name');
                if (confirm(`Are you sure you want to delete ${medName} from stock?`)) {
                    currentStock = currentStock.filter(item => item.name !== medName);
                    localStorage.setItem('pharmacyStock', JSON.stringify(currentStock));
                    renderStockTable();
                }
            });
        });
    }

    // Medicine Name Autocomplete/Search on Input
    document.getElementById('stockMedName').addEventListener('input', function() {
        const inputVal = this.value.trim().toLowerCase();
        const suggestionsContainer = document.getElementById('stockSuggestions');
        suggestionsContainer.innerHTML = '';

        if (inputVal.length > 0) {
            const matches = currentStock.filter(item => item.name.toLowerCase().startsWith(inputVal));
            matches.forEach(item => {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = item.name;
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.addEventListener('click', () => {
                    document.getElementById('stockMedName').value = item.name;
                    document.getElementById('stockPrice').value = item.price;
                    document.getElementById('stockQty').value = '';
                    suggestionsContainer.innerHTML = ''; // Clear suggestions
                    document.getElementById('stockMedName').focus();
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
        }
    });

    document.getElementById('addUpdateStockBtn').addEventListener('click', function() {
        const name = document.getElementById('stockMedName').value.trim();
        const price = parseFloat(document.getElementById('stockPrice').value);
        const qtyToAdd = parseInt(document.getElementById('stockQty').value);

        if (!name || isNaN(price) || price <= 0 || isNaN(qtyToAdd) || qtyToAdd <= 0) {
            return alert("Please enter a valid medicine name, price, and a positive quantity to add.");
        }

        const existingIndex = currentStock.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

        if (existingIndex > -1) {
            currentStock[existingIndex].qty += qtyToAdd; 
            currentStock[existingIndex].price = price;
            alert(`Added ${qtyToAdd} units to ${name}. New total: ${currentStock[existingIndex].qty}.`);
        } else {
            currentStock.push({ name, price: price.toFixed(2), qty: qtyToAdd });
            alert(`New item ${name} added to stock with quantity ${qtyToAdd}.`);
        }

        localStorage.setItem('pharmacyStock', JSON.stringify(currentStock));
        renderStockTable();
        document.getElementById('stockMedName').value = '';
        document.getElementById('stockPrice').value = '';
        document.getElementById('stockQty').value = '';
    });

    // New event listener for the search button
    document.getElementById('searchMedicineBtn').addEventListener('click', function() {
        const searchTerm = document.getElementById('searchMedicineName').value.trim();
        renderStockTable(searchTerm);
    });
    
    // --- PRESCRIPTION MANAGEMENT ---

    function loadAndRenderPrescriptions(containerId, prescriptionsToRender) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (prescriptionsToRender.length === 0) {
            container.innerHTML = '<p>No pending prescriptions found.</p>';
            return;
        }

        prescriptionsToRender.forEach(p => {
            const item = document.createElement('div');
            item.className = 'prescription-item';
            
            item.innerHTML = `
                <p class="name-id">${p.patientName} (ID: ${p.patientId})</p>
                <p class="details">
                    Prescribed: <strong>${p.medName}</strong>, Dose: ${p.dose} for ${p.duration} days. <br>
                    Dosage text: <strong>${p.dosageText || 'N/A'}</strong> <br>
                    By Dr. ${p.doctorName}
                </p>
                <button class="action-btn secondary process-btn" data-id="${p.patientId}">PROCESS</button>
            `;
            container.appendChild(item);
        });

        document.querySelectorAll('.process-btn').forEach(button => {
            button.addEventListener('click', function() {
                const patientId = this.getAttribute('data-id');
                selectPrescriptionForBilling(patientId);
            });
        });
    }

    document.getElementById('fetchPendingBtn').addEventListener('click', function() {
        const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        const pendingPrescriptions = prescriptions.filter(p => p.status === 'Pending');
        loadAndRenderPrescriptions('pendingPrescriptionsContainer', pendingPrescriptions);
    });

    document.getElementById('searchPrescriptionBtn').addEventListener('click', function() {
        const patientId = document.getElementById('searchPatientId').value.trim().toUpperCase();
        if (!patientId) {
            alert("Please enter a Patient ID to search.");
            return;
        }
        
        const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        const filteredPrescriptions = prescriptions.filter(p => 
            p.patientId.toUpperCase() === patientId && p.status === 'Pending'
        );
        
        loadAndRenderPrescriptions('pendingPrescriptionsContainer', filteredPrescriptions);
    });

    function selectPrescriptionForBilling(patientId) {
        const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        const p = prescriptions.find(p => p.patientId === patientId && p.status === 'Pending');
        
        if (!p) {
            alert("Prescription not found or already processed.");
            return;
        }

        currentPrescription = p;
        
        document.getElementById('billToken').textContent = p.token;
        document.getElementById('billName').textContent = p.patientName;
        document.getElementById('billDoctor').textContent = `Dr. ${p.doctorName}`;

        const stockItem = currentStock.find(s => s.name.toLowerCase() === p.medName.toLowerCase());
        
        if (!stockItem) {
            alert(`Error: Medicine "${p.medName}" not found in stock. Please add it to inventory.`);
            resetBillingArea();
            return;
        }
        
        const pricePerUnit = parseFloat(stockItem.price);
        const quantity = parseFloat(p.dose) * parseFloat(p.duration); 
        const subtotal = (pricePerUnit * quantity).toFixed(2);
        
        if (quantity > stockItem.qty) {
            alert(`Error: Insufficient stock for ${p.medName}. Needed: ${quantity}, Available: ${stockItem.qty}.`);
            resetBillingArea();
            return;
        }

        const billingTableBody = document.querySelector('#billingTable tbody');
        billingTableBody.innerHTML = `
            <tr>
                <td>${p.medName}</td>
                <td>${p.dosageText || p.dose + ' per day'}</td>
                <td>${quantity}</td>
                <td>Rs.${pricePerUnit.toFixed(2)}</td>
                <td>Rs.${subtotal}</td>
            </tr>
        `;
        
        const gst = (subtotal * 0.05).toFixed(2);
        const grandTotal = (parseFloat(subtotal) + parseFloat(gst)).toFixed(2);

        document.getElementById('subtotalDisplay').textContent = subtotal;
        document.getElementById('gstDisplay').textContent = gst;
        document.getElementById('grandTotalDisplay').textContent = grandTotal;

        document.getElementById('processPaymentBtn').disabled = false;
        document.getElementById('printInvoiceBtn').disabled = true;
    }
    
    function resetBillingArea() {
        document.getElementById('billToken').textContent = 'N/A';
        document.getElementById('billName').textContent = 'N/A';
        document.getElementById('billDoctor').textContent = 'N/A';
        document.querySelector('#billingTable tbody').innerHTML = '';
        document.getElementById('subtotalDisplay').textContent = '0.00';
        document.getElementById('gstDisplay').textContent = '0.00';
        document.getElementById('grandTotalDisplay').textContent = '0.00';
        document.getElementById('processPaymentBtn').disabled = true;
        document.getElementById('printInvoiceBtn').disabled = true;
        currentPrescription = null;
    }

    // Process Payment
    document.getElementById('processPaymentBtn').addEventListener('click', function() {
        if (!currentPrescription) return;

        const medName = currentPrescription.medName;
        const totalQuantityDispensed = parseFloat(document.querySelector('#billingTable tbody tr td:nth-child(3)').textContent);
        
        const stockIndex = currentStock.findIndex(s => s.name.toLowerCase() === medName.toLowerCase());
        
        if (stockIndex !== -1) {
            currentStock[stockIndex].qty -= totalQuantityDispensed;
            if (currentStock[stockIndex].qty < 0) currentStock[stockIndex].qty = 0; 

            localStorage.setItem('pharmacyStock', JSON.stringify(currentStock));
            renderStockTable(); 
        }

        let prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        const index = prescriptions.findIndex(p => p.patientId === currentPrescription.patientId && p.status === 'Pending');
        
        if (index !== -1) {
            prescriptions[index].status = 'Processed';
            localStorage.setItem('prescriptions', JSON.stringify(prescriptions));
        }

        alert(`Payment of Rs.${document.getElementById('grandTotalDisplay').textContent} processed for ${currentPrescription.patientName}. Stock updated.`);

        loadAndRenderPrescriptions('pendingPrescriptionsContainer', prescriptions.filter(p => p.status === 'Pending'));
        document.getElementById('processPaymentBtn').disabled = true;
        document.getElementById('printInvoiceBtn').disabled = false;
        
        sessionStorage.setItem('lastInvoice', JSON.stringify({
            name: currentPrescription.patientName,
            patientId: currentPrescription.patientId, // Added patientId here
            token: currentPrescription.token,
            doctor: currentPrescription.doctorName,
            items: document.querySelector('#billingTable tbody').innerHTML,
            total: document.getElementById('grandTotalDisplay').textContent
        }));
        currentPrescription = null;
    });

    // --- LOGOUT FUNCTIONALITY ---
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.clear();
            window.location.href = '../LOGIN/login.html';
        }
    });

    // --- PRINT INVOICE FUNCTIONALITY ---
    document.getElementById('printInvoiceBtn').addEventListener('click', function() {
        const invoiceData = JSON.parse(sessionStorage.getItem('lastInvoice'));

        if (!invoiceData) {
            return alert("No recent invoice available to print. Please process a payment first.");
        }
        
        const printContent = `
            <html>
            <head>
                <title>Invoice - ${invoiceData.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12pt; }
                    .invoice-box { width: 100%; max-width: 600px; margin: auto; border: 1px solid #333; padding: 20px; box-sizing: border-box; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header img { height: 50px; }
                    .details p { margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
                    .invoice-totals p { text-align: right; margin: 5px 0; }
                    .invoice-totals .grand-total { font-size: 16pt; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <h2>Faith Hospital Pharmacy Invoice</h2>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div class="details">
                        <p><strong>Patient Name:</strong> ${invoiceData.name}</p>
                        <p><strong>Patient ID:</strong> ${invoiceData.patientId}</p> 
                        <p><strong>Token ID:</strong> ${invoiceData.token}</p>
                        <p><strong>Prescribing Doctor:</strong> Dr. ${invoiceData.doctor}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr><th>Item Name</th><th>Dosage</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
                        </thead>
                        <tbody>
                            ${invoiceData.items}
                        </tbody>
                    </table>
                    
                    <div class="invoice-totals">
                        <p>SUBTOTAL: Rs.${document.getElementById('subtotalDisplay').textContent}</p>
                        <p>GST (5%): Rs.${document.getElementById('gstDisplay').textContent}</p>
                        <p class="grand-total">GRAND TOTAL: Rs.${invoiceData.total}</p>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        document.getElementById('printInvoiceBtn').disabled = true;
        resetBillingArea();
    });

    // --- INITIAL SETUP ---
    renderStockTable(); 
    document.getElementById('fetchPendingBtn').click(); // Load pending prescriptions on page load
});