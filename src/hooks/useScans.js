import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export function useScans() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'scans'), orderBy('date', 'desc'))

    // Fallback: if Firestore doesn't respond in 8s, stop loading
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 8000)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeout)
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setScans(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        clearTimeout(timeout)
        console.error('Firestore snapshot error:', err)
        setError('Failed to load scans. Please check your connection.')
        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  return { scans, loading, error }
}
