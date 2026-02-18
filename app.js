// ========================================
// GLOBAL VARIABLES
// ========================================
let inventoryData = [];
let deleteItemId = null;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    // Load user info
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (user) {
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('userName').textContent = user.name;
    }

    // Initialize app
    loadInventory();
    setupEventListeners();
});

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Menu navigation
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            navigateTo(page);
            
            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('sidebarOverlay').classList.remove('show');
            }
        });
    });

    // Mobile sidebar toggle
    document.getElementById('hamburger').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    });

    document.getElementById('sidebarOverlay').addEventListener('click', function() {
        document.getElementById('sidebar').classList.remove('active');
        this.classList.remove('show');
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', updateInventoryTable);
    
    // Filter dropdown
    document.getElementById('exportFilter').addEventListener('change', updateInventoryTable);

    // Export buttons
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('exportPdf').addEventListener('click', exportToPdf);

    // Import button
    const importExcelBtn = document.getElementById('importExcelBtn');
    const importFileInput = document.getElementById('importFileInput');
    if (importExcelBtn && importFileInput) {
        importExcelBtn.addEventListener('click', function() {
            importFileInput.click();
        });
        importFileInput.addEventListener('change', handleImportFile);
    }

    // History page event listeners
    const historySearchInput = document.getElementById('historySearchInput');
    if (historySearchInput) {
        historySearchInput.addEventListener('input', renderHistoryTable);
    }
    const historyActionFilter = document.getElementById('historyActionFilter');
    if (historyActionFilter) {
        historyActionFilter.addEventListener('change', renderHistoryTable);
    }
    const historyItemFilter = document.getElementById('historyItemFilter');
    if (historyItemFilter) {
        historyItemFilter.addEventListener('change', renderHistoryTable);
    }
    const exportHistoryExcelBtn = document.getElementById('exportHistoryExcel');
    if (exportHistoryExcelBtn) {
        exportHistoryExcelBtn.addEventListener('click', exportHistoryToExcel);
    }
    const exportHistoryPdfBtn = document.getElementById('exportHistoryPdf');
    if (exportHistoryPdfBtn) {
        exportHistoryPdfBtn.addEventListener('click', exportHistoryToPdf);
    }

    // Initialize sortable columns
    initSortableColumns();

    // Inventory form
    document.getElementById('inventoryForm').addEventListener('submit', handleInventorySubmit);

    // Print QR button
    document.getElementById('printQrBtn').addEventListener('click', printQRCode);

    // Set today's date
    document.getElementById('itemDate').valueAsDate = new Date();

    // Close modal when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// ========================================
// AUTHENTICATION
// ========================================
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ========================================
// NAVIGATION
// ========================================
function navigateTo(page) {
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Update page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(page + 'Page').classList.add('active');

    // Update title
    const pageTitles = {
        'dashboard': 'Dashboard',
        'inventory': 'Inventory',
        'input': 'Input Inventaris',
        'scan': 'Cek Inventaris',
        'history': 'History'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page];

    // Update content
    if (page === 'dashboard') {
        updateDashboard();
    } else if (page === 'inventory') {
        updateInventoryTable();
    } else if (page === 'scan') {
        initScanPage();
    } else if (page === 'history') {
        loadHistory();
    }
}

// ========================================
// API FUNCTIONS
// ========================================
async function loadInventory() {
    try {
        const response = await fetch('/api/inventory');
        inventoryData = await response.json();
        updateDashboard();
        updateInventoryTable();
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Gagal memuat data inventaris!', true);
    }
}

async function addInventory(item) {
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        const data = await response.json();
        if (data.success) {
            inventoryData.push(data.item);
            updateDashboard();
            updateInventoryTable();
            return data.item;
        }
    } catch (error) {
        console.error('Error adding inventory:', error);
        showToast('Gagal menambahkan item!', true);
    }
    return null;
}

async function updateInventoryItem(id, updatedItem) {
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedItem)
        });
        
        const data = await response.json();
        if (data.success) {
            const index = inventoryData.findIndex(item => item.id === id);
            if (index !== -1) {
                inventoryData[index] = data.item;
            }
            updateDashboard();
            updateInventoryTable();
            return true;
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        showToast('Gagal memperbarui item!', true);
    }
    return false;
}

async function deleteInventoryItem(id) {
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            inventoryData = inventoryData.filter(item => item.id !== id);
            updateDashboard();
            updateInventoryTable();
            return true;
        }
    } catch (error) {
        console.error('Error deleting inventory:', error);
        showToast('Gagal menghapus item!', true);
    }
    return false;
}

