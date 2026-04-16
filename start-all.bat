@echo off
REM Start all Node.js microservices and frontend in separate terminals

REM Backend microservices
start "API Gateway" cmd /k "cd microservices\api-gateway && node server.js"
start "Campaign Service" cmd /k "cd microservices\campaign-service && node server.js"
start "Payment Service" cmd /k "cd microservices\payment-service && node server.js"
start "User Service" cmd /k "cd microservices\user-service && node server.js"

REM Frontend (assumes vite is used and package.json is in root)
start "Frontend" cmd /k "npm run dev"

REM Open a new WSL terminal
start "WSL" wsl.exe