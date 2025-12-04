//salamo 3alikom
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TakenReport() {
  const [summary, setSummary] = useState([]);
  const [selectedSel3a, setSelectedSel3a] = useState(null);
  const [details, setDetails] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const userEmail = localStorage.getItem('email') || '';

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await axios.get('/api/sel3a/taken-report/summary', {
        headers: { 'x-user-email': userEmail },
      });
      setSummary(res.data);
      setError('');
    } catch {
      setError('❌ Échec de récupération du résumé');
    }
    setLoadingSummary(false);
  };

  const fetchDetails = async (sel3aId) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/sel3a/taken-report/details/${sel3aId}`, {
        headers: { 'x-user-email': userEmail },
      });
      setSelectedSel3a({
        sel3a_id: sel3aId,
        sel3a_name: res.data.sel3a_name,
        added_by: res.data.added_by,
        total_added: res.data.total_added,
        remaining_quantity: res.data.remaining_quantity,
      });
      setDetails(res.data.details);
      setError('');
    } catch {
      setError('❌ Échec de récupération des détails');
    }
    setLoadingDetails(false);
  };

  const handleSelectSel3a = (sel3a) => fetchDetails(sel3a.sel3a_id);

  useEffect(() => {
    if (!userEmail) {
      window.location.href = '/';
      return;
    }
    fetchSummary();
  }, [userEmail]);

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 20 }}>
      <button onClick={() => { window.location.href = '/staff'; }}
        style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 20 }}
      >
        ← Retour à la gestion des articles
      </button>

      <h2>📋 Rapport des quantités prises</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loadingSummary ? <p>⏳ Chargement du résumé...</p> : (
        <>
          <h3>Résumé des articles</h3>
          <table border="1" cellPadding="6" style={{ width: '100%', cursor: 'pointer' }}>
            <thead>
              <tr><th>Nom de l'article</th><th>Quantité totale prise</th></tr>
            </thead>
            <tbody>
              {summary.map(sel3a => (
                <tr key={sel3a.sel3a_id} onClick={() => handleSelectSel3a(sel3a)}
                  style={{ backgroundColor: selectedSel3a?.sel3a_id === sel3a.sel3a_id ? '#f0f8ff' : 'transparent' }}>
                  <td>{sel3a.sel3a_name}</td>
                  <td>{sel3a.total_taken_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {selectedSel3a && (
        <div style={{ marginTop: 30 }}>
          <h3>📦 Détails : <strong>{selectedSel3a.sel3a_name}</strong></h3>
          <p>✅ Ajouté par : <strong>{selectedSel3a.added_by}</strong></p>
          <p>➕ Total ajouté : <strong>{selectedSel3a.total_added}</strong> pièces</p>
          <p>📦 Quantité restante : <strong>{selectedSel3a.remaining_quantity}</strong> pièces</p>

          {loadingDetails ? <p>⏳ Chargement des détails...</p> :
            details.length === 0 ? <p>Aucune opération de prise pour cet article.</p> : (
              <table border="1" cellPadding="6" style={{ width: '100%' }}>
                <thead><tr><th>Quantité prise</th><th>Pris par</th><th>Date</th></tr></thead>
                <tbody>
                  {details.map(rec => (
                    <tr key={rec.id}>
                      <td>{rec.taken_quantity}</td>
                      <td>{rec.taken_by}</td>
                      <td>{new Date(rec.taken_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  );
}

export default TakenReport;
