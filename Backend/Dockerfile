# Sử dụng image Node.js chính thức
FROM node:18

# Đặt thư mục làm việc
WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package.json ./
RUN npm install

# Copy toàn bộ source code vào container
COPY . .

# Mở cổng backend
EXPOSE 3333

# Chạy backend server
CMD ["node", "index.js"]
