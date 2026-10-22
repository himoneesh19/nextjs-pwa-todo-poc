import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface Task {
  id: string
  title: string
  category: 'Attendance' | 'Parent Note' | 'Disciplinary' | 'General'
  completed: boolean
  createdAt: number
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'tasks.json')

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Review morning roll-call attendance alerts', category: 'Attendance', completed: false, createdAt: Date.now() - 3600000 },
  { id: '2', title: 'Reply to Parent Excuse Note (Absence for Student #104)', category: 'Parent Note', completed: false, createdAt: Date.now() - 1800000 },
  { id: '3', title: 'File detention queue for 5th period study hall', category: 'Disciplinary', completed: true, createdAt: Date.now() - 7200000 },
]

function readTasks(): Task[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(INITIAL_TASKS, null, 2), 'utf-8')
      return INITIAL_TASKS
    }
    const data = fs.readFileSync(FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error reading tasks file:', err)
    return INITIAL_TASKS
  }
}

function writeTasks(tasks: Task[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing tasks file:', err)
  }
}

// GET: Return all tasks
export async function GET() {
  const tasks = readTasks()
  return NextResponse.json(tasks)
}

// POST: Add new task
export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const tasks = readTasks()
    const newTask: Task = {
      id: Date.now().toString(),
      title: body.title.trim(),
      category: body.category || 'Attendance',
      completed: false,
      createdAt: Date.now(),
    }

    const updated = [newTask, ...tasks]
    writeTasks(updated)
    return NextResponse.json(newTask, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 500 })
  }
}

// PATCH: Toggle or edit task
export async function PATCH(req: Request) {
  try {
    const { id, completed, title } = await req.json()
    const tasks = readTasks()
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          completed: completed !== undefined ? completed : t.completed,
          title: title !== undefined ? title.trim() : t.title,
        }
      }
      return t
    })
    writeTasks(updated)
    return NextResponse.json({ success: true, tasks: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE: Remove task
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const tasks = readTasks()
    const updated = tasks.filter((t) => t.id !== id)
    writeTasks(updated)
    return NextResponse.json({ success: true, tasks: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
