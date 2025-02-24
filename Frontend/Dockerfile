# Sử dụng image Node.js chính thức
FROM node:18

# Đặt thư mục làm việc
WORKDIR /app

# Copy toàn bộ code vào container
COPY package.json ./
RUN npm install

COPY . .

# Build ứng dụng React
RUN npm run build

# Sử dụng Nginx để phục vụ frontend
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html

# Mở cổng 80 để truy cập
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
