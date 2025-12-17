import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, authService } from '../services/api';
import type { Order } from '../types';
import CustomScrollbar from '../components/CustomScrollbar';

const OrdersDetails: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const id = searchParams.get('id');

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [amountInput, setAmountInput] = useState<string>('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCreatedBy, setEditCreatedBy] = useState<number | null>(null);
  const [editOrderDate, setEditOrderDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([]);
  const [editShiftId, setEditShiftId] = useState<number | null>(null);

  const shiftNames = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await orderService.getById(Number(id));
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    authService.getUsers().then(res => {
      setUsers(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (order) {
      setEditingOrder(order);
      setEditTitle(order.title);
      setEditAmount(order.amount);
      setAmountInput(order.amount > 0 ? order.amount.toFixed(2) : '');
      setEditCategory(order.category);
      setEditNotes(order.notes || '');
      setEditCreatedBy(order.user_id || null);
      setEditOrderDate(order.order_date || '');
      setEditShiftId(order.shift_id || null);
    }
  }, [order]);

  const toggleOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'pending' | 'completed' }) => {
      const res = await orderService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await orderService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      navigate('/orders');
    },
  });

  const handleClose = () => {
    navigate('/orders');
  };

  const handleToggleStatus = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!editingOrder) return;
    const newStatus = editingOrder.status === 'completed' ? 'pending' : 'completed';
    setEditingOrder({ ...editingOrder, status: newStatus });
    toggleOrderStatusMutation.mutate({ id: editingOrder.id, status: newStatus });
    setTimeout(() => e.currentTarget.blur(), 0);
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    
    // Validation
    if (!editTitle.trim()) {
      alert('Inserisci il titolo');
      return;
    }
    if (!editCategory) {
      alert('Seleziona una categoria');
      return;
    }
    if (!editAmount || editAmount <= 0) {
      alert('Inserisci un importo valido');
      return;
    }
    
    try {
      // Find username from user_id
      const selectedUser = users.find(u => u.id === editCreatedBy);
      
      await orderService.update(editingOrder.id, {
        title: editTitle,
        amount: editAmount,
        category: editCategory,
        notes: editNotes,
        created_by: selectedUser?.username || undefined,
        user_id: editCreatedBy || undefined,
        order_date: editOrderDate || undefined,
        shift_id: editShiftId || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      navigate('/orders');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Errore durante l\'aggiornamento dell\'ordine');
    }
  };

  const handleDelete = () => {
    if (!editingOrder) return;
    deleteOrderMutation.mutate(editingOrder.id);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center">
        <div className="text-white">Caricamento...</div>
      </div>
    );
  }

  if (!editingOrder) {
    return null;
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-[60] transition-opacity duration-300"
        onClick={handleClose}
      />
      
      <div 
        className="fixed inset-x-0 bottom-0 z-[70] bg-white backdrop-blur-sm rounded-tr-3xl shadow-sm mx-0.3"
        style={{
          height: '68vh',
          animation: 'slideUp 0.1s ease-out',
          background: `
            linear-gradient(white, white) padding-box,
            linear-gradient(135deg, #FF5958, #FF9151 33%, #39A8FB 66%, #10B981) border-box
          `,
          border: '2px solid transparent',
          borderBottom: '0'
        }}
      >
        <div 
          className="flex justify-center pt-2 pb-2"
        >
          <div className="w-14 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        <div className="pl-7 pr-7 py-4" style={{borderColor: '#0F4295'}}>
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-2">
            <div>
              <h3 className="text-xl font-bold font-greycliff black">
                Dettagli ordine
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Icona turno statica (solo visualizzazione) */}
              <div
                className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm"

                title={editShiftId ? `${shiftNames[(editShiftId - 1) % 6]} turno` : 'Turno non assegnato'}
              >
                <span className="text-sm text-gray-700" style={{fontFamily: 'Greycliff CF', fontWeight: 900}}>
                  {editShiftId ? romanNumerals[(editShiftId - 1) % 6] : '?'}
                </span>
              </div>
              
              {/* Bottone stato */}
              <button
              onClick={handleToggleStatus}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: editingOrder.status === 'completed' ? '#39A8FB' : '#FF9151'
              }}
              title={editingOrder.status === 'completed' ? 'Segna come programmato' : 'Segna come effettuato'}
            >
              {editingOrder.status === 'completed' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="#39A8FB">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="#FF9151">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            </div>
          </div>
        </div>

        <div className="pl-6 pr-5 py-2 pb-0">
          <CustomScrollbar maxHeight="calc(81vh - 130px)">
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Titolo e Importo sulla stessa riga */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ordine"
                  className="flex-1 px-1 pt-1.5 pb-0.5 bg-transparent border-0 border-b-2 border-primary-azr text-base black transition-all duration-200 focus:outline-none"
                  style={{ width: '75%' }}
                />
                <div className="flex items-center gap-1 overflow-hidden" style={{ width: '25%', maxWidth: '110px' }}>
                  <div className="text-base pl-0 pt-0.5 black whitespace-nowrap">€</div>
                  <input
                    type="text"
                    value={amountInput}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.]/g, '');
                      // Allow only one decimal point
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }
                      // Limit to 2 decimal places
                      if (parts.length === 2 && parts[1].length > 2) {
                        value = parts[0] + '.' + parts[1].substring(0, 2);
                      }
                      setAmountInput(value);
                      const numValue = parseFloat(value) || 0;
                      setEditAmount(numValue);
                    }}
                    onBlur={() => {
                      if (amountInput && !amountInput.includes('.')) {
                        setAmountInput(amountInput + '.00');
                      } else if (amountInput.endsWith('.')) {
                        setAmountInput(amountInput + '00');
                      } else if (amountInput.includes('.')) {
                        const parts = amountInput.split('.');
                        if (parts[1].length === 1) {
                          setAmountInput(amountInput + '0');
                        }
                      }
                    }}
                    placeholder="0.00"
                    className="flex-1 pl-0 pt-1.5 pb-0.5 pr-0 bg-transparent border-0 border-b-2 border-primary-azr text-base black transition-all duration-200 focus:outline-none"
                    style={{ maxWidth: '82px' }}
                  />
                </div>
              </div>

              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-primary-azr text-base transition-all duration-200 focus:outline-none black"
              >
                <option value="">Seleziona categoria</option>
                <option value="Attrezzatura">Attrezzatura</option>
                <option value="Materiali">Materiali</option>
                <option value="Manutenzione">Manutenzione</option>
                <option value="Consumabili">Consumabili</option>
                <option value="Altro">Altro</option>
              </select>

              {/* Aggiunto da */}
              <div className="flex items-center gap-3">
                <div className="text-base pl-1 black whitespace-nowrap">Aggiunto da</div>
                <select
                  value={editCreatedBy || ''}
                  onChange={(e) => setEditCreatedBy(Number(e.target.value))}
                  className="flex-1 px-0 pt-1.5 pb-1 bg-transparent border-0 border-b-2 border-primary-azr text-base black transition-all duration-200 focus:outline-none"
                >
                  <option value="">Seleziona utente</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>

              {/* In data */}
              <div className="flex items-center gap-3">
                <div className="text-base pl-1 black whitespace-nowrap">In data</div>
                <input
                  type="date"
                  value={editOrderDate}
                  onChange={(e) => setEditOrderDate(e.target.value)}
                  className="flex-1 pt-1.5 pb-1 bg-transparent border-0 border-b-2 border-primary-azr text-base black transition-all duration-200 focus:outline-none"
                />
              </div>

              {/* Descrizione */}
              <div className="mt-2">
                <textarea
                  value={editNotes}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 110) {
                      setEditNotes(value);
                    }
                  }}
                  placeholder="Descrizione - Opzionale"
                  maxLength={110}
                  className="w-full mt-0 px-1 mt-12 pt-1 pb-1 bg-transparent border-0 border-b-2 border-primary-azr text-base black resize-none transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    height: 'auto',
                    minHeight: '20px',
                    overflow: 'hidden',
                    lineHeight: '1.3',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                />
                <div className="text-xs black mt-1 text-right">
                  {editNotes.length}/110 caratteri
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </div>

        <div className="fixed bottom-2 left-0 right-0 bg-white backdrop-blur-sm px-6 py-3">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="py-2 rounded-full text-base font-semibold transition-all duration-300 py-1"
                style={{
                  width: '120px',
                  backgroundColor: editingOrder?.status === 'completed' ? '#39A8FB' : '#FF9151',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = editingOrder?.status === 'completed' ? 'rgb(30, 140, 220)' : 'rgb(241, 120, 65)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = editingOrder?.status === 'completed' ? '#39A8FB' : '#FF9151';
                }}
              >
                Salva
              </button>
            </div>

            {!showDeleteConfirm ? (
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-base font-semibold transition-all duration-300"
                  style={{ color: '#000000' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#39A8FB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#000000';
                  }}
                >
                  Elimina
                </button>
                <button
                  onClick={handleClose}
                  className="text-base mr-1 font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: 'white',
                    color: '#000000'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#39A8FB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#000000';
                  }}
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mr-1">
                <button
                  onClick={handleDelete}
                  className="text-base font-semibold"
                  style={{ color: '#39A8FB' }}
                >
                  Conferma
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-base font-semibold"
                  style={{ color: '#000000' }}
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          textarea::placeholder {
            color: #9CA3AF;
            opacity: 1;
          }
          input[type=number]::-webkit-inner-spin-button,
          input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type=number] {
            -moz-appearance: textfield;
          }
        `}</style>
      </div>
    </>
  );
};

export default OrdersDetails;
