import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanRecipe, normalizePantry, normalizePlans } from '../storage'
import { fetchData, saveData, CLIENT_ID } from '../cloud'

export function useKitchenData({ onRemoteSync } = {}) {
  const [recipes, setRecipes] = useState([])
  const [plans, setPlans] = useState([])
  const [pantry, setPantry] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)
  const saveIdleTimer = useRef(null)
  const knownUpdatedAt = useRef(0)
  const saveStateRef = useRef(saveState)
  const onRemoteSyncRef = useRef(onRemoteSync)
  saveStateRef.current = saveState
  onRemoteSyncRef.current = onRemoteSync

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
  }, [])

  const pullRemoteIfNewer = useCallback(() => {
    if (!loadedRef.current) return Promise.resolve()
    if (saveStateRef.current === 'saving') return Promise.resolve()
    return fetchData()
      .then((remote) => {
        if (
          remote.updatedAt > knownUpdatedAt.current &&
          remote.clientId !== CLIENT_ID
        ) {
          applyRemote(remote)
          onRemoteSyncRef.current?.()
        }
      })
      .catch(() => {})
  }, [applyRemote])

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
          return pullRemoteIfNewer()
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
  }, [recipes, plans, pantry, pullRemoteIfNewer])

  useEffect(() => {
    const id = setInterval(() => pullRemoteIfNewer(), 25000)
    return () => clearInterval(id)
  }, [pullRemoteIfNewer])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') pullRemoteIfNewer()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pullRemoteIfNewer])

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
    doFetch,
    applyRemote,
    retryLoad,
    pullRemoteIfNewer,
  }
}
