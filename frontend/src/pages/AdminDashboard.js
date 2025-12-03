import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import RegisterPage from './RegisterPage';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [showRegister, setShowRegister] = useState(false);
  const [takenLogs, setTakenLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [sel3aList, setSel3aList] = useState([]);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchTakenLogs();
    fetchStaffList();
    fetchSel3aList();
  }, [token, navigate]);

  const fetchTakenLogs = async () => {
    try {
      const res = await axios.get('/api/sel3a/taken-report/all', axiosConfig);
      setTakenLogs(res.data);
    } catch (err) {
      console.error(err);
      setError('❌ Échec de récupération des opérations');
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get('/api/auth/users', axiosConfig);
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
      setError('❌ Échec de récupération de la liste des employés');
    }
  };

  const fetchSel3aList = async () => {
    try {
      const res = await axios.get('/api/sel3a/list', axiosConfig);
      setSel3aList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await axios.delete(`/api/auth/${id}`, axiosConfig);
      fetchStaffList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: 'auto' }}>
      <h2>📋 Admin Dashboard</h2>

      <nav style={{ marginBottom: 20 }}>
        <button onClick={() => setShowRegister(false)} style={{ marginRight: 10 }}>
          🏠 Accueil
        </button>
        <button onClick={() => setShowRegister(true)} style={{ marginRight: 10 }}>
          ➕ Ajouter un employé
        </button>
        <button onClick={handleLogout} style={{ background: 'red', color: 'white' }}>
          🚪 Déconnexion
        </button>
      </nav>

      {showRegister ? (
        <RegisterPage />
      ) : (
        <>
          <h3>📊 Opérations sur les produits</h3>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {takenLogs.length === 0 ? (
            <p>Pas d'opérations.</p>
          ) : (
            <table border="1" cellPadding="6" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité prise</th>
                  <th>Employé</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {takenLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.sel3a_name}</td>
                    <td>{log.taken_quantity}</td>
                    <td>{log.taken_by}</td>
                    <td>{new Date(log.taken_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 40 }}>📦 Liste des produits</h3>
          {sel3aList.length === 0 ? (
            <p>Pas de produits.</p>
          ) : (
            <table border="1" cellPadding="6" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prix</th>
                  <th>Employé</th>
                  <th>Quantité disponible</th>
                </tr>
              </thead>
              <tbody>
                {sel3aList.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.price}</td>
                    <td>{item.added_by_name || '-'}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 40 }}>👥 Liste des employés</h3>
          <table border="1" cellPadding="6" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((user, i) => (
                <tr key={i}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <button
                      onClick={() => deleteUser(user.id)}
                      style={{ background: 'red', color: 'white' }}
                      disabled={user.role === 'admin'}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
