export class AutoFindWay {
  constructor(startPos, endPos, isPassable) {
    this.startPos = { x: startPos.x, y: startPos.y };
    this.endPos = { x: endPos.x, y: endPos.y };
    this.isPassable = isPassable;
  }

  getWayLine() {
    try {
      const start = this.startPos;
      const end = this.endPos;

      if (start.x === end.x && start.y === end.y) {
        return [{ x: end.x, y: end.y }];
      }

      const key = (x, y) => x + ',' + y;
      const closedSet = new Set();
      const openMap = new Map();
      const cameFrom = new Map();
      const gScore = new Map();
      const fScore = new Map();

      const sk = key(start.x, start.y);
      gScore.set(sk, 0);
      fScore.set(sk, Math.abs(start.x - end.x) + Math.abs(start.y - end.y));
      openMap.set(sk, start);

      const MAX_ITERATIONS = 60000;
      let iterations = 0;

      while (openMap.size > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Find node with lowest F score in open set
        let bestKey = null;
        let bestF = Infinity;
        for (const [k, _] of openMap) {
          const f = fScore.get(k) || Infinity;
          if (f < bestF) {
            bestF = f;
            bestKey = k;
          }
        }

        if (!bestKey) break;

        const current = openMap.get(bestKey);
        if (current.x === end.x && current.y === end.y) {
          // Reconstruct path using parent pointers
          const path = [];
          let ck = bestKey;
          while (ck) {
            const parts = ck.split(',');
            path.push({ x: parseInt(parts[0]), y: parseInt(parts[1]) });
            ck = cameFrom.get(ck) || null;
          }
          return path;
        }

        openMap.delete(bestKey);
        closedSet.add(bestKey);

        const directions = [
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
          { x: current.x - 1, y: current.y },
          { x: current.x + 1, y: current.y },
        ];

        for (const neighbor of directions) {
          const nk = key(neighbor.x, neighbor.y);
          if (closedSet.has(nk)) continue;

          // End position is always reachable (even if not "passable" by tile type)
          const isEnd = neighbor.x === end.x && neighbor.y === end.y;
          if (!isEnd && !this.isPassable(neighbor)) continue;

          const tentativeG = (gScore.get(bestKey) || 0) + 1;

          if (!openMap.has(nk)) {
            openMap.set(nk, neighbor);
          } else if (tentativeG >= (gScore.get(nk) || Infinity)) {
            continue;
          }

          cameFrom.set(nk, bestKey);
          gScore.set(nk, tentativeG);
          fScore.set(nk, tentativeG + Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y));
        }
      }

      return [];
    } catch (e) {
      console.error('AutoFindWay error:', e);
      return [];
    }
  }
}
