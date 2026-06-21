// ============================================================
// Image Preprocessor — Canvas API Pipeline
// Silvana Financeiro OCR
// ============================================================
// Técnicas implementadas:
//   1. Conversão para escala de cinza
//   2. Upscale 2x (aumenta DPI virtual)
//   3. Contrast stretching (realce de contraste)
//   4. Gaussian blur leve (redução de ruído)
//   5. Binarização adaptativa (threshold por blocos)
//   6. Deskew automático (correção de inclinação)
// ============================================================

/**
 * Carrega uma File/Blob em um HTMLImageElement.
 */
function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (typeof source === "string") {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Cria um canvas com as dimensões especificadas e
 * retorna o contexto 2D.
 */
function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

/**
 * Etapa 1: Converte para escala de cinza usando luminância ponderada.
 * Luminância = 0.299R + 0.587G + 0.114B
 */
function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
  }
  return imageData;
}

/**
 * Etapa 2: Contrast stretching.
 * Mapeia os valores de pixel para o intervalo completo [0, 255]
 * encontrando os mínimos e máximos reais da imagem.
 */
function stretchContrast(imageData: ImageData): ImageData {
  const data = imageData.data;
  let min = 255;
  let max = 0;

  // Encontra min/max (apenas canal R, que é igual ao G e B após grayscale)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  const range = max - min || 1;

  for (let i = 0; i < data.length; i += 4) {
    const stretched = ((data[i] - min) / range) * 255;
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
  return imageData;
}

/**
 * Etapa 3: Gaussian blur 3x3 leve para redução de ruído.
 * Kernel: 1/16 * [[1,2,1],[2,4,2],[1,2,1]]
 */
function gaussianBlur(imageData: ImageData, width: number, height: number): ImageData {
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kSum = 16;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += src[idx] * kernel[k++];
        }
      }
      const out = (y * width + x) * 4;
      const val = sum / kSum;
      dst[out] = dst[out + 1] = dst[out + 2] = val;
    }
  }
  return imageData;
}

/**
 * Contrast stretching por percentis — mais robusto que min/max puro.
 * Recorta `loPct`% dos pixels mais escuros e `hiPct`% dos mais claros
 * do histograma antes de expandir o range. Isso evita que pixels de
 * encadernação/sombra dominem e "achaquem" o contraste do texto.
 */
function stretchContrastPercentile(
  imageData: ImageData,
  loPercent = 5,
  hiPercent = 95
): ImageData {
  const data = imageData.data;
  const hist = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    hist[data[i]]++;
  }

  const totalPixels = data.length / 4;
  const loThreshold = Math.floor((loPercent / 100) * totalPixels);
  const hiThreshold = Math.floor((hiPercent / 100) * totalPixels);

  let cumul = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    cumul += hist[v];
    if (cumul >= loThreshold) { lo = v; break; }
  }

  cumul = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    cumul += hist[v];
    if (cumul >= totalPixels - hiThreshold) { hi = v; break; }
  }

  const range = hi - lo || 1;
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.max(0, Math.min(255, ((data[i] - lo) / range) * 255));
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
  return imageData;
}

/**
 * Unsharp Mask — técnica de sharpening que realça bordas.
 * Subtrai uma versão borrada da imagem e re-adiciona com intensidade `amount`.
 * Realça as bordas das letras sem amplificar grãos de ruído.
 */
function unsharpMask(
  imageData: ImageData,
  width: number,
  height: number,
  amount = 0.5
): ImageData {
  const src = new Uint8ClampedArray(imageData.data);
  const blurred = new Uint8ClampedArray(src);

  // Gaussian blur 3x3 na cópia
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kSum = 16;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += src[idx] * kernel[k++];
        }
      }
      blurred[(y * width + x) * 4] = sum / kSum;
    }
  }

  // USM: saída = original + amount * (original - blurred)
  const dst = imageData.data;
  for (let i = 0; i < src.length; i += 4) {
    const sharpened = src[i] + amount * (src[i] - blurred[i]);
    const clamped = Math.max(0, Math.min(255, sharpened));
    dst[i] = dst[i + 1] = dst[i + 2] = clamped;
  }
  return imageData;
}

