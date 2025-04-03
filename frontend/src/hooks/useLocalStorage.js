import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // Obtiene el valor inicial del localStorage o usa el valor inicial proporcionado
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error al obtener de localStorage', error);
      return initialValue;
    }
  });

  // Actualiza localStorage cuando storedValue cambia
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Error al guardar en localStorage', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
