import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import api from '../services/api.ts';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setToken, setCurrentUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await api.post('/api/auth/register', { username, password });
      }

      const response = await api.post('/api/auth/login', { username, password });
      const token = response.data.access_token;

      setToken(token);

      try {
        const profileResponse = await api.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUser(profileResponse.data);
      } catch {
        const userProfile = {
          id: 1,
          username: username,
          full_name: username,
          email: `${username}@example.com`
        };
        setCurrentUser(userProfile);
      }

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="h-screen flex items-center justify-center overflow-hidden relative"
      style={{
        backgroundColor: '#FFF4EF'
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/public/login-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          zIndex: 0
        }}
      />

      <div className="w-full max-w-md px-4 relative z-10">
        <div 
          className="bg-white rounded-tr-3xl rounded-bl-3xl shadow-lg overflow-hidden"
          style={{
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF5958 0%, #39A8FB 33%, #FF9151 66%, #10B981 100%) border-box',
            border: '2px solid transparent'
          }}
        >
          <div className="pr-5 pt-6 pb-1 bg-white flex items-center justify-center">
            <img src="/logonotag.jpg" alt="LNINazioni" 
              className="w-full h-auto object-contain rounded-tr-2xl rounded-bl-2xl"
              style={{maxHeight: '180px'}}
            />
          </div>

          <div className="px-8 pb-5">
            <h2 className="text-2xl font-bold font-greycliff black text-center mb-5">
              {isRegister ? 'Registrati' : 'Accedi'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-1">
              <div>
                <style>{`
                  input[name="username"] {
                    background-color: transparent !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    color: #1F2937 !important;
                  }
                  input[name="username"]:-webkit-autofill,
                  input[name="username"]:-webkit-autofill:hover,
                  input[name="username"]:-webkit-autofill:focus,
                  input[name="username"]:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px white inset !important;
                    -webkit-text-fill-color: #1F2937 !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    background-color: transparent !important;
                  }
                `}</style>
                <input
                  type="text"
                  name="username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 8) {
                      setUsername(value);
                    }
                  }}
                  maxLength={8}
                  className="w-full px-2 py-2 bg-transparent border-0 border-b-2 border-gray-300 text-base font-medium transition-all duration-200 focus:outline-none focus:border-primary-eme black placeholder-gray-400"
                  placeholder="Username"
                  required
                />
              </div>

              <div className="relative">
                <style>{`
                  input[name="password"] {
                    background-color: transparent !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    color: #1F2937 !important;
                  }
                  input[name="password"]:-webkit-autofill,
                  input[name="password"]:-webkit-autofill:hover,
                  input[name="password"]:-webkit-autofill:focus,
                  input[name="password"]:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px white inset !important;
                    -webkit-text-fill-color: #1F2937 !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    background-color: transparent !important;
                  }
                `}</style>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2 py-2 pr-10 bg-transparent border-0 border-b-2 border-gray-300 text-base font-medium transition-all duration-200 focus:outline-none focus:border-primary-eme black placeholder-gray-400"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm text-center">
                  {error}
                </div>
              )}

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary-eme disabled:bg-gray-400 text-white rounded-tr-xl rounded-bl-xl font-bold font-greycliff text-base transition-all duration-200 shadow-sm"
                  style={{
                    backgroundColor: loading ? undefined : '#10B981',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = 'rgb(15, 167, 116)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#10B981';
                    }
                  }}
                >
                  {loading ? 'Caricamento...' : isRegister ? 'Registrati' : 'Accedi'}
                </button>
              </div>
            </form>

            <div className="black text-center mt-3 mb-8">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="font-medium text-sm transition-all"
              >
                {isRegister ? (
                  <>
                    Hai già un account?{' '}
                    <span className="text-primary-eme underline hover:text-primary-eme transition-colors">
                      Accedi
                    </span>
                  </>
                ) : (
                  <>
                    Non hai un account?{' '}
                    <span className="text-primary-eme underline hover:text-primary-eme transition-colors">
                      Registrati
                    </span>
                  </>
                )}
              </button>
            </div>



          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;