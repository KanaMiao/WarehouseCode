const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Dummy function to simulate saving data to a database
function saveUserProductData(userName, productName, quantity) {
  const data = { userName, productName, quantity };
  const filePath = path.join(__dirname, 'data', 'userProductData.json');

  let fileData = [];
  if (fs.existsSync(filePath)) {
    fileData = JSON.parse(fs.readFileSync(filePath));
  }

  fileData.push(data);
  fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
}

module.exports = {
  searchInDatabase,
  updateDataInDatabase,
  saveDataToDatabase,
  updateProductQuantity,
  saveUserProductData,
};