import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reportsService, seasonService, shiftService, orderService } from '../services/api';
import type { Season, Shift } from '../types';
import BottomNav from '../components/Layout/BottomNav';
import { useAppContext } from '../context/AppContext';
import { getShiftOrdinalName } from '../utils/shiftNames';
import { formatDate } from '../utils/dateFormat';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSeason: contextSeason } = useAppContext();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | ''>(contextSeason?.id || '');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<number[]>(() => {
    const saved = localStorage.getItem('reports_selected_shifts');
    return saved ? JSON.parse(saved) : [];
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'title' | 'amount' | 'order_date' | 'category' | 'created_by' | 'shift_id'>('order_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    seasonService.getAll().then((res) => setSeasons(res.data));
  }, []);

  useEffect(() => {
    if (seasonId) {
      shiftService.getBySeasonId(Number(seasonId)).then((res) => {
        const sortedShifts = res.data.sort((a, b) => a.shift_number - b.shift_number);
        setShifts(sortedShifts);
      });
    } else {
      setShifts([]);
      setSelectedShifts([]);
    }
  }, [seasonId]);

  useEffect(() => {
    localStorage.setItem('reports_selected_shifts', JSON.stringify(selectedShifts));
  }, [selectedShifts]);

  useEffect(() => {
    if (contextSeason && seasonId !== contextSeason.id) {
      setSeasonId(contextSeason.id);
    }
  }, [contextSeason, seasonId]);

  const { data: seasonReport, isLoading } = useQuery({
    queryKey: ['season-report', seasonId],
    queryFn: async () => {
      if (!seasonId) return null as any;
      const res = await reportsService.getSeasonReport(Number(seasonId));
      return res.data;
    },
  });

  // Fetch all COMPLETED orders for the selected shifts
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-by-shifts', seasonId, selectedShifts],
    queryFn: async () => {
      if (!seasonId || selectedShifts.length === 0) return [];
      const ordersPromises = selectedShifts.map(shiftId =>
        orderService.getAll({ shift_id: shiftId })
      );
      const ordersResults = await Promise.all(ordersPromises);
      // Keep only completed orders
      return ordersResults.flatMap(result => result.data.filter(order => order.status === 'completed'));
    },
    enabled: !!seasonId && selectedShifts.length > 0,
  });

  const handleExport = async () => {
    if (!seasonId || selectedShifts.length === 0) return;

    // Download an Excel file with the selected shifts' orders
    const res = await orderService.export({
      shift_ids: selectedShifts,
      sort_by: 'id',  // Sort by increasing ID
      order: 'asc',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `LNIspent.xlsx`;  // Fixed filename
    a.click();
    URL.revokeObjectURL(url);
  };

  const ordersByCategoryEntries = Object.entries(seasonReport?.orders_by_category || {});

  const sortedCat = [...ordersByCategoryEntries].sort((a, b) =>
    (sortDir === 'asc' ? 1 : -1) * (a[1] as number - (b[1] as number))
  );

  // Dynamic order sorting
  const sortedOrders = [...(ordersData || [])].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (sortField === 'order_date') {
      aVal = new Date(a.order_date).getTime();
      bVal = new Date(b.order_date).getTime();
    } else if (sortField === 'amount') {
      aVal = parseFloat(String(a.amount));
      bVal = parseFloat(String(b.amount));
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when shifts change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedShifts]);

  const handleShiftToggle = (shiftId: number) => {
    setSelectedShifts(prev =>
      prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const handleSelectAllShifts = () => {
    setSelectedShifts(shifts.map(s => s.id));
  };

  const handleDeselectAllShifts = () => {
    setSelectedShifts([]);
  };

  return (
    <div className="min-h-screen pb-32" style={{backgroundColor: '#F5F4ED', minHeight: 'calc(100vh + 8rem)'}}>
      {/* Header */}
      <div className="bg-white mb-1.5 border-b border-gray-200 px-4 py-3 shadow">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-0.9">
            {/* Titolo centrale */}
            <div className="flex-1 text-left">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 rounded-lg hover:transition-all duration-600 group"
              >
                <h1 className="text-xl font-bold font-display black group-hover:text-emerald-500 transition-colors duration-200">
                  Resoconto
                </h1>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card principale con filtri */}
      <div style={{backgroundColor: '#F5F4ED'}} className="px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded px-1 pt-1 pb-1 mb-1 shadow">
            <div className="px-4 py-3 border-b border-emerald-400 bg-emerald-500">
              <h2 className="text-lg font-bold font-display text-white">Seleziona stagione e turni per il resoconto</h2>
            </div>

            {/* Filtri */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold font-display text-gray-700 mb-2">Stagione</label>
                  <select
                    value={seasonId}
                    onChange={(e) => {
                      setSeasonId(e.target.value ? Number(e.target.value) : '');
                      setSelectedShifts([]);
                    }}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-gray-300 text-sm font-bold transition-all duration-200 focus:outline-none focus:border-emerald-500 text-emerald-500"
                    style={{backgroundColor: 'transparent', color: '#059669'}}
                  >
                    <option value="">Seleziona stagione</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold font-display text-gray-700 mb-2">Turni</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllShifts}
                        disabled={!seasonId || shifts.length === 0}
                        className="px-3 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Seleziona tutti
                      </button>
                      <button
                        onClick={handleDeselectAllShifts}
                        disabled={selectedShifts.length === 0}
                        className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Deseleziona tutti
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {shifts.map((shift) => (
                        <label key={shift.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedShifts.includes(shift.id)}
                            onChange={() => handleShiftToggle(shift.id)}
                            className="w-4 h-4 text-emerald-500 bg-white border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">{getShiftOrdinalName(shift.shift_number)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleExport}
                    disabled={!seasonId || selectedShifts.length === 0}
                    className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded text-sm font-bold transition-all duration-300"
                    onMouseEnter={(e) => {
                      if (seasonId && selectedShifts.length > 0) {
                        e.currentTarget.style.boxShadow = 'inset 0px 0px 100px rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Scarica Excel - Turni selezionati: {selectedShifts.length > 0 ? `${selectedShifts.length}` : 'nessuno'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div style={{backgroundColor: '#F5F4ED'}} className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          {isLoading || ordersLoading ? (
            <div className="text-center py-16">
              <div className="text-gray-500 text-sm">Caricamento report...</div>
            </div>
          ) : !seasonId || selectedShifts.length === 0 ? (
            <div className="text-center py-1">
              <div className="bg-green-50 border border-green-200 p-4 rounded shadow">
                <p className="text-green-700 text-sm font-bold">
                  Seleziona una stagione e almeno un turno dal pannello soprastante per poterne visualizzare i dati
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-sm text-gray-500">Spese totali</div>
                  <div className="text-2xl font-bold text-emerald-500">€{seasonReport.total_orders_amount.toFixed(2)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-sm text-gray-500">Acquisti effettuati</div>
                  <div className="text-2xl font-bold text-emerald-500">{seasonReport.total_orders_count}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-sm text-gray-500">Lavori completati</div>
                  <div className="text-2xl font-bold text-emerald-500">{seasonReport.total_works_count}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-sm text-gray-500">Problemi/danni alle imbarcazioni </div>
                  <div className="text-2xl font-bold text-emerald-500">{seasonReport.total_problems_count}</div>
                </div>
              </div>

              {/* Spese per Categoria */}
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-emerald-400 bg-emerald-50">
                  <h3 className="font-semibold font-display text-emerald-800">Spese per categoria - Turni selezionati: {selectedShifts.length > 0 ? `${selectedShifts.length}` : 'nessuno'}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase">Categoria</th>
                        <th onClick={() => setSortDir((d)=> d==='asc'?'desc':'asc')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                          Importo <span className="text-[10px]">{sortDir==='asc'?'↑':'↓'}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedCat.map(([cat, amt]) => (
                        <tr key={cat}>
                          <td className="px-6 py-6 text-sm black">{cat}</td>
                          <td className="px-6 py-6 text-sm text-emerald-500 font-medium">€{(amt as number).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabella riepilogo acquisti */}
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-emerald-400 bg-emerald-50">
                  <h3 className="font-semibold font-display text-emerald-800">
                    Elenco acquisti - Turni selezionati: {selectedShifts.length > 0 ? `${selectedShifts.length}` : 'Nessun turno selezionato'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th onClick={() => handleSort('title')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          Titolo {sortField === 'title' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleSort('amount')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          Importo {sortField === 'amount' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleSort('order_date')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          Data {sortField === 'order_date' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleSort('category')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          Categoria {sortField === 'category' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleSort('created_by')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          User {sortField === 'created_by' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleSort('shift_id')} className="px-6 pb-3 pt-4 text-left border-b border-gray-200 text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 w-[120px]">
                          Turno {sortField === 'shift_id' && <span className="text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedOrders.map((order) => {
                        const shift = shifts.find(s => s.id === order.shift_id);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm font-medium black w-[120px]">{order.title}</td>
                            <td className="px-6 py-3 text-sm text-emerald-500 font-medium w-[120px]">€{parseFloat(String(order.amount)).toFixed(2)}</td>
                            <td className="px-6 py-3 text-sm text-gray-600 w-[120px]">{formatDate(order.order_date)}</td>
                            <td className="px-6 py-3 text-sm black w-[120px]">{order.category}</td>
                            <td className="px-6 py-3 text-sm text-gray-600 w-[120px]">{order.created_by || 'User'}</td>
                            <td className="px-6 py-3 text-sm black w-[120px]">{shift ? getShiftOrdinalName(shift.shift_number) : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {selectedShifts.length > 0 && (
                  <div className="px-6 py-3 border-t border-gray-200 bg-emerald-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-emerald-800">
                        <div>Spese totali: €{sortedOrders.reduce((sum, order) => sum + parseFloat(String(order.amount)), 0).toFixed(2)}</div>
                        <div>Acquisti effettuati: {sortedOrders.length}</div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page);
                            }
                          }}
                          className="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-emerald-800">/ {totalPages}</span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Reports;
