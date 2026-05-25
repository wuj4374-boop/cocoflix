@echo off
chcp 65001 >nul

echo ==========================================
echo   CocoFlix 项目初始化
echo ==========================================
echo.

REM 检查 Node.js 版本
echo [1/7] 检查 Node.js 版本...
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo 错误: 需要 Node.js 18+
    exit /b 1
)
echo Node.js 版本:
node -v

REM 检查 Docker
echo [2/7] 检查 Docker...
docker -v >nul 2>&1
if errorlevel 1 (
    echo 警告: Docker 未安装，将跳过数据库初始化
    set SKIP_DOCKER=true
) else (
    echo Docker 已安装
)

REM 复制环境变量
echo [3/7] 配置环境变量...
if not exist .env (
    copy .env.example .env
    echo 已创建 .env 文件
) else (
    echo .env 文件已存在，跳过
)

REM 安装依赖
echo [4/7] 安装依赖...
call npm install

REM 启动数据库
if "%SKIP_DOCKER%"=="true" (
    echo [5/7] 跳过数据库启动 (Docker 未安装)
    echo [6/7] 跳过数据库迁移
    echo [7/7] 跳过种子数据
) else (
    echo [5/7] 启动数据库...
    docker-compose -f docker-compose.dev.yml up -d

    echo 等待数据库启动...
    timeout /t 5 /nobreak >nul

    echo [6/7] 运行数据库迁移...
    call npm run typeorm:migration:run || echo 迁移失败，将使用 synchronize 模式

    echo [7/7] 初始化种子数据...
    call npm run seed || echo 种子数据初始化失败，请手动运行: npm run seed
)

echo.
echo ==========================================
echo   初始化完成！
echo ==========================================
echo.
echo 启动开发服务器:
echo   npm run dev
echo.
echo 启动数据库 (如果未启动):
echo   docker-compose -f docker-compose.dev.yml up -d
echo.
echo 访问地址:
echo   前端: http://localhost:3000
echo   API:  http://localhost:4000/api/v1
echo   Swagger: http://localhost:4000/api/docs
echo.
echo 默认管理员账号:
echo   用户名: admin
echo   密码: admin123
echo.
