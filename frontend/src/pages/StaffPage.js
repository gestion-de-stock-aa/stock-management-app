import React, { useEffect, useState } from 'react';
import axios from 'axios';

function StaffPage() {
  const [sel3a, setSel3a] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', quantity: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // État pour ouvrir le formulaire "Prendre un article"
  const [takeModal, setTakeModal] = useState({ open: false, sel3aId: null, maxQuantity: 0, quantity: '' });

  const userEmail = localStorage.getItem('email') || '';

  const fetchSel3a = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sel3a');
      setSel3a(res.data);
    } catch (err) {
      setError('❌ Échec de récupération des articles');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSel3a();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const { name, price, quantity } = form;

    if (!name || !price || !quantity) {
      setError('❌ Tous les champs sont obligatoires');
      return;
    }

    try {
      if (editId === null) {
        await axios.post(
          '/api/sel3a',
          { name, price: parseFloat(price), quantity: parseInt(quantity) },
          { headers: { 'x-user-email': userEmail } }
        );
      } else {
        await axios.put(
          `/api/sel3a/${editId}`,
          { name, price: parseFloat(price), quantity: parseInt(quantity) },
          { headers: { 'x-user-email': userEmail } }
        );
      }

      setForm({ name: '', price: '', quantity: '' });
      setEditId(null);
      setError('');
      fetchSel3a();
    } catch (err) {
      setError('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Êtes-vous sûr ?')) return;

    try {
      await axios.delete(`/api/sel3a/${id}`, { headers: { 'x-user-email': userEmail } });
      fetchSel3a();
    } catch (err) {
      setError('❌ Erreur lors de la suppression');
    }
  };

  const handleEdit = item => {
    setForm({ name: item.name, price: item.price, quantity: item.quantity });
    setEditId(item.id);
  };

  // Ouvrir le modal "Prendre un article"
  const openTakeModal = (id, maxQuantity) => {
    setTakeModal({ open: true, sel3aId: id, maxQuantity, quantity: '' });
    setError('');
  };

  // Fermer le modal "Prendre un article"
  const closeTakeModal = () => {
    setTakeModal({ open: false, sel3aId: null, maxQuantity: 0, quantity: '' });
    setError('');
  };

  // Soumettre la prise d’article
  const handleTakeSubmit = async e => {
    e.preventDefault();
    const qty = parseInt(takeModal.quantity);

    if (!qty || qty <= 0) {
      setError('❌ Entrez une quantité valide');
      return;
    }
    if (qty > takeModal.maxQuantity) {
      setError(`❌ La quantité ne peut pas dépasser ${takeModal.maxQuantity}`);
      return;
    }

    try {
      await axios.post(
        `/api/sel3a/take/${takeModal.sel3aId}`,
        { quantity: qty },
        { headers: { 'x-user-email': userEmail } }
      );
      setError('');
      closeTakeModal();
      fetchSel3a();
    } catch (err) {
      setError('❌ Erreur lors de la prise de l’article');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 20 }}>
      <h2>📦 Gestion des articles</h2>

      <button onClick={handleLogout}>🚪 Déconnexion</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => window.location.href = '/taken-report'}>
        📋 Rapport des quantités prises
      </button>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <input name="name" placeholder="Nom de l'article" value={form.name} onChange={handleChange} style={{ marginRight: 10 }} />
        <input name="price" type="number" step="0.01" placeholder="Prix" value={form.price} onChange={handleChange} style={{ marginRight: 10 }} />
        <input name="quantity" type="number" placeholder="Quantité" value={form.quantity} onChange={handleChange} style={{ marginRight: 10 }} />
        <button type="submit">{editId === null ? '➕ Ajouter' : '✏️ Modifier'}</button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm({ name: '', price: '', quantity: '' }); }} style={{ marginLeft: 10 }}>
            Annuler
          </button>
        )}
      </form>

      {loading ? (
        <p>⏳ Chargement...</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: '100%', marginTop: 20 }}>
          <thead>
            <tr>
              <th>Nom de l'article</th>
              <th>Prix</th>
              <th>Quantité</th>
              <th>Ajouté par</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sel3a.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{Number(item.price).toFixed(2)}</td>
                <td>{item.quantity}</td>
                <td>{item.added_by || '-'}</td>
                <td>
                  {item.added_by === userEmail ? (
                    <>
                      <button onClick={() => handleEdit(item)}>✏️</button>{' '}
                      <button onClick={() => handleDelete(item.id)}>🗑️</button>{' '}
                    </>
                  ) : (
                    '-'
                  )}
                  <button
                    onClick={() => openTakeModal(item.id, item.quantity)}
                    disabled={item.quantity === 0}
                    style={{ marginLeft: 5 }}
                  >
                    Prendre un article
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Prendre un article */}
      {takeModal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={closeTakeModal}
        >
          <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, minWidth: 300 }} onClick={e => e.stopPropagation()}>
            <h3>Prendre une quantité de l'article</h3>
            <form onSubmit={handleTakeSubmit}>
              <input
                type="number"
                placeholder={`Quantité (jusqu'à ${takeModal.maxQuantity})`}
                value={takeModal.quantity}
                onChange={e => setTakeModal(prev => ({ ...prev, quantity: e.target.value }))}
                min="1"
                max={takeModal.maxQuantity}
                required
                style={{ width: '100%', marginBottom: 10 }}
              />
              <button type="submit">Confirmer</button>{' '}
              <button type="button" onClick={closeTakeModal}>Annuler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPage;
