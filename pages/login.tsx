import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [userId, setUserId] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First try admin login
      const adminResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password, isAdmin: true }),
      });

      const adminData = await adminResponse.json();

      if (adminResponse.ok && !adminData.requiresOTP) {
        // Admin login successful
        localStorage.setItem('token', adminData.token);
        localStorage.setItem('user', JSON.stringify(adminData.user));
        router.push(adminData.redirectTo || '/admin/dashboard');
        return;
      }

      // If admin login fails, try user login
      const userResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password, isAdmin: false }),
      });

      const userData = await userResponse.json();

      if (userResponse.ok) {
        if (userData.requiresOTP) {
          // User login - show OTP input
          setShowOtpInput(true);
          setUserId(userData.userId);
        } else {
          // Direct login for verified users
          localStorage.setItem('token', userData.token);
          localStorage.setItem('user', JSON.stringify(userData.user));
          router.push('/');
        }
      } else {
        setError(userData.message || 'Login gagal. Periksa nomor telepon dan password Anda.');
      }
    } catch (error) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Masuk
          </h1>
          <p className="text-gray-300">
            {showOtpInput 
              ? 'Masukkan kode OTP yang dikirim ke WhatsApp' 
              : 'Masuk ke akun Anda'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {!showOtpInput ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-200 mb-2">
                Nomor Telepon
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-gray-400 backdrop-blur-sm"
                placeholder="Contoh: 08123456789"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-gray-400 backdrop-blur-sm"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerification} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-200 mb-2">
                Kode OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-center text-2xl tracking-widest text-white placeholder-gray-400 backdrop-blur-sm"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOtpInput(false);
                setOtp('');
                setError('');
                setPhone('');
                setPassword('');
                setUserId('');
              }}
              className="w-full text-gray-300 hover:text-white transition-colors"
            >
              Kembali ke login
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-300">
            Belum punya akun?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}