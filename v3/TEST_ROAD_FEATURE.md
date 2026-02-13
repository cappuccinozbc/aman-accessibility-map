# 测试道路功能 - 简化方案

## 🎯 需求理解

**目标：** 在当前版本中增加测试功能，允许用户：
1. 手动添加测试道路
2. 修改/删除测试道路
3. 基于测试道路重新计算可达性范围
4. 对比原始结果 vs 测试结果

---

## 💡 核心思路

### 混合模式：高德API + 测试道路

```
可达性搜索 = 基础路网（高德API） + 测试道路（用户添加）

搜索流程：
1. 使用高德API获取基础可达范围
2. 添加用户的测试道路
3. 基于测试道路计算额外的可达区域
4. 合并结果并可视化
```

---

## 🗂️ 数据结构

```javascript
// 测试道路
class TestRoad {
  constructor(id, startPoint, endPoint) {
    this.id = id;              // 唯一标识
    this.startPoint = startPoint;  // {lng, lat}
    this.endPoint = endPoint;      // {lng, lat}
    this.length = calculateDistance(startPoint, endPoint);  // 道路长度
    this.walkTime = this.length / 83.3;  // 步行时间（分钟）
    this.status = 'active';     // 'active' | 'deleted'
  }
}

// 测试道路管理器
class TestRoadManager {
  constructor() {
    this.testRoads = new Map();  // id -> TestRoad
    this.nextId = 1;
  }

  addTestRoad(startPoint, endPoint) {
    const id = this.nextId++;
    const road = new TestRoad(id, startPoint, endPoint);
    this.testRoads.set(id, road);
    return road;
  }

  removeTestRoad(id) {
    this.testRoads.delete(id);
  }

  getActiveRoads() {
    return Array.from(this.testRoads.values())
      .filter(road => road.status === 'active');
  }

  clearAll() {
    this.testRoads.clear();
    this.nextId = 1;
  }

  exportToJSON() {
    return JSON.stringify(Array.from(this.testRoads.values()), null, 2);
  }

  importFromJSON(jsonStr) {
    const roads = JSON.parse(jsonStr);
    this.testRoads.clear();
    roads.forEach(road => {
      this.testRoads.set(road.id, new TestRoad(road.id, road.startPoint, road.endPoint));
    });
    this.nextId = Math.max(...roads.map(r => r.id)) + 1;
  }
}
```

---

## 🔄 搜索流程

### 修改后的可达性搜索

```javascript
class AccessibilitySearcher {
  constructor() {
    this.testRoadManager = new TestRoadManager();
  }

  async search(lng, lat, timeMinutes, gridSize) {
    // 1. 原始搜索（基于高德API）
    const originalResult = await this.searchOriginal(lng, lat, timeMinutes, gridSize);

    // 2. 如果有测试道路，计算额外可达区域
    const testRoads = this.testRoadManager.getActiveRoads();
    if (testRoads.length > 0) {
      const enhancedResult = this.enhanceWithTestRoads(originalResult, testRoads, timeMinutes);
      return {
        original: originalResult,
        enhanced: enhancedResult,
        testRoads: testRoads
      };
    }

    return {
      original: originalResult,
      enhanced: null,
      testRoads: testRoads
    };
  }

  async searchOriginal(lng, lat, timeMinutes, gridSize) {
    // 使用现有的搜索逻辑
    // ... (当前代码)
    return {
      boundaryPoints: [...],
      polygon: [...],
      area: ...
    };
  }

  enhanceWithTestRoads(originalResult, testRoads, maxTimeMinutes) {
    const enhancedBoundaryPoints = new Set(originalResult.boundaryPoints);
    const origin = { lng: originalResult.center.lng, lat: originalResult.center.lat };

    // 基于测试道路扩展可达范围
    testRoads.forEach(road => {
      // 计算测试道路起点的可达性
      const startAccessible = this.isPointAccessible(road.startPoint, originalResult);
      const endAccessible = this.isPointAccessible(road.endPoint, originalResult);

      if (startAccessible && !endAccessible) {
        // 起点可达，终点不可达 -> 延伸可达范围
        if (road.walkTime <= maxTimeMinutes) {
          enhancedBoundaryPoints.push(road.endPoint);
        }
      } else if (!startAccessible && endAccessible) {
        // 终点可达，起点不可达 -> 反向延伸
        if (road.walkTime <= maxTimeMinutes) {
          enhancedBoundaryPoints.push(road.startPoint);
        }
      }
    });

    // 重新计算多边形
    const enhancedPolygon = this.createPolygonFromPoints(enhancedBoundaryPoints);

    return {
      boundaryPoints: Array.from(enhancedBoundaryPoints),
      polygon: enhancedPolygon,
      area: calculatePolygonArea(enhancedPolygon)
    };
  }

  isPointAccessible(point, originalResult) {
    // 检查点是否在原始可达范围内
    // 使用点在多边形内的算法
    return isPointInPolygon(point, originalResult.polygon);
  }
}
```

