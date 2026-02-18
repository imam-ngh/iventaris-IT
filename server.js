const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.use('/barcode', express.static(path.join(__dirname, 'barcode')));

// Helper to map DB columns to JSON properties
function mapInventory(row) {
    return {
        id: row.id,
        no: row.no,
        name: row.name,
        merk: row.merk,
        sn: row.sn,
        lokasi: row.lokasi,
        kondisiBefore: row.kondisi_before,
        checklist: row.checklist,
        kondisiAfter: row.kondisi_after,
        catatan: row.catatan,
        tanggalMasuk: row.tanggal_masuk ? row.tanggal_masuk.toISOString().split('T')[0] : null,
        date: row.date ? row.date.toISOString().split('T')[0] : null,
        qrCode: row.qr_code,
        createdAt: row.created_at
    };
}

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query(
            'SELECT id, username, name FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ success: true, message: 'Login successful', user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM inventory ORDER BY no ASC');
        res.json(result.rows.map(mapInventory));
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Add inventory item
app.post('/api/inventory', async (req, res) => {
    const newItem = req.body;
    
    try {
        // Generate ID
        const maxIdResult = await db.query('SELECT MAX(no) as max_no FROM inventory');
        const maxNo = maxIdResult.rows[0].max_no || 0;
        const nextNo = maxNo + 1;
        const id = `INV-${String(nextNo).padStart(3, '0')}`;
        
        newItem.id = id;
        newItem.no = nextNo;
        newItem.createdAt = new Date().toISOString();
        
        // Set default values
        newItem.kondisiBefore = newItem.kondisiBefore || '';
        newItem.checklist = newItem.checklist || 'Tidak';
        newItem.kondisiAfter = newItem.kondisiAfter || '';
        newItem.catatan = newItem.catatan || '';
        
        // Save QR code image to file if exists
        if (newItem.qrCode && newItem.qrCode.startsWith('data:image/png;base64,')) {
            const base64Data = newItem.qrCode.replace(/^data:image\/png;base64,/, '');
            const barcodeDir = path.join(__dirname, 'barcode');
            
            if (!fs.existsSync(barcodeDir)) {
                fs.mkdirSync(barcodeDir, { recursive: true });
            }
            
            const barcodePath = path.join(barcodeDir, `${id}.png`);
            fs.writeFileSync(barcodePath, base64Data, 'base64');
            newItem.qrCode = `/barcode/${id}.png`;
        }
        
        await db.query(
            `INSERT INTO inventory (id, no, name, merk, sn, lokasi, kondisi_before, checklist, kondisi_after, catatan, tanggal_masuk, date, qr_code, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                newItem.id, newItem.no, newItem.name, newItem.merk, newItem.sn, newItem.lokasi,
                newItem.kondisiBefore, newItem.checklist, newItem.kondisiAfter, newItem.catatan,
                newItem.tanggalMasuk || newItem.date, newItem.date, newItem.qrCode, newItem.createdAt
            ]
        );
        
        // Log history
        await logHistory('CREATE', newItem, `Menambahkan item baru: ${newItem.name} (${newItem.id})`);
        
        res.json({ success: true, item: newItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Update inventory item
app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    try {
        const result = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        
        const currentItem = result.rows[0];
        const updated = {
            name: updateData.name || currentItem.name,
            merk: updateData.merk || currentItem.merk,
            sn: updateData.sn || currentItem.sn,
            lokasi: updateData.lokasi || currentItem.lokasi,
            kondisi_before: updateData.kondisiBefore || currentItem.kondisi_before,
            checklist: updateData.checklist || currentItem.checklist,
            kondisi_after: updateData.kondisiAfter || currentItem.kondisi_after,
            catatan: updateData.catatan || currentItem.catatan,
            tanggal_masuk: updateData.tanggalMasuk || currentItem.tanggal_masuk,
            date: updateData.date || currentItem.date,
            qr_code: updateData.qrCode || currentItem.qr_code
        };

        await db.query(
            `UPDATE inventory SET
                name = $1, merk = $2, sn = $3, lokasi = $4, kondisi_before = $5,
                checklist = $6, kondisi_after = $7, catatan = $8, tanggal_masuk = $9, date = $10, qr_code = $11
             WHERE id = $12`,
            [
                updated.name, updated.merk, updated.sn, updated.lokasi, updated.kondisi_before,
                updated.checklist, updated.kondisi_after, updated.catatan, updated.tanggal_masuk, updated.date, updated.qr_code,
                id
            ]
        );
        
        const finalResult = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
        const finalItem = mapInventory(finalResult.rows[0]);
        
        // Log history
        await logHistory('UPDATE', finalItem, `Memperbarui item: ${finalItem.name} (${id})`);
        
        res.json({ success: true, item: finalItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Get item before deleting for history
        const itemResult = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);

        const result = await db.query('DELETE FROM inventory WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            // Log history
            if (itemResult.rows.length > 0) {
                const deletedItem = mapInventory(itemResult.rows[0]);
                await logHistory('DELETE', deletedItem, `Menghapus item: ${deletedItem.name} (${id})`);
            }
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Helper to parse Indonesian date format
function parseIndonesianDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Try to parse Indonesian format: "13 Februari 2026" or "14 Feb 2026"
    const months = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'mei': '05', 'jun': '06', 'jul': '07', 'agu': '08', 'agt': '08',
        'sep': '09', 'okt': '10', 'nov': '11', 'des': '12'
    };
    
    const parts = dateStr.toLowerCase().trim().split(' ');
    if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
}

// Bulk import inventory items
app.post('/api/inventory/import', async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items to import' });
    }

    try {
        // Get current max no
        const maxIdResult = await db.query('SELECT MAX(no) as max_no FROM inventory');
        let currentMaxNo = maxIdResult.rows[0].max_no || 0;

        let importedCount = 0;
        for (const item of items) {
            currentMaxNo++;
            const id = `INV-${String(currentMaxNo).padStart(3, '0')}`;
            const createdAt = new Date().toISOString();

            // Set defaults
            const name = item.name || '';
            const merk = item.merk || '';
            const sn = item.sn || '';
            const lokasi = item.lokasi || '';
            const kondisiBefore = item.kondisiBefore || item.kondisi_before || 'Baik';
            const checklist = item.checklist || 'Tidak';
            const kondisiAfter = item.kondisiAfter || item.kondisi_after || '';
            const catatan = item.catatan || '';
            const tanggalMasuk = parseIndonesianDate(item.tanggalMasuk || item.date);
            const date = parseIndonesianDate(item.date);

            if (!name) continue;

            // Generate QR code data (not image yet - will be generated on edit)
            const qrCodeData = JSON.stringify({
                id: id,
                name: name,
                merk: merk,
                sn: sn,
                lokasi: lokasi
            });

            await db.query(
                `INSERT INTO inventory (id, no, name, merk, sn, lokasi, kondisi_before, checklist, kondisi_after, catatan, tanggal_masuk, date, qr_code, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [id, currentMaxNo, name, merk, sn, lokasi, kondisiBefore, checklist, kondisiAfter, catatan, tanggalMasuk, date, '', createdAt]
            );

            // Log history for each imported item
            await logHistory('CREATE', { id, name, merk, sn, lokasi }, `Mengimpor item: ${name} (${id}) - QR belum digenerate, please edit to generate`);
            importedCount++;
        }

        res.json({ success: true, count: importedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalResult = await db.query('SELECT COUNT(*) FROM inventory');
        const monitorsResult = await db.query("SELECT COUNT(*) FROM inventory WHERE LOWER(name) = 'monitor'");
        const keyboardsResult = await db.query("SELECT COUNT(*) FROM inventory WHERE LOWER(name) = 'keyboard'");
        const miceResult = await db.query("SELECT COUNT(*) FROM inventory WHERE LOWER(name) = 'mouse'");
        
        const stats = {
            total: parseInt(totalResult.rows[0].count),
            monitors: parseInt(monitorsResult.rows[0].count),
            keyboards: parseInt(keyboardsResult.rows[0].count),
            mice: parseInt(miceResult.rows[0].count)
        };
        
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// ========================================
// HISTORY ENDPOINTS
// ========================================

// Create history table on startup and add columns if not exist
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS history (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                item_id TEXT,
                item_name TEXT,
                item_merk TEXT,
                item_sn TEXT,
                item_lokasi TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add tanggal_masuk column to inventory if not exists
        await db.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tanggal_masuk DATE;
        `);
        console.log('History table ready and inventory columns checked');
    } catch (err) {
        console.error('Error creating history table:', err);
    }
})();

// Helper to log history
async function logHistory(action, item, details) {
    try {
        await db.query(
            `INSERT INTO history (action, item_id, item_name, item_merk, item_sn, item_lokasi, details, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [action, item.id || null, item.name || null, item.merk || null, item.sn || null, item.lokasi || null, details || '']
        );
    } catch (err) {
        console.error('Error logging history:', err);
    }
}

// Get all history
app.get('/api/history', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM history ORDER BY timestamp DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            action: row.action,
            itemId: row.item_id,
            itemName: row.item_name,
            itemMerk: row.item_merk,
            itemSn: row.item_sn,
            itemLokasi: row.item_lokasi,
            details: row.details,
            timestamp: row.timestamp
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Static routes
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
