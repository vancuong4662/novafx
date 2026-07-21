import { describe, expect, it, vi } from 'vitest';
import { drawCoverImage } from './previewCanvas.js';

describe('drawCoverImage', () => {
  it('scales and centers a background image to cover the preview canvas', () => {
    const context = { drawImage: vi.fn() };
    const image = { naturalWidth: 100, naturalHeight: 50 };

    drawCoverImage(context, image, 200, 200);

    expect(context.drawImage).toHaveBeenCalledWith(image, -100, 0, 400, 200);
  });
});