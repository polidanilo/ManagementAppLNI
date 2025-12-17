import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { Work } from '../types';
import CustomScrollbar from '../components/CustomScrollbar';

const WORK_CATEGORIES: Work['category'][] = ['Campo', 'Officina', 'Servizi', 'Gommoni', 'Barche', 'Vele', 'Altro'];

type WorkForm = {
  title: string;
  description: string;
  category: string;
  notes: string;
};

const WorksNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedShift } = useAppContext();

  const [workForm, setWorkForm] = useState<WorkForm>({ title: '', description: '', category: '', notes: '' });
  const [workStatus, setWorkStatus] = useState<'pending' | 'completed'>('completed');
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(
    selectedShift?.id && selectedShift.id !== -1 ? selectedShift.id : null
  );
  const [showShiftSelector, setShowShiftSelector] = useState(false);

  const shiftNames = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  const createWorkMutation = useMutation({
    mutationFn: async (payload: Omit<Work, 'id'>) => {
      const res = await workService.create(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-works'] });
      navigate('/works');
    },
    onError: () => {
      alert('Errore durante la creazione del lavoro');
    },
  });

  const handleClose = () => {
    navigate('/works');
  };

  const handleAddWork = () => {
    if (!selectedShiftId) {
      alert('Seleziona un turno');
      return;
    }
    if (!workForm.title) {
      alert('Inserisci un titolo');
      return;
    }
    if (!workForm.category) {
      alert('Seleziona una categoria');
      return;
    }

    const payload = {
      title: workForm.title,
      description: workForm.description || '',
      category: workForm.category as Work['category'],
      status: workStatus,
      work_date: new Date().toISOString().split('T')[0],
      shift_id: selectedShiftId,
      notes: '',
      created_by: '',
    } as Omit<Work, 'id'>;
    
    createWorkMutation.mutate(payload);
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
            linear-gradient(135deg, #FF5958, #39A8FB 33%, #FF9151 66%, #10B981) border-box
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
                Aggiungi lavoro
              </h3>
            </div>
            <div className="flex items-center gap-2">
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
              <button
              onClick={(e) => {
                const newStatus = workStatus === 'pending' ? 'completed' : 'pending';
                setWorkStatus(newStatus);
                setTimeout(() => e.currentTarget.blur(), 0);
              }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: workStatus === 'completed' ? '#10B981' : '#FF9151'
              }}
              title={workStatus === 'completed' ? 'Segna come in corso' : 'Segna come completato'}
            >
              {workStatus === 'completed' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
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
              <input
                type="text"
                value={workForm.title}
                onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                placeholder="Lavoro"
                className="w-full px-1 pt-1.5 pb-0.5 bg-transparent border-0 border-b-2 text-base black transition-all duration-200 focus:outline-none"
                style={{ borderColor: '#FF9151' }}
              />

              <select
                value={workForm.category}
                onChange={(e) => setWorkForm({ ...workForm, category: e.target.value })}
                className="w-full px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 focus:outline-none black"
                style={{ borderColor: '#FF9151' }}
              >
                <option value="">Seleziona categoria</option>
                {WORK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div>
                <textarea
                  value={workForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 110) {
                      setWorkForm({ ...workForm, description: value });
                    }
                  }}
                  placeholder="Descrizione - Opzionale"
                  maxLength={110}
                  className="w-full mt-0 px-1 mt-12 pt-1 pb-1 bg-transparent border-0 border-b-2 text-base black resize-none transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    height: 'auto',
                    minHeight: '20px',
                    overflow: 'hidden',
                    lineHeight: '1.3',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    borderColor: '#FF9151'
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
                  {workForm.description.length}/110 caratteri
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </div>

        <div className="fixed bottom-2 left-0 right-0 bg-white backdrop-blur-sm px-6 py-3">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button
              onClick={handleAddWork}
              disabled={createWorkMutation.isPending}
              className="py-2 rounded-full text-base font-semibold transition-all duration-300 py-1"
              style={{
                width: '120px',
                backgroundColor: workStatus === 'completed' ? '#10B981' : '#FF9151',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = workStatus === 'completed' ? 'rgb(5, 150, 105)' : 'rgb(241, 120, 65)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = workStatus === 'completed' ? '#10B981' : '#FF9151';
              }}
            >
              {createWorkMutation.isPending 
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
                e.currentTarget.style.color = '#FF9151';
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
        `}</style>
      </div>
    </>
  );
};

export default WorksNew;
