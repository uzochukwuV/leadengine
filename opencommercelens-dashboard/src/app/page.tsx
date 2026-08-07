'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    if (api.isAuthenticated()) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
          OCL
        </div>
        <h1 className="text-2xl font-bold text-gray-900">OpenCommerceLens</h1>
        <p className="text-gray-500 mt-2">Loading...</p>
      </div>
    </div>
  );
}
