import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface BarcodeBatangProps {
  value: string;
  width?: number;
  height?: number;
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  fontOptions?: string;
  className?: string;
  label?: string;
  showCodeText?: boolean;
  background?: string;
  lineColor?: string;
}

/**
 * Komponen Barcode Batang (Linear Barcode 1D - Standar Code 128)
 * Sesuai kebutuhan MTs. Darul Huda: Model barcode batang untuk santri & guru.
 * Menghasilkan SVG vektor tajam tanpa pecah saat dicetak di kertas KTA/A4
 * dan kompatibel dengan scanner barcode USB/Bluetooth maupun kamera HP.
 */
export const BarcodeBatang: React.FC<BarcodeBatangProps> = ({
  value,
  width = 1.6,
  height = 46,
  format = 'CODE128',
  displayValue = true,
  fontSize = 12,
  textMargin = 4,
  fontOptions = 'bold',
  className = '',
  label,
  showCodeText = true,
  background = 'transparent',
  lineColor = '#0f172a',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const cleanValue = (value || '').trim() || 'DARUL-HUDA';

    try {
      JsBarcode(svgRef.current, cleanValue, {
        format: format,
        width: width,
        height: height,
        displayValue: displayValue && showCodeText,
        text: label || cleanValue,
        fontSize: fontSize,
        font: 'monospace',
        textMargin: textMargin,
        fontOptions: fontOptions,
        background: background,
        lineColor: lineColor,
        margin: 4,
      });
    } catch (err) {
      console.warn('JsBarcode render warning for value:', cleanValue, err);
      // Fallback try with alphanumeric clean
      try {
        const fallbackValue = cleanValue.replace(/[^a-zA-Z0-9-]/g, '');
        JsBarcode(svgRef.current, fallbackValue || 'DARULHUDA', {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue && showCodeText,
          text: label || fallbackValue,
          fontSize: fontSize,
          font: 'monospace',
          textMargin: textMargin,
          fontOptions: fontOptions,
          background: background,
          lineColor: lineColor,
          margin: 4,
        });
      } catch (innerErr) {
        console.error('JsBarcode failed completely:', innerErr);
      }
    }
  }, [value, width, height, format, displayValue, fontSize, textMargin, fontOptions, label, showCodeText, background, lineColor]);

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-center overflow-hidden max-w-full">
        <svg 
          ref={svgRef} 
          className="max-w-full h-auto select-none"
        />
      </div>
    </div>
  );
};

export default BarcodeBatang;
