const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');


// Cấu hình kết nối tới SQL Server
const config = {
    user: 'kan',
    password: 'Az01257352Za@',
    server: 'kanamiao.database.windows.net',
    database: 'warehousesasi',
    options: {
        encrypt: true,  // Bắt buộc cho Azure SQL
        enableArithAbort: true,
        keepAlive: true,  // Giữ kết nối sống
        keepAliveInterval: 3600000  // Khoảng thời gian giữ kết nối (1 giờ)
    }
};

// Đường dẫn tới các file JSON
const jsonDBPath = path.join(__dirname, 'db_data.json');
const jsonRequestPath = path.join(__dirname, 'request_data.json');

// Tạo một Connection Pool duy nhất khi ứng dụng khởi động
let pool;

// Hàm khởi tạo kết nối đến database và đồng bộ dữ liệu JSON
async function initializeConnectionPool() {
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
        try {
            pool = await sql.connect(config);
            console.log("Connected to the database");

            // Đồng bộ lại file JSON database với cơ sở dữ liệu
            await reloadDatabaseToJSON();

            // Xử lý các yêu cầu tạm thời đã lưu trong file JSON request
            await processJsonRequests();

            break;
        } catch (err) {
            retries++;
            console.error(`Connection attempt ${retries} failed:`, err.message);

            if (retries >= maxRetries) {
                throw new Error('Failed to connect to the database after several attempts');
            }

            console.log(`Retrying to connect in 5 seconds...`);
            await new Promise(res => setTimeout(res, 5000)); // Đợi 5 giây trước khi thử lại
        }
    }
}

// Hàm lấy kết nối từ pool
async function getConnectionPool() {
    if (!pool || !pool.connected) {
        console.log('Reinitializing connection pool...');
        await initializeConnectionPool(); // Tạo lại pool nếu chưa có hoặc bị mất kết nối
    }
    return pool;
}

// Hàm đọc dữ liệu từ file JSON database tạm thời
async function readDatabaseJSON() {
    const filePath = jsonDBPath; // jsonDBPath đã được khai báo là db_data.json

    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data); // Trả về dữ liệu JSON đã được parse
    } catch (error) {
        console.error('Failed to read JSON database file:', error.message);
        throw new Error('Failed to read the JSON database.');
    }
}

// Hàm ghi dữ liệu vào file JSON database
async function writeDatabaseJSON(dbData) {
    await fs.writeFile(jsonDBPath, JSON.stringify(dbData, null, 2), 'utf8');
}

// Hàm đọc dữ liệu từ file JSON lưu yêu cầu của người dùng
async function readRequestJSON() {
    try {
        const data = await fs.readFile(jsonRequestPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('File request_data.json not found, fetching data from the server...');
            
            const fetchedData = await fetchDataFromServer(); // Tải dữ liệu từ SQL Server
            await writeRequestJSON(fetchedData); // Ghi dữ liệu vào file JSON
            return fetchedData;
        } else {
            throw err;
        }
    }
}

// Hàm ghi yêu cầu vào file JSON request
async function writeRequestJSON(requests) {
    await fs.writeFile(jsonRequestPath, JSON.stringify(requests, null, 2), 'utf8');
}

// Hàm tải dữ liệu từ SQL Server
async function fetchDataFromServer() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`
            SELECT ID, [Tên_sản_phẩm], [Mã_sản_phẩm], [Số_lượng_sản_phẩm]
            FROM [Done-2]
        `);
        
        const fetchedData = result.recordset.map(item => ({
            id: item.ID,
            productId: item.ID,
            quantity: item['Số_lượng_sản_phẩm'],
            status: 'completed'
        }));
        
        console.log('Fetched data from server:', fetchedData);
        return fetchedData;
    } catch (error) {
        console.error('Error fetching data from server:', error.message);
        throw new Error('Failed to fetch data from server');
    }
}

// Hàm tìm kiếm trong file JSON database tạm thời
async function searchInDatabase(keyword) {
    try {
        const dbData = await readDatabaseJSON(); // Đọc dữ liệu từ file JSON database
        const normalizedKeyword = normalizeString(keyword);

        // Nếu keyword rỗng hoặc chỉ chứa khoảng trắng, trả về toàn bộ dữ liệu
        if (!normalizedKeyword) {
            console.log('Keyword is empty, returning all data from JSON.');
            return Object.values(dbData);
        }

        const filteredData = Object.values(dbData).filter(item => {
            const productName = item.TenSanPham ? item.TenSanPham.toUpperCase() : '';
            return productName.includes(normalizedKeyword);
        });

        if (filteredData.length > 0) {
            console.log(`Found data in local JSON database for keyword: ${normalizedKeyword}`);
            return filteredData;
        } else {
            console.log(`No data found in local JSON for keyword: ${normalizedKeyword}`);
            return [];
        }
    } catch (error) {
        console.error('Error while searching in JSON database:', error.message);
        throw new Error('Failed to search in the JSON database.');
    }
}

