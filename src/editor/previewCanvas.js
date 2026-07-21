export function drawCoverImage(context, image, width, height) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  if (!imageWidth || !imageHeight || !width || !height) {
    return;
  }

  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
}

export function downloadJson(data, fileName) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}