---

## 🎨 UI设计

### 添加测试道路控制面板

```html
<div class="sidebar">
  <!-- 原有控制项 -->
  <div class="form-group">
    <label>Longitude</label>
    <input type="number" id="lng" value="106.554">
  </div>
  <div class="form-group">
    <label>Latitude</label>
    <input type="number" id="lat" value="29.563">
  </div>
  <div class="form-group">
    <label>Walking Time (min)</label>
    <input type="number" id="time" value="10">
  </div>

  <!-- 新增：测试道路功能 -->
  <div class="divider"></div>
  <h3>测试道路（新功能）</h3>

  <div class="radio-group">
    <label>
      <input type="radio" name="mode" value="normal" checked>
      正常模式
    </label>
    <label>
      <input type="radio" name="mode" value="add-road">
      添加测试道路
    </label>
  </div>

  <div class="form-group" id="road-info" style="display: none;">
    <label>测试道路信息</label>
    <div id="road-coordinates">
      点击地图设置起点和终点<br>
      起点: <span id="start-point">未设置</span><br>
      终点: <span id="end-point">未设置</span>
    </div>
    <div class="btn-group">
      <button class="btn" onclick="addTestRoad()">添加道路</button>
      <button class="btn btn-secondary" onclick="cancelRoad()">取消</button>
    </div>
  </div>

  <div class="test-roads-list" id="test-roads-list">
    <!-- 测试道路列表 -->
    <div class="road-item" data-id="1">
      <span>道路 #1</span>
      <button onclick="removeRoad(1)">删除</button>
    </div>
  </div>

  <div class="btn-group">
    <button class="btn" onclick="search()">搜索</button>
    <button class="btn btn-secondary" onclick="clearMap()">清除</button>
  </div>
</div>
```

### 地图交互模式

