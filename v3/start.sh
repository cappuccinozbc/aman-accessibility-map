#!/bin/bash
# 启动路网可达性地图服务

PORT=8080
LOG_FILE="/tmp/roadmap-server.log"

# 检查是否已经在运行
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "服务已在端口 $PORT 上运行"
    exit 1
fi

# 进入目录
cd "$(dirname "$0")"

# 启动服务
echo "启动路网可达性地图服务..."
nohup python3 -m http.server $PORT > $LOG_FILE 2>&1 &

# 等待服务启动
sleep 2

# 检查是否启动成功
if luid=$(lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1); then
    echo "✓ 服务启动成功！"
    echo ""
    echo "访问地址："
    echo "  本地访问: http://localhost:$PORT/index.html"
    echo "  调试页面: http://localhost:$PORT/debug.html"
    echo ""
    echo "日志文件: $LOG_FILE"
    echo "查看日志命令: tail -f $LOG_FILE"
else
    echo "✗ 服务启动失败，查看日志: $LOG_FILE"
    exit 1
fi
