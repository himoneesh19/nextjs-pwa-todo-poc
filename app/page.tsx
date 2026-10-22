'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Download,
  Wifi,
  WifiOff,
  Bell,
  Sparkles,
  ClipboardList,
  Edit2,
  Check,
  X,
  RefreshCw
} from 'lucide-react'

export interface Task {
  id: string
  title: string
  category: 'Attendance' | 'Parent Note' | 'Disciplinary' | 'General'
  completed: boolean
  createdAt: number
}

const CATEGORIES: Task['category'][] = ['Attendance', 'Parent Note', 'Disciplinary', 'General']

const CATEGORY_COLORS: Record<Task['category'], string> = {
  Attendance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Parent Note': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Disciplinary: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  General: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export default function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [category, setCategory] = useState<Task['category']>('Attendance')
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistered, setSwRegistered] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch tasks from Server API
  const fetchTasks = useCallback(async () => {
    try {
      setIsSyncing(true)
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (err) {
      console.warn('Network fetch failed, relying on current state:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Initial load, SW registration, and Sync loop
  useEffect(() => {
    fetchTasks()

    // Check standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setSwRegistered(true))
        .catch((err) => console.error('SW registration failed:', err))
    }

    // Network status listeners
    setIsOnline(navigator.onLine)
    const handleOnline = () => {
      setIsOnline(true)
      fetchTasks()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // beforeinstallprompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Auto-sync polling every 5 seconds + on window focus (so Desktop & Mobile reflect updates)
    const interval = setInterval(fetchTasks, 5000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchTasks()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchTasks])

  // Badge Management: Universal Title Badge + Native W3C App Badge
  useEffect(() => {
    const pendingCount = tasks.filter((t) => !t.completed).length

    // 1. Universal Title Badge (Works on Linux, Firefox, Chrome, Android tabs)
    document.title = pendingCount > 0 ? `(${pendingCount}) YHD Tasks POC` : 'YHD Tasks POC'

    // 2. Native OS App Badging API (Supported Windows/Mac Chrome/Edge & some Android WebAPKs)
    if ('setAppBadge' in navigator) {
      if (pendingCount > 0) {
        navigator.setAppBadge(pendingCount).catch(() => {})
      } else {
        navigator.clearAppBadge().catch(() => {})
      }
    }
  }, [tasks])

  // CRUD: Add Task via Server API
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const tempId = Date.now().toString()
    const optimisticTask: Task = {
      id: tempId,
      title: newTitle.trim(),
      category,
      completed: false,
      createdAt: Date.now(),
    }

    // Optimistic UI update
    setTasks([optimisticTask, ...tasks])
    const titleToSubmit = newTitle
    setNewTitle('')

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSubmit, category }),
      })
      if (res.ok) {
        fetchTasks()
      }
    } catch (err) {
      console.error('Failed to post task to server:', err)
    }
  }

  // CRUD: Toggle Task via Server API
  const toggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id)
    if (!target) return

    const updatedStatus = !target.completed
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: updatedStatus } : t)))

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: updatedStatus }),
      })
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  // CRUD: Delete Task via Server API
  const deleteTask = async (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditingText(task.title)
  }

  const saveEdit = async (id: string) => {
    if (editingText.trim()) {
      setTasks(tasks.map((t) => (t.id === id ? { ...t, title: editingText.trim() } : t)))
      try {
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, title: editingText.trim() }),
        })
      } catch (err) {
        console.error('Failed to save edit:', err)
      }
    }
    setEditingId(null)
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const pendingCount = tasks.filter((t) => !t.completed).length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Top Banner: Status & Connectivity */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                YHD Tasks POC
                {isStandalone && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Standalone App
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Multi-Device Cloud Sync</span>
                {isSyncing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {/* Online / Offline Indicator */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Install Button (if browser triggered beforeinstallprompt) */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 rounded-full text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* PWA Capabilities Info Bar */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${swRegistered ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>Service Worker: {swRegistered ? 'Active (Offline shell ready)' : 'Registering...'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
            <Bell className="w-3.5 h-3.5" />
            <span>Active Count Badge: {pendingCount} Pending</span>
          </div>
        </div>

        {/* Create Task Form */}
        <form onSubmit={addTask} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create New Task</span>
            </label>
            <div className="flex gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                    category === cat
                      ? CATEGORY_COLORS[cat] + ' font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Follow up on student attendance alert..."
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-all ${
                  filter === tab
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab} {tab === 'pending' && `(${pendingCount})`}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No tasks found in this view</p>
              <p className="text-xs text-slate-600 mt-1">Create one above to test live sync and badging</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {editingId === task.id ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="bg-slate-900 border border-indigo-500 rounded-lg px-2 py-1 text-sm text-white flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(task.id)}
                        className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 hover:bg-rose-500/20 text-rose-400 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => toggleTask(task.id)}
                        className={`text-sm truncate cursor-pointer ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                          CATEGORY_COLORS[task.category]
                        }`}
                      >
                        {task.category}
                      </span>
                    </div>
                  )}
                </div>

                {editingId !== task.id && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-700/50"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
