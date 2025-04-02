import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // Estado para almacenar el valor
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Obtener el valor del localStorage por la clave
      const item = window.localStorage.getItem(key);
      // Parsear el JSON guardado o, si no existe, retornar el valor inicial
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error al obtener de localStorage', error);
      return initialValue;
    }
  });

  // useEffect para actualizar el localStorage cuando el estado cambia
  useEffect(() => {
    try {
      // Guardar el estado en el localStorage
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Error al guardar en localStorage', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
