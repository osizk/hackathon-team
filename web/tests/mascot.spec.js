import { test, expect } from '@playwright/test';
import { home } from './helpers.js';

const expectPose = async (page, pose, flip = '1') => {
  const mascot = page.locator('#mascot');
  await expect(mascot).toHaveAttribute('data-mascot-pose', pose);
  await expect(mascot).toHaveAttribute('data-ready', '1');
  await expect(mascot).toHaveAttribute('data-rendered-pose', pose);
  await expect(mascot).toHaveCSS('scale', flip);
};

test('idle is mirrored and renders the JPEG background transparent without losing the face', async ({ page }, testInfo) => {
  await home(page);
  await expectPose(page, 'idle', '-1 1');
  await expect.poll(() => page.locator('#mascot').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  const alpha = await page.locator('#mascot').evaluate((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return [ctx.getImageData(0, 0, 1, 1).data[3], ctx.getImageData(512, 450, 1, 1).data[3]];
  });
  expect(alpha).toEqual([0, 255]);
  await page.screenshot({ path: testInfo.outputPath('idle.png') });
});

test('mic takes priority over voice; processing and idle are mirrored independently of animation', async ({ page }) => {
  await home(page);
  await page.evaluate(() => document.body.classList.add('speaking', 'listening'));
  await expectPose(page, 'listening');
  await page.evaluate(() => document.body.classList.remove('listening'));
  await expectPose(page, 'speaking');
  await page.evaluate(() => document.body.classList.add('thinking'));
  await expectPose(page, 'running', '-1 1');
  await page.evaluate(() => document.body.classList.remove('thinking', 'speaking'));
  await expectPose(page, 'idle', '-1 1');
});

test('scene outcomes select sad, celebration and running; leaving scenes do not leak their mood', async ({ page }) => {
  await home(page);
  await page.evaluate(() => {
    window.agentOS.openScene('payment');
    document.querySelector('.scene-payment').classList.add('denied');
  });
  await expectPose(page, 'sad');
  await page.evaluate(() => {
    const scene = document.querySelector('.scene-payment');
    scene.classList.remove('denied');
    scene.classList.add('paid');
  });
  await expectPose(page, 'jump');
  await page.evaluate(() => window.agentOS.openScene('training'));
  await expectPose(page, 'idle', '-1 1');
  await expect(page.locator('.treadmill')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('.treadmill')).toHaveCSS('scale', '-1 1');
  await page.evaluate(() => document.querySelector('.scene-training').classList.add('signed-up'));
  await expectPose(page, 'running', '-1 1');
  await page.evaluate(() => window.agentOS.closeScene());
  await expectPose(page, 'idle', '-1 1');
});
