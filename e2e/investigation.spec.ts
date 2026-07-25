import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForGame(page: Page) {
  await page.goto("/");
  await page.locator('[data-load-state="ready"] canvas').waitFor();
}

async function canvasColorCount(page: Page) {
  const screenshot = await page.locator("canvas").screenshot();
  return page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 54;
      const context = canvas.getContext("2d");

      if (!context) return 0;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set<string>();

      for (let index = 0; index < data.length; index += 16) {
        colors.add(Array.from(data.slice(index, index + 4)).join(","));
      }

      return colors.size;
    },
    "data:image/png;base64," + screenshot.toString("base64"),
  );
}

test.beforeEach(async ({ page }) => {
  await waitForGame(page);
});

test("首屏可交互且 Phaser 画布包含有效像素", async ({ page }) => {
  await expect(page.getByText("ENGLISHTECH", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "丹阙疑云" })).toBeVisible();
  expect(await canvasColorCount(page)).toBeGreaterThan(8);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
});

test("可以切换案件并保持游戏世界就绪", async ({ page }) => {
  await page.getByRole("button", { name: "零点回声" }).click();
  await expect(page.getByRole("heading", { name: "零点回声" })).toBeVisible();
  await expect(page.locator('[data-load-state="ready"] canvas')).toBeVisible();
});

test("正确英文输入推进剧情并记录掌握", async ({ page }) => {
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByLabel("启用倒计时").uncheck();
  await page.getByRole("button", { name: "关闭设置" }).click();
  await page.getByLabel("英文回应").fill("evidence");
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page.getByText("你保留了证据链，案件时钟没有推进。")).toBeVisible();
  await expect(page.getByLabel("英文回应")).toHaveValue("");
  await expect(page.getByText("掌握 1")).toHaveText("掌握 1");
});

test("超时不降低已获得的掌握度", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.getByLabel("英文回应").fill("evidence");
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page.getByText("掌握 1")).toBeVisible();
  await expect(page.getByText("错误方向消耗了调查窗口，但你获得了可解释的订正。")).toBeVisible({ timeout: 18_000 });
  await expect(page.getByText("掌握 1")).toBeVisible();
});

test("移动端没有横向溢出或控制区遮挡任务台", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
  const overlaps = await page.evaluate(() => {
    const controls = document.querySelector(".touch-controls") as HTMLElement;
    const consolePanel = document.querySelector(".evidence-console") as HTMLElement;
    return controls.getBoundingClientRect().bottom > consolePanel.getBoundingClientRect().top;
  });
  expect(overlaps).toBe(false);
});

test("没有严重或关键的 axe 可访问性问题", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

