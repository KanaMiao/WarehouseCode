const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Hàm phân tích dữ liệu từ sheet "Name" trong Excel
function parseNameData(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Name';
    
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Sheet '${sheetName}' không tồn tại trong tệp Excel`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      throw new Error(`Sheet '${sheetName}' trống`);
    }
    return jsonData.map(item => item['Tên người dùng']);
  } catch (error) {
    console.error('Lỗi khi đọc sheet Name từ tệp Excel:', error.message);
    throw new Error('Không thể đọc dữ liệu tên từ tệp Excel');
  }
}

// Hàm lấy danh sách tên người dùng từ file Excel
function getNameList() {
  const filePath = path.join(__dirname, '../uploads/Done-2.xlsx');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at ${filePath}`);
  }

  return parseNameData(filePath);
}

module.exports = {
  getNameList
};