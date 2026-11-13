import type { Page } from "@playwright/test";

export async function flamePixels(page: Page) {
  await page.locator(".cc-flame-viewport").scrollIntoViewIfNeeded();
  const png = await page.locator(".cc-flame-viewport").screenshot();
  return page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height).data;
    // Separate the connected flame silhouette from wall lights/loose embers.
    const visited = new Uint8Array(image.width * image.height);
    const foreground = (pixel: number) => {
      const i = pixel * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      return Math.max(r, g, b) >= 65 && Math.max(r, g, b) - Math.min(r, g, b) >= 25;
    };
    let largest = { count: 0, brightness: 0, blue: 0, aspect: 0 };
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || !foreground(start)) continue;
      const queue = [start];
      visited[start] = 1;
      let count = 0, brightness = 0, blue = 0;
      let left = image.width, right = 0, top = image.height, bottom = 0;
      for (let head = 0; head < queue.length; head++) {
        const pixel = queue[head], x = pixel % image.width, y = Math.floor(pixel / image.width), i = pixel * 4;
        count++; brightness += data[i] + data[i + 1] + data[i + 2];
        if (data[i + 2] > data[i] * 1.4) blue++;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        for (const next of [x > 0 ? pixel - 1 : -1, x < image.width - 1 ? pixel + 1 : -1, pixel - image.width, pixel + image.width]) {
          if (next < 0 || next >= visited.length || visited[next] || !foreground(next)) continue;
          visited[next] = 1; queue.push(next);
        }
      }
      if (count > largest.count) largest = { count, brightness, blue, aspect: (right - left + 1) / (bottom - top + 1) };
    }
    image.close();
    return largest;
  }, png.toString("base64"));
}