/**
 * Etapa 4: Binarização adaptativa por blocos (Sauvola-like simplificado).
 * Para cada pixel, compara com a média local de uma janela NxN.
 * Ideal para imagens com iluminação irregular.
 */
function adaptiveThreshold(
  imageData: ImageData,
  width: number,
  height: number,
  blockSize = 32,
  c = 10
): ImageData {
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calcula a média local dentro do bloco
      const x0 = Math.max(0, x - blockSize);
      const x1 = Math.min(width - 1, x + blockSize);
      const y0 = Math.max(0, y - blockSize);
      const y1 = Math.min(height - 1, y + blockSize);

      let sum = 0;
      let count = 0;
      for (let by = y0; by <= y1; by += 2) {
        for (let bx = x0; bx <= x1; bx += 2) {
          sum += src[(by * width + bx) * 4];
          count++;
        }
      }
      const mean = sum / (count || 1);
      const pixel = src[(y * width + x) * 4];
      const val = pixel > mean - c ? 255 : 0;
      const idx = (y * width + x) * 4;
      dst[idx] = dst[idx + 1] = dst[idx + 2] = val;
    }
  }
  return imageData;
}

/**
 * Etapa 5: Deskew — Correção de inclinação.
 * Usa projeção de histogramas horizontais:
 * testa ângulos de -10° a +10° e escolhe aquele que
 * maximiza a variância das projeções (texto alinhado).
 *
 * Opera sobre uma versão reduzida (thumbnail) para performance.
 */
function detectSkewAngle(
  imageData: ImageData,
  width: number,
  height: number
): number {
  // Trabalha com resolução reduzida para performance
  const scale = Math.min(1, 400 / Math.max(width, height));
  const sw = Math.floor(width * scale);
  const sh = Math.floor(height * scale);

  // Cria canvas temporário para resize
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = sw;
  tmpCanvas.height = sh;
  const tmpCtx = tmpCanvas.getContext("2d")!;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = width;
  srcCanvas.height = height;
  srcCanvas.getContext("2d")!.putImageData(imageData, 0, 0);
  tmpCtx.drawImage(srcCanvas, 0, 0, sw, sh);

  const small = tmpCtx.getImageData(0, 0, sw, sh);
  const pixels = small.data;

  let bestAngle = 0;
  let bestVariance = -1;

  // Testa ângulos em passos de 0.5°
  for (let angleDeg = -10; angleDeg <= 10; angleDeg += 0.5) {
    const rad = (angleDeg * Math.PI) / 180;
    const hist = new Array(sh).fill(0);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const px = pixels[(y * sw + x) * 4];
        if (px < 128) {
          // Pixel escuro = possível texto
          const newY = Math.round(
            (x - sw / 2) * Math.sin(rad) + (y - sh / 2) * Math.cos(rad) + sh / 2
          );
          if (newY >= 0 && newY < sh) hist[newY]++;
        }
      }
    }

    // Calcula variância do histograma
    const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
    const variance = hist.reduce((v, h) => v + (h - mean) ** 2, 0) / hist.length;

    if (variance > bestVariance) {
      bestVariance = variance;
      bestAngle = angleDeg;
    }
  }

  return bestAngle;
}

/**
 * Aplica rotação no canvas para corrigir inclinação.
 */
function applyDeskew(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  angle: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (Math.abs(angle) < 0.3) return { canvas, ctx }; // Dentro da tolerância

  const rad = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = Math.floor(canvas.width * cos + canvas.height * sin);
  const newH = Math.floor(canvas.height * cos + canvas.width * sin);

  const { canvas: rotCanvas, ctx: rotCtx } = createCanvas(newW, newH);
  rotCtx.fillStyle = "#ffffff";
  rotCtx.fillRect(0, 0, newW, newH);
  rotCtx.translate(newW / 2, newH / 2);
  rotCtx.rotate(-rad);
  rotCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  rotCtx.setTransform(1, 0, 0, 1, 0, 0);

  return { canvas: rotCanvas, ctx: rotCtx };
}

// ============================================================
// Função principal: preprocessImage
// ============================================================