```javascript
// 当前模式
let currentMode = 'normal';  // 'normal' | 'add-road'
let tempRoadStart = null;
let tempRoadEnd = null;
let tempRoadLine = null;

// 切换模式
function switchMode(mode) {
  currentMode = mode;

  if (mode === 'add-road') {
    document.getElementById('road-info').style.display = 'block';
    showResult('点击地图设置测试道路起点', false);
  } else {
    document.getElementById('road-info').style.display = 'none';
    resetTempRoad();
  }
}

// 地图点击事件
map.on('click', function(e) {
  if (currentMode === 'add-road') {
    handleAddRoadClick(e.lnglat);
  } else if (currentMode === 'normal') {
    // 原有逻辑
    document.getElementById('lng').value = e.lnglat.getLng().toFixed(6);
    document.getElementById('lat').value = e.lnglat.getLat().toFixed(6);
  }
});

// 处理添加道路的点击
function handleAddRoadClick(lnglat) {
  const point = { lng: lnglat.getLng(), lat: lnglat.getLat() };

  if (!tempRoadStart) {
    // 设置起点
    tempRoadStart = point;
    document.getElementById('start-point').textContent =
      `${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}`;

    // 显示起点标记
    const marker = new AMap.Marker({
      position: [point.lng, point.lat],
      icon: new AMap.Icon({
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
        size: new AMap.Size(25, 34),
        imageSize: new AMap.Size(25, 34)
      }),
      map: map
    });
    markers.push(marker);

    showResult('点击地图设置终点', false);
  } else if (!tempRoadEnd) {
    // 设置终点
    tempRoadEnd = point;
    document.getElementById('end-point').textContent =
      `${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}`;

    // 显示终点标记
    const marker = new AMap.Marker({
      position: [point.lng, point.lat],
      icon: new AMap.Icon({
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
        size: new AMap.Size(25, 34),
        imageSize: new AMap.Size(25, 34)
      }),
      map: map
    });
    markers.push(marker);

    // 绘制临时连线
    tempRoadLine = new AMap.Polyline({
      path: [[tempRoadStart.lng, tempRoadStart.lat],
              [tempRoadEnd.lng, tempRoadEnd.lat]],
      strokeColor: '#FF5722',
      strokeWeight: 3,
      strokeStyle: 'dashed',
      map: map
    });
    markers.push(tempRoadLine);

    showResult('点击"添加道路"按钮确认', false);
  }
}

// 添加测试道路
function addTestRoad() {
  if (!tempRoadStart || !tempRoadEnd) {
    showResult('请先设置起点和终点', true);
    return;
  }

  const road = testRoadManager.addTestRoad(tempRoadStart, tempRoadEnd);

  // 绘制道路（永久显示）
  const roadLine = new AMap.Polyline({
    path: [[tempRoadStart.lng, tempRoadStart.lat],
            [tempRoadEnd.lng, tempRoadEnd.lat]],
    strokeColor: '#52c41a',  // 绿色
    strokeWeight: 3,
    map: map
  });
  testRoadLines.push(roadLine);

  // 更新道路列表
  updateTestRoadsList();

  // 重置临时状态
  resetTempRoad();

  showResult(`测试道路 #${road.id} 已添加`, false);
}

// 删除测试道路
function removeTestRoad(id) {
  testRoadManager.removeTestRoad(id);

  // 移除对应的可视化元素
  const index = id - 1;
  if (testRoadLines[index]) {
    map.remove(testRoadLines[index]);
    testRoadLines.splice(index, 1);
  }

  updateTestRoadsList();
  showResult(`测试道路 #${id} 已删除`, false);
}

// 重置临时道路
function resetTempRoad() {
  tempRoadStart = null;
  tempRoadEnd = null;

  if (tempRoadLine) {
    map.remove(tempRoadLine);
    tempRoadLine = null;
  }

  document.getElementById('start-point').textContent = '未设置';
  document.getElementById('end-point').textContent = '未设置';
}

// 取消添加道路
function cancelRoad() {
  resetTempRoad();
  switchMode('normal');
  showResult('已取消', false);
}

