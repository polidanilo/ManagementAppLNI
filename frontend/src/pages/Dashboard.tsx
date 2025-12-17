import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { seasonService, shiftService, reportsService, workService, orderService, problemService } from '../services/api';
import type { Work } from '../types';
import BottomNav from '../components/Layout/BottomNav';
import { useAppContext } from '../context/AppContext';
import { getShiftOrdinalName } from '../utils/shiftNames';
import { formatDate } from '../utils/dateFormat';
import CustomScrollbar from '../components/CustomScrollbar';

const Dashboard: React.FC = () => {
  const { selectedSeason, setSelectedSeason, selectedShift, setSelectedShift, setToken, currentUser, setCurrentUser } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<number | null>(null);
  
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (selectedShift) {
      queryClient.invalidateQueries({ queryKey: ['problems-open', selectedShift.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-works', selectedShift.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders', selectedShift.id] });
    }
  }, [selectedShift?.id, queryClient]);

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await seasonService.getAll();
      return response.data;
    },
  });

  const { data: shifts, isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['shifts', selectedSeason?.id],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const response = await shiftService.getBySeasonId(selectedSeason.id);
      const sortedShifts = response.data.sort((a, b) => a.shift_number - b.shift_number);
      return sortedShifts;
    },
    enabled: !!selectedSeason,
  });

  // Auto-select season 2025 ONLY on first load (when no season in localStorage)
  const [hasAutoSelected, setHasAutoSelected] = React.useState(false);
  
  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeason && !hasAutoSelected) {
      // Try to find season with name "2025"
      const season2025 = seasons.find(s => s.name === '2025');
      if (season2025) {
        console.log('🎯 Auto-selecting season 2025:', season2025);
        setSelectedSeason(season2025);
      } else {
        // Fallback to first season if 2025 not found
        console.log('⚠️ Season 2025 not found, selecting first season:', seasons[0]);
        setSelectedSeason(seasons[0]);
      }
      setHasAutoSelected(true);
    }
  }, [seasons, selectedSeason, setSelectedSeason, hasAutoSelected]);

  // Auto-select "Tutti" when shifts are loaded
  useEffect(() => {
    if (shifts && shifts.length > 0 && !selectedShift && selectedSeason && hasAutoSelected) {
      // Seleziona "Tutti" - usa un oggetto speciale con id -1
      setSelectedShift({ id: -1, shift_number: 0, season_id: selectedSeason.id, start_date: '', end_date: '' } as any);
    }
  }, [shifts, selectedShift, selectedSeason, setSelectedShift, hasAutoSelected]);

  // Debug logging
  useEffect(() => {
    console.log('📊 Dashboard State:', {
      selectedSeason,
      selectedShift,
      shifts,
      shiftsLoading,
      shiftsError
    });
  }, [selectedSeason, selectedShift, shifts, shiftsLoading, shiftsError]);

  // Fetch problemi (tutti: aperti e risolti)
  const { data: openProblems, isLoading: problemsLoading } = useQuery({
    queryKey: ['problems-open', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      // Se "Tutti" è selezionato (id === -1), recupera tutti i problemi della stagione
      if (selectedShift.id === -1 && shifts) {
        // Fai query per ogni turno e unisci i risultati
        const allProblems = await Promise.all(
          shifts.map(shift => problemService.list({ shift_id: shift.id }))
        );
        const combined = allProblems.flatMap(res => res.data);
        // Ordina per data più recente e prendi i primi 6
        return combined.sort((a, b) => 
          new Date(b.reported_date || 0).getTime() - new Date(a.reported_date || 0).getTime()
        ).slice(0, 6);
      }
      
      const response = await problemService.list({
        shift_id: selectedShift.id
      });
      return response.data.slice(0, 6);
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Fetch ultimi lavori
  const { data: recentWorks, isLoading: worksLoading } = useQuery({
    queryKey: ['recent-works', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      // Se "Tutti" è selezionato (id === -1), recupera tutti i lavori della stagione
      if (selectedShift.id === -1 && shifts) {
        // Fai query per ogni turno e unisci i risultati
        const allWorks = await Promise.all(
          shifts.map(shift => workService.getAll({ shift_id: shift.id }))
        );
        const combined = allWorks.flatMap(res => res.data);
        // Ordina per data più recente e prendi i primi 6
        return combined.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ).slice(0, 6);
      }
      
      const response = await workService.getAll({
        shift_id: selectedShift.id,
        sort_by: 'created_at',
        order: 'desc',
      });
      return response.data.slice(0, 6);
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Fetch ultimi ordini
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      // Se "Tutti" è selezionato (id === -1), recupera tutti gli ordini della stagione
      if (selectedShift.id === -1 && shifts) {
        // Fai query per ogni turno e unisci i risultati
        const allOrders = await Promise.all(
          shifts.map(shift => orderService.getAll({ shift_id: shift.id }))
        );
        const combined = allOrders.flatMap(res => res.data);
        // Ordina per data più recente e prendi i primi 6
        return combined.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ).slice(0, 6);
      }
      
      const response = await orderService.getAll({
        shift_id: selectedShift.id,
        sort_by: 'created_at',
        order: 'desc',
      });
      return response.data.slice(0, 6);
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Fetch TUTTI i problemi per le statistiche (non solo i 6 mostrati)
  const { data: allProblemsForStats } = useQuery({
    queryKey: ['all-problems-stats', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      // Se "Tutti" è selezionato, recupera tutti i problemi della stagione
      if (selectedShift.id === -1 && shifts) {
        const allProblems = await Promise.all(
          shifts.map(shift => problemService.list({ shift_id: shift.id }))
        );
        return allProblems.flatMap(res => res.data);
      }
      
      const response = await problemService.list({ shift_id: selectedShift.id });
      return response.data;
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch TUTTI i lavori per le statistiche
  const { data: allWorksForStats } = useQuery({
    queryKey: ['all-works-stats', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      if (selectedShift.id === -1 && shifts) {
        const allWorks = await Promise.all(
          shifts.map(shift => workService.getAll({ shift_id: shift.id }))
        );
        return allWorks.flatMap(res => res.data);
      }
      
      const response = await workService.getAll({ shift_id: selectedShift.id });
      return response.data;
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch TUTTI gli ordini per le statistiche
  const { data: allOrdersForStats } = useQuery({
    queryKey: ['all-orders-stats', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift) return [];
      
      if (selectedShift.id === -1 && shifts) {
        const allOrders = await Promise.all(
          shifts.map(shift => orderService.getAll({ shift_id: shift.id }))
        );
        return allOrders.flatMap(res => res.data);
      }
      
      const response = await orderService.getAll({ shift_id: selectedShift.id });
      return response.data;
    },
    enabled: !!selectedShift && (selectedShift.id !== -1 || !!shifts),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch statistiche turno
  useQuery({
    queryKey: ['shift-stats', selectedShift?.id],
    queryFn: async () => {
      if (!selectedShift) return null;
      const response = await reportsService.getShiftReport(selectedShift.id);
      return response.data;
    },
    enabled: !!selectedShift,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Mutations per lavori
  const deleteWorkMutation = useMutation({
    mutationFn: async (id: number) => {
      await workService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-works', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-works-stats', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['shift-stats', selectedShift?.id] });
      setShowDeleteConfirm(false);
      setWorkToDelete(null);
    },
  });

  const toggleWorkStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'pending' }) => {
      const res = await workService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-works', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-works-stats', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['shift-stats', selectedShift?.id] });
    },
  });

  // Mutations per problemi
  const toggleProblemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'open' | 'closed' }) => {
      const res = await problemService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems-open', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-problems-stats', selectedShift?.id] });
    },
  });

  // Mutations per ordini
  const toggleOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'completed' | 'pending' }) => {
      const res = await orderService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-orders', selectedShift?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-orders-stats', selectedShift?.id] });
    },
  });

  // Handlers per problemi
  const handleToggleProblemStatus = (e: React.MouseEvent, problem: any) => {
    e.stopPropagation();
    const newStatus = problem.status === 'closed' ? 'open' : 'closed';
    toggleProblemStatusMutation.mutate({ id: problem.id, status: newStatus });
  };

  // Handlers per lavori
  const handleToggleWorkStatus = (e: React.MouseEvent, work: Work) => {
    e.stopPropagation();
    const newStatus = work.status === 'completed' ? 'pending' : 'completed';
    toggleWorkStatusMutation.mutate({ id: work.id, status: newStatus });
  };

  // Handlers per ordini
  const handleToggleOrderStatus = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    const newStatus = order.status === 'completed' ? 'pending' : 'completed';
    toggleOrderStatusMutation.mutate({ id: order.id, status: newStatus });
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      // Deseleziona stagione
      setSelectedSeason(null);
      setSelectedShift(null);
    } else {
      const season = seasons?.find((s) => s.id === Number(value));
      if (season) {
        setSelectedSeason(season);
        setSelectedShift(null);
        // Invalida le query quando cambia la stagione
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
      }
    }
  };

  const handleShiftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      // Deseleziona turno
      setSelectedShift(null);
    } else if (value === 'all') {
      // Seleziona "Tutti" - usa un oggetto speciale
      setSelectedShift({ id: -1, shift_number: 0, season_id: selectedSeason?.id || 0, start_date: '', end_date: '' } as any);
    } else {
      const shiftId = Number(value);
      console.log('🔄 handleShiftChange called with:', shiftId);
      console.log('📋 Available shifts:', shifts);
      
      const shift = shifts?.find((s) => s.id === shiftId);
      console.log('🎯 Found shift:', shift);
      
      if (shift) {
        console.log('✅ Setting selected shift:', shift);
        setSelectedShift(shift);
        // Le query vengono invalidate automaticamente dall'useEffect
      } else {
        console.log('❌ Shift not found for id:', shiftId);
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden" style={{backgroundColor: '#FFF4EF'}}>
      <CustomScrollbar maxHeight="100vh" onScroll={(scrollTop) => setScrollY(scrollTop)} hideOnMobile={false}>
        <div className="pb-9" style={{backgroundColor: '#FFF4EF'}}>
      {/* Top Bar con Saluto e Logout */}
      <div style={{backgroundColor: '#FFF4EF', zIndex: 10, position: 'relative'}} className="px-4 pt-10 pb-0.5">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          {/* Riquadro Dashboard con immagine di sfondo */}
          <div className="flex-1">
            <div 
              className="relative overflow-hidden rounded-tr-2xl rounded-bl-2xl shadow-sm mb-4"
              style={{
                height: '116px',
                backgroundImage: 'url(/lake.png)', // ← Modifica qui il nome dell'immagine
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 10
              }}
            >
              {/* Overlay scuro per oscurare l'immagine */}
              <div className="absolute inset-0 bg-black opacity-40"></div>
              
              {/* Testo sopra l'immagine */}
              <div className="ml-6 relative z-10 flex items-center h-full">
                <h1 className="text-3xl font-bold font-greycliff text-white">
                  Benvenutə alla Home, {currentUser?.full_name || currentUser?.username || 'User'}!                </h1>
              </div>
            </div>
            
            <p className="pl-2 pt-2 text-base black">
              Ecco i dati dei turni selezionati:
            </p>
          </div>
          
          {/* Logout Icon */}
          <button
            onClick={() => {
              setToken(null);
              setCurrentUser(null);
              setSelectedSeason(null);
              setSelectedShift(null);
              navigate('/login');
            }}
            className="pl-2 pr-0 py-1.5 mt-0.5 rounded-full relative"
            style={{zIndex: 30}}
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary-ros" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selettori Stagione e Turno */}
      <div style={{backgroundColor: '#FFF4EF', zIndex: 10, position: 'relative'}} className="px-4 pb-2">
        <div className="px-1 max-w-4xl mx-auto flex gap-3">
          {/* Stagione */}
          <select
            value={selectedSeason?.id || ''}
            onChange={handleSeasonChange}
            disabled={seasonsLoading}
            className="px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 disabled:opacity-50 text-gray-700"
            style={{backgroundColor: 'transparent', borderColor: '#10B981'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#10B981'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#10B981'}
          >
            <option value="">{seasonsLoading ? 'Caricamento...' : 'Seleziona stagione'}</option>
            {seasons?.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>

          {/* Turno */}
          <select
            value={selectedShift?.id === -1 ? 'all' : (selectedShift?.id || '')}
            onChange={handleShiftChange}
            disabled={!selectedSeason || shiftsLoading || !shifts || shifts.length === 0}
            className="px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 focus:outline-none disabled:opacity-50 text-gray-700"
            style={{backgroundColor: 'transparent', borderColor: '#10B981'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#10B981'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#10B981'}
          >
            <option value="">
              {shiftsLoading ? 'Caricamento...' : 
               !selectedSeason ? 'Seleziona turno' :
               !shifts || shifts.length === 0 ? 'Nessun turno' :
               'Seleziona turno'}
            </option>
            {selectedSeason && shifts && shifts.length > 0 && (
              <option value="all">Tutti</option>
            )}
            {shifts?.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {getShiftOrdinalName(shift.shift_number)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenuto principale - visibile solo se turno selezionato */}
      {selectedShift ? (
        <div style={{backgroundColor: '#FFF4EF'}} className="px-4 pb-9 relative">
          {/* Cerchi decorativi emerald di sfondo - parallax nuvolette */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{zIndex: 1, right: '15px'}}>
            {/* Cerchio emerald grande - alto destra */}
            <div 
              className="absolute rounded-full shadow-sm transition-transform duration-200"
              style={{
                width: '180px',
                height: '30px',
                backgroundColor: '#10B981',
                top: '64%',
                right: '4%',
                opacity: 0.9,
                transform: `translateY(-${scrollY * 0.5}px)` // Parallax illimitato verso l'alto
              }}
            />

            <div 
              className="absolute rounded-full shadow-sm transition-transform duration-150"
              style={{
                width: '190px',
                height: '20px',
                backgroundColor: '#10B981',
                top: '54%',
                right: '10%',
                opacity: 0.9,
                transform: `translateY(-${scrollY * 0.5}px)` // Parallax illimitato verso l'alto
              }}
            />

            <div 
              className="absolute rounded-full shadow-sm transition-transform duration-90"
              style={{
                width: '35px',
                height: '15px',
                backgroundColor: '#10B981',
                top: '70%',
                left: '55%',
                opacity: 0.6,
                transform: `translateY(-${scrollY * 0.5}px)` // Parallax illimitato verso l'alto
              }}
            />

            {/* Cerchio emerald grande - alto destra */}
            <div 
              className="absolute rounded-full shadow-sm transition-transform duration-90"
              style={{
                width: '65px',
                height: '25px',
                backgroundColor: '#10B981',
                top: '50%',
                left: '8%',
                opacity: 0.4,
                transform: `translateY(-${scrollY * 0.5}px)` // Parallax illimitato verso l'alto
              }}
            />

            {/* Cerchio emerald grande - alto destra */}
            <div 
              className="absolute rounded-full shadow-sm transition-transform duration-200"
              style={{
                width: '45px',
                height: '20px',
                backgroundColor: '#10B981',
                top: '34%',
                right: '13%',
                opacity: 0.5,
                transform: `translateY(-${scrollY * 0.5}px)` // Parallax illimitato verso l'alto
              }}
            />

        
          </div>

          <div className="max-w-4xl mx-auto space-y-4 mt-4 relative" style={{zIndex: 1}}>

            {/* Cerchi Sovrapposti */}
            <div className="ml-3 mb-6 relative h-64 flex items-center justify-center">
              {/* Cerchio Blu (Spese) - Sinistra, sopra rosso */}
              <div 
                className="absolute cursor-pointer transition-transform hover:scale-105"
                style={{
                  left: '12%',
                  top: '70%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20
                }}
                onClick={() => navigate('/orders')}
              >
                <div 
                  className="shadow-sm cursor-pointer transition-transform hover:scale-110 w-28 h-28 rounded-full flex flex-col items-center justify-center"
                  style={{backgroundColor: '#39A8FB'}}
                >
                  <div className="text-white text-center">
                    <div className="text-2xl font-bold font-greycliff">
                      €{allOrdersForStats?.filter(o => o.status === 'completed').reduce((sum, o) => sum + parseFloat(String(o.amount)), 0).toFixed(0) || '0'}
                    </div>
                    <div className="text-xs font-bold font-greycliff mt-0 uppercase">Di spese <br /> totali</div>
                  </div>
                </div>
              </div>

              {/* Cerchio Rosso (Problemi) - Centro, layer bottom, più grande */}
              <div 
                className="absolute cursor-pointer transition-transform hover:scale-105"
                style={{
                  left: '48%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
                onClick={() => navigate('/boats')}
              >
                <div 
                  className="shadow-sm cursor-pointer transition-transform hover:scale-110 w-52 h-52 rounded-full flex flex-col items-center justify-center"
                  style={{backgroundColor: '#FF5958'}}
                >
                  <div className="text-white text-center">
                    <div className="text-4xl font-bold font-greycliff">
                      {allProblemsForStats?.filter(p => p.status === 'open').length || 0}
                    </div>
                    <div className="text-sm font-bold font-greycliff mt-0 uppercase">Imbarcazioni  <br /> danneggiate</div>
                  </div>
                </div>
              </div>

              {/* Cerchio Arancione (Lavori) - Destra, sopra rosso */}
              <div 
                className="absolute cursor-pointer transition-transform hover:scale-105"
                style={{
                  right: '16%',
                  top: '30%',
                  transform: 'translate(50%, -50%)',
                  zIndex: 20
                }}
                onClick={() => navigate('/works')}
              >
                <div 
                  className="shadow-sm cursor-pointer transition-transform hover:scale-110 w-28 h-28 rounded-full flex flex-col items-center justify-center"
                  style={{backgroundColor: ' rgb(255, 145, 81)'}}
                >
                  <div className="text-white text-center">
                    <div className="text-2xl font-bold font-greycliff">
                      {allWorksForStats?.filter(w => w.status === 'completed').length || 0}
                    </div>
                    <div className="text-xs font-bold font-greycliff mt-0 uppercase">Lavori  <br /> fatti</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenitore con sfondo per le tab - nasconde cerchi emerald */}
            <div className="relative space-y-4 pb-9" style={{backgroundColor: '#FFF4EF', zIndex: 1}}>
              
            {/* Ultimi problemi barche */}
            <div className="bg-white rounded-tr-3xl rounded-bl-3xl px-2 py-5 pb-3 shadow-sm relative" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #FF5958 0%, #FF5958 85%, #39A8FB 85%) border-box',
              border: '0px solid transparent',
              height: '340px'
            }}>
              <h3 className="text-xl font-bold font-greycliff black mb-3 pb-1 pl-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#FF5958'}} />
                Ultimi problemi aggiunti
              </h3>
              
              {problemsLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Caricamento...</div>
                </div>
              ) : !openProblems || openProblems.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Nessun problema disponibile</div>
                </div>
              ) : (
                <CustomScrollbar maxHeight="232px">
                  <div className="space-y-2 mr-2">
                  {openProblems.slice(0, 6).map((problem) => (
                    <div
                      key={problem.id}
                      className="relative p-4 pb-3.5 rounded-tr-xl rounded-bl-xl cursor-pointer transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: problem.status === 'closed' 
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(255, 89, 88, 0.5)'
                      }}
                      onMouseEnter={(e) => {
                        if (problem.status === 'closed') {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.5)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 89, 88, 0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (problem.status === 'closed') {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 89, 88, 0.5)';
                        }
                      }}
                      onClick={() => navigate(`/boats?id=${problem.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="pt-0 text-base font-semibold black mb-1">
                            {problem.boat_name || 'Barca'}
                          </h4>
                          <div className="text-sm black mt-3" style={{lineHeight: '1.4'}}>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {formatDate(problem.reported_date)}{problem.shift_id ? `, ${['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'][(problem.shift_id - 1) % 6]}` : ''}</span></div>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {problem.boat_type || 'Categoria'}</span></div>
                            {problem.part_affected && (
                              <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {problem.part_affected}</span></div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={(e) => handleToggleProblemStatus(e, problem)}
                            className="group w-8 h-8 mr-1 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-100 transition-all duration-200"
                            title={problem.status === 'closed' ? 'Segna come aperto' : 'Segna come risolto'}
                          >
                            
                            {/* Icona normale */}
                            {problem.status === 'closed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 group-hover:hidden" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:hidden" viewBox="0 0 20 20" fill="#FF5958">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                            {/* Icona hover (stato opposto) */}
                            {problem.status === 'closed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden group-hover:block" viewBox="0 0 20 20" fill="#FF5958">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 hidden group-hover:block" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </CustomScrollbar>
              )}
            </div>

            {/* Ultimi lavori */}
            <div className="bg-white rounded-tr-3xl rounded-bl-3xl px-2 py-5 pb-3 shadow-sm relative" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, rgb(255, 145, 81) 0%, rgb(255, 145, 81) 85%, #39A8FB 85%) border-box',
              border: '0px solid transparent',
              height: '340px'
            }}>
              <h3 className="text-xl font-bold font-greycliff black mb-3 pb-1 pl-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#FF9151'}} />
                Ultimi lavori aggiunti
              </h3>
              
              {worksLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Caricamento...</div>
                </div>
              ) : !recentWorks || recentWorks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Nessun lavoro disponibile</div>
                </div>
              ) : (
                <CustomScrollbar maxHeight="232px">
                  <div className="space-y-2 mr-2">
                  {recentWorks.map((work) => (
                    <div
                      key={work.id}
                      className="relative p-4 pb-3.5 rounded-tr-xl rounded-bl-xl cursor-pointer transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: work.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(255, 145, 81, 0.5)'
                      }}
                      onMouseEnter={(e) => {
                        if (work.status === 'completed') {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.5)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.7)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (work.status === 'completed') {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.5)';
                        }
                      }}
                      onClick={() => navigate(`/works?id=${work.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Sinistra: Titolo, categoria, data */}
                        <div className="flex-1 min-w-0">
                          <h4 className="pt-0 text-base font-semibold black mb-1 truncate">
                            {work.title.length > 25 ? work.title.substring(0, 25) : work.title}
                          </h4>
                          <div className="text-sm black mt-3" style={{lineHeight: '1.4'}}>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {formatDate(work.work_date)}{work.shift_id ? `, ${['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'][(work.shift_id - 1) % 6]}` : ''}</span></div>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {work.category}</span></div>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {work.created_by || 'N/A'}</span></div>
                          </div>
                        </div>

                        {/* Destra: Icona stato sopra + Pulsanti azione sotto */}
                        <div className="flex flex-col items-center gap-2">
                          {/* Icona stato cliccabile */}
                          <button
                            onClick={(e) => handleToggleWorkStatus(e, work)}
                            className="group w-8 h-8 mr-1 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 bg-white hover:bg-gray-100"
                            title={work.status === 'completed' ? 'Segna come in corso' : 'Segna come completato'}
                          >
                            {/* Icona normale */}
                            {work.status === 'completed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 group-hover:hidden" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:hidden" viewBox="0 0 20 20" fill="#FF9151">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            {/* Icona hover (stato opposto) */}
                            {work.status === 'completed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden group-hover:block" viewBox="0 0 20 20" fill="#FF9151">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 hidden group-hover:block" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </CustomScrollbar>
              )}
            </div>

            {/* Ultimi ordini */}
            <div className="bg-white rounded-tr-3xl rounded-bl-3xl px-2 py-5 pb-3 shadow-sm relative" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(315deg, #39A8FB 0%, #39A8FB 85%, #FF5958 85%) border-box',
              border: '0px solid transparent',
              height: '340px'
            }}>
              <h3 className="text-xl font-bold font-greycliff black mb-3 pb-1 pl-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#39A8FB'}} />
                Ultimi ordini aggiunti
              </h3>
              
              {ordersLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Caricamento...</div>
                </div>
              ) : !recentOrders || recentOrders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-sm">Nessun ordine disponibile</div>
                </div>
              ) : (
                <CustomScrollbar maxHeight="232px">
                  <div className="space-y-2 mr-2">
                  {recentOrders?.slice(0, 6).map((order) => (
                    <div
                      key={order.id}
                      className="relative p-4 pb-3.5 rounded-tr-xl rounded-bl-xl cursor-pointer transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: order.status === 'completed'
                          ? 'rgb(57, 168, 251, 0.4)'
                          : 'rgba(255, 145, 81, 0.5)'
                      }}
                      onMouseEnter={(e) => {
                        if (order.status === 'completed') {
                          e.currentTarget.style.backgroundColor = ' rgb(57, 168, 251, 0.6)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.7)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (order.status === 'completed') {
                          e.currentTarget.style.backgroundColor = ' rgb(57, 168, 251, 0.4)';
                        } else {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.5)';
                        }
                      }}
                      onClick={() => navigate(`/orders?id=${order.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="pt-0 text-base font-semibold black mb-1">
                            €{parseFloat(String(order.amount)).toFixed(2)}
                          </h4>
                          <div className="text-sm black mt-3" style={{lineHeight: '1.4'}}>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {formatDate(order.order_date)}{order.shift_id ? `, ${['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'][(order.shift_id - 1) % 6]}` : ''}</span></div>
                            <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {order.category}</span></div>
                            <div><span className="break-words"><span className="text-lg font-bold">•</span> {order.title.length > 25 ? order.title.substring(0, 25) : order.title}</span></div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={(e) => handleToggleOrderStatus(e, order)}
                            className="group w-8 h-8 mr-1 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 bg-white hover:bg-gray-100"
                            title={order.status === 'completed' ? 'Segna come programmato' : 'Segna come effettuato'}
                          >
                            {/* Icona normale */}
                            {order.status === 'completed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:hidden" viewBox="0 0 20 20" fill="rgb(57, 168, 251)">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:hidden" viewBox="0 0 20 20" fill="#FF9151">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            {/* Icona hover (stato opposto) */}
                            {order.status === 'completed' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden group-hover:block" viewBox="0 0 20 20" fill="#FF9151">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden group-hover:block" viewBox="0 0 20 20" fill="rgb(57, 168, 251)">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </CustomScrollbar>
              )}
            </div>

            </div>
            {/* Fine contenitore con sfondo */}

          </div>
        </div>
      ) : (
        /* Messaggio quando non è selezionato un turno */
      <div>
        <div className="fixed inset-0 flex items-center justify-center mx-8 px-4 py-1.5">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-lg p-6 rounded-xl text-center" style={{
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF5958 0%, #39A8FB 33%, #FF9151 66%, #10B981 100%) border-box',
            border: '2px solid transparent'
          }}>
              <p className="black text-sm font-medium">Seleziona una stagione e un turno per poterne visualizzare i dati</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modale conferma eliminazione lavoro */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold black mb-4">Conferma eliminazione</h3>
            <p className="text-gray-600 mb-6">Sei sicuro di voler eliminare questo lavoro? L'operazione non può essere annullata.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-4 rounded font-semibold text-sm bg-gray-200 hover:bg-gray-300 black transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (workToDelete) {
                    deleteWorkMutation.mutate(workToDelete);
                  }
                }}
                disabled={deleteWorkMutation.isPending}
                className="flex-1 py-2 px-4 rounded font-semibold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {deleteWorkMutation.isPending ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
        </div>
      </CustomScrollbar>
    </div>
  );
};

export default Dashboard;
