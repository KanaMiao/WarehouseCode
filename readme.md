# WarehouseCode

Đây là mã nguồn cho luận văn tốt nghiệp năm 2025 của tôi, bao gồm hệ thống quản lý kho hàng với phần `Frontend` và `Backend` được triển khai riêng biệt.

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
  - [Sử dụng Docker](#sử-dụng-docker)
  - [Cài đặt thủ công](#cài-đặt-thủ-công)
- [Sử dụng](#sử-dụng)
- [Đóng góp](#đóng-góp)
- [Liên hệ](#liên-hệ)
- [Giấy phép](#giấy-phép)

## Giới thiệu

Dự án này phát triển một hệ thống quản lý kho hàng, cho phép người dùng theo dõi và quản lý hàng tồn kho, đơn đặt hàng và các hoạt động liên quan. Hệ thống bao gồm:

- **Frontend**: Giao diện người dùng, cung cấp trải nghiệm tương tác và thân thiện.
- **Backend**: Xử lý logic nghiệp vụ, quản lý cơ sở dữ liệu và cung cấp API cho frontend.

## Công nghệ sử dụng

- **Frontend**:
  - [React](https://reactjs.org/): Thư viện JavaScript để xây dựng giao diện người dùng.
  - [TypeScript](https://www.typescriptlang.org/): Ngôn ngữ lập trình phát triển từ JavaScript với kiểu tĩnh.
  - [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS): Ngôn ngữ tạo kiểu cho giao diện.

- **Backend**:
  - [Node.js](https://nodejs.org/): Môi trường chạy JavaScript phía server.
  - [Express](https://expressjs.com/): Framework web cho Node.js.
  - [TypeScript](https://www.typescriptlang.org/): Sử dụng cho việc phát triển backend.
  - [Docker](https://www.docker.com/): Nền tảng triển khai ứng dụng trong các container.

## Yêu cầu hệ thống

- [Docker](https://www.docker.com/) và [Docker Compose](https://docs.docker.com/compose/) (nếu sử dụng phương pháp cài đặt bằng Docker).
- [Node.js](https://nodejs.org/) phiên bản 14 trở lên (nếu cài đặt thủ công).
- [npm](https://www.npmjs.com/) hoặc [yarn](https://yarnpkg.com/) để quản lý gói.

## Cài đặt
1. **React**: 18.3.1
2. **React DOM**: 18.3.1
3. **TypeScript**: Latest (version unspecified but likely the latest installed)
4. **Next.js**: 14.2.5
5. **Tailwind CSS**: 3.4.1
6. **Node.js**: Determined indirectly based on your npm and package configuration (unspecified version, but it should be compatible with your dependencies).
7. **Webpack**: 5.94.0
8. **Webpack-dev-server**: 5.1.0
9. **Express**: 4.19.2
10. **Hero Packages**:
11. **React-Router-Dom**: 6.26.0

### Sử dụng Docker

1. **Clone repository**:

   ```bash
   git clone https://github.com/KanaMiao/WarehouseCode.git
   cd WarehouseCode
