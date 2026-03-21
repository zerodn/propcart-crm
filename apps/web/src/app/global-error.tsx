'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Có lỗi xảy ra</h1>
            <p className="text-gray-600">{error.message || 'Something went wrong'}</p>
            <button
              onClick={() => reset()}
              className="w-full bg-[#CFAF6E] text-white py-2 rounded-lg hover:bg-[#B89655]"
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
