'use client';

/**
 * Genera un QR para /producto/[slug] usando la librería `qrcode`.
 * Se renderiza en un <canvas> y ofrece descarga como PNG.
 */
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  slug: string;
  /** Texto bajo el QR (nombre + precio), usado solo en la vista imprimible */
  label?: string;
  /** Tamaño en px del canvas (default 160) */
  size?: number;
}

export function QrCode({ slug, size = 160 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';
  const url = `${baseUrl}/producto/${slug}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    }).catch(() => null);
  }, [url, size]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas ref={canvasRef} className="rounded" />
      <button
        type="button"
        onClick={handleDownload}
        className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 transition underline underline-offset-2"
      >
        Descargar PNG
      </button>
    </div>
  );
}

/**
 * Versión mínima para la hoja imprimible:
 * solo el canvas sin botón, con nombre y precio debajo.
 */
export function QrCodePrint({
  slug,
  name,
  price,
  size = 120,
}: {
  slug: string;
  name: string;
  price: number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';
  const url = `${baseUrl}/producto/${slug}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    }).catch(() => null);
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <canvas ref={canvasRef} className="rounded" />
      <p className="text-[11px] font-semibold text-neutral-900 leading-tight max-w-[120px] break-words">
        {name}
      </p>
      <p className="text-[11px] text-neutral-600">S/ {price.toFixed(2)}</p>
    </div>
  );
}
