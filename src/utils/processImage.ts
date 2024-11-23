import sharp from 'sharp';

export async function processImage(file: Buffer): Promise<Buffer> {
  const image = await sharp(file)
    .normalize()
    .modulate({
      brightness: 1.3,  // Яркость
      saturation: 1.2, // Увеличение насыщенности (можно настроить)
    })
    .linear(1.5, -128) // Увеличение контрастности
    .threshold(90)
    .toBuffer();

  return image;
}