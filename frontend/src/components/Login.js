// src/components/Login.js
import React, { useState } from 'react';
import axios from "axios";
import API_URL from "../config"; // Importamos la URL del backend
import './Login.css';
import logo from '../assets/logo-jcs.png'; // Asegúrate de tener esta imagen en la carpeta src/assets/

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

  // Verificar dominio antes de hacer la solicitud al backend
  if (!email.endsWith("@jcsfamily.com")) {
    setError("Solo se permiten correos @jcsfamily.com");
    setTimeout(() => {
      window.location.href = "https://google.com"; // Redirigir a otra página
    }, 1000); // Espera 1 segundo antes de redirigir
    return;
  }

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      
      console.log("✅ Usuario autenticado:", response.data);
      
      // Extraemos token y usuario de la respuesta
      const { token, user } = response.data;
      // Guarda el token y el userId en localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("userId", user.id); // <-- AÑADIDO: guardar userId explícitamente
      localStorage.setItem("user", JSON.stringify(user)); // Opcional: asegura que el objeto user esté actualizado
      console.log("LocalStorage token:", localStorage.getItem("token"));
    
      setTimeout(() => {
        onLogin({ ...user, token });
      }, 300); // retraso para que la auto-traduccion no crashee el codigo.
    } catch (err) {
      // Manejo de errores específicos según el mensaje recibido del backend
      if (err.response) {
        if (err.response.status === 403) {
          setError("Correo no autorizado.");
        } else if (err.response.status === 404) {
          setError("El correo no existe. Verifica que esté bien escrito.");
        } else if (err.response.status === 400) {
          setError("Contraseña incorrecta.");
        } else {
          setError("Ocurrió un error al iniciar sesión.");
        }
      } else {
        setError("No se pudo conectar al servidor.");
      }
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>Iniciar sesión</h2>
         {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label>Correo electrónico:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">Ingresar</button>
      </form>
    </div>
  );
};

export default Login;