// ========================================
// DASHBOARD
// ========================================
function updateDashboard() {
    // Calculate stats
    const total = inventoryData.length;
    const monitors = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'monitor').length;
    const keyboards = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'keyboard').length;
    const mice = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'mouse').length;
    const headsets = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'headset').length;

    document.getElementById('totalItems').textContent = total;
    document.getElementById('totalMonitors').textContent = monitors;
    document.getElementById('totalKeyboards').textContent = keyboards;
    document.getElementById('totalMice').textContent = mice;
    document.getElementById('totalHeadsets').textContent = headsets;

    // Update recent activity
    const recentTableBody = document.getElementById('recentTableBody');
    const recentItems = inventoryData.slice(-5).reverse();
    
    if (recentItems.length === 0) {
        recentTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-secondary);">Belum ada aktivitas</td></tr>';
    } else {
        recentTableBody.innerHTML = recentItems.map((item, index) => `
            <tr>
                <td>${item.name || '-'}</td>
                <td>${item.merk || '-'}</td>
                <td>${item.sn || '-'}</td>
                <td>${item.lokasi || '-'}</td>
                <td>${item.kondisiBefore || '-'}</td>
                <td>${item.checklist || '-'}</td>
                <td>${item.kondisiAfter || '-'}</td>
                <td>${item.catatan || '-'}</td>
                <td>${item.date || '-'}</td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
            </tr>
        `).join('');
    }
}

