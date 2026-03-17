import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boatService, problemService, authService } from '../services/api';
import type { Problem } from '../types';
import CustomScrollbar from '../components/CustomScrollbar';

const BoatsDetails: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const id = searchParams.get('id');

  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editPartAffected, setEditPartAffected] = useState('');
  const [editReportedDate, setEditReportedDate] = useState('');
  const [editReportedBy, setEditReportedBy] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editShiftId, setEditShiftId] = useState<number | null>(null);
  
  const shiftNames = ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto'];
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const [parts, setParts] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([]);
  
  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await problemService.getById(Number(id));
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
    if (problem) {
      setEditingProblem(problem);
      setEditDescription(problem.description || '');
      setEditPartAffected(problem.part_affected || '');
      setEditReportedDate(problem.reported_date || '');
      setEditShiftId(problem.shift_id || null);
      setEditReportedBy(problem.reported_by || null);

      if (problem.boat_type) {
        boatService.getPartsByType(problem.boat_type as any).then(res => {
          setParts(res.data);
        }).catch(err => {
          console.error('Error loading parts:', err);
        });
      }
    }
  }, [problem]);

  const toggleProblemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'open' | 'closed' }) => {
      const res = await problemService.update(id, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-problems'] });
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: async (id: number) => {
      await problemService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-problems'] });
      navigate('/boats');
    },
  });

  const handleClose = () => {
    navigate('/boats');
  };

  const handleToggleStatus = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!editingProblem) return;
    const newStatus = editingProblem.status === 'closed' ? 'open' : 'closed';
    setEditingProblem({ ...editingProblem, status: newStatus });
    toggleProblemStatusMutation.mutate({ id: editingProblem.id, status: newStatus });
    // Force an immediate re-render before blurring
    setTimeout(() => e.currentTarget.blur(), 0);
  };

  const handleSave = async () => {
    if (!editingProblem) return;
    
    // No required fields for boats (description and part are optional)
    
    try {
      await problemService.update(editingProblem.id, {
        description: editDescription,
        part_affected: editPartAffected,
        reported_date: editReportedDate,
        reported_by: editReportedBy || undefined,
        shift_id: editShiftId || undefined
      });
      queryClient.invalidateQueries({ queryKey: ['all-problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      navigate('/boats');
    } catch (error) {
      console.error('Error updating problem:', error);
      alert('Errore durante l\'aggiornamento del problema');
    }
  };

  const handleDelete = () => {
    if (!editingProblem) return;
    deleteProblemMutation.mutate(editingProblem.id);
  };

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 z-[60]" onClick={handleClose} />
        <div className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-tr-3xl shadow-sm mx-0.3" style={{ height: '76vh' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Caricamento...</div>
          </div>
        </div>
      </>
    );
  }

  if (!editingProblem) {
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
          height: '75vh',
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

        <div className="pl-7 pr-4 py-4" style={{borderColor: '#0F4295'}}>
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-2">
            <h3 className="text-xl font-bold font-greycliff black">
              Dettagli problema
            </h3>
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
              className="mr-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: editingProblem.status === 'closed' ? '#10B981' : '#FF5958'
              }}
              title={editingProblem.status === 'closed' ? 'Segna come aperto' : 'Segna come risolto'}
            >
              {editingProblem.status === 'closed' ? (
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

        <div className="pl-6 pr-3.5 py-2 pb-0">
          <CustomScrollbar maxHeight="calc(81vh - 130px)">
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="w-full px-1 pt-1 pb-0.5 bg-transparent border-0 border-b-2 border-gray-300 text-base black">
                {editingProblem.boat_type || 'Categoria'}
              </div>

              <div className="w-full px-1 pt-1 pb-0.5 bg-transparent border-0 border-b-2 border-gray-300 text-base black">
                {editingProblem.boat_name || 'Imbarcazione'}
              </div>

              <select
                value={editPartAffected}
                onChange={(e) => setEditPartAffected(e.target.value)}
                className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-primary-ros text-base black transition-all duration-200 focus:outline-none"
              >
                <option value="">Seleziona parte - Opzionale</option>
                {parts?.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>

              {/* Segnalato da */}
              <div className="flex items-center gap-3">
                <div className="text-base pl-1 black whitespace-nowrap">Segnalato da</div>
                <select
                  value={editReportedBy || ''}
                  onChange={(e) => setEditReportedBy(Number(e.target.value))}
                  className="flex-1 px-0 pt-1.5 pb-1 bg-transparent border-0 border-b-2 border-primary-ros text-base black transition-all duration-200 focus:outline-none"
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
                  value={editReportedDate}
                  onChange={(e) => setEditReportedDate(e.target.value)}
                  className="flex-1 pt-1.5 pb-1 bg-transparent border-0 border-b-2 border-primary-ros text-base black transition-all duration-200 focus:outline-none"
                />
              </div>

              {/* Descrizione */}
              <div className="mt-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 110) {
                      setEditDescription(e.target.value);
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
                <div className="text-xs black mt-1 text-right">
                  {editDescription.length}/110 caratteri
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
                  backgroundColor: editingProblem?.status === 'closed' ? '#10B981' : '#FF5958',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = editingProblem?.status === 'closed' ? 'rgb(5, 150, 105)' : 'rgb(239, 73, 73)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = editingProblem?.status === 'closed' ? '#10B981' : '#FF5958';
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
                    e.currentTarget.style.color = '#FF5958';
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
                    e.currentTarget.style.color = '#FF5958';
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
                  style={{ color: '#FF5958' }}
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
        `}</style>
      </div>


    </>
  );
};

export default BoatsDetails;
