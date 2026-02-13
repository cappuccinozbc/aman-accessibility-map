# 路网编辑与可达性搜索 - 实现方案

## 🎯 功能目标

### Phase 1: 路网数据获取（基础）
- [ ] 设置中心点
- [ ] 获取高德路网数据（周边道路）
- [ ] 构建路网拓扑结构
- [ ] 可视化路网（显示道路节点和连接）

### Phase 2: 路网编辑（交互）
- [ ] 点击地图添加道路节点
- [ ] 连接两个节点创建道路
- [ ] 删除道路节点/连接
- [ ] 编辑道路权重（长度/时间）
- [ ] 导出/导入路网数据（JSON格式）

### Phase 3: 基于路网的可达性搜索（算法）
- [ ] 实现 Dijkstra 算法
- [ ] 基于路网拓扑计算可达范围
- [ ] 可视化可达路径
- [ ] 对比：路网搜索 vs 高德API搜索

### Phase 4: 结果对比（分析）
- [ ] 显示原路网可达范围
- [ ] 显示编辑后路网可达范围
- [ ] 差异高亮显示
- [ ] 统计指标对比（面积、节点数等）

---

## 🗂️ 核心数据结构

```javascript
// 路网节点
class RoadNode {
  constructor(id, lng, lat) {
    this.id = id;
    this.lng = lng;
    this.lat = lat;
    this.connections = new Set();  // 连接的节点ID
  }
}

// 路网连接
class RoadEdge {
  constructor(from, to, length) {
    this.from = from;      // 起点 ID
    this.to = to;          // 终点 ID
    this.length = length;  // 道路长度（米）
    this.time = length / 83.3;  // 步行时间（分钟）
  }
}

// 路网
class RoadNetwork {
  constructor() {
    this.nodes = new Map();     // id -> RoadNode
    this.edges = new Map();     // edgeId -> RoadEdge
    this.adjList = new Map();   // nodeId -> Set<neighborId>
  }

  addNode(id, lng, lat) {
    this.nodes.set(id, new RoadNode(id, lng, lat));
    this.adjList.set(id, new Set());
  }

  addEdge(fromId, toId, length) {
    const edge = new RoadEdge(fromId, toId, length);
    this.edges.set(`${fromId}-${toId}`, edge);
    this.adjList.get(fromId).add(toId);
    this.adjList.get(toId).add(fromId);  // 无向图
  }

  removeNode(id) {
    this.nodes.delete(id);
    this.adjList.delete(id);
    // 移除相关边
    this.edges.forEach((edge, key) => {
      if (edge.from === id || edge.to === id) {
        this.edges.delete(key);
      }
    });
  }

  removeEdge(fromId, toId) {
    this.edges.delete(`${fromId}-${toId}`);
    this.edges.delete(`${toId}-${fromId}`);
    this.adjList.get(fromId).delete(toId);
    this.adjList.get(toId).delete(fromId);
  }
}
```

---

## 🔍 可达性搜索算法

### Dijkstra 算法实现

```javascript
class PathFinder {
  constructor(roadNetwork) {
    this.network = roadNetwork;
  }

  // 基于路网搜索可达范围
  findReachableArea(startNodeId, maxTimeMinutes) {
    const maxTime = maxTimeMinutes * 60;  // 转换为秒
    const distances = new Map();           // nodeId -> 最短时间
    const visited = new Set();
    const pq = new PriorityQueue();        // 优先队列

    // 初始化
    this.network.nodes.forEach((node) => {
      distances.set(node.id, Infinity);
    });
    distances.set(startNodeId, 0);
    pq.enqueue(startNodeId, 0);

    const reachableNodes = [];
    const paths = new Map();

    while (!pq.isEmpty()) {
      const { node: currentNodeId, dist } = pq.dequeue();

      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      if (dist <= maxTime) {
        reachableNodes.push({
          id: currentNodeId,
          distance: dist
        });
      }

      // 探索邻居
      const neighbors = this.network.adjList.get(currentNodeId) || new Set();
      neighbors.forEach(neighborId => {
        if (visited.has(neighborId)) return;

        const edge = this.getEdge(currentNodeId, neighborId);
        if (!edge) return;

        const newDist = dist + edge.time;

        if (newDist < distances.get(neighborId)) {
          distances.set(neighborId, newDist);
          paths.set(neighborId, currentNodeId);  // 记录路径
          pq.enqueue(neighborId, newDist);
        }
      });
    }

    return {
      nodes: reachableNodes,
      distances,
      paths
    };
  }

  getEdge(fromId, toId) {
    return this.network.edges.get(`${fromId}-${toId}`) ||
           this.network.edges.get(`${toId}-${fromId}`);
  }
}

// 优先队列实现
class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(node, priority) {
    this.items.push({ node, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}
```

---

## 🗺️ 路网获取策略

### 策略1：基于导航API采样（推荐）

