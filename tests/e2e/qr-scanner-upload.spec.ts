import { expect, test } from '@playwright/test';
import { APP_URL, setupGeneratorPage } from './utils/generator';

const qrUploadText = 'https://example.com/upload-test';

const qrUploadBase64 = [
  'iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB1PADUAAAAAklEQVR4AewaftIAAAS8SURBVO3BSY4jSRAEQdMA//9lnT76KYBEOquXMR',
  'H8JVVLTqoWnVQtOqladFK16KRq0UnVopOqRSdVi06qFp1ULTqpWnRSteikatFJ1aKTqkWfvATkJ6l5AsiNmieAfJOaCchPUvPGSdWik6pFJ1WLPlmmZhOQJ4BMam6ATG',
  'pu1PxOajYB2XRSteikatFJ1aJPvgzIE2qeADKpmYDcqLkBMqmZgExqJiCTmk1AnlDzTSdVi06qFp1ULfrkH6fmDTVPAJnU3ACZ1PzNTqoWnVQtOqla9Mk/BshPUjMBmY',
  'D8n5xULTqpWnRSteiTL1PzO6mZgGwCcqPmBsgbav4kJ1WLTqoWnVQt+mQZkN9JzQRkUjMBmdRMQCY1E5BJzQRkUvMGkD/ZSdWik6pFJ1WLPnlJzZ9MzQTkBsikZgIyqb',
  'lR84aav8lJ1aKTqkUnVYs+eQnIpGYCsknNpGYCMqmZ1ExAJjUTkCeATGreALJJzTedVC06qVp0UrXok2VAJjUTkBs1N0AmNTdAJjVPqJmATEAmNROQn6TmCSCTmjdOqh',
  'adVC06qVr0yTI1N2qeAPKEmhsgb6h5Q80EZAIyqZmAbFKz6aRq0UnVopOqRZ8sAzKpmYBMaiYgk5oJyARkUjMBuVFzA2RSMwGZ1ExqJiCb1ExAJjUTkEnNppOqRSdVi0',
  '6qFn3ykpoJyCYgm9RMQCY1k5ongExqbtQ8oeYJIJOabzqpWnRSteikatEnP0zNBGRScwPkBsgNkBsgT6i5AfIEkDfUPAFkUvPGSdWik6pFJ1WL8JcsAnKj5gbIjZpvAv',
  'KGmieATGomIJvUfNNJ1aKTqkUnVYs+eQnIpGYC8oSaGyA3aiYgk5oJyI2aCcik5gbIpOYGyKTmBsik5gbIpGbTSdWik6pFJ1WLPlkGZBOQGzU3ap5QMwF5AsgNkEnNG2',
  'omIDdqvumkatFJ1aKTqkWffJmaGyA3ap4AMql5Q80EZALyBpBNaiYgN0AmNW+cVC06qVp0UrXok2VqboA8AeRGzaRmAnKj5gk1m4BMap4A8oaaTSdVi06qFp1ULfrky4',
  'C8oWYC8oaaCcikZgIyqZmATGpugGxSc6NmAjKp2XRSteikatFJ1SL8JS8AmdRsAnKjZgLyhJpNQCY1E5BvUjMBeULNGydVi06qFp1ULcJf8hcDcqNmAjKpmYA8oeYNIJ',
  'OaJ4BsUvPGSdWik6pFJ1WLPnkJyE9SM6n5mwB5Asik5g0133RSteikatFJ1aJPlqnZBOQGyKRmAvKGmgnIBGRSMwF5Q80Tap4AMql546Rq0UnVopOqRZ98GZAn1LwBZF',
  'IzAZmATGomIE8AmdTcAJmAbAIyqfmmk6pFJ1WLTqoWffI/o2YCcqPmBsikZgLyhpoJyKRmAvKEmk0nVYtOqhadVC365B+j5gk1TwB5Qs0TQCYgN0CeADKp2XRSteikat',
  'FJ1aJPvkzNN6m5AfKGmknNJiCTmgnIG2omIN90UrXopGrRSdWiT5YB+UlAJjWTmjeAvKFmAjKpmYC8oWYCMqn5ppOqRSdVi06qFuEvqVpyUrXopGrRSdWik6pFJ1WLTq',
  'oWnVQtOqladFK16KRq0UnVopOqRSdVi06qFp1ULfoPdeMiSv2BX0oAAAAASUVORK5CYII='
].join('');

const qrUploadBuffer = Buffer.from(qrUploadBase64, 'base64');

test.beforeEach(async ({ page }, testInfo) => {
  await setupGeneratorPage(page, testInfo);
});

test.describe('QR scanner uploads', () => {
  test('decodes QR code from uploaded image', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    const scannerTab = page.getByRole('button', { name: '📷 Сканер' });
    await scannerTab.waitFor({ state: 'visible', timeout: 30_000 });
    await scannerTab.click();

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    await fileInput.setInputFiles({
      name: 'qr-upload.png',
      mimeType: 'image/png',
      buffer: qrUploadBuffer
    });

    const resultItem = page.locator('.scanner__results li').first();
    await expect(resultItem).toBeVisible({ timeout: 30_000 });

    await expect(resultItem.locator('.pill')).toHaveText('🖼️');
    await expect(resultItem.locator('code')).toHaveText(qrUploadText);
    await expect(page.locator('.error-text')).toHaveCount(0);
  });
});
