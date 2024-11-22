import sharp from 'sharp';

export async function processImage(imageUrl: string): Promise<Buffer> {
  const image = await sharp(imageUrl)
    .resize(1500)
    .grayscale()
    .normalize()
    .toBuffer();

  return image;
}