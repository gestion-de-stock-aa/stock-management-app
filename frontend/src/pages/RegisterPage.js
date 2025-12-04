//team leader m3akom

import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

function RegisterPage() {
  const videoRef = useRef();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role,] = useState('staff'); // actuellement staff direct
  const [faceDescriptors, setFaceDescriptors] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  const CAPTURE_COUNT = 3;
  const CAPTURE_INTERVAL = 1500;

  // 1️⃣ Chargement des modèles
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
        console.error("❌ Erreur lors du chargement des modèles:", err);
        setError('Échec du chargement des modèles de reconnaissance faciale');
      }
    };

    loadModels();
  }, []);

  // 2️⃣ Démarrage de la caméra après chargement des modèles
  useEffect(() => {
    if (!modelsLoaded || role !== 'staff') return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        console.log("Caméra démarrée !");
      } catch (err) {
        console.error(err);
        setError('Impossible d’accéder à la caméra. Vérifiez les permissions.');
      }
    };

    startVideo();
  }, [modelsLoaded, role]);

  // 3️⃣ Capture des visages
  useEffect(() => {
    if (!modelsLoaded || role !== 'staff' || !videoRef.current) return;

    let captureCount = 0;
    setFaceDescriptors([]);
    setCapturing(true);

    const interval = setInterval(async () => {
      if (captureCount >= CAPTURE_COUNT) {
        clearInterval(interval);
        setCapturing(false);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && detection.descriptor) {
          setFaceDescriptors(prev => [...prev, Array.from(detection.descriptor)]);
          captureCount++;
          console.log(`Visage capturé ${captureCount}/${CAPTURE_COUNT}`);
        } else {
          console.log('Aucun visage détecté pour le moment...');
        }
      } catch (err) {
        console.error('Erreur de détection faciale:', err);
      }
    }, CAPTURE_INTERVAL);

    return () => clearInterval(interval);
  }, [modelsLoaded, role]);

  // 4️⃣ Envoyer les données pour l’enregistrement
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (role === 'staff' && faceDescriptors.length < CAPTURE_COUNT) {
      setError(`Veuillez attendre la capture complète du visage (${faceDescriptors.length}/${CAPTURE_COUNT})`);
      return;
    }

    try {
      await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role,
        faceDescriptors
      });
      alert('Utilisateur enregistré avec succès !');
      setName(''); setEmail(''); setPassword('');
      setFaceDescriptors([]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur côté serveur');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Enregistrement d’un nouvel employé</h2>
      <form onSubmit={handleSubmit}>
        <input
          required
          type="text"
          placeholder="Nom"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', marginBottom: 10 }}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 10 }}
        />
        <input
          required
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 10 }}
        />
        <input
          type="text"
          value="staff"
          readOnly
          style={{ width: '100%', marginBottom: 10 }}
        />

        {role === 'staff' && (
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <video
              ref={videoRef}
              width="300"
              height="225"
              autoPlay
              muted
              style={{ border: '1px solid #ccc' }}
            />
            <p>
              {capturing
                ? `Capture du visage en cours... (${faceDescriptors.length}/${CAPTURE_COUNT})`
                : 'Capture du visage terminée'}
            </p>
          </div>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={capturing}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;
