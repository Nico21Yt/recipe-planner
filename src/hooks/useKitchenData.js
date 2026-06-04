import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanRecipe, normalizePlans } from '../storage'
import { fetchData, saveData, CLIENT_ID } from '../cloud'

export function useKitchenData() {
  const [recipes, setRecipes] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const [hasUpdate, setHasUpdate] = useState(false)
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)
  const knownUpdatedAt = useRef(0)

  const applyRemote = useCallback(({ recipes, plans, updatedAt }) => {
    setRecipes(recipes.map(cleanRecipe))
    setPlans(normalizePlans(plans))
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
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      saveData({ recipes, plans })
        .then((updatedAt) => {
          setSaveState('saved')
          knownUpdatedAt.current = updatedAt
        })
        .catch(() => setSaveState('error'))
    }, 600)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [recipes, plans])

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