// Hàm thêm yêu cầu của người dùng vào file JSON request
async function addUserRequest(productId, quantity) {
    try {
        const requests = await readRequestJSON();

        const newRequest = {
            id: requests.length + 1,
            productId: productId,
            quantity: quantity,
            status: 'pending'  // Đánh dấu là chưa xử lý
        };

        requests.push(newRequest);
        await writeRequestJSON(requests);
        console.log(`Added new request to update product ${productId}`);
    } catch (error) {
        console.error('Error adding user request:', error.message);
        throw new Error('Failed to add user request to JSON.');
    }
}

// Hàm xử lý các yêu cầu trong file JSON request sau khi kết nối lại với database
// Gọi hàm đồng bộ hóa lịch sử người dùng sau khi xử lý request JSON
async function processJsonRequests() {
    try {
        const requests = await readRequestJSON();
        const pool = await getConnectionPool();

        for (const request of requests) {
            if (request.status === 'pending') {
                const { productId, quantity } = request;

                // Cập nhật số lượng sản phẩm trong cơ sở dữ liệu
                const result = await pool.request()
                    .input('id', sql.Int, productId)
                    .input('quantity', sql.Int, quantity)
                    .query(`
                        UPDATE [Done-2]
                        SET [Số_lượng_sản_phẩm] = [Số_lượng_sản_phẩm] - @quantity
                        WHERE [ID] = @id
                    `);

                if (result.rowsAffected[0] > 0) {
                    request.status = 'completed'; // Đánh dấu đã hoàn thành
                    console.log(`Successfully processed request for product ID: ${productId}`);
                } else {
                    console.log(`Failed to process request for product ID: ${productId}`);
                }
            }
        }

        // Đảm bảo rằng hàm syncUserHistoryWithDatabase được gọi đúng cách
        console.log('Synchronized user history after processing JSON requests.');
        
    } catch (error) {
        console.error('Error processing JSON requests:', error.message);
    }
}

// Hàm đồng bộ lại dữ liệu từ database SQL sang file JSON
async function reloadDatabaseToJSON() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`
            SELECT ID, [Tên_sản_phẩm], [Mã_sản_phẩm], [Thông_số_sản_phẩm], [Vị_trí], [Số_lượng_sản_phẩm]
            FROM [Done-2]
        `);

        const dbData = {};
        result.recordset.forEach(item => {
            dbData[item.ID] = {
                ID: item.ID,
                TenSanPham: item['Tên_sản_phẩm'],
                MaSanPham: item['Mã_sản_phẩm'],
                ThongSoSanPham: item['Thông_số_sản_phẩm'],
                ViTri: item['Vị_trí'],
                SoLuongSanPham: item['Số_lượng_sản_phẩm']
            };
        });

        await writeDatabaseJSON(dbData); // Ghi lại dữ liệu vào file JSON database
        console.log('Database has been synced to local JSON file.');
    } catch (error) {
        console.error('Error reloading database to JSON:', error.message);
        throw new Error('Failed to sync database to JSON.');
    }
}

// Hàm cập nhật dữ liệu sản phẩm trong cơ sở dữ liệu và file JSON
async function updateProductQuantity(id, quantity) {
    try {
        const dbData = await readDatabaseJSON();

        if (!dbData[id]) {
            throw new Error(`Product with ID ${id} not found in local JSON`);
        }

        dbData[id].SoLuongSanPham -= quantity;

        await writeDatabaseJSON(dbData); // Cập nhật lại dữ liệu vào file JSON database
        console.log(`Updated product quantity in local JSON for product ID: ${id}`);

        await addUserRequest(id, quantity); // Thêm yêu cầu vào file request JSON
    } catch (error) {
        console.error('Error updating product quantity:', error.message);
        throw new Error('Failed to update product quantity in JSON.');
    }
}

// Hàm chuẩn hóa chuỗi
function normalizeString(str) {
    return str ? str.trim().toUpperCase() : '';
}

module.exports = {
    searchInDatabase,
    updateProductQuantity,
    initializeConnectionPool,
    reloadDatabaseToJSON,
    processJsonRequests,
    getConnectionPool
};