export interface PreprocessResult {
  blob: Blob;
  previewUrl: string;
  /** Ângulo de inclinação detectado (graus) */
  skewAngle: number;
  /** Dimensões da imagem processada */
  width: number;
  height: number;
}

/**
 * Pipeline completo de pré-processamento de imagem para OCR.
 *
 * Ordem das etapas:
 * 1. Carrega imagem
 * 2. Upscale 2x
 * 3. Grayscale
 * 4. Contrast Stretching suave (90th-percentile clip)
 * 5. Sharpening leve (unsharp mask)
 * 6. Deskew detection & correction
 * 7. Adaptive Threshold (binarização — OPCIONAL, desativada por padrão)
 *
 * NOTA: A binarização adaptativa melhora texto impresso mas pode degradar
 * a leitura de escrita manual em cadernos com linhas coloridas (azul/verde).
 * Para cadernos manuscritos, use binarize=false (padrão).
 */
export async function preprocessImage(
  source: File | Blob | string,
  upscaleFactor: 1 | 2 | 3 = 2,
  binarize = false   // ← desativado por padrão para cadernos manuscritos
): Promise<PreprocessResult> {
  // 1. Carrega a imagem
  const img = await loadImage(source);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // 2. Upscale condicional ou Downscale para limite do payload da Vercel (máx 4.5MB)
  let W = origW;
  let H = origH;

  if (origW < 1500 && origH < 1500) {
    // Se a imagem for pequena, faz upscale para melhorar leitura
    W = origW * upscaleFactor;
    H = origH * upscaleFactor;
  } else {
    // Se for gigante (celulares modernos), redimensiona proporcionalmente para no máximo 2500px
    const maxDimension = 2500;
    if (origW > maxDimension || origH > maxDimension) {
      const ratio = origW / origH;
      if (origW > origH) {
        W = maxDimension;
        H = Math.round(maxDimension / ratio);
      } else {
        H = maxDimension;
        W = Math.round(maxDimension * ratio);
      }
    }
  }

  let { canvas, ctx } = createCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  // 3. Lê pixels e aplica grayscale
  let imageData = ctx.getImageData(0, 0, W, H);
  imageData = toGrayscale(imageData);
  ctx.putImageData(imageData, 0, 0);

  // 4. Contrast Stretching suave — recorta 5%/95% do histograma para evitar
  //    que pixels muito escuros (encadernação, sombras) dominem o range
  imageData = ctx.getImageData(0, 0, W, H);
  imageData = stretchContrastPercentile(imageData, 5, 95);
  ctx.putImageData(imageData, 0, 0);

  // 5. Sharpening leve — realça bordas das letras sem amplificar ruído
  imageData = ctx.getImageData(0, 0, W, H);
  imageData = unsharpMask(imageData, W, H, 0.5);
  ctx.putImageData(imageData, 0, 0);

  // 6. Deskew: detecta e corrige inclinação
  imageData = ctx.getImageData(0, 0, W, H);
  const skewAngle = detectSkewAngle(imageData, W, H);

  // Limita o deskew para evitar rotações falsas (ex: causadas pelas espirais ou margem do caderno)
  if (Math.abs(skewAngle) > 0.5 && Math.abs(skewAngle) < 6) {
    const deskewed = applyDeskew(canvas, ctx, skewAngle);
    canvas = deskewed.canvas;
    ctx = deskewed.ctx;
  }

  // 7. Binarização adaptativa (apenas quando solicitada explicitamente)
  //    Use blockSize=64 e C=15 — mais suave que antes (era 40/8)
  if (binarize) {
    const dW = canvas.width;
    const dH = canvas.height;
    imageData = ctx.getImageData(0, 0, dW, dH);
    imageData = adaptiveThreshold(imageData, dW, dH, 64, 15);
    ctx.putImageData(imageData, 0, 0);
  }

  // Exporta resultado
  const previewUrl = canvas.toDataURL("image/jpeg", 0.85);
  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.85)
  );

  return {
    blob,
    previewUrl,
    skewAngle,
    width: canvas.width,
    height: canvas.height,
  };
}

