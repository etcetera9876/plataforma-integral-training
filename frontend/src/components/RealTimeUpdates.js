// src/components/RealTimeUpdates.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Conecta al backend (asegúrate de que la URL coincide con la de tu servidor)
const socketUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(socketUrl);

const RealTimeUpdates = () => {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    // Escucha el evento "dbChange" emitido desde el backend
    socket.on('dbChange', (change) => {
      console.log('Cambio recibido:', change);
      // Agrega el cambio a la lista de actualizaciones
      setUpdates(prevUpdates => [change, ...prevUpdates]);
    });

    return () => {
      socket.off('dbChange');
    };
  }, []);

  return (
    <div>
      <h2>Actualizaciones en Tiempo Real</h2>
      <ul>
        {updates.map((update, index) => (
          <li key={index}>{JSON.stringify(update)}</li>
        ))}
      </ul>
    </div>
  );
};

export default RealTimeUpdates;
