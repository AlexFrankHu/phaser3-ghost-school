export class AutoFindWay {
  constructor(startPos, endPos, isPassable) {
    this.startPos = { x: startPos.x, y: startPos.y };
    this.endPos = { x: endPos.x, y: endPos.y };
    this.isPassable = isPassable;
    this.closeList = [];
    this.openList = [];
  }

  getWayLine() {
    try {
      const wayList = [];
      const startNode = this._createNode(this.startPos, null);
      startNode.g = 0;

      const aroundNodes = this._getAround(startNode);
      if (!aroundNodes || aroundNodes.length === 0) return wayList;
      this.openList.push(...aroundNodes);

      for (let i = 0; i < this.openList.length; i++) {
        const aroundList = this._getAround(this.openList[i]);
        if (!aroundList || aroundList.length === 0) continue;

        let foundEnd = false;
        for (const node of aroundList) {
          if (node.x === this.endPos.x && node.y === this.endPos.y) {
            foundEnd = true;
            this.closeList.push(node);
            break;
          }
        }

        if (foundEnd) break;

        for (const node of aroundList) {
          let inOpen = false;
          for (const openNode of this.openList) {
            if (openNode.x === node.x && openNode.y === node.y) {
              inOpen = true;
              if (openNode.g > node.g) {
                openNode.g = node.g;
                openNode.f = openNode.g + openNode.h;
                openNode.parent = node.parent;
              }
              break;
            }
          }
          if (!inOpen) {
            this.openList.push(node);
          }
        }

        this.openList.splice(i, 1);
        i--;
      }

      // Trace back path
      for (let i = 0; i < this.closeList.length; i++) {
        if (wayList.length > 0) {
          const last = wayList[wayList.length - 1];
          if (last.parent &&
              last.parent.x === this.closeList[i].x &&
              last.parent.y === this.closeList[i].y) {
            wayList.push(this.closeList[i]);
            if (this.closeList[i].x === this.startPos.x &&
                this.closeList[i].y === this.startPos.y) {
              break;
            }
            this.closeList.splice(i, 1);
            i = -1;
          }
          continue;
        }

        if (this.closeList[i].x === this.endPos.x &&
            this.closeList[i].y === this.endPos.y) {
          wayList.push(this.closeList[i]);
          this.closeList.splice(i, 1);
          i = -1;
        }
      }

      return wayList;
    } catch (e) {
      console.error('AutoFindWay error:', e);
      return null;
    }
  }

  _createNode(pos, parent) {
    return {
      x: pos.x,
      y: pos.y,
      g: 0,
      h: 0,
      f: 0,
      parent: parent,
    };
  }

  _isInList(list, node) {
    return list.some(n => n.x === node.x && n.y === node.y);
  }

  _getAround(node) {
    const list = [];
    const directions = [
      { x: node.x, y: node.y + 1 }, // up
      { x: node.x, y: node.y - 1 }, // down
      { x: node.x - 1, y: node.y }, // left
      { x: node.x + 1, y: node.y }, // right
    ];

    for (const dir of directions) {
      const newNode = this._createNode(dir, node);
      if (this.isPassable(dir) && !this._isInList(this.closeList, newNode)) {
        list.push(newNode);
      }
    }

    this.closeList.push(node);

    // Calculate F, G, H
    for (const n of list) {
      n.g = node.g + 1;
      n.h = Math.abs(n.x - this.endPos.x) + Math.abs(n.y - this.endPos.y);
      n.f = n.g + n.h;
    }

    return list;
  }
}
