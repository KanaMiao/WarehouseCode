const fs = require('fs').promises;
const path = require('path');
const { getConnectionPool } = require('./connect'); // SQL Server connection
const sql = require('mssql');
const moment = require('moment-timezone');

// Path to the temporary JSON file
const jsonHistoryPath = path.join(__dirname, 'user_history_temp.json');

// Function to create the "UserProductData" table if it doesn't exist
async function createUserTableIfNotExists() {
    const pool = await getConnectionPool();
    try {
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'UserProductData'
            )
            BEGIN
                CREATE TABLE UserProductData (
                    [ID] INT IDENTITY(1,1) PRIMARY KEY,
                    [Tên người dùng] NVARCHAR(255),
                    [Tên sản phẩm] NVARCHAR(255),
                    [Số lượng sản phẩm] INT,
                    [Thời gian] DATETIME
                );
            END
        `);
        console.log('Table "UserProductData" is ready in the database.');
    } catch (err) {
        console.error('Failed to create UserProductData table:', err);
        throw new Error('Failed to create table');
    }
}

// Validate input data before saving
function validateUserData(id, userName, quantity) {
    if (!id || !userName || !quantity) {
        throw new Error('Invalid input data: Product ID, user name, and quantity are required.');
    }
}

// Function to process the product retrieval without waiting for database
async function processProductRetrieval(id, userName, quantity) {
    try {
        // Thực hiện lệnh lấy sản phẩm ngay lập tức
        console.log(`User ${userName} is retrieving ${quantity} units of product ID ${id}.`);

        // Bắt đầu quá trình lưu trữ vào cơ sở dữ liệu hoặc JSON trong nền
        storeUserAction(id, userName, quantity);
        
    } catch (err) {
        console.error('Error processing product retrieval:', err);
    }
}

// Function to store the user action asynchronously
async function storeUserAction(id, userName, quantity) {
    try {
        // Validate the input data
        validateUserData(id, userName, quantity);

        const pool = await getConnectionPool();

        // Query to get the product name and code from the "Done-2" table
        const productResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT [Tên_sản_phẩm]
                FROM [Done-2]
                WHERE [ID] = @id
            `);

        if (productResult.recordset.length === 0) {
            throw new Error(`Product with ID ${id} not found`);
        }

        const productName = productResult.recordset[0]['Tên_sản_phẩm'];

        // Get current time (GMT+7)
        const formattedTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

        // Save the product action immediately to the database
        await pool.request()
            .input('userName', sql.NVarChar, userName)
            .input('productName', sql.NVarChar, productName)
            .input('quantity', sql.Int, quantity)
            .input('time', sql.DateTime, formattedTime)
            .query(`
                INSERT INTO UserProductData ([Tên người dùng], [Tên sản phẩm], [Số lượng sản phẩm], [Thời gian])
                VALUES (@userName, @productName, @quantity, @time)
            `);

        console.log(`Stored user action for ${userName} successfully in the database.`);
    } catch (err) {
        console.error('Error storing user action in the database:', err);

        // If unable to save to the database, store it in the JSON file temporarily
        await saveUserHistoryToJSON(id, userName, quantity);
    }
}

// Function to save user history to a temporary JSON file
async function saveUserHistoryToJSON(id, userName, quantity) {
    try {
        let userHistory = [];
        try {
            const data = await fs.readFile(jsonHistoryPath, 'utf8');
            userHistory = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }

        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        userHistory.push({
            id,
            userName,
            quantity,
            time: now
        });

        await fs.writeFile(jsonHistoryPath, JSON.stringify(userHistory, null, 2), 'utf8');
        console.log('User history saved to JSON file.');
    } catch (error) {
        console.error('Failed to save user history to JSON:', error.message);
    }
}

// Automatically sync user history every hour
setInterval(async () => {
    try {
        await syncUserHistoryWithDatabase();
    } catch (error) {
        console.error('Failed to sync user history on schedule:', error.message);
    }
}, 3600000); // 1 hour

// Hàm xử lý đồng bộ dữ liệu từ file JSON lên cơ sở dữ liệu (sync)
async function syncUserHistoryWithDatabase() {
    try {
      console.log('Reading user history from JSON...');
      const data = await fs.readFile(jsonHistoryPath, 'utf8');
      const userHistory = JSON.parse(data);
  
      console.log('Connecting to database...');
      const pool = await getConnectionPool();
  
      for (const record of userHistory) {
        const { id, userName, quantity, time } = record;
        console.log(`Processing record: ID=${id}, userName=${userName}`);
  
        const productResult = await pool.request()
          .input('id', sql.Int, id)
          .query(`
            SELECT [Tên_sản_phẩm]
            FROM [Done-2]
            WHERE [ID] = @id
          `);
  
        if (productResult.recordset.length > 0) {
          const productName = productResult.recordset[0]['Tên_sản_phẩm'];
          console.log(`Product found: ${productName}`);
  
          await pool.request()
            .input('userName', sql.NVarChar, userName)
            .input('productName', sql.NVarChar, productName)
            .input('quantity', sql.Int, quantity)
            .input('time', sql.DateTime, time)
            .query(`
              INSERT INTO UserProductData ([Tên người dùng], [Tên sản phẩm],[Số lượng sản phẩm], [Thời gian])
              VALUES (@userName, @productName, @quantity, @time)
            `);
          console.log(`Synchronized user history for product ID ${id}`);
        } else {
          console.log(`Product with ID ${id} not found.`);
        }
      }
  
      console.log('Deleting user history JSON after successful sync...');
      await fs.unlink(jsonHistoryPath);
      console.log('User history JSON file deleted.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('No user history to sync.');
      } else {
        console.error('Error syncing user history to database:', error.message);
      }
    }
  }

module.exports = {
    createUserTableIfNotExists,
    processProductRetrieval,  // Hàm này thực hiện lệnh lấy sản phẩm
    storeUserAction,          // Hàm này xử lý lưu trữ
    syncUserHistoryWithDatabase,saveUserHistoryToJSON
};