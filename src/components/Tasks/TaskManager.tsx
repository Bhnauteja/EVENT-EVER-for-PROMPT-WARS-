import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Filter,
  X,
  Save,
  Tag,
  Sparkles
} from 'lucide-react';
import { EventDetails, EventTask, TaskPriority, TaskStatus } from '../../types';
import { storage } from '../../services/storage';

interface TaskManagerProps {
  event: EventDetails;
  tasks: EventTask[];
  onUpdate: () => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ event, tasks, onUpdate }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Logistics');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  const now = new Date();

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setCategory('General');
    setPriority('medium');
    setStatus('pending');
    setDeadline(new Date(event.startDate).toISOString().split('T')[0]);
    setAssignedTo('');
    setPrivateNotes('');
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: EventTask) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline);
    setAssignedTo(task.assignedTo || '');
    setPrivateNotes(task.privateNotes || '');
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      const updated: EventTask = {
        ...editingTask,
        title,
        description,
        category,
        priority,
        status,
        deadline,
        assignedTo,
        privateNotes
      };
      storage.saveTask(updated);
    } else {
      const newTask: EventTask = {
        id: 'task-' + Date.now(),
        eventId: event.id,
        title,
        description,
        category,
        priority,
        status,
        deadline,
        assignedTo,
        privateNotes,
        createdAt: new Date().toISOString()
      };
      storage.saveTask(newTask);
    }

    setIsModalOpen(false);
    setEditingTask(null);
    onUpdate();
  };

  const handleToggleComplete = (task: EventTask) => {
    const updatedStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    storage.saveTask({
      ...task,
      status: updatedStatus
    });
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this task?')) {
      storage.deleteTask(id);
      onUpdate();
    }
  };

  const isOverdue = (task: EventTask) => {
    if (task.status === 'completed' || !task.deadline) return false;
    return new Date(task.deadline) < now;
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'pending' && task.status === 'completed') return false;
    if (filterStatus === 'completed' && task.status !== 'completed') return false;
    if (filterStatus === 'overdue' && !isOverdue(task)) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Task & Checklist Coordination
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Track deadlines, priority tiers, team assignments, and operational dependencies.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 flex items-center space-x-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex space-x-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterStatus === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterStatus === 'pending' ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({tasks.length - completedCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterStatus === 'completed' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({completedCount})
          </button>
          {overdueCount > 0 && (
            <button
              onClick={() => setFilterStatus('overdue')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
                filterStatus === 'overdue' ? 'bg-rose-950/50 text-rose-300 border border-rose-500/40' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Overdue ({overdueCount})</span>
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Priority:</span>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm">No tasks matching the selected filters.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const overdue = isOverdue(task);
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
                    : overdue
                    ? 'bg-rose-950/15 border-rose-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`text-sm font-semibold text-slate-100 ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {task.category}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        task.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300'
                          : task.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.priority}
                      </span>
                      {overdue && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      {task.deadline && (
                        <span className="flex items-center space-x-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Deadline: {task.deadline}</span>
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>Assigned: {task.assignedTo}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 self-center">
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Confirm speaker slides, pickup badge lanyards"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Logistics, Catering, Venue, Tech"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Organizer / Helper</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Chen, Alex R."
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Checklist Details</label>
                <textarea
                  rows={2}
                  placeholder="Detailed notes or specific step-by-step instructions..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
