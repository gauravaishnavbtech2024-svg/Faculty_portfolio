'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Props = {
  file: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
};

export default function ImageCropModal({ file, onCropComplete, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, [file]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.3, Math.min(3.5, z + delta)));
  };

  const handleCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const cropSize = 320; // 320x320 retina avatar output

    const canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewSize = 256;
    const scale = cropSize / viewSize;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropSize, cropSize);

    ctx.save();
    ctx.translate(cropSize / 2, cropSize / 2);
    ctx.translate(pan.x * scale, pan.y * scale);
    ctx.scale(zoom * scale, zoom * scale);

    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col items-center">
        <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Adjust & Center Profile Headshot
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Drag to reposition and adjust the zoom slider so your headshot aligns within the circle.
        </p>

        {/* Cropper Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
          onWheel={handleWheel}
          className="relative mt-5 w-64 h-64 rounded-2xl bg-slate-900 overflow-hidden cursor-move select-none flex items-center justify-center"
        >
          {imgSrc && (
            <img
              ref={imageRef}
              src={imgSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                maxWidth: 'none',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              }}
              className="pointer-events-none origin-center"
            />
          )}

          {/* Circular Mask Overlay */}
          <div className="absolute inset-0 pointer-events-none border-[32px] border-slate-900/60 rounded-full box-content -m-[32px] shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ring-2 ring-white/90" />
        </div>

        {/* Zoom Controls */}
        <div className="w-full mt-6 px-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm transition-colors"
            >
              −
            </button>
            <input
              type="range"
              min="0.3"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#2547d0] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.1))}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3 w-full mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="flex-1 rounded-xl bg-[#2547d0] hover:bg-[#1e3bb8] py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:scale-[1.02]"
          >
            Crop & Apply Photo
          </button>
        </div>
      </div>
    </div>
  );
}
