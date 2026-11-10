import React, { useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  FileText
} from 'lucide-react';

export interface SupportClientCredentialsProps {
  client: any;
  supportedUserName?: string | null;
  defaultExpanded?: boolean;
  className?: string;
  titlePrefix?: string;
}

export function SupportClientCredentials({
  client,
  supportedUserName,
  defaultExpanded = true,
  className = '',
  titlePrefix = 'Thông tin xử lý cho người hỗ trợ',
}: SupportClientCredentialsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showInvoicePass, setShowInvoicePass] = useState(false);
  const [showTaxPass, setShowTaxPass] = useState(false);
  const [showAccPass, setShowAccPass] = useState(false);
  const [showInsPass, setShowInsPass] = useState(false);

  if (!client) {
    return null;
  }

  const copyToClipboard = async (text: string, fieldKey: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleCopyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines: string[] = [
      `=== THÔNG TIN BÀN GIAO KHÁCH HÀNG ===`,
      `- Doanh nghiệp: ${client.name || ''}`,
      `- Mã số thuế: ${client.tax_code || ''}`,
    ];
    if (client.contact_name || client.contact_phone) {
      lines.push(`- Người liên hệ khách hàng: ${client.contact_name || ''} ${client.contact_phone ? `(${client.contact_phone})` : ''}`.trim());
    }
    if (supportedUserName) {
      lines.push(`- Người phụ trách chính: ${supportedUserName}`);
    } else if (client.accounting_person || client.insurance_person) {
      lines.push(`- Phụ trách: KT: ${client.accounting_person || '-'} | BHXH: ${client.insurance_person || '-'}`);
    }

    lines.push('\n[1. HÓA ĐƠN ĐIỆN TỬ]');
    lines.push(`- Link: ${client.invoice_link || '(Chưa cập nhật)'}`);
    lines.push(`- Tài khoản: ${client.invoice_user || client.tax_code || '(Trống)'}`);
    lines.push(`- Mật khẩu: ${client.invoice_pass || '(Trống)'}`);

    lines.push('\n[2. THUẾ ĐIỆN TỬ]');
    lines.push('- Link: https://thuedientu.gdt.gov.vn');
    lines.push(`- Tài khoản: ${client.tax_user || `${client.tax_code || ''}-ql` || '(Trống)'}`);
    lines.push(`- Mật khẩu: ${client.tax_pass || '(Trống)'}`);

    if (client.acc_software || client.acc_user) {
      lines.push('\n[3. PHẦN MỀM KẾ TOÁN]');
      lines.push(`- Phần mềm: ${client.acc_software || '-'} ${client.acc_version ? `(${client.acc_version})` : ''}`);
      lines.push(`- Tài khoản: ${client.acc_user || '-'}`);
      lines.push(`- Mật khẩu: ${client.acc_pass || '-'}`);
    }

    if (client.ins_software || client.ins_user) {
      lines.push('\n[4. PHẦN MỀM BHXH]');
      lines.push(`- Phần mềm: ${client.ins_software || '-'}`);
      lines.push(`- Tài khoản: ${client.ins_user || '-'}`);
      lines.push(`- Mật khẩu: ${client.ins_pass || '-'}`);
    }

    copyToClipboard(lines.join('\n'), 'all');
  };

  const hasInvoice = Boolean(client.invoice_link || client.invoice_user || client.invoice_pass);
  const hasTax = Boolean(client.tax_user || client.tax_pass);
  const hasAcc = Boolean(client.acc_software || client.acc_user || client.acc_pass);
  const hasIns = Boolean(client.ins_software || client.ins_user || client.ins_pass);

  const hasAnyCredentials = hasInvoice || hasTax || hasAcc || hasIns;

  return (
    <div
      className={`rounded-xl border border-purple-200/90 bg-purple-50/60 shadow-xs transition-all ${className}`}
    >
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 cursor-pointer select-none hover:bg-purple-100/60 rounded-xl transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-600 text-white shrink-0 shadow-2xs">
            <Key size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                {titlePrefix}
              </h4>
              {supportedUserName && (
                <span className="text-[11px] font-semibold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <UserCheck size={11} /> Phụ trách: {supportedUserName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-purple-700/90 mt-0.5 truncate">
              {client.name} {client.tax_code ? `· MST: ${client.tax_code}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {hasAnyCredentials && (
            <button
              type="button"
              onClick={handleCopyAll}
              title="Xuất và sao chép toàn bộ thông tin khách hàng để bàn giao"
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-purple-100/80 text-purple-800 border border-purple-300 flex items-center gap-1.5 transition shadow-2xs"
            >
              {copiedField === 'all' ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Đã xuất thông tin</span>
                </>
              ) : (
                <>
                  <FileText size={12} className="text-purple-600" />
                  <span>Xuất thông tin khách hàng</span>
                </>
              )}
            </button>
          )}

          <div className="p-1 rounded-md text-purple-700 hover:bg-purple-200/60">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4 pt-1 border-t border-purple-200/70 space-y-3">
          {!hasAnyCredentials ? (
            <div className="p-3 bg-white/80 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                Khách hàng này chưa được cập nhật thông tin xuất hóa đơn hoặc tài khoản thuế.
                {supportedUserName && ` (Người phụ trách ${supportedUserName} có thể cập nhật trong mục 'Khách hàng của tôi').`}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Box 1: Trang xuất hóa đơn */}
              <div className="bg-white/95 rounded-lg p-3 border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs text-blue-900">
                    <Globe size={13} className="text-blue-600" />
                    Trang xuất hóa đơn điện tử
                  </span>
                  {client.invoice_link && (
                    <a
                      href={client.invoice_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      <ExternalLink size={11} /> Mở web
                    </a>
                  )}
                </div>

                {client.invoice_link ? (
                  <div className="space-y-1">
                    <span className="text-gray-500 text-[11px]">Đường dẫn (URL):</span>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <span className="text-[11px] text-blue-700 font-mono truncate flex-1" title={client.invoice_link}>
                        {client.invoice_link}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(client.invoice_link, 'inv_link')}
                        className="text-gray-500 hover:text-blue-600 p-0.5"
                        title="Sao chép đường dẫn"
                      >
                        {copiedField === 'inv_link' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Chưa có link xuất hóa đơn</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-gray-500 text-[11px] block">Tên tài khoản:</span>
                    <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                      <span className="font-mono font-semibold text-gray-800 text-[11px] truncate">
                        {client.invoice_user || client.tax_code || '-'}
                      </span>
                      {(client.invoice_user || client.tax_code) && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(client.invoice_user || client.tax_code, 'inv_user')}
                          className="text-gray-500 hover:text-blue-600"
                          title="Sao chép tên tài khoản"
                        >
                          {copiedField === 'inv_user' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[11px] block">Mật khẩu:</span>
                    <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                      <span className="font-mono font-semibold text-gray-800 text-[11px] truncate">
                        {client.invoice_pass
                          ? (showInvoicePass ? client.invoice_pass : '••••••••')
                          : '-'}
                      </span>
                      {client.invoice_pass && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowInvoicePass(!showInvoicePass)}
                            className="text-gray-400 hover:text-gray-700"
                            title={showInvoicePass ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          >
                            {showInvoicePass ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.invoice_pass, 'inv_pass')}
                            className="text-gray-500 hover:text-blue-600"
                            title="Sao chép mật khẩu"
                          >
                            {copiedField === 'inv_pass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Trang Thuế điện tử */}
              <div className="bg-white/95 rounded-lg p-3 border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs text-orange-950">
                    <ShieldCheck size={13} className="text-orange-600" />
                    Trang Thuế điện tử (Tổng cục Thuế)
                  </span>
                  <a
                    href="https://thuedientu.gdt.gov.vn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 hover:underline font-medium"
                  >
                    <ExternalLink size={11} /> thuedientu.gdt.gov.vn
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-gray-500 text-[11px] block">Tên đăng nhập thuế:</span>
                    <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                      <span className="font-mono font-semibold text-gray-800 text-[11px] truncate">
                        {client.tax_user || (client.tax_code ? `${client.tax_code}-ql` : '-')}
                      </span>
                      {(client.tax_user || client.tax_code) && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(client.tax_user || `${client.tax_code}-ql`, 'tax_user')}
                          className="text-gray-500 hover:text-orange-600"
                          title="Sao chép tài khoản thuế"
                        >
                          {copiedField === 'tax_user' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[11px] block">Mật khẩu thuế:</span>
                    <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                      <span className="font-mono font-semibold text-gray-800 text-[11px] truncate">
                        {client.tax_pass
                          ? (showTaxPass ? client.tax_pass : '••••••••')
                          : '-'}
                      </span>
                      {client.tax_pass && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowTaxPass(!showTaxPass)}
                            className="text-gray-400 hover:text-gray-700"
                            title={showTaxPass ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          >
                            {showTaxPass ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.tax_pass, 'tax_pass')}
                            className="text-gray-500 hover:text-orange-600"
                            title="Sao chép mật khẩu thuế"
                          >
                            {copiedField === 'tax_pass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 italic mt-1">
                  * Tài khoản doanh nghiệp thường có đuôi <code className="font-mono text-orange-700 bg-orange-50 px-1 py-0.2 rounded">-ql</code> để ký nộp tờ khai.
                </p>
              </div>

              {/* Box 3: Phần mềm Kế toán (nếu có) */}
              {hasAcc && (
                <div className="bg-white/95 rounded-lg p-3 border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="font-bold text-gray-800 text-xs text-emerald-900 flex items-center gap-1">
                      💻 Phần mềm Kế toán: {client.acc_software || 'Chưa đặt tên'}
                    </span>
                    {client.acc_version && (
                      <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {client.acc_version}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Tài khoản PM:</span>
                      <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                        <span className="font-mono text-gray-800 text-[11px] truncate">{client.acc_user || '-'}</span>
                        {client.acc_user && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.acc_user, 'acc_user')}
                            className="text-gray-500 hover:text-emerald-600"
                          >
                            {copiedField === 'acc_user' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Mật khẩu PM:</span>
                      <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                        <span className="font-mono text-gray-800 text-[11px] truncate">
                          {client.acc_pass ? (showAccPass ? client.acc_pass : '••••••••') : '-'}
                        </span>
                        {client.acc_pass && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowAccPass(!showAccPass)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {showAccPass ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.acc_pass, 'acc_pass')}
                              className="text-gray-500 hover:text-emerald-600"
                            >
                              {copiedField === 'acc_pass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Box 4: Phần mềm BHXH (nếu có) */}
              {hasIns && (
                <div className="bg-white/95 rounded-lg p-3 border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="font-bold text-gray-800 text-xs text-purple-900 flex items-center gap-1">
                      🛡️ Phần mềm BHXH: {client.ins_software || 'Chưa đặt tên'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Tài khoản BHXH:</span>
                      <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                        <span className="font-mono text-gray-800 text-[11px] truncate">{client.ins_user || '-'}</span>
                        {client.ins_user && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.ins_user, 'ins_user')}
                            className="text-gray-500 hover:text-purple-600"
                          >
                            {copiedField === 'ins_user' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Mật khẩu BHXH:</span>
                      <div className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200 mt-0.5">
                        <span className="font-mono text-gray-800 text-[11px] truncate">
                          {client.ins_pass ? (showInsPass ? client.ins_pass : '••••••••') : '-'}
                        </span>
                        {client.ins_pass && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowInsPass(!showInsPass)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {showInsPass ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.ins_pass, 'ins_pass')}
                              className="text-gray-500 hover:text-purple-600"
                            >
                              {copiedField === 'ins_pass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