// ========================================
// INVENTORY TABLE
// ========================================
function updateInventoryTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterSelect = document.getElementById('exportFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    let filtered = inventoryData.filter(item => {
        // Apply name filter
        if (filterValue !== 'all' && item.name !== filterValue) {
            return false;
        }
        
        const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) || 
                            (item.merk && item.merk.toLowerCase().includes(search)) ||
                            (item.sn && item.sn.toLowerCase().includes(search)) ||
                            (item.lokasi && item.lokasi.toLowerCase().includes(search));
        return matchesSearch;
    });

    const tableBody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = filtered.map((item, index) => `
            <tr>
                <td>${item.name || '-'}</td>
                <td>${item.merk || '-'}</td>
                <td>${item.sn || '-'}</td>
                <td>${item.lokasi || '-'}</td>
                <td>${item.kondisiBefore || '-'}</td>
                <td>${item.checklist || '-'}</td>
                <td>${item.kondisiAfter || '-'}</td>
                <td>${item.catatan || '-'}</td>
                <td>${item.tanggalMasuk || '-'}</td>
                <td>${item.date || '-'}</td>
                <td>
                    <img src="${item.qrCode || ''}" alt="QR" class="qr-thumbnail" onclick="viewItem('${item.id}')" style="display: ${item.qrCode ? 'block' : 'none'}">
                </td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewItem('${item.id}')" title="Lihat">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editItem('${item.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// ========================================
// INPUT INVENTORY
// ========================================
async function handleInventorySubmit(e) {
    e.preventDefault();

    const newItem = {
        name: document.getElementById('itemName').value,
        merk: document.getElementById('itemMerk').value,
        sn: document.getElementById('itemSn').value,
        lokasi: document.getElementById('itemLocation').value,
        kondisiBefore: document.getElementById('itemKondisiBefore').value,
        checklist: document.getElementById('itemChecklist').value,
        kondisiAfter: document.getElementById('itemKondisiAfter').value,
        catatan: document.getElementById('itemCatatan').value,
        tanggalMasuk: document.getElementById('itemTanggalMasuk').value,
        date: document.getElementById('itemDate').value,
        qrCode: ''
    };

    // First save to server to get the ID
    const savedItem = await addInventory(newItem);

    if (savedItem) {
        // Now generate QR code with the correct ID
        const qrData = JSON.stringify({
            id: savedItem.id,
            name: savedItem.name,
            merk: savedItem.merk,
            sn: savedItem.sn,
            lokasi: savedItem.lokasi
        });

        // Clear previous QR code
        const qrcodeDiv = document.getElementById('qrcode');
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        qrcodeDiv.innerHTML = '';
        qrcodeDiv.style.display = 'block';
        qrPlaceholder.style.display = 'none';

        // Generate new QR code with correct ID
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Get QR code as data URL and update on server
        setTimeout(() => {
            const canvas = qrcodeDiv.querySelector('canvas');
            if (canvas) {
                savedItem.qrCode = canvas.toDataURL('image/png');
                updateInventoryItem(savedItem.id, { qrCode: savedItem.qrCode });
            } else {
                const img = qrcodeDiv.querySelector('img');
                if (img) {
                    savedItem.qrCode = img.src;
                    updateInventoryItem(savedItem.id, { qrCode: savedItem.qrCode });
                }
            }
        }, 100);

        // Update UI
        document.getElementById('qrInfo').style.display = 'block';
        document.getElementById('qrItemName').textContent = savedItem.name;
        document.getElementById('qrItemId').textContent = 'ID: ' + savedItem.id;
        document.getElementById('printQrBtn').classList.add('show');

        showToast('Item berhasil ditambahkan!');
        document.getElementById('inventoryForm').reset();
        document.getElementById('itemDate').valueAsDate = new Date();
    }
}

function printQRCode() {
    const qrcodeDiv = document.getElementById('qrcode');
    const qrImage = qrcodeDiv.querySelector('canvas') || qrcodeDiv.querySelector('img');
    
    if (qrImage) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Code</title>
                    <style>
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0;
                            font-family: Arial, sans-serif;
                        }
                        .qr-container { 
                            text-align: center; 
                        }
                        img { 
                            width: 200px; 
                            height: 200px; 
                        }
                        .item-id { 
                            margin-top: 10px; 
                            font-size: 18px; 
                            font-weight: bold; 
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        <img src="${qrImage.src}" />
                        <div class="item-id">${document.getElementById('qrItemId').textContent}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function viewItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;
    
    // Store current item ID for print
    window.currentViewItemId = id;
    
    document.getElementById('viewItemName').textContent = item.name || '-';
    document.getElementById('viewMerk').textContent = item.merk || '-';
    document.getElementById('viewSn').textContent = item.sn || '-';
    document.getElementById('viewLocation').textContent = item.lokasi || '-';
    document.getElementById('viewKondisiBefore').textContent = item.kondisiBefore || '-';
    document.getElementById('viewChecklist').textContent = item.checklist || '-';
    document.getElementById('viewKondisiAfter').textContent = item.kondisiAfter || '-';
    document.getElementById('viewCatatan').textContent = item.catatan || '-';
    document.getElementById('viewItemDate').textContent = formatDate(item.date);

    // Generate QR in modal
    const modalQr = document.getElementById('modal-qrcode');
    modalQr.innerHTML = '';
    if (item.qrCode) {
        const img = document.createElement('img');
        img.src = item.qrCode;
        img.alt = 'QR Code';
        modalQr.appendChild(img);
    }

    document.getElementById('viewModal').classList.add('show');
}

// Print Barcode Function
function printBarcode() {
    const id = window.currentViewItemId;
    if (!id) return;
    
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcode - ${item.id}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                }
                .qrcode-img {
                    width: 180px;
                    height: 180px;
                    margin: 20px 0;
                }
                .item-info {
                    margin-top: 15px;
                    font-size: 14px;
                }
                .item-id {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="item-id">${item.id}</div>
            <img class="qrcode-img" src="${item.qrCode || ''}" alt="QR Code" onerror="this.style.display='none'">
            <div class="item-info">
                <strong>${item.name || '-'}</strong><br>
                ${item.merk || '-'} | ${item.sn || '-'}
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function editItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editMerk').value = item.merk || '';
    document.getElementById('editSn').value = item.sn || '';
    document.getElementById('editLocation').value = item.lokasi || '';
    document.getElementById('editKondisiBefore').value = item.kondisiBefore || 'Baik';
    document.getElementById('editChecklist').value = item.checklist || 'Tidak';
    document.getElementById('editKondisiAfter').value = item.kondisiAfter || 'Baik';
    document.getElementById('editCatatan').value = item.catatan || '';
    document.getElementById('editTanggalMasuk').value = item.tanggalMasuk || item.date || '';
    document.getElementById('editItemDate').value = item.date || '';

    document.getElementById('editModal').classList.add('show');
}

async function saveEdit() {
    const id = document.getElementById('editItemId').value;
    const updatedItem = {
        name: document.getElementById('editItemName').value,
        merk: document.getElementById('editMerk').value,
        sn: document.getElementById('editSn').value,
        lokasi: document.getElementById('editLocation').value,
        kondisiBefore: document.getElementById('editKondisiBefore').value,
        checklist: document.getElementById('editChecklist').value,
        kondisiAfter: document.getElementById('editKondisiAfter').value,
        catatan: document.getElementById('editCatatan').value,
        tanggalMasuk: document.getElementById('editTanggalMasuk').value,
        date: document.getElementById('editItemDate').value
    };

    // Generate QR code if item doesn't have one
    const currentItem = inventoryData.find(i => i.id === id);
    if (!currentItem || !currentItem.qrCode) {
        const qrData = JSON.stringify({
            id: id,
            name: updatedItem.name,
            merk: updatedItem.merk,
            sn: updatedItem.sn,
            lokasi: updatedItem.lokasi
        });

        // Generate QR code
        const qrContainer = document.createElement('div');
        new QRCode(qrContainer, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QR code to generate
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = qrContainer.querySelector('canvas');
        if (canvas) {
            updatedItem.qrCode = canvas.toDataURL('image/png');
        } else {
            const img = qrContainer.querySelector('img');
            if (img) {
                updatedItem.qrCode = img.src;
            }
        }
    }

    const success = await updateInventoryItem(id, updatedItem);

    if (success) {
        closeModal('editModal');
        showToast('Item berhasil diperbarui! QR Code telah digenerate.');
    }
}

function deleteItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    deleteItemId = id;
    document.getElementById('deleteItemName').textContent = item.name;
    document.getElementById('deleteModal').classList.add('show');
}

async function confirmDelete() {
    if (deleteItemId) {
        const success = await deleteInventoryItem(deleteItemId);
        
        if (success) {
            deleteItemId = null;
            closeModal('deleteModal');
            showToast('Item berhasil dihapus!');
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
async function exportToExcel() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';
    
    // Filter data based on selection
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name && item.name.toLowerCase() === filterValue.toLowerCase());
    }

    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    showToast('Sedang menyiapkan file Excel...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Add headers
    const headers = ['ID', 'QR Code', 'Nama Barang', 'Merk', 'SN', 'Lokasi', 'Kondisi (Before)', 'Checklist', 'Kondisi (After)', 'Catatan', 'Tanggal'];
    const headerRow = worksheet.addRow(headers);
    
    // Style header
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF037A89' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set column widths
    worksheet.columns = [
        { width: 12 }, // ID
        { width: 15 }, // QR Code
        { width: 20 }, // Nama Barang
        { width: 15 }, // Merk
        { width: 20 }, // SN
        { width: 20 }, // Lokasi
        { width: 18 }, // Kondisi (Before)
        { width: 12 }, // Checklist
        { width: 18 }, // Kondisi (After)
        { width: 25 }, // Catatan
        { width: 15 }  // Tanggal
    ];

    // Add data
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const rowIndex = i + 2; // +1 for 1-based index, +1 for header
        
        const rowData = [
            item.id,
            '', // Placeholder for QR code
            item.name,
            item.merk,
            item.sn,
            item.lokasi,
            item.kondisiBefore,
            item.checklist,
            item.kondisiAfter,
            item.catatan,
            formatDate(item.date)
        ];
        
        const row = worksheet.addRow(rowData);
        row.height = 80; // Make row tall enough for image
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Add QR code image if exists
        if (item.qrCode) {
            try {
                let base64Data;
                if (item.qrCode.startsWith('data:image')) {
                    // Strip the data URI prefix to get raw base64
                    base64Data = item.qrCode.split(',')[1];
                } else {
                    // It's a URL path, need to fetch it
                    const response = await fetch(item.qrCode);
                    const blob = await response.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    base64Data = dataUrl.split(',')[1];
                }

                const imageId = workbook.addImage({
                    base64: base64Data,
                    extension: 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 1, row: rowIndex - 1 },
                    br: { col: 2, row: rowIndex },
                    editAs: 'oneCell'
                });
            } catch (error) {
                console.error('Error adding image to Excel:', error);
            }
        }
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const filterText = filterValue === 'all' ? 'Semua' : filterValue;
    anchor.download = `Inventory_${filterText}_${formatDate(new Date())}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Berhasil export ke Excel dengan QR Code!');
}

