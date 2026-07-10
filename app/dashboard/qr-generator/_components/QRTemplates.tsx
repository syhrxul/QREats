import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TemplateProps {
  templateId: 'minimalist' | 'vintage' | 'dark' | 'tent';
  table: {
    id: number;
    name: string;
    token: string;
  };
  shopName: string;
  appDomain: string;
}

export function QRTemplateCard({ templateId, table, shopName, appDomain }: TemplateProps) {
  const url = `${appDomain}/order/${encodeURIComponent(table.token)}`;
  const numberMatch = table.name.match(/\d+$/);
  const number = numberMatch ? numberMatch[0] : '';
  const namePrefix = table.name.replace(/[-_ ]*\d+$/, '').trim();

  switch (templateId) {
    case 'vintage':
      return (
        <div
          id={`qr-card-${table.name}`}
          className="bg-[#FAF6EE] border-4 double border-[#5C4033] rounded-3xl p-6 flex flex-col items-center justify-between text-[#5C4033] w-full min-h-[360px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
        >
          <div className="absolute inset-1 border border-[#5C4033]/20 rounded-2xl pointer-events-none" />
          <div className="text-center w-full pt-1">
            <p className="text-[9px] font-bold tracking-widest uppercase font-serif italic text-[#5C4033]/60">Welcome to</p>
            <h3 className="text-sm font-bold font-serif tracking-tight mt-0.5 truncate uppercase">{shopName || 'QREats Cafe'}</h3>
            <div className="w-16 h-[1px] bg-[#5C4033]/35 mx-auto mt-1" />
          </div>
          <div className="p-3 bg-[#FAF6EE] border-2 border-[#5C4033] rounded-2xl my-3">
            <QRCodeSVG value={url} size={120} bgColor="#FAF6EE" fgColor="#5C4033" level="H" />
          </div>
          <div className="text-center w-full pb-1">
            <p className="text-xs font-serif italic text-[#5C4033]/70">{namePrefix || 'Table'}</p>
            <p className="text-3xl font-black font-serif mt-0.5">{number ? `No. ${number}` : 'Meja'}</p>
            <p className="text-[8px] uppercase tracking-widest mt-2.5 font-bold text-[#5C4033]/45 print:hidden">Scan to Order & Pay</p>
            <a
              href={`/order/${table.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-[#5C4033]/60 font-semibold underline underline-offset-2 hover:text-[#5C4033] transition-colors print:hidden"
            >
              Buka Link ↗
            </a>
          </div>
        </div>
      );
    case 'dark':
      return (
        <div
          id={`qr-card-${table.name}`}
          className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-3xl p-6 flex flex-col items-center justify-between text-white w-full min-h-[360px] shadow-md relative qr-card-print group hover:shadow-lg transition-all duration-300"
        >
          <div className="text-center w-full">
            <p className="text-[9px] font-black tracking-widest text-[#D4AF37] uppercase">PREMIUM SELF ORDER</p>
            <h3 className="text-xs font-black tracking-tight mt-1 truncate uppercase">{shopName || 'QREats Venue'}</h3>
          </div>
          <div className="p-3 bg-white rounded-2xl my-4 ring-2 ring-[#D4AF37]/30">
            <QRCodeSVG value={url} size={120} bgColor="#FFFFFF" fgColor="#1A1A1A" level="H" />
          </div>
          <div className="text-center w-full">
            <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{namePrefix || 'Table'}</p>
            <p className="text-4xl font-extrabold tracking-tighter mt-1 text-white">{number ? `#${number}` : 'Meja'}</p>
            <p className="text-[8px] text-[#D4AF37] uppercase tracking-widest font-bold mt-2.5 print:hidden">Scan to Order & Pay</p>
            <a
              href={`/order/${table.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-white/50 font-semibold underline underline-offset-2 hover:text-white transition-colors print:hidden"
            >
              Buka Link ↗
            </a>
          </div>
        </div>
      );
    case 'tent':
      return (
        <div
          id={`qr-card-${table.name}`}
          className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 flex flex-col items-center justify-between text-[#1A1A1A] w-full min-h-[480px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
        >
          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300 flex items-center justify-center pointer-events-none">
            <span className="bg-white px-2 text-[8px] font-bold text-gray-400 tracking-wider uppercase -mt-2">Garis Lipat / Fold Here</span>
          </div>
          <div className="w-full text-center flex flex-col items-center justify-center transform rotate-180 h-1/2 pb-6 border-b border-gray-100/50">
            <h3 className="text-sm font-black tracking-tight mb-1 truncate text-gray-600 uppercase">{shopName || 'QREats Cafe'}</h3>
            <p className="text-[9px] text-gray-400 font-bold max-w-[200px] leading-relaxed">
              Selamat datang! Silakan scan QR code di sisi sebaliknya untuk memesan mandiri dari meja Anda.
            </p>
          </div>
          <div className="w-full text-center flex flex-col items-center justify-between h-1/2 pt-6">
            <div className="p-2.5 bg-[#FAF6EE] border border-gray-200 rounded-2xl mx-auto w-fit">
              <QRCodeSVG value={url} size={90} bgColor="#FAF6EE" fgColor="#1A1A1A" level="H" />
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{namePrefix || 'Table'}</p>
              <p className="text-2xl font-black tracking-tight text-black mt-0.5">{number ? `Meja ${number}` : 'Meja'}</p>
              <a
                href={`/order/${table.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-[9px] text-gray-400 font-semibold underline underline-offset-2 hover:text-black transition-colors print:hidden"
              >
                Buka Link ↗
              </a>
            </div>
          </div>
        </div>
      );
    case 'minimalist':
    default:
      return (
        <div
          id={`qr-card-${table.name}`}
          className="bg-white border border-[#1A1A1A]/10 rounded-3xl p-6 flex flex-col items-center justify-between text-[#1A1A1A] w-full min-h-[360px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
        >
          <div className="text-center w-full">
            <h3 className="text-sm font-black tracking-tight mt-1 truncate uppercase">{shopName || 'QREats Cafe'}</h3>
          </div>
          <div className="p-2.5 bg-[#F5F2EB] rounded-2xl my-3">
            <QRCodeSVG value={url} size={130} bgColor="#F5F2EB" fgColor="#1A1A1A" level="H" />
          </div>
          <div className="text-center w-full">
            <p className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-wider">{namePrefix || 'Table'}</p>
            <p className="text-4xl font-black tracking-tighter mt-1">{number ? `#${number}` : 'Meja'}</p>
            <p className="text-[9px] text-[#1A1A1A]/30 uppercase tracking-widest font-bold mt-2.5 print:hidden">Scan to Order</p>
            <a
              href={`/order/${table.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-blue-500 font-semibold underline underline-offset-2 hover:text-blue-600 transition-colors print:hidden"
            >
              Buka Link ↗
            </a>
          </div>
        </div>
      );
  }
}
