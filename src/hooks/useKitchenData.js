import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanRecipe, normalizePantry, normalizePlans } from '../storage'
import { fetchData, saveData, CLIENT_ID } from '../cloud'

export function useKitchenData() {
  const [recipes, setRecipes] = useState([])
  const [plans, setPlans] = useState([])
  const [pantry, setPantry] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const [hasUpdate, setHasUpdate] = useState(false)
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)
  const saveIdleTimer = useRef(null)
  const knownUpdatedAt = useRef(0)

  function scheduleSaveIdle(ms = 1800) {
    if (saveIdleTimer.current) clearTimeout(saveIdleTimer.current)
    saveIdleTimer.current = setTimeout(() => setSaveState('idle'), ms)
  }

  const applyRemote = useCallback(({ recipes, plans, pantry, updatedAt }) => {
    setRecipes(recipes.map(cleanRecipe))
    setPlans(normalizePlans(plans))
    setPantry(normalizePantry(pantry))
    setLoadError(null)
    knownUpdatedAt.current = updatedAt
    setHasUpdate(false)
  }, [])

  const doFetch = useCallback(() => {
    return fetchData()
      .then(applyRemote)
      .catch((e) => setLoadError(e.message))
      .finally(() => {
        setLoading(false)
        loadedRef.current = true
      })
  }, [applyRemote])

  function retryLoad() {
    setLoading(true)
    setLoadError(null)
    doFetch()
  }

  useEffect(() => {
    doFetch()
  }, [doFetch])

  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (saveIdleTimer.current) clearTimeout(saveIdleTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      saveData({ recipes, plans, pantry })
        .then((updatedAt) => {
          setSaveState('saved')
          knownUpdatedAt.current = updatedAt
          scheduleSaveIdle(1800)
        })
        .catch(() => {
          setSaveState('error')
          scheduleSaveIdle(4000)
        })
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (saveIdleTimer.current) clearTimeout(saveIdleTimer.current)
    }
  }, [recipes, plans, pantry])

  useEffect(() => {
    const id = setInterval(() => {
      if (!loadedRef.current) return
      fetchData()
        .then((remote) => {
          if (
            remote.updatedAt > knownUpdatedAt.current &&
            remote.clientId !== CLIENT_ID
          ) {
            setHasUpdate(true)
          }
        })
        .catch(() => {})
    }, 25000)
    return () => clearInterval(id)
  }, [])

  return {
    recipes,
    setRecipes,
    plans,
    setPlans,
    pantry,
    setPantry,
    loading,
    loadError,
    saveState,
    hasUpdate,
    setHasUpdate,
    doFetch,
    applyRemote,
    retryLoad,
  }
}
