import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      color: '#10B981',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Imbarcazioni', 
      path: '/boats', 
      color: '#FF5958',
      newPath: '/boats?modal=new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      name: 'Lavori', 
      path: '/works', 
      color: '#FF9151',
      newPath: '/works?modal=new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      name: 'Acquisti', 
      path: '/orders', 
      color: '#39A8FB',
      newPath: '/orders?modal=new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
  ];

  const getActivePageForAdd = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/boats')) return navItems.find(item => item.path === '/boats');
    if (currentPath.startsWith('/works')) return navItems.find(item => item.path === '/works');
    if (currentPath.startsWith('/orders')) return navItems.find(item => item.path === '/orders');
    return null;
  };

  const activePageForAdd = getActivePageForAdd();
  const isAddButtonActive = activePageForAdd !== null;

  const handleAddClick = () => {
    if (activePageForAdd?.newPath) {
      navigate(activePageForAdd.newPath);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center">
      <div className="shadow-sm px-2.5 py-2 w-full max-w-2xl mx-auto" style={{backgroundColor: 'rgb(17, 17, 17)'}}>
        <div className="flex items-center justify-around">
          <Link
            to={navItems[0].path}
            className={`flex-1 flex items-center justify-center p-3 transition-all duration-200 ${
              location.pathname === navItems[0].path
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {navItems[0].icon}
          </Link>

          <Link
            to={navItems[1].path}
            className={`flex-1 flex items-center justify-center p-3 transition-all duration-200 ${
              location.pathname.startsWith('/boats')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {navItems[1].icon}
          </Link>

          <div className="flex-1 flex items-center justify-center relative group px-3">
            <button
              onClick={handleAddClick}
              disabled={!isAddButtonActive}
              className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center ${
                isAddButtonActive
                  ? 'text-white hover:opacity-90'
                  : 'text-gray-600'
              }`}
              style={
                isAddButtonActive && activePageForAdd 
                  ? {backgroundColor: activePageForAdd.color, border: '2px solid white'} 
                  : {backgroundColor: '#2a2a2a', border: 'none'}
              }
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 12H4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {!isAddButtonActive && (
              <div className="absolute bottom-full mb-3 text-center hidden group-hover:block bg-primary-tip bg-opacity-80 text-white text-xs rounded pt-2 pb-1.5 px-3 whitespace-nowrap">
                Passa alle altre pagine per aggiungere elementi
              </div>
            )}
          </div>

          <Link
            to={navItems[2].path}
            className={`flex-1 flex items-center justify-center p-3 transition-all duration-200 ${
              location.pathname.startsWith('/works')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {navItems[2].icon}
          </Link>

          <Link
            to={navItems[3].path}
            className={`flex-1 flex items-center justify-center p-3 transition-all duration-200 ${
              location.pathname.startsWith('/orders')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {navItems[3].icon}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;