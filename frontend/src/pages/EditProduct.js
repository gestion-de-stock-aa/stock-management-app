import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EditProduct({ productId, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    quantity: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Récupérer les données du produit pour modification au chargement
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`/api/sel3a/${productId}`);
        setForm({
          name: res.data.name,
          price: res.data.price,
          description: res.data.description || '',
          quantity: res.data.quantity || '',
        });
      } catch (err) {
        setError('Erreur lors de la récupération du produit');
      }
    };
    fetchProduct();
  }, [productId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // Vérifier les champs obligatoires
    if (!form.name || !form.price || form.quantity === '') {
      setError('Nom, prix et quantité sont requis');
      return;
    }

    try {
      await axios.put(`/api/sel3a/${productId}`, {
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
        quantity: parseInt(form.quantity, 10),
      });
      onUpdated(); // Mettre à jour la liste ou fermer le formulaire
      onClose();
    } catch {
      setError('Erreur lors de la modification');
    }
  };

  return (
    <div>
      <h3>Modifier le produit</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nom du produit"
          required
        />
        <input
          name="price"
          type="number"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="Prix"
          required
        />
        <input
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Quantité"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description (optionnel)"
        />
        <button type="submit">Modifier</button>
        <button type="button" onClick={onClose}>Annuler</button>
      </form>
    </div>
  );
}

export default EditProduct;
