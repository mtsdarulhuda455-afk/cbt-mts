import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface SquareBarcodeProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
  showCodeText?: boolean;
}

/**
 * Barcode Berbentuk Kotak (2D Matrix / QR Code)
 * Sesuai permintaan MTs. Darul Huda: Barcode kotak untuk kartu santri & guru
 * Dapat dibaca oleh scanner barcode eksternal USB 2D/QR maupun kamera HP.
 */
export const SquareBarcode: React.FC<SquareBarcodeProps> = ({
  value,
  size = 120,
  className = '',
  label,
  showCodeText = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const safeValue = (value || '').trim() || 'MTS-DARUL-HUDA';

    QRCode.toDataURL(safeValue, {
      width: Math.max(size * 2, 200), // Retina / high-DPI quality for printing
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating square barcode:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className="p-1.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          <img 
            src={dataUrl} 
            alt={`Barcode Kotak ${value}`} 
            className="w-full h-full object-contain select-none"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400">
            ...
          </div>
        )}
      </div>
      {showCodeText && (
        <span className="font-mono text-[11px] font-black tracking-wider text-slate-800 mt-1 select-all">
          {label || value}
        </span>
      )}
    </div>
  );
};
