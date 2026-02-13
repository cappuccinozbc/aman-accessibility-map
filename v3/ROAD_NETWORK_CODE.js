// 路网相关数据结构和算法

// 路网节点
class RoadNode {
    constructor(id, lng, lat) {
        this.id = id;
        this.lng = lng;
        this.lat = lat;
        this.connections = new Set();  // 连接的节点ID
        this.isBoundary = false;       // 是否为边界点
    }
}

// 路网连接
class RoadEdge {
    constructor(from, to, length) {
        this.from = from;      // 起点 ID
        this.to = to;          // 终点 ID
        this.length = length;  // 道路长度（米）
        this.time = length / 83.33 * 60;  // 步行时间（秒）
    }
}

// 路网
class RoadNetwork {
    constructor() {
        this.nodes = new Map();     // id -> RoadNode
        this.edges = new Map();     // edgeId -> RoadEdge
        this.adjList = new Map();   // nodeId -> Set<neighborId>
        this.nextNodeId = 1;
    }

    // 添加节点
    addNode(lng, lat) {
        const id = 'n_' + this.nextNodeId++;
        const node = new RoadNode(id, lng, lat);
        this.nodes.set(id, node);
        this.adjList.set(id, new Set());
        return node;
    }

    // 删除节点
    removeNode(id) {
        const node = this.nodes.get(id);
        if (!node) return;

        // 移除所有相关的边
        node.connections.forEach(neighborId => {
            this.removeEdge(id, neighborId);
        });

        this.nodes.delete(id);
        this.adjList.delete(id);
    }

    // 添加边
    addEdge(fromId, toId, length) {
        const edgeId = fromId + '-' + toId;
        const edge = new RoadEdge(fromId, toId, length);
        this.edges.set(edgeId, edge);

        this.nodes.get(fromId).connections.add(toId);
        this.nodes.get(toId).connections.add(fromId);

        this.adjList.get(fromId).add(toId);
        this.adjList.get(toId).add(fromId);
    }

    // 删除边
    removeEdge(fromId, toId) {
        const edgeId1 = fromId + '-' + toId;
        const edgeId2 = toId + '-' + fromId;
        this.edges.delete(edgeId1);
        this.edges.delete(edgeId2);

        if (this.adjList.has(fromId)) {
            this.adjList.get(fromId).delete(toId);
        }
        if (this.adjList.has(toId)) {
            this.adjList.get(toId).delete(fromId);
        }

        if (this.nodes.has(fromId)) {
            this.nodes.get(fromId).connections.delete(toId);
        }
        if (this.nodes.has(toId)) {
            this.nodes.get(toId).connections.delete(fromId);
        }
    }

    // 获取节点
    getNode(id) {
        return this.nodes.get(id);
    }

    // 获取所有节点
    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    // 获取所有边
    getAllEdges() {
        return Array.from(this.edges.values());
    }

    // 导出为JSON
    exportToJSON() {
        return JSON.stringify({
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values())
        }, null, 2);
    }

    // 从JSON导入
    importFromJSON(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.nodes.clear();
        this.edges.clear();
        this.adjList.clear();
        this.nextNodeId = 1;

        data.nodes.forEach(node => {
            const newNode = new RoadNode(node.id, node.lng, node.lat);
            newNode.isBoundary = node.isBoundary || false;
            newNode.connections = new Set(node.connections || []);
            this.nodes.set(node.id, newNode);
            this.adjList.set(node.id, new Set());
            this.nextNodeId = Math.max(this.nextNodeId, parseInt(node.id.split('_')[1]) + 1);
        });

        data.edges.forEach(edge => {
            this.edges.set(edge.from + '-' + edge.to, edge);
            this.adjList.get(edge.from).add(edge.to);
            this.adjList.get(edge.to).add(edge.from);
        });

        return this;
    }
}

// 优先队列（用于Dijkstra算法）
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

// Dijkstra 算法 - 基于路网搜索可达范围
class DijkstraSearch {
    constructor(roadNetwork) {
        this.roadNetwork = roadNetwork;
    }

    // 搜索从起点到所有节点的最短路径
    search(startNodeId, maxTimeSeconds) {
        const distances = new Map();           // nodeId -> 最短时间（秒）
        const previous = new Map();             // nodeId -> 前驱节点（用于重建路径）
        const visited = new Set();
        const pq = new PriorityQueue();

        // 初始化
        this.roadNetwork.getAllNodes().forEach(node => {
            distances.set(node.id, Infinity);
        });
        distances.set(startNodeId, 0);
        pq.enqueue(startNodeId, 0);

        while (!pq.isEmpty()) {
            const { node: currentNodeId, dist: currentDist } = pq.dequeue();

            if (visited.has(currentNodeId)) continue;
            visited.add(currentNodeId);

            // 如果当前距离已经超过最大时间，停止探索该节点的邻居
            if (currentDist > maxTimeSeconds) continue;

            // 探索邻居
            const neighbors = this.roadNetwork.adjList.get(currentNodeId) || new Set();
            neighbors.forEach(neighborId => {
                if (visited.has(neighborId)) return;

                // 找到对应的边
                const edge = this.findEdge(currentNodeId, neighborId);
                if (!edge) return;

                const newDist = currentDist + edge.time;

                if (newDist < distances.get(neighborId)) {
                    distances.set(neighborId, newDist);
                    previous.set(neighborId, currentNodeId);
                    pq.enqueue(neighborId, newDist);
                }
            });
        }

        return {
            distances,
            previous,
            reachableNodes: Array.from(distances.entries())
                .filter(([nodeId, dist]) => dist <= maxTimeSeconds && dist)
                .map(([nodeId, dist]) => ({
                    nodeId,
                    node: this.roadNetwork.getNode(nodeId),
                    distance: dist
                }))
        };
    }

    // 查找两个节点之间的边
    findEdge(fromId, toId) {
        return this.roadNetwork.edges.get(fromId + '-' + toId) ||
               this.roadNetwork.edges.get(toId + '-' + fromId);
    }

    // 重建从起点到终点的路径
    reconstructPath(previous, startNodeId, endNodeId) {
        const path = [];
        let current = endNodeId;

        while (current !== startNodeId) {
            path.unshift(current);
            current = previous.get(current);
            if (!current) break;
        }

        path.unshift(startNodeId);
        return path;
    }
}

// 工具函数
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

// 计算多边形面积（使用鞋带公式）
function calculatePolygonArea(points) {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].lng * points[j].lat;
        area -= points[j].lng * points[i].lat;
    }

    area = Math.abs(area) / 2;
    // 将经纬度转换为米（近似）
    const lat = points[0].lat;
    const latInMeters = 111000;
    const lngInMeters = 111000 * Math.cos(lat * Math.PI / 180);

    return area * latInMeters * lngInMeters;
}
