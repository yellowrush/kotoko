import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl';

// OpenFreeMap 的 liberty / positron 样式在多个图层 filter 里直接对
// `["get", "admin_level"]` / `["get", "rank"]` / `["get", "ref_length"]`
// 做数值比较（>= / <=）。OSM 数据中这些字段为 null 时，MapLibre 的 number
// 类型断言会抛出：
//   Expected value to be of type number, but found null instead.
// 这是 maplibre-gl-js#7856 / openfreemap#107 已知的上游问题。
//
// 这里在样式进入 MapLibre 之前，给这类数值比较包上一层
// `["case", ["==", ["typeof", ...], "number"], <原比较>, false]` 守卫
// （与 openfreemap-styles 上游修复一致）：
// - 字段缺失或为 null → false（与当前抛错后被当作 false 的渲染行为一致）
// - 字段为数字 → 与原表达式结果完全一致
//
// 注意不能改成 `["to-number", ...]`：to-number(null) 返回 0，
// 会让 `["<=", ref_length, 6]` 这类比较对 null 变为 true，改变渲染。

const NUMERIC_COMPARISON_OPS = new Set(['>', '>=', '<', '<=']);

type UnknownNode = unknown;

function isGetExpr(node: UnknownNode): node is ExpressionSpecification {
  return Array.isArray(node) && typeof node[0] === 'string' && node[0] === 'get';
}

function transformFilter(node: UnknownNode): UnknownNode {
  if (!Array.isArray(node)) return node;
  const op = node[0];

  if (typeof op === 'string' && NUMERIC_COMPARISON_OPS.has(op)) {
    const propertyRefs = node.slice(1).filter(isGetExpr);
    if (propertyRefs.length > 0) {
      const guard: ExpressionSpecification = [
        'all',
        ...propertyRefs.map(
          (ref) => ['==', ['typeof', ref], 'number'] as unknown as ExpressionSpecification,
        ),
      ];
      return ['case', guard, node, false] as unknown as FilterSpecification;
    }
    return node;
  }

  let changed = false;
  const next = node.map((child) => {
    if (!Array.isArray(child)) return child;
    const transformed = transformFilter(child);
    if (transformed !== child) changed = true;
    return transformed;
  });
  return changed ? next : node;
}

export function patchOpenFreeMapStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) => {
    const layerWithFilter = layer as LayerSpecification & { filter?: FilterSpecification };
    if (!layerWithFilter.filter) return layer;
    const transformed = transformFilter(layerWithFilter.filter);
    if (transformed === layerWithFilter.filter) return layer;
    return { ...layerWithFilter, filter: transformed as FilterSpecification };
  });
  return { ...style, layers };
}

// 兜底图标：sprite 缺失的 icon（如 office / gate / ferry_terminal）在
// `styleimagemissing` 事件里用它注册，避免 MapLibre 输出
// `Image "..." could not be loaded` 警告且图标位置留空。
export function createFallbackIcon(): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 20;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { width: size, height: size, data: new Uint8ClampedArray(size * size * 4) };
  }

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(125, 125, 135, 0.85)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(70, 70, 80, 0.9)';
  ctx.stroke();

  return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
}
