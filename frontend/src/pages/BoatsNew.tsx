import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boatService, problemService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { Boat, Problem } from '../types';
import CustomScrollbar from '../components/CustomScrollbar';

const BOAT_TYPES: Boat['type'][] = ['Gommone', 'Optimist', 'Fly', 'Equipe', 'Caravella', 'Trident'];

type ProblemForm = {
  description: string;
  part_affected: string;
};

const BoatsNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedShift } = useAppContext();

  const [selectedType, setSelectedType] = useState<Boat['type'] | ''>('');
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [problemForm, setProblemForm] = useState<ProblemForm>({ description: '', part_affected: '' });
  const [problemStatus, setProblemStatus] = useState<'open' | 'closed'>('open');
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(selectedShift?.id && selectedShift.id !== -1 ? selectedShift.id : null);
  const [showShiftSelector, setShowShiftSelector] = useState(false);
  
  const shiftNames = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  const { data: boats } = useQuery({
    queryKey: ['boats', selectedType],
    queryFn: async () => {
      const res = await (selectedType ? boatService.getByType(selectedType) : boatService.getAll());
      return res.data;
    },
  });

  const { data: parts } = useQuery({
    queryKey: ['boat-parts', selectedType],
    enabled: Boolean(selectedType),
    queryFn: async () => {
      if (!selectedType) return [] as string[];
      const res = await boatService.getPartsByType(selectedType);
      return res.data;
    },
  });

  const createProblemMutation = useMutation({
    mutationFn: async (payload: Omit<Problem, 'id' | 'resolved_date'>) => {
      const res = await problemService.createWithDate(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-problems'] });
      navigate('/boats');
    },
    onError: (error) => {
      console.error('Error creating problem:', error);
      alert('Errore durante la creazione del problema');
    },
  });

  const handleClose = () => {
    navigate('/boats');
  };

  const handleAddProblem = () => {
    if (!selectedBoat?.id) {
      alert('Seleziona un\'imbarcazione');
      return;
    }
    if (!selectedShiftId) {
      alert('Seleziona un turno');
      return;
    }
    // Descrizione e parte sono opzionali
    const payload = {
      boat_id: selectedBoat.id,
      description: problemForm.description || '',
      part_affected: problemForm.part_affected || undefined,
      status: problemStatus,
      reported_date: new Date().toISOString().split('T')[0],
      shift_id: selectedShiftId,
    } as Omit<Problem, 'id' | 'resolved_date'>;
    
    console.log('Creating problem with status:', problemStatus, 'Full payload:', payload);
    createProblemMutation.mutate(payload);
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
          height: '62vh',
          animation: 'slideUp 0.2s ease-out',
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
                Aggiungi problema
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
                const newStatus = problemStatus === 'open' ? 'closed' : 'open';
                setProblemStatus(newStatus);
                setTimeout(() => e.currentTarget.blur(), 0);
              }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: problemStatus === 'closed' ? '#10B981' : '#FF5958'
              }}
              title={problemStatus === 'closed' ? 'Segna come aperto' : 'Segna come risolto'}
            >
              {problemStatus === 'closed' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="#FF5958">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            </div>
          </div>
        </div>

        <div className="pl-6 pr-5 py-2 pb-0">
          <CustomScrollbar maxHeight="calc(81vh - 130px)">
            <div className="space-y-4 max-w-2xl mx-auto">
              <select
                value={selectedType}
                onChange={(e) => {
                  const t = e.target.value as Boat['type'] | '';
                  setSelectedType(t);
                  setSelectedBoat(null);
                }}
                className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-primary-ros text-base transition-all duration-200 focus:outline-none black"
              >
                <option value="">Seleziona categoria</option>
                {BOAT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={selectedBoat?.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const b = (boats || []).find(x => x.id === id) || null;
                  setSelectedBoat(b);
                }}
                disabled={!selectedType || !boats || boats.length === 0}
                className={`w-full px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 focus:outline-none black ${
                  (!selectedType || !boats || boats.length === 0)
                    ? 'border-gray-400 opacity-50'
                    : 'border-primary-ros'
                }`}
              >
                <option value="">
                  {!selectedType ? 'Seleziona imbarcazione' :
                   !boats || boats.length === 0 ? 'Nessuna imbarcazione' :
                   "Seleziona imbarcazione"}
                </option>
                {(boats || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={problemForm.part_affected}
                onChange={(e) => setProblemForm({ ...problemForm, part_affected: e.target.value })}
                disabled={!selectedBoat}
                className={`w-full px-0 py-1 bg-transparent border-0 border-b-2 text-base transition-all duration-200 focus:outline-none black ${
                  !selectedBoat ? 'border-gray-400 opacity-50' : 'border-primary-ros'
                }`}
              >
                <option value="">Seleziona parte - Opzionale</option>
                {parts?.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>


              <div>
                <textarea
                  value={problemForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 110) {
                      setProblemForm({ ...problemForm, description: value });
                    }
                  }}
                  placeholder="Descrizione - Opzionale"
                  maxLength={110}
                  className="w-full mt-0 px-1 mt-12 pt-1 pb-1 bg-transparent border-0 border-b-2 border-primary-ros text-base black resize-none transition-all duration-200 focus:outline-none"
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
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {problemForm.description.length}/110 caratteri
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </div>

<div className="fixed bottom-2 left-0 right-0 bg-white backdrop-blur-sm px-6 py-3">
  <div className="max-w-2xl mx-auto flex justify-between items-center">
    <button
      onClick={() => {
        if (!selectedType) {
          alert('Seleziona categoria');
          return;
        }
        if (!selectedBoat?.id) {
          alert('Seleziona imbarcazione');
          return;
        }
        handleAddProblem();
      }}
      disabled={createProblemMutation.isPending}
      className="py-2 rounded-full text-base font-semibold transition-all duration-300 py-1"
      style={{
        width: '120px',
        backgroundColor: problemStatus === 'closed' ? '#10B981' : '#FF5958',
        color: 'white'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = problemStatus === 'closed' ? 'rgb(5, 150, 105)' : 'rgb(239, 73, 73)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = problemStatus === 'closed' ? '#10B981' : '#FF5958';
      }}
    >
      {createProblemMutation.isPending 
        ? (problemStatus === 'closed' ? 'Aggiungendo...' : 'Aggiungendo...') 
        : (problemStatus === 'closed' ? 'Aggiungi' : 'Aggiungi')}
    </button>
    <button
      onClick={handleClose}
      className="text-base mr-1 font-semibold transition-all duration-300"
      style={{
        backgroundColor: 'white',
        color: '#000000'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#FF5958';
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

export default BoatsNew;
