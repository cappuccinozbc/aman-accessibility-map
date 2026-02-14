# 路网可达性地图 v3 - 部署信息

## 当前部署状态

### 服务器信息
- **内网IP**: 172.31.0.2
- **外网IP**: 163.7.0.18
- **服务端口**: 8080
- **服务类型**: Python SimpleHTTPServer

### 访问地址

**内网访问** (推荐):
- http://172.31.0.2:8080/index.html
- http://172.31.0.2:8080/debug.html

**外网访问** (需要开放8080端口):
- http://163.7.0.18:8080/index.html
- http://163.7.0.18:8080/debug.html

### 使用说明

1. **访问主应用**: 打开 `index.html`
2. **测试调试**: 打开 `debug.html` 并点击"测试地图"按钮
3. **查看日志**: 在主应用中按 `Ctrl/Cmd+D` 打开调试面板
4. **浏览器控制台**: 按 `F12` 查看详细日志

## 功能说明

### 核心功能
1. **路网获取**: 从高德地图API获取区域路网数据
2. **可达性计算**: 基于步行时间计算可达范围
3. **可视化**: 显示节点、道路、可达范围
4. **编辑功能**: 手动添加/删除节点和道路
5. **数据导出**: 导出路网、可达节点、统计报告

### 操作流程
1. 设置中心点经纬度（重庆默认: 106.554, 29.563）
2. 设置步行时间（默认: 10分钟）
3. 点击"获取路网数据"按钮
4. 等待路网加载完成
5. 点击"搜索可达范围"按钮
6. 查看可视化结果

## 技术栈

- **前端**: 纯HTML/JavaScript/CSS
- **地图API**: 高德地图 JavaScript API v2.0
- **路径规划**: 高德地图 Web服务 API (步行路径)
- **算法**: Dijkstra 最短路径算法
- **部署**: Python SimpleHTTPServer (临时方案)

## 生产部署建议

### 方式1: 使用nginx (推荐)
```bash
# 安装nginx
apt-get update
apt-get install nginx -y

# 复制文件
cp -r /root/.openclaw/workspace/aman-accessibility-map/v3/* /var/www/html/

# 启动nginx
systemctl start nginx
systemctl enable nginx
```

### 方式2: 使用PM2 + Express
创建更专业的Node.js服务，支持：
- 更好的性能
- HTTPS支持
- 访问日志
- 反向代理

### 方式3: 部署到CDN
将静态文件部署到阿里云OSS、腾讯云COS或GitHub Pages

## API密钥配置

当前使用的API密钥：
- JavaScript API Key: `a4097d1dbdf4a439ff4ad1e49a18b3fb`
- Web服务 Key: `210c4260c793bebc10a6d3cb836430ec`

请确保在高德开发者平台中：
1. 已启用 JavaScript API
2. 已启用 Web服务 API
3. 配置了正确的域名/IP白名单
4. 监控配额使用情况

## 注意事项

1. **网络要求**: 需要能访问 `restapi.amap.com` 和 `webapi.amap.com`
2. **浏览器要求**: 现代浏览器 (Chrome、Firefox、Edge等)
3. **配额限制**: 高德API有每日调用次数限制
4. **HTTPS**: 如果生产环境需要HTTPS，建议配置SSL证书

## 问题排查

### 地图不显示
1. 检查网络连接
2. 检查API密钥是否有效
3. 检查控制台错误信息
4. 尝试使用 debug.html 测试

### 路网获取失败
1. 检查 Web服务 Key 是否有效
2. 检查IP白名单配置
3. 查看调试面板的错误信息

### 性能优化
1. 减少采样点数量（修改 `directions` 和 `distances` 数组）
2. 使用缓存机制
3. 考虑使用更高效的服务端渲染

## 联系方式

如需帮助，请联系开发团队。
