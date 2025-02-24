import React from 'react';
import './Header.css';

const Header = () => {
    return (
        <header className="main-header">
            <div className="container">
                <nav className="main-nav">
                    <ul>
                        <li>
                            <a href="http://192.168.50.254:3000">
                                <img src="https://sasi.com.vn/wp-content/uploads/2022/04/a1.png" alt="Home" className="nav-icon"/>
                            </a>
                        </li>
                        <li><a href="https://sasi.com.vn/?lang=vi">Thông tin</a></li>
                        <li><a href="mailto:tran.tin.3912@gmail.com?subject=Hỗ trợ kỹ thuật&body=Xin chào, tôi cần được hỗ trợ về...">Liên hệ hỗ trợ</a></li>
                        <li><a href="tel:+84354194299">Phone</a></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;