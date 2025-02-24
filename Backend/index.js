const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const cron = require('node-cron'); // Dùng để lên lịch tự động
const { 
  searchInDatabase, 
  updateProductQuantity,getConnectionPool
} = require('./connect');
const { 
  createUserTableIfNotExists,
  storeUserAction, 
  syncUserHistoryWithDatabase ,saveUserHistoryToJSON
} = require('./user');
const { getNameList } = require('./utils/excelUtils');
const jsonRequestPath = path.join(__dirname, 'request_data.json');

const app = express();
const port = 3333;

const allowedOrigins = [
  'https://frontend-warehouse.vercel.app',
  'https://frontend-warehouse-tranthanhtins-projects.vercel.app',
  'http://localhost:3000',
  'https://tranthanhtin-stc4594.github.io/',
  'http://192.168.50.29:3000',
  'http://192.168.1.8:3000',
  'http://192.168.50.254:3000',
  'http://192.168.50.69:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Tạo bảng người dùng nếu chưa tồn tại
createUserTableIfNotExists().catch(err => {
  console.error('Error creating UserProductData table:', err);
});

// Gọi hàm syncUserHistoryFromJSON khi server khởi động
syncUserHistoryWithDatabase().then(() => {
  console.log('User history synced successfully at server start.');
}).catch(err => {
  console.error('Error syncing user history on server start:', err);
});
// Trang chủ
app.get('/', (req, res) => {
  res.send('Welcome to the BackEnd Warehouse API');
});
// API để kiểm tra kết nối cơ sở dữ liệu
app.get('/api/init-database-connection', async (req, res) => {
  try {
    // Gọi hàm để lấy connection pool
    const pool = await getConnectionPool();

    // Thực hiện một truy vấn đơn giản để kiểm tra kết nối
    await pool.request().query('SELECT 1 AS result'); 

    // Nếu truy vấn thành công, gửi phản hồi thành công
    res.status(200).json({ message: 'Kết nối tới database thành công!' });
  } catch (error) {
    // Nếu có lỗi, ghi log và trả về lỗi
    console.error('Lỗi khi kết nối tới cơ sở dữ liệu:', error.message);
    res.status(500).json({ message: 'Không thể kết nối tới database.' });
  }
});
// Lưu dữ liệu sản phẩm của người dùng
app.post('/api/save-product-data', async (req, res) => {
  const { userName, productName, quantity } = req.body;

  try {
    const rowsAffected = await saveUserProductData(userName, productName, quantity);
    res.status(200).json({ message: 'Data saved successfully', rowsAffected });
  } catch (error) {
    console.error('Error saving product data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Tìm kiếm sản phẩm theo keyword và parameter
app.get('/api/search', async (req, res) => {
  let { keyword = '', parameter = '' } = req.query;

  keyword = typeof keyword === 'string' ? keyword.trim() : '';
  parameter = typeof parameter === 'string' ? parameter.trim() : '';

  try {
    const results = await searchInDatabase(keyword, parameter);
    res.json({ filteredData: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy danh sách tên người dùng từ file Excel
app.get('/api/get-names', async (req, res) => {
  try {
    const nameList = await getNameList();
    res.json(nameList);
  } catch (error) {
    console.error('Error getting names:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Gợi ý từ khóa sản phẩm
app.get('/api/suggestions', async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ message: 'Keyword is required' });
  }

  try {
    const results = await searchInDatabase(keyword, '');

    const suggestions = results
      .map(item => item.TenSanPham)
      .filter(item => item && item.toUpperCase().includes(keyword.toUpperCase()))
      .filter((item, index, self) => self.indexOf(item) === index)
      .sort();

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cập nhật số lượng sản phẩm và lưu dữ liệu người dùng
app.post('/api/update-quantity', async (req, res) => {
  const { id, quantity, userName } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!id || !quantity || !userName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Cập nhật số lượng sản phẩm trong cơ sở dữ liệu
    const updatedItem = await updateProductQuantity(id, quantity);
    console.log('Product quantity updated:', updatedItem);

    // Ghi lại hành động của người dùng
    try {
      await storeUserAction(id, userName, quantity);
      console.log('User action stored successfully.');
    } catch (err) {
      console.error('Error saving user action to database, saving to JSON:', err);
      await saveUserHistoryToJSON(id, userName, quantity);
      console.log('User action saved to JSON.');
    }

    // Dọn dẹp các yêu cầu đã hoàn thành sau khi cập nhật thành công
    try {
      console.log('Calling cleanUpCompletedRequests...');
      await cleanUpCompletedRequests(); // Gọi hàm dọn dẹp
      console.log('Completed requests have been cleaned up.');
    } catch (cleanUpError) {
      console.error('Error cleaning up completed requests:', cleanUpError);
    }

    // Trả về phản hồi thành công
    res.status(200).json({ message: 'Product quantity updated, user action logged, and requests cleaned up', updatedItem });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Lưu thông tin sản phẩm người dùng
app.post('/api/save-user-product', async (req, res) => {
  const { userName, productName, quantity } = req.body;

  if (!userName || !productName || !quantity) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await saveUserProductData(userName, productName, quantity);
    await storeUserAction(productName, userName, quantity);
    res.status(200).json({ message: 'User product data saved successfully', result });
  } catch (error) {
    console.error('Save user product data error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Function to clean up completed entries in request_data.json
async function cleanUpCompletedRequests() {
  try {
    const requestData = await fs.readFile(jsonRequestPath, 'utf8');
    const requests = JSON.parse(requestData);

    // Nếu không có yêu cầu nào hoặc tất cả đều là "completed", không cần thay đổi
    if (!requests || requests.length === 0) {
      console.log('No requests found in the file.');
      return;
    }

    // Lọc bỏ các yêu cầu "completed"
    const pendingRequests = requests.filter(request => request.status?.toLowerCase() !== 'completed');

    // Nếu không có gì thay đổi, không cần ghi lại
    if (pendingRequests.length === requests.length) {
      console.log('No completed requests were found.');
      return;
    }

    // Ghi lại các yêu cầu còn lại vào file
    await fs.writeFile(jsonRequestPath, JSON.stringify(pendingRequests, null, 2), 'utf8');
    console.log('Cleaned up completed requests from request_data.json');
  } catch (error) {
    console.error('Error cleaning up completed requests:', error.message);
  }
}
// Schedule the cron job to run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled task: syncing user history from JSON to database');
  try {
    // Sync user history to the database
    await syncUserHistoryWithDatabase();
    console.log('User history synced successfully');
    
    // Clean up completed requests after syncing
    await cleanUpCompletedRequests();
  } catch (error) {
    console.error('Error syncing user history from JSON to database:', error);
  }
});

// Bắt lỗi toàn cục
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Lắng nghe kết nối
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);

  try {
    // Gọi hàm cleanup khi khởi động server
    await cleanUpCompletedRequests();
    console.log('Cleaned up completed requests during server startup.');
  } catch (error) {
    console.error('Error cleaning up completed requests during server startup:', error.message);
  }
});

module.exports = app;