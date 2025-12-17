import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { Order } from '../types';
import CustomScrollbar from '../components/CustomScrollbar';

type OrderForm = {
  title: string;
  amount: number;
  category: string;
  notes: string;
};

const OrdersNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedShift } = useAppContext();

  const [orderForm, setOrderForm] = useState<OrderForm>({ title: '', amount: 0, category: '', notes: '' });
  const [orderStatus, setOrderStatus] = useState<'pending' | 'completed'>('completed');
  const [amountInput, setAmountInput] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(
    selectedShift?.id && selectedShift.id !== -1 ? selectedShift.id : null
  );
  const [showShiftSelector, setShowShiftSelector] = useState(false);

  const shiftNames = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  const createOrderMutation = useMutation({
    mutationFn: async (payload: Omit<Order, 'id'>) => {
      const res = await orderService.create(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      navigate('/orders');
    },
    onError: () => {
      alert('Errore durante la creazione dell\'ordine');
    },
  });

  const handleClose = () => {
    navigate('/orders');
  };

  const handleAddOrder = () => {
    if (!selectedShiftId) {
      alert('Seleziona un turno');
      return;
    }
    if (!orderForm.title) {
      alert('Inserisci il titolo');
      return;
    }
    if (!orderForm.category) {
      alert('Seleziona una categoria');
      return;
    }
    if (!orderForm.amount || orderForm.amount <= 0) {
      alert('Inserisci un importo valido');
      return;
    }

    const payload = {
      title: orderForm.title,
      amount: orderForm.amount,
      category: orderForm.category,
      order_date: new Date().toISOString().split('T')[0],
      notes: orderForm.notes || '',
      status: orderStatus,
      shift_id: selectedShiftId,
    } as Omit<Order, 'id'>;
    
    createOrderMutation.mutate(payload);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-[60] transition-opacity duration-300"
        onClick={handleClose}
      />
      
      <div 
        className="fixed inset-x-0 bottom-0 z-[70] bg-white backdrop-blur-sm rounded-tr-3xl shadow-sm mx-0.3"
        style={{
          height: '56vh',
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
                Aggiungi ordine
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Selettore turno modificabile */}
              <div className="relative">
                <button
                  onClick={() => setShowShiftSelector(!showShiftSelector)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
                  style={{
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#6B7280'
                  }}
                  title="Seleziona turno"
                >
                  <span className="text-sm text-gray-700" style={{fontFamily: 'Greycliff CF', fontWeight: 900}}>
                    {selectedShiftId && selectedShiftId !== -1 ? romanNumerals[(selectedShiftId - 1) % 6] : 'T'}
                  </span>
                </button>
                
                {showShiftSelector && (
                  <div className="absolute top-10 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50" style={{minWidth: '150px'}}>
                    {shiftNames.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedShiftId(index + 1);
                          setShowShiftSelector(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-3"
                      >
                        <div className="text-gray-700" style={{width: '20px', fontFamily: 'Greycliff CF', fontWeight: 900}}>{romanNumerals[index]}</div>
                        <div className="text-sm text-gray-600 whitespace-nowrap">{name} turno</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Bottone stato */}
              <button
              onClick={(e) => {
                const newStatus = orderStatus === 'pending' ? 'completed' : 'pending';
                setOrderStatus(newStatus);
                setTimeout(() => e.currentTarget.blur(), 0);
              }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: orderStatus === 'completed' ? '#39A8FB' : '#FF9151'
              }}
              title={orderStatus === 'completed' ? 'Segna come programmato' : 'Segna come effettuato'}
            >
              {orderStatus === 'completed' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-azr" viewBox="0 0 20 20" fill="currentColor">
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
                  value={orderForm.title}
                  onChange={(e) => setOrderForm({ ...orderForm, title: e.target.value })}
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
                      setOrderForm({ ...orderForm, amount: numValue });
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
                value={orderForm.category}
                onChange={(e) => setOrderForm({ ...orderForm, category: e.target.value })}
                className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-primary-azr text-base transition-all duration-200 focus:outline-none black"
              >
                <option value="">Seleziona categoria</option>
                <option value="Attrezzatura">Attrezzatura</option>
                <option value="Materiali">Materiali</option>
                <option value="Manutenzione">Manutenzione</option>
                <option value="Consumabili">Consumabili</option>
                <option value="Altro">Altro</option>
              </select>

              <div>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 110) {
                      setOrderForm({ ...orderForm, notes: value });
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
                  {orderForm.notes.length}/110 caratteri
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </div>

        <div className="fixed bottom-2 left-0 right-0 bg-white backdrop-blur-sm px-6 py-3">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button
              onClick={handleAddOrder}
              disabled={createOrderMutation.isPending}
              className="py-2 text-base font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: '120px',
                backgroundColor: orderStatus === 'completed' ? '#39A8FB' : '#FF9151',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = orderStatus === 'completed' ? 'rgb(30, 140, 220)' : 'rgb(241, 120, 65)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = orderStatus === 'completed' ? '#39A8FB' : '#FF9151';
              }}
            >
              {createOrderMutation.isPending 
                ? 'Aggiungendo...' 
                : 'Aggiungi'}
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
              Annulla
            </button>
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

export default OrdersNew;