function exportToPdf() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';
    
    // Filter data based on selection
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name && item.name.toLowerCase() === filterValue.toLowerCase());
    }

    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title - Centered
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = 'LAPORAN INVENTORY KANTOR';
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, (pageWidth - titleWidth) / 2, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const filterLabel = `Filter: ${filterValue === 'all' ? 'Semua Data' : filterValue}`;
    const filterLabelWidth = doc.getTextWidth(filterLabel);
    doc.text(filterLabel, (pageWidth - filterLabelWidth) / 2, 30);
    
    const dateText = `Tanggal: ${formatDate(new Date())}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 36);

    // Table
    const tableData = filteredData.map(item => [
        item.id || '-',
        item.name || '-',
        item.merk || '-',
        item.sn || '-',
        item.lokasi || '-',
        item.kondisiBefore || '-',
        item.checklist || '-',
        item.kondisiAfter || '-'
    ]);

    doc.autoTable({
        head: [['ID', 'Nama', 'Merk', 'SN', 'Lokasi', 'Kondisi(B)', 'Checklist', 'Kondisi(A)']],
        body: tableData,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, overflow: 'wrap', halign: 'center', valign: 'middle' },
        headStyles: { 
            fillColor: [3, 122, 137],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: { halign: 'center' },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        margin: { left: 10, right: 30 },
        columnStyles: {
            0: { cellWidth: 18, minCellHeight: 8 },
            1: { cellWidth: 30, minCellHeight: 8 },
            2: { cellWidth: 22, minCellHeight: 8 },
            3: { cellWidth: 35, minCellHeight: 8 },
            4: { cellWidth: 25, minCellHeight: 8 },
            5: { cellWidth: 30, minCellHeight: 8 },
            6: { cellWidth: 18, minCellHeight: 8 },
            7: { cellWidth: 15, minCellHeight: 8 }
        }
    });

    const filterText = filterValue === 'all' ? 'Semua' : filterValue;
    doc.save(`Inventory_${filterText}_${formatDate(new Date())}.pdf`);
    
    showToast('Berhasil export ke PDF!');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.toggle('error', isError);
    toast.querySelector('i').className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// SCAN/CHECK INVENTORY FUNCTIONS
// ========================================
let checkedItems = {};
let html5QrcodeScanner = null;

function initScanPage() {
    loadCheckedItems();
    renderScanTable();
    updateScanStats();
    
    // Set up scan input
    const scanInput = document.getElementById('scanInput');
    const scanBtn = document.getElementById('scanBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const resetBtn = document.getElementById('resetCheckBtn');
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    const exportExcelBtn = document.getElementById('exportCheckExcelBtn');
    const exportPdfBtn = document.getElementById('exportCheckPdfBtn');
    
    if (scanBtn) {
        scanBtn.addEventListener('click', performScan);
    }
    
    if (scanInput) {
        scanInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performScan();
            }
        });
        scanInput.focus();
    }
    
    // Camera button
    if (cameraBtn) {
        cameraBtn.addEventListener('click', toggleCamera);
    }
    
    // Close scanner button
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopCamera);
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin mereset semua checklist?')) {
                checkedItems = {};
                saveCheckedItems();
                renderScanTable();
                updateScanStats();
                showToast('Checklist telah direset');
            }
        });
    }
    
    // Export buttons
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportChecklistToExcel);
    }
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportChecklistToPdf);
    }
    
    // Scan filter dropdown
    const scanFilter = document.getElementById('scanFilter');
    if (scanFilter) {
        scanFilter.addEventListener('change', function() {
            renderScanTable();
            updateScanStats();
        });
    }
}

function toggleCamera() {
    const scannerContainer = document.getElementById('scannerContainer');
    const scanInput = document.getElementById('scanInput');
    
    if (scannerContainer.style.display === 'none') {
        scannerContainer.style.display = 'block';
        startCamera();
    } else {
        stopCamera();
    }
}

function startCamera() {
    if (html5QrcodeScanner) {
        return;
    }
    
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Error starting camera:", err);
        showToast('Gagal mengakses kamera!', true);
    });
}

function stopCamera() {
    const scannerContainer = document.getElementById('scannerContainer');
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner = null;
            scannerContainer.style.display = 'none';
        }).catch(err => {
            console.error("Error stopping camera:", err);
            html5QrcodeScanner = null;
            scannerContainer.style.display = 'none';
        });
    } else {
        scannerContainer.style.display = 'none';
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Handle the scanned code
    const scanInput = document.getElementById('scanInput');
    
    // Parse JSON if QR contains data like {"id":"INV-001","name":"monitor",...}
    let searchId = decodedText;
    try {
        const parsed = JSON.parse(decodedText);
        // Extract ID from JSON object
        searchId = parsed.id || decodedText;
    } catch(e) {
        // Not JSON, use as-is
        searchId = decodedText;
    }
    
    scanInput.value = searchId;
    performScan();
    stopCamera();
}

function onScanFailure(error) {
    // Handle scan failure, usually better to ignore and keep scanning
}

function performScan() {
    const scanInput = document.getElementById('scanInput');
    const searchValue = scanInput.value.trim().toUpperCase();
    
    if (!searchValue) {
        showToast('Mohon masukkan ID atau barcode', true);
        return;
    }
    
    // Find item by ID (INV-001, INV-002, etc) or by SN
    const item = inventoryData.find(i => 
        (i.id && i.id.toUpperCase() === searchValue) ||
        (i.sn && i.sn.toUpperCase().includes(searchValue))
    );
    
    if (item) {
        const alreadyChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        
        // Mark as checked
        checkedItems[item.id] = {
            checked: true,
            checkTime: new Date().toISOString()
        };
        saveCheckedItems();
        renderScanTable();
        updateScanStats();
        scanInput.value = '';
        scanInput.focus();

        // Show scan result popup
        showScanResultPopup(item, alreadyChecked);
    } else {
        showToast('Barang tidak ditemukan!', true);
    }
}

function showScanResultPopup(item, isDuplicate) {
    const header = document.getElementById('scanResultHeader');
    const title = document.getElementById('scanResultTitle');
    const statusDiv = document.getElementById('scanResultStatus');
    const tableBody = document.getElementById('scanResultTableBody');

    // Set header style based on first scan or duplicate
    header.className = 'modal-header ' + (isDuplicate ? 'header-duplicate' : 'header-new');
    title.textContent = isDuplicate ? '⚠ Barang Sudah Pernah Dicek' : '✓ Berhasil Dicek';

    // Set status message
    if (isDuplicate) {
        statusDiv.className = 'scan-result-status-duplicate';
        statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Barang ini sudah pernah discan sebelumnya!';
    } else {
        statusDiv.className = 'scan-result-status-new';
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Barang berhasil dicek untuk pertama kali.';
    }

    // Build table with item data
    tableBody.innerHTML = `
        <tr><td>ID</td><td>${item.id || '-'}</td></tr>
        <tr><td>Nama Barang</td><td>${item.name || '-'}</td></tr>
        <tr><td>Merk</td><td>${item.merk || '-'}</td></tr>
        <tr><td>SN</td><td>${item.sn || '-'}</td></tr>
        <tr><td>Lokasi</td><td>${item.lokasi || '-'}</td></tr>
        <tr><td>Kondisi (Before)</td><td>${item.kondisiBefore || '-'}</td></tr>
        <tr><td>Checklist</td><td>${item.checklist || '-'}</td></tr>
        <tr><td>Kondisi (After)</td><td>${item.kondisiAfter || '-'}</td></tr>
        <tr><td>Catatan</td><td>${item.catatan || '-'}</td></tr>
        <tr><td>Tanggal</td><td>${formatDate(item.date)}</td></tr>
        <tr><td>Waktu Dicek</td><td>${formatDateTime(new Date().toISOString())}</td></tr>
    `;

    // Show modal
    document.getElementById('scanResultModal').classList.add('show');
}

function renderScanTable() {
    const tableBody = document.getElementById('scanTableBody');
    if (!tableBody) return;
    
    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    // Filter inventory data
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data inventaris</td></tr>';
        return;
    }
    
    tableBody.innerHTML = filteredData.map(item => {
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        const rowClass = isChecked ? 'scan-item-checked' : '';
        const statusIcon = isChecked ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : '<i class="fas fa-circle" style="color: #dc3545;"></i>';
        const statusText = isChecked ? 'Sudah Dicek' : 'Belum Dicek';
        
        return `
            <tr class="${rowClass}" data-id="${item.id}">
                <td>${statusIcon}</td>
                <td>${item.id || '-'}</td>
                <td>${item.name || '-'}</td>
                <td>${item.merk || '-'}</td>
                <td>${item.sn || '-'}</td>
                <td>${item.lokasi || '-'}</td>
                <td>${checkTime ? formatDateTime(checkTime) : '-'}</td>
            </tr>
        `;
    }).join('');
}

function updateScanStats() {
    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    // Filter inventory data for stats
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }
    
    const total = filteredData.length;
    let checked = 0;
    
    filteredData.forEach(item => {
        if (checkedItems[item.id] && checkedItems[item.id].checked) {
            checked++;
        }
    });
    
    const unchecked = total - checked;
    
    document.getElementById('totalToCheck').textContent = total;
    document.getElementById('totalChecked').textContent = checked;
    document.getElementById('totalUnchecked').textContent = unchecked;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function loadCheckedItems() {
    const saved = localStorage.getItem('checkedItems');
    if (saved) {
        checkedItems = JSON.parse(saved);
    }
}

function saveCheckedItems() {
    localStorage.setItem('checkedItems', JSON.stringify(checkedItems));
}

// Export checklist to Excel
async function exportChecklistToExcel() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    // Filter inventory data
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }
    
    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    showToast('Sedang menyiapkan file Excel...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cek Inventaris');

    // Add headers
    const headers = ['Status', 'ID', 'QR Code', 'Nama Barang', 'Merk', 'SN', 'Lokasi', 'Waktu Cek'];
    const headerRow = worksheet.addRow(headers);
    
    // Style header
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF037A89' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set column widths
    worksheet.columns = [
        { width: 15 }, // Status
        { width: 12 }, // ID
        { width: 15 }, // QR Code
        { width: 20 }, // Nama Barang
        { width: 15 }, // Merk
        { width: 20 }, // SN
        { width: 20 }, // Lokasi
        { width: 20 }  // Waktu Cek
    ];

    // Add data
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const rowIndex = i + 2;
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        
        const rowData = [
            isChecked ? 'Sudah Dicek' : 'Belum Dicek',
            item.id,
            '', // QR Code placeholder
            item.name,
            item.merk,
            item.sn,
            item.lokasi,
            checkTime ? formatDateTime(checkTime) : '-'
        ];
        
        const row = worksheet.addRow(rowData);
        row.height = 80;
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (cell.value === 'Sudah Dicek') {
                cell.font = { color: { argb: 'FF28A745' }, bold: true };
            } else if (cell.value === 'Belum Dicek') {
                cell.font = { color: { argb: 'FFDC3545' }, bold: true };
            }
        });

        // Add QR code image
        if (item.qrCode) {
            try {
                let base64Image;
                if (item.qrCode.startsWith('data:image')) {
                    base64Image = item.qrCode;
                } else {
                    const response = await fetch(item.qrCode);
                    const blob = await response.blob();
                    base64Image = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }

                const imageId = workbook.addImage({
                    base64: base64Image,
                    extension: 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 2, row: rowIndex - 1 },
                    ext: { width: 100, height: 100 },
                    editAs: 'oneCell'
                });
            } catch (error) {
                console.error('Error adding image to Excel:', error);
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Cek_Inventaris_${formatDate(new Date())}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Berhasil export checklist ke Excel!');
}

// Export checklist to PDF
function exportChecklistToPdf() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    // Filter inventory data
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }
    
    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title - Centered
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = 'LAPORAN CEK INVENTARIS';
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, (pageWidth - titleWidth) / 2, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateText = `Tanggal: ${formatDate(new Date())}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 30);

    // Table
    const tableData = filteredData.map(item => {
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        
        return [
            item.id || '-',
            item.name || '-',
            item.merk || '-',
            item.sn || '-',
            item.lokasi || '-',
            checkTime ? formatDateTime(checkTime) : '-',
            isChecked ? '✓' : '✗'
        ];
    });

    doc.autoTable({
        head: [['ID', 'Nama', 'Merk', 'SN', 'Lokasi', 'Waktu Cek', 'Status']],
        body: tableData,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, overflow: 'wrap', halign: 'center', valign: 'middle' },
        headStyles: { 
            fillColor: [3, 122, 137],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: { halign: 'center' },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        margin: 20,
        columnStyles: {
            0: { cellWidth: 18, minCellHeight: 8 },
            1: { cellWidth: 30, minCellHeight: 8 },
            2: { cellWidth: 22, minCellHeight: 8 },
            3: { cellWidth: 35, minCellHeight: 8 },
            4: { cellWidth: 25, minCellHeight: 8 },
            5: { cellWidth: 30, minCellHeight: 8 },
            6: { cellWidth: 15, minCellHeight: 8, halign: 'center' }
        }
    });

    doc.save(`Cek_Inventaris_${formatDate(new Date())}.pdf`);
    
    showToast('Berhasil export checklist ke PDF!');
}

