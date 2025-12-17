import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { setToken } = useAppContext();

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl"></span>
          <span className="ml-2 font-bold text-lg text-gray-800">LNI Manager</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;