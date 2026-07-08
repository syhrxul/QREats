import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  // Dapatkan parameter 'next' (tujuan akhir) dari URL query
  const next = requestUrl.searchParams.get('next') || '/';
  
  // Dapatkan parameter 'email' (jika ada) untuk diteruskan
  const email = requestUrl.searchParams.get('email');
  
  // Susun URL tujuan
  const targetUrl = new URL(next, requestUrl.origin);
  if (email) {
    targetUrl.searchParams.set('email', email);
  }
  
  // Lakukan HTTP Redirect. 
  // Browser secara otomatis akan mempertahankan Hash Fragment (#access_token=...) 
  // saat melakukan redirect ke URL baru yang tidak memiliki hash.
  return NextResponse.redirect(targetUrl.toString());
}