// 更新测试道路列表
function updateTestRoadsList() {
  const list = document.getElementById('test-roads-list');
  const roads = testRoadManager.getActiveRoads();

  list.innerHTML = roads.map(road => `
    <div class="road-item" data-id="${road.id}">
      <span>道路 #${road.id} (${road.length.toFixed(0)}m)</span>
      <button class="btn-danger" onclick="removeTestRoad(${road.id})">删除</button>
    </div>
  `).join('');
}
```

---

## 📊 结果可视化

### 对比显示

```javascript
async function search() {
  const lng = document.getElementById('lng').value;
  const lat = document.getElementById('lat').value;
  const time = document.getElementById('time').value;

  showResult('搜索中...', false);

  const result = await searcher.search(
    parseFloat(lng),
    parseFloat(lat),
    parseInt(time),
    parseInt(document.getElementById('gridSize').value)
  );

  // 清除旧的多边形
  clearPolygons();

  // 显示原始结果（蓝色）
  const originalPolygon = new AMap.Polygon({
    path: result.original.polygon,
    strokeColor: '#1890ff',
    strokeWeight: 2,
    strokeOpacity: 0.8,
    fillColor: '#1890ff',
    fillOpacity: 0.2,
    map: map
  });
  polygons.push(originalPolygon);

  // 如果有测试道路增强的结果，显示（绿色）
  if (result.enhanced) {
    const enhancedPolygon = new AMap.Polygon({
      path: result.enhanced.polygon,
      strokeColor: '#52c41a',
      strokeWeight: 2,
      strokeOpacity: 0.8,
      fillColor: '#52c41a',
      fillOpacity: 0.2,
      map: map
    });
    polygons.push(enhancedPolygon);

    // 显示统计信息
    const areaDiff = result.enhanced.area - result.original.area;
    const percentChange = (areaDiff / result.original.area * 100).toFixed(1);

    showResult(
      `原始面积: ${result.original.area.toFixed(3)} km²<br>` +
      `增强面积: ${result.enhanced.area.toFixed(3)} km²<br>` +
      `变化: ${areaDiff > 0 ? '+' : ''}${percentChange}%`,
      false
    );
  } else {
    showResult(
      `可达面积: ${result.original.area.toFixed(3)} km²<br>` +
      `(基于${result.testRoads.length}条测试道路)`,
      false
    );
  }
}
```

---

## 🎯 核心功能清单

### 基础功能（必需）
- [ ] 添加测试道路模式切换
- [ ] 地图点击设置起点/终点
- [ ] 测试道路可视化（绿色线条）
- [ ] 测试道路列表显示
- [ ] 删除测试道路

### 搜索功能（核心）
- [ ] 基于测试道路扩展可达范围
- [ ] 原始结果 vs 增强结果对比
- [ ] 差异可视化（蓝绿双色）
- [ ] 统计信息显示

### 高级功能（可选）
- [ ] 导出/导入测试道路（JSON）
- [ ] 测试道路属性编辑（长度、通行速度）
- [ ] 道路方向设置（单向/双向）
- [ ] 多条测试道路串联

---

## 🚀 实施步骤

### Step 1: UI界面（30分钟）
- 添加测试道路控制面板
- 添加模式切换按钮
- 添加测试道路列表显示

### Step 2: 交互逻辑（30分钟）
- 实现地图点击处理
- 实现起点/终点设置
- 实现道路可视化

### Step 3: 测试道路管理（20分钟）
- 实现添加/删除功能
- 实现数据管理器

### Step 4: 搜索逻辑（40分钟）
- 修改搜索函数支持测试道路
- 实现可达范围扩展算法
- 实现结果对比显示

### Step 5: 测试和优化（30分钟）
- 功能测试
- 性能优化
- UI调整

**总预计时间：** 约 2.5 小时

---

## 💡 使用示例

### 场景1：模拟新开道路

1. 设置中心点和搜索时间
2. 切换到"添加测试道路"模式
3. 在当前可达范围内点击设置起点
4. 在可达范围外点击设置终点
5. 点击"添加道路"
6. 点击"搜索"查看扩展后的可达范围

### 场景2：多道路测试

1. 添加多条测试道路，连接不同区域
2. 查看扩展后的可达范围
3. 对比不同道路组合的效果

---

## 🎉 总结

这个简化方案专注于**测试功能**：
- ✅ 简单易用的道路添加界面
- ✅ 可视化对比原始 vs 增强结果
- ✅ 无需复杂路网编辑
- ✅ 保持原有功能不变

**核心价值：**
- 快速测试道路改造的影响
- 可视化展示可达性变化
- 适合规划分析和演示

需要我现在开始实现吗？
