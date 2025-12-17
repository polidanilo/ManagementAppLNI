import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OrdersNew from './OrdersNew';
import OrdersDetails from './OrdersDetails';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, seasonService, shiftService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { Order } from '../types';
import BottomNav from '../components/Layout/BottomNav';
import { getShiftOrdinalName } from '../utils/shiftNames';
import { formatDate } from '../utils/dateFormat';
import CustomScrollbar from '../components/CustomScrollbar';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedShift, selectedSeason, setSelectedSeason, setSelectedShift } = useAppContext();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('completed');
  
  const showNewModal = searchParams.get('modal') === 'new';
  const showDetailsModal = searchParams.get('id') !== null;

  // Fetch seasons
  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await seasonService.getAll();
      return response.data;
    },
  });

  // Fetch shifts quando cambia la stagione
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
      setSelectedShift({ id: -1, shift_number: 0, season_id: selectedSeason.id, start_date: '', end_date: '' } as any);
    }
  }, [shifts, selectedShift, selectedSeason, setSelectedShift, hasAutoSelected]);

  // TUTTI gli ordini esistenti
  const { data: allOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['all-orders', selectedShift?.id, selectedSeason?.id],
    queryFn: async () => {
      if (!selectedShift?.id) return [];
      
      if (selectedShift.id === -1 && shifts) {
        const allOrders = await Promise.all(
          shifts.map(shift => orderService.getAll({ shift_id: shift.id }))
        );
        return allOrders.flatMap(res => res.data);
      }
      
      const res = await orderService.getAll({ shift_id: selectedShift.id });
      return res.data;
    },
    enabled: !!selectedShift?.id && (selectedShift.id !== -1 || !!shifts),
  });

  const toggleOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'pending' | 'completed' }) => {
      const res = await orderService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });

  const handleToggleStatus = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const newStatus = order.status === 'pending' ? 'completed' : 'pending';
    toggleOrderStatusMutation.mutate({ id: order.id, status: newStatus });
  };

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

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];

    let filtered = allOrders;

    // Filtro per stato
    if (filterStatus === 'pending') {
      filtered = filtered.filter(o => o.status === 'pending');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(o => o.status === 'completed');
    }

    // Filtro per testo di ricerca
    if (searchText) {
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (o.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (o.category || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Ordina: ordini pending sempre in cima, poi per data (più recenti prima)
    return filtered.sort((a, b) => {
      // Prima ordina per status
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Poi ordina per data (più recenti prima)
      const dateA = new Date(a.order_date || 0).getTime();
      const dateB = new Date(b.order_date || 0).getTime();
      return dateB - dateA;
    });
  }, [allOrders, searchText, filterStatus]);

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
                backgroundImage: 'url(/orders5.png)', // ← Modifica qui il nome dell'immagine
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Overlay scuro per oscurare l'immagine */}
              <div className="absolute inset-0 bg-black opacity-20"></div>
              
              {/* Testo sopra l'immagine */}
              <div className="ml-6 relative z-10 flex items-center h-full">
                <h1 className="text-3xl font-bold font-greycliff text-white">
                  Ordini
                </h1>
              </div>
            </div>
            
            <p className="pl-2 pt-2 text-base black">
              Ecco gli ordini effettuati nei turni selezionati:
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
            className="px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 disabled:opacity-50 black"
            style={{backgroundColor: 'transparent', borderColor: '#39A8FB'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#39A8FB'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#39A8FB'}
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
            className="px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 focus:outline-none disabled:opacity-50 black"
            style={{backgroundColor: 'transparent', borderColor: '#39A8FB'}}
            onFocus={(e) => e.currentTarget.style.borderColor = '#39A8FB'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#39A8FB'}
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

      {/* Tab Ordini o Messaggio Empty State */}
      {selectedShift ? (
        <div style={{backgroundColor: '#FFF4EF', zIndex: 1, position: 'relative'}} className="px-4 pb-9 mt-8" >
        <div className="bg-white rounded-tr-3xl rounded-bl-3xl px-4 pb-10 mt-6 mb-8 shadow-sm relative" style={{paddingBottom: '15px',
          background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #39A8FB 0%, #39A8FB 85%, #FF9151 85%) border-box',
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
                  backgroundColor: filterStatus === 'completed' ? '#39A8FB' : 'white',
                  color: filterStatus === 'completed' ? 'white' : '#6B7280'
                }}
                onMouseEnter={(e) => {
                  if (filterStatus === 'completed') {
                    e.currentTarget.style.backgroundColor = 'rgb(39, 152, 238)';
                  } else {
                    e.currentTarget.style.backgroundColor = ' rgb(57, 168, 251, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterStatus === 'completed') {
                    e.currentTarget.style.backgroundColor = '#39A8FB';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                EFFETTUATI
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
                PROGRAMMATI
              </button>
            </div>

            {/* Excel Export Button - Scarica TUTTI i turni della stagione */}
            <button
              onClick={async () => {
                if (!selectedSeason?.id || !shifts) return;
                try {
                  // Scarica tutti gli ordini della stagione (tutti i turni)
                  const allShiftIds = shifts.map(s => s.id);
                  const res = await orderService.export({
                    shift_ids: allShiftIds,
                    status_filter: 'completed',
                    sort_by: 'order_date',
                    order: 'desc',
                  });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Ordini_Stagione_${selectedSeason.name}_Tutti_Turni.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exporting orders:', error);
                  alert('Errore durante l\'esportazione');
                }
              }}
              disabled={!selectedSeason || !shifts || shifts.length === 0}
              className="w-7 h-7 mr-0.5 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30"
              style={{
                backgroundColor: (selectedSeason && shifts && shifts.length > 0) ? '#10B981' : '#D1D5DB',
                cursor: (selectedSeason && shifts && shifts.length > 0) ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => {
                if (selectedSeason && shifts && shifts.length > 0) {
                  e.currentTarget.style.backgroundColor = 'rgb(15, 167, 116)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSeason && shifts && shifts.length > 0) {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }
              }}
              title="Scarica Excel (Tutti i turni)"
            >
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18" height="18" viewBox="0 0 30 30" fill="white">
    <path d="M 15 3 A 2 2 0 0 0 14.599609 3.0429688 L 14.597656 3.0410156 L 4.6289062 5.0351562 L 4.6269531 5.0371094 A 2 2 0 0 0 3 7 L 3 23 A 2 2 0 0 0 4.6289062 24.964844 L 14.597656 26.958984 A 2 2 0 0 0 15 27 A 2 2 0 0 0 17 25 L 17 5 A 2 2 0 0 0 15 3 z M 19 5 L 19 8 L 21 8 L 21 10 L 19 10 L 19 12 L 21 12 L 21 14 L 19 14 L 19 16 L 21 16 L 21 18 L 19 18 L 19 20 L 21 20 L 21 22 L 19 22 L 19 25 L 25 25 C 26.105 25 27 24.105 27 23 L 27 7 C 27 5.895 26.105 5 25 5 L 19 5 z M 23 8 L 24 8 C 24.552 8 25 8.448 25 9 C 25 9.552 24.552 10 24 10 L 23 10 L 23 8 z M 6.1855469 10 L 8.5878906 10 L 9.8320312 12.990234 C 9.9330313 13.234234 10.013797 13.516891 10.091797 13.837891 L 10.125 13.837891 C 10.17 13.644891 10.258531 13.351797 10.394531 12.966797 L 11.785156 10 L 13.972656 10 L 11.359375 14.955078 L 14.050781 19.998047 L 11.716797 19.998047 L 10.212891 16.740234 C 10.155891 16.625234 10.089203 16.393266 10.033203 16.072266 L 10.011719 16.072266 C 9.9777187 16.226266 9.9105937 16.458578 9.8085938 16.767578 L 8.2949219 20 L 5.9492188 20 L 8.7324219 14.994141 L 6.1855469 10 z M 23 12 L 24 12 C 24.552 12 25 12.448 25 13 C 25 13.552 24.552 14 24 14 L 23 14 L 23 12 z M 23 16 L 24 16 C 24.552 16 25 16.448 25 17 C 25 17.552 24.552 18 24 18 L 23 18 L 23 16 z M 23 20 L 24 20 C 24.552 20 25 20.448 25 21 C 25 21.552 24.552 22 24 22 L 23 22 L 23 20 z"></path>
</svg>
            </button>
          </div>

          {/* Barra di ricerca */}
          <div className="mb-8 ml-0.5 mr-0.5">
            <div className="relative group">
              <input
                type="text"
                placeholder="Cerca ordini"
                className="w-full pl-8 pr-4 pb-1.5 pt-2 bg-transparent border-0 border-b-2 border-gray-300 text-sm transition-all duration-200 focus:outline-none focus:border-primary-azr black"
                style={{backgroundColor: 'transparent', color: '#6B7280'}}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-azr transition-colors duration-200">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 15.0005L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Lista Ordini dentro la tab - Stile Dashboard */}
          <CustomScrollbar maxHeight="600px">
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Caricamento ordini...</div>
              </div>
            ) : !allOrders || allOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Nessun ordine trovato per questo turno</div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">Nessun ordine corrisponde ai filtri selezionati</div>
              </div>
            ) : (
              <div className="space-y-2 mr-2">
                {filteredOrders.map((order) => (
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
                        e.currentTarget.style.backgroundColor = 'rgb(57, 168, 251, 0.6)';
                      } else {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.7)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (order.status === 'completed') {
                        e.currentTarget.style.backgroundColor = 'rgb(57, 168, 251, 0.4)';
                      } else {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 145, 81, 0.5)';
                      }
                    }}
                    onClick={() => {
                      navigate(`/orders?id=${order.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="pt-0 text-base font-semibold black mb-1">
                          €{order.amount ? order.amount.toFixed(2) : '0.00'}
                        </h4>
                        <div className="text-sm black mt-3" style={{lineHeight: '1.4'}}>
                          <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {formatDate(order.order_date)}{order.shift_id ? `, ${['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'][(order.shift_id - 1) % 6]}` : ''}</span></div>
                          <div><span className="whitespace-nowrap"><span className="text-lg font-bold">•</span> {order.category || 'Categoria'}</span></div>
                          <div><span className="break-words"><span className="text-lg font-bold">•</span> {order.title ? (order.title.length > 25 ? order.title.substring(0, 25) : order.title) : 'N/A'}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={(e) => handleToggleStatus(e, order)}
                          className="group w-8 h-8 mr-1 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-100 transition-all duration-200"
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
      {showNewModal && <OrdersNew />}
      {showDetailsModal && <OrdersDetails />}
        </div>
      </CustomScrollbar>
    </div>
  );
};

export default Orders;
