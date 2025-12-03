import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const videoRef = useRef();

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [faceLoginSuccess, setFaceLoginSuccess] = useState(false);

  // ----------- Chargement des modèles de reconnaissance faciale -----------
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        console.log("⏳ Chargement des modèles depuis:", MODEL_URL);

        await faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`);
        console.log("✅ tinyFaceDetector chargé");

        await faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`);
        console.log("✅ faceLandmark68Net chargé");

        await faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_URL}/face_recognition`);
        console.log("✅ faceRecognitionNet chargé");

        setModelsLoaded(true);
      } catch (err) {
        console.error("❌ Erreur de chargement des modèles:", err);
        setError('Échec du chargement des modèles de reconnaissance faciale');
      }
    };

    loadModels();
  }, []);

  // ----------- Gestion de la caméra -----------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Erreur lors du démarrage de la caméra:', err);
      setError('Impossible d’accéder à la caméra. Vérifiez les permissions.');
      throw err;
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // ----------- Gestion du login -----------
  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Veuillez entrer l’email et le mot de passe');
      return;
    }
    setProcessing(true);

    try {
      const res = await axios.post('/api/auth/login', { email, password });

      if (res.data.role === 'admin') {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', 'admin');
        navigate('/admin', { replace: true });
        return;
      }

      if (res.data.valid && res.data.role === 'staff') {
        if (!modelsLoaded) {
          setError('Les modèles de reconnaissance faciale ne sont pas encore chargés');
          setProcessing(false);
          return;
        }
        setShowCamera(true);
        await startCamera();
      } else {
        setError(res.data.message || 'Échec de la connexion');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Erreur lors de la connexion');
    } finally {
      setProcessing(false);
    }
  };

  // ----------- Boucle de détection faciale -----------
  useEffect(() => {
    if (!showCamera) return;

    let intervalId;

    const checkFace = async () => {
      if (!videoRef.current) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          clearInterval(intervalId);
          stopCamera();

          const descriptorArray = Array.from(detection.descriptor);
          const res = await axios.post('/api/auth/face-login', { email, descriptor: descriptorArray });

          if (res.data.token) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', 'staff');
            localStorage.setItem('email', email);
            setFaceLoginSuccess(true);
          } else {
            setError('Échec de la vérification faciale');
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Erreur lors de la vérification faciale');
      }
    };

    intervalId = setInterval(checkFace, 1500);
    return () => {
      clearInterval(intervalId);
      stopCamera();
    };
  }, [showCamera, email]);

  // ----------- Navigation après login facial -----------
  useEffect(() => {
    if (faceLoginSuccess) {
      navigate('/staff', { replace: true });
    }
  }, [faceLoginSuccess, navigate]);

  // ----------- Fonction déconnexion -----------
  
  // ----------- JSX -----------
  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Connexion</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
        disabled={processing || showCamera}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
        disabled={processing || showCamera}
      />
      <button
        onClick={handleLogin}
        disabled={processing || showCamera}
        style={{
          width: '100%',
          padding: 10,
          background: processing ? '#aaa' : '#007bff',
          color: 'white',
          border: 'none',
          cursor: processing ? 'default' : 'pointer'
        }}
      >
        {processing ? 'Traitement en cours...' : 'Se connecter'}
      </button>

      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}

      {showCamera && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            width="300"
            height="225"
            style={{ border: '1px solid #ccc', marginTop: 15 }}
          />
          <p>Veuillez regarder la caméra pour la vérification faciale...</p>
        </>
      )}
    </div>
  );
}
