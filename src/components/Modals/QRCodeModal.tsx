import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, ExternalLink, X } from 'lucide-react';
import { EventDetails } from '../../types';
import { CommunicationService } from '../../services/communicationService';

interface QRCodeModalProps {
  event: EventDetails;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ event, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const guestHubUrl = CommunicationService.getGuestEventUrl(event);

  useEffect(() => {
    QRCode.toDataURL(guestHubUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setDataUrl(url))
      .catch(err => console.error(err));
  }, [guestHubUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(guestHubUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${event.publicSlug}-qrcode.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white font-['Outfit']">
          Guest Event Hub QR Code
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Print on posters, badges, banners, or placecards so guests can instantly open the event portal on their mobile phones.
        </p>

        {/* QR Code Container */}
        <div className="my-5 bg-white p-4 rounded-2xl inline-block shadow-xl">
          {dataUrl ? (
            <img src={dataUrl} alt="PlanWise Event Hub QR Code" className="w-48 h-48 mx-auto" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs font-mono">
              Generating QR...
            </div>
          )}
        </div>

        {/* URL Display */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-left text-xs mb-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Hub Address</span>
          <div className="font-mono text-indigo-300 truncate mt-0.5">{guestHubUrl}</div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            onClick={handleCopy}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center justify-center space-x-1.5 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/25 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
