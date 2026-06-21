function clampPos(newX: number, newY: number, zoom: number) {
  const curW = imgW * zoom;
  const curH = imgH * zoom;

  let x = newX;
  if (curW <= containerW) {
    // 情況 A：圖片比容器窄（如手機截圖在寬屏顯示）。
    // 強制置中，不允許左右移動。
    x = (containerW - curW) / 2;
  } else {
    // 情況 B：圖片放大到比容器寬。
    // 限制範圍在 [容器寬 - 圖片寬, 0]，確保不露白。
    x = Math.max(Math.min(newX, 0), containerW - curW);
  }

  let y = newY;
  if (curH <= containerH) {
    // 情況 A：圖片比容器矮。強制垂直置中。
    y = (containerH - curH) / 2;
  } else {
    // 情況 B：圖片比容器高。限制範圍在 [容器高 - 圖片高, 0]。
    y = Math.max(Math.min(newY, 0), containerH - curH);
  }

  return { x, y };
}