// ========================================
// HISTORY FUNCTIONS
// ========================================
let historyData = [];

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        historyData = await response.json();
        renderHistoryTable();
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('Gagal memuat data history!', true);
    }
}

function renderHistoryTable() {
    const tableBody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');
    if (!tableBody) return;

    const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        if (search) {
            const matchesSearch = 
                (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                (h.itemMerk && h.itemMerk.toLowerCase().includes(search)) ||
                (h.itemSn && h.itemSn.toLowerCase().includes(search)) ||
                (h.itemLokasi && h.itemLokasi.toLowerCase().includes(search)) ||
                (h.details && h.details.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = filtered.map(h => {
            const actionClass = h.action.toLowerCase();
            const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
            return `
                <tr>
                    <td><span class="history-action-badge ${actionClass}">${actionLabel}</span></td>
                    <td>${h.itemId || '-'}</td>
                    <td>${h.itemName || '-'}</td>
                    <td>${h.itemMerk || '-'}</td>
                    <td>${h.itemSn || '-'}</td>
                    <td>${h.itemLokasi || '-'}</td>
                    <td>${h.details || '-'}</td>
                    <td>${h.timestamp ? formatDateTime(h.timestamp) : '-'}</td>
                </tr>
            `;
        }).join('');
    }
}

async function exportHistoryToExcel() {
    if (historyData.length === 0) {
        showToast('Tidak ada data history untuk diexport!', true);
        return;
    }

    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        return true;
    });

    if (filtered.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('History');

    const headers = ['Aksi', 'ID Item', 'Nama Barang', 'Merk', 'SN', 'Lokasi', 'Detail', 'Waktu'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF037A89' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.columns = [
        { width: 12 }, { width: 12 }, { width: 20 }, { width: 15 },
        { width: 20 }, { width: 20 }, { width: 35 }, { width: 22 }
    ];

    filtered.forEach(h => {
        const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
        const row = worksheet.addRow([
            actionLabel, h.itemId || '-', h.itemName || '-', h.itemMerk || '-',
            h.itemSn || '-', h.itemLokasi || '-', h.details || '-',
            h.timestamp ? formatDateTime(h.timestamp) : '-'
        ]);
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `History_${formatDate(new Date())}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast('Berhasil export history ke Excel!');
}

function exportHistoryToPdf() {
    if (historyData.length === 0) {
        showToast('Tidak ada data history untuk diexport!', true);
        return;
    }

    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        return true;
    });

    if (filtered.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = 'HISTORY INVENTARIS';
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, (pageWidth - titleWidth) / 2, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateText = `Tanggal: ${formatDate(new Date())}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 30);

    const tableData = filtered.map(h => {
        const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
        return [
            actionLabel, h.itemId || '-', h.itemName || '-', h.itemMerk || '-',
            h.itemSn || '-', h.itemLokasi || '-', h.details || '-',
            h.timestamp ? formatDateTime(h.timestamp) : '-'
        ];
    });

    doc.autoTable({
        head: [['Aksi', 'ID Item', 'Nama', 'Merk', 'SN', 'Lokasi', 'Detail', 'Waktu']],
        body: tableData,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, overflow: 'wrap', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [3, 122, 137], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center' },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        margin: 15
    });

    doc.save(`History_${formatDate(new Date())}.pdf`);
    showToast('Berhasil export history ke PDF!');
}

// ========================================
// SORTABLE TABLE COLUMNS
// ========================================
let sortState = {};

function initSortableColumns() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const table = this.closest('table');
            const tableId = table.id;
            const sortKey = this.dataset.sort;

            // Toggle sort direction
            if (!sortState[tableId]) sortState[tableId] = {};
            if (sortState[tableId].key === sortKey) {
                sortState[tableId].dir = sortState[tableId].dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState[tableId] = { key: sortKey, dir: 'asc' };
            }

            // Update header icons
            table.querySelectorAll('.sortable').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            this.classList.add(sortState[tableId].dir === 'asc' ? 'sort-asc' : 'sort-desc');

            // Sort and re-render based on table
            if (tableId === 'inventoryTable') {
                sortAndRenderInventory();
            } else if (tableId === 'scanTable') {
                sortAndRenderScan();
            } else if (tableId === 'historyTable') {
                sortAndRenderHistory();
            }
        });
    });
}

