export const BHXH_LOOKUP_SOURCE = 'https://baohiemxahoi.gov.vn/tracuu/pages/don-vi-tham-gia-bhxh.aspx';
export interface LookupQuery { MaBHXH: string; MaSoThue: string; MaDonVi: string; TenDonVi: string }
export interface LookupTable { headers: string[]; rows: string[][] }
export interface LookupResult { tables: LookupTable[]; message: string; pages: number[]; page: number; checkedAt: string }
export interface LookupResponse {
  session?: string; captcha?: string;
  result?: LookupResult; error?: string;
}

export async function bhxhLookupRequest(payload: Record<string, unknown>, signal?: AbortSignal): Promise<LookupResponse> {
  const response = await fetch('/api/bhxh-lookup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal,
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('API tra cứu chưa hoạt động. Hãy chạy app bằng npm run dev hoặc triển khai cả thư mục api lên Vercel.');
  }
  const data = await response.json() as LookupResponse;
  if (!response.ok && !data.error) throw new Error('Chưa kết nối được cổng BHXH. Vui lòng thử lại.');
  return data;
}
