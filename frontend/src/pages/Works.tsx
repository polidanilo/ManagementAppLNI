import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WorksNew from './WorksNew';
import WorksDetails from './WorksDetails';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workService, seasonService, shiftService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { Work } from '../types';
import BottomNav from '../components/Layout/BottomNav';
import { getShiftOrdinalName } from '../utils/shiftNames';
import { formatDate } from '../utils/dateFormat';
import CustomScrollbar from '../components/CustomScrollbar';

const Works: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedShift, selectedSeason, setSelectedSeason, setSelectedShift } = useAppContext();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('completed');
  
  const showNewModal = searchParams.get('modal') === 'new';
  const showDetailsModal = searchParams.get('id') !== null;

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await seasonService.getAll();
      return response.data;
    },
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedSeason?.id],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const response = await shiftService.getBySeasonId(selectedSeason.id);
      const sortedShifts = response.data.sort((a, b) => a.shift_number - b.shift_number);
      return sortedShifts;
    },
    enabled: !!selectedSeason,
  });

  // Auto-select season 2025 ONLY on first load
  const [hasAutoSelected, setHasAutoSelected] = React.useState(false);
  
  React.useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeason && !hasAutoSelected) {
      const season2025 = seasons.find(s => s.name === '2025');
      if (season2025) {
        setSelectedSeason(season2025);
      } else {
        setSelectedSeason(seasons[0]);
      }
      setHasAutoSelected(true);
    }
  }, [seasons, selectedSeason, setSelectedSeason, hasAutoSelected]);

  // Auto-select "Tutti" when shifts are loaded
  React.useEffect(() => {
    if (shifts && shifts.length > 0 && !selectedShift && selectedSeason && hasAutoSelected) {
      // Seleziona "Tutti" - usa un oggetto speciale con id -1
      setSelectedShift({ id: -1, shift_number: 0, season_id: selectedSeason.id, start_date: '', end_date: '' } as any);
    }
  }, [shifts, selectedShift, selectedSeason, setSelectedShift, hasAutoSelected]);

  // TUTTI i lavori esistenti
  const { data: allWorks, isLoading: worksLoading } = useQuery({
    queryKey: ['all-works', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift?.id) return [];
      
      // Se "Tutti" è selezionato (id === -1), recupera tutti i lavori della stagione
      if (selectedShift.id === -1 && shifts) {
        const allWorks = await Promise.all(
          shifts.map(shift => workService.getAll({ shift_id: shift.id }))
        );
        return allWorks.flatMap(res => res.data);
      }
      
      const res = await workService.getAll({ shift_id: selectedShift.id });
      return res.data;
    },
    enabled: !!selectedShift?.id && (selectedShift.id !== -1 || !!shifts),
  });


  const toggleWorkStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'pending' | 'completed' }) => {
      const res = await workService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-works'] });
    },
  });

  const handleToggleStatus = (e: React.MouseEvent, work: Work) => {
    e.stopPropagation();
    const newStatus = work.status === 'pending' ? 'completed' : 'pending';
    toggleWorkStatusMutation.mutate({ id: work.id, status: newStatus });
  };




  // Filtered problems - ora filtra da TUTTI i problemi esistenti
  // Handlers per season e shift
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedSeason(null);
      setSelectedShift(null);
    } else {
      const seasonId = Number(value);
      const season = seasons?.find((s) => s.id === seasonId);
      if (season) {
        setSelectedSeason(season);
        setSelectedShift(null);
      }
    }
  };

  const handleShiftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedShift(null);
    } else if (value === 'all') {
      // Seleziona "Tutti" - usa un oggetto speciale
      setSelectedShift({ id: -1, shift_number: 0, season_id: selectedSeason?.id || 0, start_date: '', end_date: '' } as any);
    } else {
      const shiftId = Number(value);
      const shift = shifts?.find((s) => s.id === shiftId);
      if (shift) {
        setSelectedShift(shift);
      }
    }
  };

  const filteredWorks = useMemo(() => {
    if (!allWorks) return [];

    let filtered = allWorks;

    // Filtro per stato
    if (filterStatus === 'pending') {
      filtered = filtered.filter(w => w.status === 'pending');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(w => w.status === 'completed');
    }

    // Filtro per testo di ricerca
    if (searchText) {
      filtered = filtered.filter(w =>
        w.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (w.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (w.category || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Ordina: lavori pending sempre in cima, poi per data (più recenti prima)
    return filtered.sort((a, b) => {
      // Prima ordina per status
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Poi ordina per data (più recenti prima)
      const dateA = new Date(a.work_date || 0).getTime();
      const dateB = new Date(b.work_date || 0).getTime();
      return dateB - dateA;
    });
  }, [allWorks, searchText, filterStatus]);

  return (
    <div className="h-screen overflow-hidden" style={{backgroundColor: '#FFF4EF'}}>
      <CustomScrollbar maxHeight="100vh">
        <div className="pb-9" style={{backgroundColor: '#FFF4EF'}}>
      {/* Top Bar con Saluto e Logout */}
      <div style={{backgroundColor: '#FFF4EF'}} className="px-4 pt-10 pb-0.5">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          {/* Riquadro Imbarcazioni con immagine di sfondo */}
          <div className="flex-1">
            <div 
              className="relative overflow-hidden rounded-tr-2xl rounded-bl-2xl shadow-sm mb-4"
              style={{
                height: '90px',
                backgroundImage: 'url(/works7.png)', // ← Modifica qui il nome dell'immagine
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Overlay scuro per oscurare l'immagine */}
              <div className="absolute inset-0 bg-black opacity-40"></div>
              
              {/* Testo sopra l'immagine */}
              <div className="ml-6 relative z-10 flex items-center h-full">
                <h1 className="text-3xl font-bold font-greycliff text-white">
                  Lavori
                </h1>
              </div>
            </div>
            
            <p className="pl-2 pt-2 text-base black">
              Ecco i lavori effettuati nei turni selezionati:
            </p>
          </div>
        </div>
      </div>

      {/* Selettori Stagione e Turno */}
      <div style={{backgroundColor: '#FFF4EF'}} className="px-4 pb-2">
        <div className="px-1 max-w-4xl mx-auto flex gap-3">
          {/* Stagione */}
          <select
            value={selectedSeason?.id || ''}
            onChange={handleSeasonChange}
            disabled={seasonsLoading}
            className="px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 disabled:opacity-50 text-gray-700"
            style={{backgroundColor: 'transparent', borderColor: '#FF9151'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF9151'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#FF9151'}
          >
            <option value="">Seleziona stagione</option>
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
            style={{backgroundColor: 'transparent', borderColor: '#FF9151'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF9151'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#FF9151'}
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

      {/* Tab Lavori o Messaggio Empty State */}
      {selectedShift ? (
        <div style={{backgroundColor: '#FFF4EF', zIndex: 1, position: 'relative'}} className="px-4 pb-9 mt-8" >
        <div className="bg-white rounded-tr-3xl rounded-bl-3xl px-4 pb-10 mt-6 mb-8 shadow-sm relative" style={{paddingBottom: '15px',
          background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #FF9151 0%, #FF9151 85%, #39A8FB 85%) border-box',
          border: '0px solid transparent',
          minHeight: '750px',
          zIndex: 1
        }}>

          {/* Tasti Switch e Pulsante + */}
          <div className="pt-4 mb-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('completed')}
                className="py-1.5 rounded-tr-xl rounded-bl-xl text-sm font-semibold transition-all duration-300"
                style={{
                  width: '120px',
                  backgroundColor: filterStatus === 'completed' ? '#10B981' : 'white',
                  color: filterStatus === 'completed' ? 'white' : '#6B7280'
                }}
                onMouseEnter={(e) => {
                  if (filterStatus === 'completed') {
                    e.currentTarget.style.backgroundColor = 'rgb(5, 150, 105)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterStatus === 'completed') {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                COMPLETATI
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className="py-1.5 rounded-tr-xl rounded-bl-xl text-sm font-semibold transition-all duration-300"
                style={{
                  width: '120px',
                  backgroundColor: filterStatus === 'pending' ? '#FF9151' : 'white',
                  color: filterStatus === 'pending' ? 'white' : '#6B7280'
                }}
                onMouseEnter={(e) => {
                  if (filterStatus === 'pending') {
                    e.currentTarget.style.backgroundColor = 'rgb(241, 120, 65)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterStatus === 'pending') {
                    e.currentTarget.style.backgroundColor = '#FF9151';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                IN CORSO
              </button>
            </div>
          </div>

          {/* Barra di ricerca */}
          <div className="mb-8 ml-0.5 mr-0.5">
            <div className="relative group">
              <input
                type="text"
                placeholder="Cerca lavori"
                className="w-full pl-8 pr-4 pb-1.5 pt-2 bg-transparent border-0 border-b-2 border-gray-300 text-sm transition-all duration-200 focus:outline-none focus:border-primary-ara text-gray-700"
                style={{backgroundColor: 'transparent', color: '#6B7280'}}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-400 transition-colors duration-200">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 15.0005L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Lista Lavori dentro la tab - Stile Dashboard */}
          <CustomScrollbar maxHeight="600px">
            {worksLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Caricamento lavori...</div>
              </div>
            ) : !allWorks || allWorks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Nessun lavoro trovato per questo turno</div>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Nessun lavoro corrisponde ai filtri selezionati</div>
              </div>
            ) : (
              <div className="space-y-2 mr-2">
                {filteredWorks.map((work) => (
                  <div
                    key={work.id}
                    className="relative p-4 pb-3.5 rounded-tr-xl rounded-bl-xl cursor-pointer transition-all duration-200 shadow-sm"
                    style={{
                      backgroundColor: work.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.4)'
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
                    onClick={() => {
                      navigate(`/works?id=${work.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="pt-0 text-base font-semibold black mb-1 truncate">
                          {work.title ? (work.title.length > 25 ? work.title.substring(0, 25) : work.title) : 'N/A'}
                        </h4>
                        <div className="text-sm black mt-3" style={{lineHeight: '1.4'}}>
                          <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {formatDate(work.work_date)}{work.shift_id ? `, ${['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'][(work.shift_id - 1) % 6]}` : ''}</span></div>
                          <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {work.category || 'Categoria'}</span></div>
                          <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {work.created_by || 'N/A'}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={(e) => handleToggleStatus(e, work)}
                          className="group w-8 h-8 mr-1 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-100 transition-all duration-200"
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
            )}
          </CustomScrollbar>
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


      <BottomNav />
      {showNewModal && <WorksNew />}
      {showDetailsModal && <WorksDetails />}
        </div>
      </CustomScrollbar>
    </div>
  );
};

export default Works;