```javascript
async function fetchRoadNetworkFromAMap(lng, lat, radius) {
  const roadNetwork = new RoadNetwork();
  const directions = [0, 45, 90, 135, 180, 225, 270, 315]; // 8个方向
  const distances = [radius * 0.3, radius * 0.6, radius * 1.0];  // 3个距离

  // 为不同方向和距离的采样点获取路径
  for (const direction of directions) {
    for (const dist of distances) {
      const targetLng = lng + (dist * Math.cos(direction * Math.PI / 180) / 111000 / Math.cos(lat * Math.PI / 180));
      const targetLat = lat + (dist * Math.sin(direction * Math.PI / 180) / 111000);

      const path = await fetchWalkingPath(lng, lat, targetLng, targetLat);

      // 提取路径中的道路节点
      extractRoadNodesAndEdges(path, roadNetwork);
    }
  }

  return roadNetwork;
}

function extractRoadNodesAndEdges(path, roadNetwork) {
  // 解析 polyline 数据
  const coords = parsePolyline(path.polyline);

  // 创建节点和边
  for (let i = 0; i < coords.length; i++) {
    const coord = coords[i];
    const nodeId = `n_${coord.lng.toFixed(6)}_${coord.lat.toFixed(6)}`;

    if (!roadNetwork.nodes.has(nodeId)) {
      roadNetwork.addNode(nodeId, coord.lng, coord.lat);
    }

    // 创建边（连接相邻节点）
    if (i > 0) {
      const prevNode = coords[i - 1];
      const prevNodeId = `n_${prevNode.lng.toFixed(6)}_${prevNode.lat.toFixed(6)}`;
      const length = calculateDistance(prevNode, coord);

      roadNetwork.addEdge(prevNodeId, nodeId, length);
    }
  }
}
```

---

## 🎨 UI设计

### 路网编辑界面

```
┌─────────────────────────────────────────────┐
│  Walking Accessibility Map (Road Network)    │
├─────────────────────────────────────────────┤
│                                             │
│  [选择模式] [查看路网] [编辑路网] [对比结果] │
│                                             │
│  中心点: [106.554, 29.563]                  │
│  搜索半径: [1000]米                         │
│  最大时间: [10]分钟                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │      地图显示区域                   │   │
│  │                                     │   │
│  │      ● 路网节点                     │   │
│  │      ─── 道路连接                   │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [获取路网] [导出路网] [导入路网]           │
│                                             │
│  编辑工具:                                 │
│  [添加节点] [连接节点] [删除] [撤销]        │
│                                             │
│  统计信息:                                  │
│  节点数: 128 | 边数: 156 | 可达面积: 2.3km²│
└─────────────────────────────────────────────┘
```

---

## 📊 结果对比显示

```javascript
function compareReachability(originalNetwork, editedNetwork, startNode, maxTime) {
  const originalResult = findReachableArea(originalNetwork, startNode, maxTime);
  const editedResult = findReachableArea(editedNetwork, startNode, maxTime);

  const diff = {
    addedNodes: editedResult.nodes.filter(n => !originalResult.nodes.includes(n)),
    removedNodes: originalResult.nodes.filter(n => !editedResult.nodes.includes(n)),
    areaChange: calculateArea(editedResult.nodes) - calculateArea(originalResult.nodes)
  };

  return {
    original: originalResult,
    edited: editedResult,
    difference: diff
  };
}
```

---

## ⚙️ 配置和工具函数

```javascript
// 计算两点距离
function calculateDistance(p1, p2) {
  const R = 6371000;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 解析高德 polyline 格式
function parsePolyline(polylineStr) {
  const coords = [];
  const points = polylineStr.split(';');

  points.forEach(point => {
    const [lng, lat] = point.split(',').map(parseFloat);
    coords.push({ lng, lat });
  });

  return coords;
}

// 导出路网为JSON
function exportRoadNetwork(roadNetwork) {
  return JSON.stringify({
    nodes: Array.from(roadNetwork.nodes.values()),
    edges: Array.from(roadNetwork.edges.values())
  }, null, 2);
}

// 从JSON导入路网
function importRoadNetwork(jsonStr) {
  const data = JSON.parse(jsonStr);
  const roadNetwork = new RoadNetwork();

  data.nodes.forEach(node => {
    roadNetwork.addNode(node.id, node.lng, node.lat);
  });

  data.edges.forEach(edge => {
    roadNetwork.addEdge(edge.from, edge.to, edge.length);
  });

  return roadNetwork;
}
```

---

## 🚀 实施建议

### 推荐实施顺序

1. **Week 1**: 实现路网数据获取和可视化
2. **Week 2**: 实现路网编辑功能（添加/删除节点）
3. **Week 3**: 实现基于路网的可达性搜索算法
4. **Week 4**: 实现结果对比和优化

### 技术栈推荐

- **前端框架**: 纯 JavaScript（保持当前架构）
- **可视化**: 高德地图 API + 自定义图层
- **数据存储**: 浏览器 localStorage / 导出为 JSON
- **算法**: Dijkstra（时间最短）/ BFS（范围搜索）

### 潜在挑战

1. **路网数据完整性**: 高德API可能无法返回完整路网
   - 解决方案：多点采样 + 用户补充编辑

2. **路网编辑复杂度**: 需要直观的交互界面

对于路径识别，我将利用高德API的路径特性，通过分析polyline的曲率变化来精准捕捉道路拐点。这种方法可以帮助我准确识别道路网络的拓扑结构。

3. **性能问题**: 大型路网的图算法性能
   - 解决方案：限制搜索范围 + 使用优先队列优化

---

## 🎯 总结

这个功能是**完全可实现的**，核心思路是：

1. ✅ **获取路网**: 高德API + 采样策略
2. ✅ **构建路网拓扑**: 节点 + 边的数据结构
3. ✅ **图算法**: Dijkstra/BFS 计算可达范围
4. ✅ **交互编辑**: 提供用户补充/修改路网的能力
5. ✅ **结果对比**: 可视化差异

**优势:**
- 不依赖外部API计算，响应更快
- 用户可以自定义路网（模拟道路封闭、新开道路等场景）
- 适合城市规划、交通分析等应用

需要我开始实现吗？我可以从 Phase 1（路网获取和可视化）开始。
