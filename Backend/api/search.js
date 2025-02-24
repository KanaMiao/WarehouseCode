import { searchInDatabase } from '../utils/excelUtils';

export default function handler(req, res) {
  const { keyword, parameter } = req.query;

  const results = searchInDatabase(keyword, parameter);

  res.status(200).json({
    suggestions: results.map(result => result['Mã sản phẩm']),
    filteredData: results,
  });
}