function sortData(data, key, dir) {
    return [...data].sort((a, b) => {
        let valA = a[key] || '';
        let valB = b[key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

function sortAndRenderInventory() {
    const state = sortState['inventoryTable'];
    if (!state) return;

    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';

    let filtered = inventoryData.filter(item => {
        if (filterValue !== 'all' && item.name !== filterValue) return false;
        const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) ||
                            (item.merk && item.merk.toLowerCase().includes(search)) ||
                            (item.sn && item.sn.toLowerCase().includes(search)) ||
                            (item.lokasi && item.lokasi.toLowerCase().includes(search));
        return matchesSearch;
    });

    filtered = sortData(filtered, state.key, state.dir);

    const tableBody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = filtered.map(item => `
            <tr>
                <td>${item.name || '-'}</td>
                <td>${item.merk || '-'}</td>
                <td>${item.sn || '-'}</td>
                <td>${item.lokasi || '-'}</td>
                <td>${item.kondisiBefore || '-'}</td>
                <td>${item.checklist || '-'}</td>
                <td>${item.kondisiAfter || '-'}</td>
                <td>${item.catatan || '-'}</td>
                <td>${item.tanggalMasuk || '-'}</td>
                <td>${item.date || '-'}</td>
                <td>
                    <img src="${item.qrCode || ''}" alt="QR" class="qr-thumbnail" onclick="viewItem('${item.id}')" style="display: ${item.qrCode ? 'block' : 'none'}">
                </td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewItem('${item.id}')" title="Lihat">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editItem('${item.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function sortAndRenderScan() {
    const state = sortState['scanTable'];
    if (!state) return;

    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }

    // Add sort-friendly properties
    let sortableData = filteredData.map(item => {
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        return { ...item, status: isChecked ? 'checked' : 'unchecked', checkTime: checkTime || '' };
    });

    sortableData = sortData(sortableData, state.key, state.dir);

    const tableBody = document.getElementById('scanTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = sortableData.map(item => {
        const isChecked = item.status === 'checked';
        const rowClass = isChecked ? 'scan-item-checked' : '';
        const statusIcon = isChecked ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : '<i class="fas fa-circle" style="color: #dc3545;"></i>';
        const statusText = isChecked ? 'Sudah Dicek' : 'Belum Dicek';

        return `
            <tr class="${rowClass}" data-id="${item.id}">
                <td>${statusIcon}</td>
                <td>${item.id || '-'}</td>
                <td>${item.name || '-'}</td>
                <td>${item.merk || '-'}</td>
                <td>${item.sn || '-'}</td>
                <td>${item.lokasi || '-'}</td>
                <td>${item.checkTime ? formatDateTime(item.checkTime) : '-'}</td>
            </tr>
        `;
    }).join('');
}

function sortAndRenderHistory() {
    const state = sortState['historyTable'];
    if (!state) return;

    const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        if (search) {
            const matchesSearch =
                (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                (h.details && h.details.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    filtered = sortData(filtered, state.key, state.dir);

    const tableBody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = filtered.map(h => {
            const actionClass = h.action.toLowerCase();
            const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
            return `
                <tr>
                    <td><span class="history-action-badge ${actionClass}">${actionLabel}</span></td>
                    <td>${h.itemId || '-'}</td>
                    <td>${h.itemName || '-'}</td>
                    <td>${h.itemMerk || '-'}</td>
                    <td>${h.itemSn || '-'}</td>
                    <td>${h.itemLokasi || '-'}</td>
                    <td>${h.details || '-'}</td>
                    <td>${h.timestamp ? formatDateTime(h.timestamp) : '-'}</td>
                </tr>
            `;
        }).join('');
    }
}

// ========================================
// IMPORT FUNCTIONS
// ========================================
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        showToast('Format file tidak didukung! Gunakan file Excel (.xlsx, .xls) atau CSV.', true);
        return;
    }

    showToast('Memproses file...');

    try {
        const data = await readExcelFile(file);
        if (!data || data.length === 0) {
            showToast('File kosong atau tidak valid!', true);
            return;
        }

        // Map Excel columns to inventory fields
        const items = data.map((row, index) => {
            // Handle various column name formats
            const name = row['Nama Barang'] || row['name'] || row['Name'] || row['NAMA BARANG'] || '';
            const merk = row['Merk'] || row['merk'] || row['MERK'] || '';
            const sn = row['SN'] || row['sn'] || row['SN'] || row['Serial Number'] || '';
            const lokasi = row['Lokasi'] || row['lokasi'] || row['LOKASI'] || '';
            const kondisiBefore = row['Kondisi (Before)'] || row['kondisiBefore'] || row['Kondisi Before'] || 'Baik';
            const checklist = row['Checklist'] || row['checklist'] || row['CHECKLIST'] || 'Tidak';
            const kondisiAfter = row['Kondisi (After)'] || row['kondisiAfter'] || row['Kondisi After'] || '';
            const catatan = row['Catatan'] || row['catatan'] || row['CATATAN'] || '';
            const date = row['Tanggal'] || row['date'] || row['Tanggal'] || new Date().toISOString().split('T')[0];

            if (!name) return null;

            return {
                name: String(name),
                merk: String(merk || ''),
                sn: String(sn || ''),
                lokasi: String(lokasi || ''),
                kondisiBefore: String(kondisiBefore),
                checklist: String(checklist),
                kondisiAfter: String(kondisiAfter || ''),
                catatan: String(catatan || ''),
                date: date
            };
        }).filter(item => item !== null);

        if (items.length === 0) {
            showToast('Tidak ada data yang valid ditemukan dalam file!', true);
            return;
        }

        // Send to server for bulk import
        const response = await fetch('/api/inventory/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Berhasil import ${result.count} item!`);
            loadInventory();
        } else {
            showToast('Gagal import: ' + (result.message || 'Unknown error'), true);
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('Error saat memproses file: ' + error.message, true);
    }

    // Reset file input
    event.target.value = '';
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
