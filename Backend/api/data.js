import { updateDataInDatabase, searchInDatabase } from '../utils/excelUtils';

export default function handler(req, res) {
  const { keyword, newData } = req.body;

  updateDataInDatabase(keyword, newData);

  const updatedData = searchInDatabase(keyword);

  res.status(200).json(updatedData);
}