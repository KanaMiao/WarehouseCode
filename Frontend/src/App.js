import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

//const backendUrl = 'http://192.168.50.254:3333';
const backendUrl = 'http://localhost:3333';

function App() {
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nameList, setNameList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');

  const toastConfig = useMemo(() => ({
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  }), []);
  // Lấy danh sách tên người dùng từ API
  useEffect(() => {
    let isMounted = true; // Đánh dấu trạng thái component đã mount

    // Hàm kiểm tra kết nối tới database
    const initializeDatabaseConnection = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/init-database-connection`);
        if (!response.ok) {
          if (isMounted) {
            toast.error('⚠️ Không thể kết nối tới database.', toastConfig);
          }
        } else {
          if (isMounted) {
            toast.success('Kết nối tới database thành công!', toastConfig);
          }
        }
      } catch (error) {
        if (isMounted) {
          toast.error('🌐 Lỗi mạng khi kết nối tới database.', toastConfig);
        }
        console.error('Chi tiết lỗi:', error); // Log chi tiết lỗi.
      }
    };

    // Hàm lấy danh sách người dùng
    const fetchNames = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/get-names`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setNameList(data);
          }
        } else {
          if (isMounted) {
            toast.error('⚠️ Không thể lấy danh sách người dùng.', toastConfig);
          }
        }
      } catch (error) {
        if (isMounted) {
          toast.error('🌐 Lỗi mạng khi lấy danh sách người dùng.', toastConfig);
        }
        console.error('Chi tiết lỗi:', error);
      }
    };

    // Gọi các hàm khi component được mount
    initializeDatabaseConnection();
    fetchNames();

    // Cleanup khi component unmount
    return () => {
      isMounted = false;
    };
  }, [toastConfig]);
  // Hiển thị thông báo khi chọn tên người dùng
  const handlesh = (name) => {
    if (!name) {
      toast.error("Nào từ từ khai báo tên đi đã!", toastConfig);
    } else if (name === "Trần Lập") {
      toast.success(
        <>
          500 anh em xếp hàng chào<br />
          Đại ca {name} tới kho.🔥
        </>,
        toastConfig
      );;
    } else if (name === "Thanh Tín") {
      toast.success(
        <>
          À há Admin{name} kết nối lại kìa bây ơi!
        </>,
        toastConfig
      );;
    } else {
      toast.success(`Ơ kìa! Có phải là ${name} đang kết nối đúng không ta?`, toastConfig);
    }
  };

  // Xử lý khi người dùng thay đổi tên trong dropdown
  const handleUsernameChange = (e) => {
    const selectedName = e.target.value;
    setUsername(selectedName);
    handlesh(selectedName); // Gọi handlesh ngay sau khi chọn tên
  };

  // Lấy gợi ý sản phẩm từ API khi nhập từ khóa
  const fetchSuggestions = async (keyword) => {
    const url = `${backendUrl}/api/suggestions?keyword=${keyword}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        toast.error('⚠️ Gọi điện cho Thanh Tín để nó kết nối lại thôi.', toastConfig);
      }
    } catch (error) {
      toast.error('🌐 Không biết gợi ý cho bạn tìm kiếm sao luôn.', toastConfig);
    }
  };

  // Thay đổi từ khóa tìm kiếm và lấy gợi ý
  const handleKeywordChange = (e) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
    if (newKeyword) {
      fetchSuggestions(newKeyword);
    } else {
      setSuggestions([]);
    }
  };

  // Chọn một gợi ý và tìm kiếm
  const handleSuggestionClick = (suggestion) => {
    setKeyword(suggestion);
    setSuggestions([]);
    handleSearch(suggestion);
  };

  // Nhấn phím Enter để tìm kiếm
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Thực hiện tìm kiếm sản phẩm
  const handleSearch = async (searchKeyword = keyword) => {
    if (!username) {
      toast.error("Nào! Từ đã nhập tên đi chứ!", toastConfig);
      return;
    }
  
    if (!searchKeyword) {
      toast.error('⚠️ Bạn đang tìm kiếm điều gì trong kho này ?', toastConfig);
      return;
    }
  
    setSuggestions([]);
    setSearchResults([]);
    const url = `${backendUrl}/api/search?keyword=${searchKeyword}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.filteredData && data.filteredData.length > 0) {
          setSearchResults(data.filteredData);
        } else {
          toast.info('📝 Không tìm thấy đồ bạn muốn tìm rồi.', toastConfig);
        }
      } else {
        toast.error('🙅‍♂️ Hmmmm có vẻ như có lỗi gì đó rồi.', toastConfig);
      }
    } catch (error) {
      toast.error('🌐 Ối ai đó đã tắt mạng rồi?.', toastConfig);
    }
  };

  // Chọn sản phẩm từ danh sách kết quả tìm kiếm
  const handleResultClick = (result) => {
    setSelectedProduct(result.ID);
    setSelectedProductName(result.TenSanPham);
    setSearchResults([result]); // Chỉ hiển thị sản phẩm được chọn
  };

  // Cập nhật số lượng sản phẩm
  const handleUpdateQuantity = async () => {
    if (!username) {
      toast.error("Nào nào! Khai báo tên đi chứ!", toastConfig);
      return;
    }

    if (!selectedProduct || !quantity) {
      toast.error('⚠️ Chọn sản phẩm mà lấy ra đi bạn êi.', toastConfig);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/update-quantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedProduct, quantity: parseInt(quantity, 10), userName: username }),
      });

      if (response.ok) {
        toast.success(`🎉 Bạn đã lấy thành công sản phẩm rồi đó: ${quantity}`, toastConfig);
        handleSearch();  // Cập nhật kết quả tìm kiếm sau khi cập nhật số lượng
      } else {
        const errorResponse = await response.json();
        toast.error(`🫠 Trong kho không đủ cho bạn lấy rồi!: ${errorResponse.error}`, toastConfig);
      }
    } catch (error) {
      toast.error('🌐 Chế nào ngắt kết nối mạng của bạn rồi đó.', toastConfig);
    }
  };

  return (
    <div className="App">
      <h1>Quản lý Kho</h1>
      <div>
        {/* Drop-down list lấy từ API get-names */}
        <label>
          Xin vui lòng báo danh 👨‍🏭:
          <select value={username} onChange={handleUsernameChange}>
            <option value="">Chọn tên người dùng</option>
            {nameList.map((name, index) => (
              <option key={index} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tên sản phẩm 📰:
          <input
            type="text"
            value={keyword}
            onChange={handleKeywordChange}
            onKeyPress={handleKeyPress}
            disabled={!username} // Vô hiệu hóa ô nhập liệu nếu chưa báo danh
          />
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </label>
        <button onClick={handleSearch} disabled={!username}>Search 🔎</button>
      </div>
      <div className="results">
        <h2>Kết quả Tìm kiếm</h2>
        <ul>
          {searchResults.length > 0 ? (
            searchResults.map(result => (
              <li
                key={result.ID}
                className={selectedProduct === result.ID ? 'selected' : ''}
                onClick={() => handleResultClick(result)}
              >
                <p><strong>Tên sản phẩm:</strong> {result.TenSanPham}</p>
                <p><strong>Mã sản phẩm:</strong> {result.MaSanPham}</p>
                <p><strong>Thông số sản phẩm:</strong> {result.ThongSoSanPham}</p>
                <p><strong>Vị trí:</strong> {result.ViTri}</p>
                <p><strong>Số lượng sản phẩm:</strong> {result.SoLuongSanPham}</p>
              </li>
            ))
          ) : (
            <p>No results found.</p>
          )}
        </ul>
      </div>
      {selectedProduct && (
        <div className="update-quantity">
          <h2>Cập nhật số lượng cho {selectedProductName}</h2>
          <input
            type="number"
            placeholder="Nhập số lượng"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <button onClick={handleUpdateQuantity}>Cập nhật số lượng</button>
        </div>
      )}
      <ToastContainer {...toastConfig} />
    </div>
  );
}

export default App;